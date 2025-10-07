# Postmark Webhook Issue - Debug Report

## Executive Summary

**Problem**: Postmark inbound webhook is NOT detecting email replies, preventing automatic escrow payment release.

**Status**:
- ✅ Outbound emails sent successfully via Postmark
- ✅ Recipients receive emails and can reply
- ✅ Senders receive the replies
- ❌ Postmark inbound webhook is NEVER triggered

**Impact**: Core business logic broken - cannot automatically detect responses and release payments.

---

## System Architecture

### Platform: FASTPASS Escrow Payment System
- **Frontend**: React + TypeScript (Vercel)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Email Provider**: Postmark
- **Payment**: Stripe

### Email Flow (Current Implementation)

```
1. Sender pays → Creates message in database
2. Postmark sends email to Receiver
   - From: FASTPASS <noreply@fastpass.email>
   - To: receiver@example.com
   - Reply-To: 3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com
   - Subject: 💰 Guaranteed Message (€15.00) - Response within 48 hours

3. Receiver replies to email
   - Reply should go to: 3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com

4. Postmark should POST to webhook:
   - URL: https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-webhook-public
   - Expected: HTTP 200 response
   - ACTUAL: Webhook is NEVER called (no activity in Postmark dashboard)

5. Webhook should:
   - Detect response via In-Reply-To header
   - Mark response as received
   - Release escrow payment (75% to receiver, 25% platform)
   - Forward response to original sender
```

---

## Postmark Configuration

### Server Details
- **Server Name**: FASTPASS Transactional
- **Server ID**: 13164655
- **Environment**: Test Mode (reviewing account)

### Inbound Stream Configuration
- **Stream Name**: Default Inbound Stream
- **Stream ID**: `inbound`
- **Inbound Email Address**: `3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com`
- **Webhook URL**: `https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-webhook-public`
- **Webhook Status**: Configured and saved ✅
- **Authentication**: None (verify_jwt = false in Supabase config)

### DNS Configuration
- **Domain**: fastpass.email (verified via IONOS)
- **SPF**: Configured ✅
- **DKIM**: Configured ✅
- **Return-Path**: Configured ✅
- **MX Records**: NOT configured for inbound (potential issue?)

### API Tokens
- **Server Token**: Configured in Supabase secrets ✅
- **Account Token**: Available (38cc80d5-c0bc-420e-8834-15794a3ebbc9)

---

## What We've Tested

### Test Scenario 1: Direct Inbound Test Emails
- **Method**: Sent emails directly to `3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com`
- **Result**: Webhook receives POST, returns HTTP 200 with "No matching message found"
- **Status**: ✅ Webhook works when emails sent directly to inbound address

### Test Scenario 2: Production Flow (Current Issue)
- **Method**:
  1. Created payment via `https://fastpass.email/pay/[user-id]`
  2. Email sent via Postmark with Reply-To: inbound address
  3. Receiver replies to email
  4. Sender receives reply
- **Result**: Postmark shows NO inbound activity, webhook NEVER called
- **Status**: ❌ Replies do NOT reach Postmark inbound system

### Test Scenario 3: Webhook URL Verification
- **Manual Test**: `curl -X POST [webhook-url]` with test JSON
- **Result**: Returns HTTP 200
- **Status**: ✅ Webhook endpoint is accessible and responding

---

## Current Hypothesis

**The Issue**: Email clients may be routing replies to `noreply@fastpass.email` instead of the Reply-To address.

**Why This Matters**:
- Reply-To header: `3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com`
- From header: `FASTPASS <noreply@fastpass.email>`
- Some email clients prioritize From over Reply-To
- If reply goes to `noreply@fastpass.email`, Postmark never receives it

**Evidence**:
- Postmark Activity shows ZERO inbound emails when replies are sent
- Direct emails TO the inbound address work perfectly
- Webhook is properly configured and responds correctly

---

## Technical Details

### Outbound Email Configuration (postmark-send-message function)

```typescript
{
  From: 'FASTPASS <noreply@fastpass.email>',
  To: recipientEmail,
  ReplyTo: '3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com',
  Subject: `💰 Guaranteed Message (${amount}€) - Response within ${deadline}`,
  HtmlBody: htmlContent,
  TextBody: textContent,
  MessageStream: 'outbound',
  TrackOpens: true,
  TrackLinks: 'HtmlAndText',
  Headers: [
    { Name: 'X-Fastpass-Message-Id', Value: messageId }
  ],
  Metadata: {
    messageId: messageId,
    senderEmail: senderEmail
  }
}
```

### Webhook Function (postmark-inbound-webhook)

**URL**: `https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-inbound-webhook`

**Authentication**: Public (verify_jwt = false)

**Logic**:
1. Receives Postmark inbound JSON payload
2. Extracts In-Reply-To header to match original message
3. Looks up message in database via email_logs table
4. If found and within deadline: releases escrow funds
5. Forwards response to original sender
6. Returns HTTP 200 with processing status

**Current Status**:
- ✅ Returns HTTP 200 for all scenarios
- ✅ Handles errors gracefully
- ❌ Never receives inbound emails from Postmark

### Database Schema

**email_logs table** (tracks outbound emails):
```sql
- message_id: uuid (FK to messages)
- email_provider_id: text (Postmark MessageID)
- email_type: 'new_message_notification'
- email_service_provider: 'postmark'
- response_detected_at: timestamp
```

**email_response_tracking table** (tracks responses):
```sql
- message_id: uuid
- original_email_id: text (from In-Reply-To header)
- response_received_at: timestamp
- response_detected_method: 'webhook' | 'manual' | 'grace_period'
- within_deadline: boolean
```

---

## What We've Already Fixed

1. ✅ **HTTP 500 errors**: Fixed database query join issues
2. ✅ **Migration applied**: email_response_tracking table exists in production
3. ✅ **Authentication**: Added verify_jwt = false for public webhook access
4. ✅ **Reply-To routing**: Changed from sender email to Postmark inbound address
5. ✅ **Response forwarding**: Added automatic forwarding to original sender
6. ✅ **Error handling**: All webhook responses return HTTP 200

---

## Questions for Postmark Expert

### Primary Question
**Why are email replies NOT reaching Postmark's inbound system when Reply-To header is set to the inbound address?**

### Specific Areas to Investigate

1. **Email Client Behavior**:
   - Do major email clients (Gmail, Outlook) honor Reply-To headers?
   - Is there a better way to force replies through Postmark?

2. **Postmark Inbound Configuration**:
   - Do we need MX records for `fastpass.email` pointing to Postmark?
   - Is there a special configuration needed beyond the webhook URL?
   - Does "Test Mode" affect inbound email processing?

3. **Alternative Solutions**:
   - Should we use email forwarding instead of Reply-To?
   - Should we configure `info@fastpass.email` to forward to inbound address?
   - Is there a Postmark-specific header or configuration we're missing?

4. **Debugging Steps**:
   - How can we trace where replies are actually going?
   - Can Postmark logs show rejected/lost inbound emails?
   - Are there Postmark API endpoints to manually check for inbound emails?

---

## Reproduction Steps

### Step 1: Send Test Email
```bash
curl -X POST \
  "https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-send-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
  -d '{
    "recipientEmail": "marc.bernard@ece-france.com",
    "senderEmail": "test@example.com",
    "senderMessage": "Test message for webhook",
    "messageId": "[UUID]",
    "paymentAmount": 15,
    "responseDeadline": "48 hours"
  }'
```

### Step 2: Check Email
- Recipient receives email from `FASTPASS <noreply@fastpass.email>`
- Reply-To header shows: `3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com`

### Step 3: Reply to Email
- Click "Reply" in email client
- Send response

### Step 4: Observe Issue
- ✅ Original sender receives the reply (somehow)
- ❌ Postmark Inbound Activity shows ZERO emails
- ❌ Webhook is NEVER triggered

---

## Environment Details

### Production URLs
- **Frontend**: https://fastpass.email
- **Supabase Project**: znncfayiwfamujvrprvf.supabase.co
- **Webhook Endpoint**: https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-webhook-public
- **Postmark Dashboard**: https://account.postmarkapp.com/servers/13164655

### Key Files
- Outbound Email: `/supabase/functions/postmark-send-message/index.ts`
- Inbound Webhook: `/supabase/functions/postmark-inbound-webhook/index.ts`
- Public Wrapper: `/supabase/functions/postmark-webhook-public/index.ts`
- Config: `/supabase/config.toml`

### Deployment Status
- ✅ All Edge Functions deployed to production
- ✅ Database migration applied
- ✅ All changes committed to main branch
- ✅ Webhook URL configured in Postmark dashboard

---

## Expected vs Actual Behavior

### Expected Flow
```
1. Email sent with Reply-To: [inbound-address]
2. User replies → Email goes to [inbound-address]
3. Postmark receives email at inbound stream
4. Postmark POSTs to webhook URL
5. Webhook processes, releases funds, forwards to sender
```

### Actual Flow
```
1. Email sent with Reply-To: [inbound-address] ✅
2. User replies → Email goes to ??? ❓
3. Postmark receives: NOTHING ❌
4. Postmark POSTs: NEVER HAPPENS ❌
5. Sender still receives reply somehow ❓
```

---

## Critical Missing Piece

**The sender receives the reply, but we don't know how or from where.**

This suggests:
- Replies may be going directly to sender (bypassing Postmark)
- Email client may be ignoring Reply-To header
- There may be a configuration issue with how Postmark handles Reply-To

---

## Success Criteria

The issue will be resolved when:

1. ✅ User replies to email
2. ✅ Email reaches Postmark inbound address
3. ✅ Postmark Activity shows inbound email received
4. ✅ Webhook receives POST request from Postmark
5. ✅ Webhook processes response and releases escrow
6. ✅ Original sender receives forwarded reply

---

## Additional Resources

### Documentation Referenced
- Postmark Inbound Processing: https://postmarkapp.com/developer/user-guide/inbound/parse-an-email
- Postmark Error Messages: https://postmarkapp.com/support/article/870-what-are-inbound-error-messages
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

### Repository
- GitHub: https://github.com/MarcoBlch/guaranteed-inquiry-paywall
- Branch: main (all changes merged)

---

## Contact & Access

**Developer**: Marc Bernard
**Email**: marc.bernard@ece-france.com
**Test Email**: bernardmarc92@gmail.com

**Access Credentials** (if needed):
- Postmark Account: Available
- Supabase Project: Available
- GitHub Repository: Public

---

## Next Steps

1. **Expert Analysis**: Review this document and identify root cause
2. **Configuration Fix**: Implement recommended Postmark setup
3. **Testing**: Verify inbound emails reach Postmark
4. **Validation**: Confirm complete end-to-end flow works

---

**Document Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Status**: Ready for Expert Review
