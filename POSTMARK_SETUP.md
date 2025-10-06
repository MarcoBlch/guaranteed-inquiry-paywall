# Postmark Email Service Setup Guide

## Phase 3A: Dual-Service Email Infrastructure

This guide covers setting up Postmark for inbound email parsing and enhanced deliverability alongside the existing Resend service.

---

## Why Postmark?

**Key Benefits:**
- ✅ **Production-ready inbound email parsing** (not early access like Resend)
- ✅ **93.8% deliverability rate** (industry-leading)
- ✅ **Real-time webhook support** for instant response detection
- ✅ **Precise email header timestamps** for deadline enforcement
- ✅ **Affordable pricing**: $15/month for 10,000 emails
- ✅ **Comprehensive tracking**: Opens, clicks, bounces, spam complaints

---

## Setup Steps

### 1. Create Postmark Account

1. Visit [https://postmarkapp.com/](https://postmarkapp.com/)
2. Sign up for a new account
3. Choose **Transactional** email stream (not marketing)
4. Complete account verification

### 2. Configure Sender Domain

**Domain Setup (fastpass.email):**

1. In Postmark dashboard, go to **Servers** → **Sender Signatures**
2. Click **Add Domain** and enter: `fastpass.email`
3. Postmark will provide DNS records to add:

```dns
# SPF Record (TXT)
Host: @
Value: v=spf1 include:spf.postmarkapp.com ~all

# DKIM Record (TXT) - Postmark provides unique values
Host: [postmark-provided-key]._domainkey
Value: [postmark-provided-value]

# Return-Path (CNAME)
Host: pm-bounces
Value: pm.mtasv.net

# Tracking Domain (CNAME) - Optional but recommended
Host: link
Value: track.postmarkapp.com
```

4. Add these records to your IONOS DNS settings
5. Wait for verification (usually 15-30 minutes)
6. Confirm verification in Postmark dashboard

### 3. Configure Inbound Email Processing

**Inbound Domain Setup:**

1. In Postmark dashboard, go to **Servers** → **Inbound**
2. Click **Add Inbound Domain**
3. Enter: `reply.fastpass.email` (or your preferred subdomain)
4. Add MX records provided by Postmark:

```dns
# MX Record for inbound emails
Host: reply
Priority: 10
Value: inbound.postmarkapp.com
```

5. Configure webhook endpoint:
   - **Webhook URL**: `https://[your-supabase-url]/functions/v1/postmark-inbound-webhook`
   - **Include raw email**: No (we only need headers and body)
   - **Authentication**: Add custom header with secret token

### 4. Get API Credentials

**Server API Token:**

1. Go to **Servers** → **API Tokens**
2. Copy the **Server API Token** (starts with letters)
3. This is your `POSTMARK_SERVER_TOKEN`

**Account API Token (optional):**

1. Go to **Account** → **API Tokens**
2. Generate new token if needed
3. This is your `POSTMARK_ACCOUNT_TOKEN` (for management APIs)

### 5. Configure Environment Variables

**Supabase Edge Functions:**

Add these secrets to your Supabase project:

```bash
# Via Supabase CLI
supabase secrets set POSTMARK_SERVER_TOKEN=your_server_token_here
supabase secrets set POSTMARK_ACCOUNT_TOKEN=your_account_token_here
supabase secrets set POSTMARK_INBOUND_WEBHOOK_SECRET=your_webhook_secret_here
supabase secrets set POSTMARK_INBOUND_EMAIL_ADDRESS=reply@fastpass.email
```

**Or via Supabase Dashboard:**

1. Go to **Project Settings** → **Edge Functions**
2. Add secrets:
   - `POSTMARK_SERVER_TOKEN`: Your Postmark server API token
   - `POSTMARK_ACCOUNT_TOKEN`: Your Postmark account API token
   - `POSTMARK_INBOUND_WEBHOOK_SECRET`: Generate secure random string
   - `POSTMARK_INBOUND_EMAIL_ADDRESS`: `reply@fastpass.email`

### 6. Deploy Edge Functions

Deploy the new Postmark functions:

```bash
# Deploy all three new functions
supabase functions deploy postmark-send-message
supabase functions deploy postmark-inbound-webhook
supabase functions deploy email-service-health

# Verify deployment
supabase functions list
```

### 7. Run Database Migration

Apply the email tracking schema enhancements:

```bash
# If using local Supabase
supabase db push

# Or manually run the migration in Supabase SQL Editor
# Copy contents of: supabase/migrations/20251006000000_enhance_email_tracking.sql
```

### 8. Configure Webhook Security

**Secure your inbound webhook:**

1. In Postmark dashboard, go to **Servers** → **Webhooks**
2. Add webhook URL: `https://[your-supabase-url]/functions/v1/postmark-inbound-webhook`
3. Enable webhook authentication with custom header:
   - Header: `X-Postmark-Webhook-Secret`
   - Value: Your `POSTMARK_INBOUND_WEBHOOK_SECRET`

4. Update the webhook function to verify the secret (TODO in code)

---

## Testing the Setup

### Test Outbound Email

```bash
# Test sending via Postmark
curl -X POST https://[your-supabase-url]/functions/v1/postmark-send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [service-role-key]" \
  -d '{
    "senderEmail": "test@example.com",
    "senderMessage": "This is a test message",
    "responseDeadline": "48 hours",
    "paymentAmount": 10.00,
    "messageId": "test-uuid-here",
    "recipientEmail": "your-email@example.com"
  }'
```

### Test Inbound Email

1. Send an outbound email via Postmark using the test above
2. Reply to that email from your recipient address
3. Check logs to verify webhook received the reply:

```bash
# View Edge Function logs
supabase functions logs postmark-inbound-webhook --tail
```

### Test Health Check

```bash
curl https://[your-supabase-url]/functions/v1/email-service-health \
  -H "Authorization: Bearer [service-role-key]"
```

Expected response:
```json
{
  "timestamp": "2025-10-06T...",
  "overallStatus": "healthy",
  "recommendation": "postmark",
  "services": {
    "resend": { "status": "healthy", ... },
    "postmark": { "status": "healthy", ... }
  },
  "responseTracking": { ... }
}
```

---

## Migration Strategy

### Phase 3A: Dual-Service (Current Phase)

- ✅ **Keep Resend** for existing outbound emails
- ✅ **Add Postmark** for testing inbound parsing
- ✅ **A/B test** deliverability between services
- ✅ **Monitor** both services via health endpoint

### Phase 3B: Gradual Migration (Next)

- Migrate new messages to Postmark
- Keep Resend for legacy message notifications
- Compare metrics: deliverability, response detection accuracy
- Gather data for final decision

### Phase 3C: Complete Migration (Future)

- Migrate all outbound emails to Postmark
- Remove Resend dependencies
- Optimize webhook performance
- Full end-to-end testing

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Deliverability Rate**: Target ≥95%
2. **Response Detection**: Webhook vs manual marking ratio
3. **Grace Period Usage**: % of responses using 15min buffer
4. **Email Open Rate**: Engagement metric
5. **Failure Rate**: Should be <5%

### Health Check Endpoint

Monitor via: `GET /functions/v1/email-service-health`

Set up automated alerts for:
- Service degradation (delivery rate <85%)
- API downtime
- High failure rates (>15%)
- Webhook processing errors

---

## Cost Analysis

**Postmark Pricing:**
- First 10,000 emails: $15/month ($0.0015 per email)
- Beyond 10k: Volume discounts available
- No hidden fees for opens/clicks tracking

**Cost Comparison:**
- **Resend**: Similar pricing but lacks inbound parsing
- **Postmark**: Slightly higher but includes critical features
- **ROI**: Worth investment for revenue protection via reliable response detection

---

## Troubleshooting

### Inbound Emails Not Detected

1. **Check MX records**: Verify `reply.fastpass.email` points to Postmark
2. **Test MX resolution**: `dig reply.fastpass.email MX`
3. **Check webhook logs**: Look for POST requests from Postmark
4. **Verify In-Reply-To header**: Ensure emails are threaded properly

### Low Deliverability

1. **Verify SPF/DKIM**: Use mail-tester.com to check
2. **Check sender reputation**: Monitor Postmark dashboard
3. **Review bounce logs**: Identify patterns
4. **Warm up domain**: Gradually increase sending volume

### Webhook Authentication Failing

1. **Verify secret**: Check Supabase secrets match Postmark config
2. **Check header name**: Must be exact match (case-sensitive)
3. **Review webhook logs**: Look for authentication errors

---

## Support Resources

- **Postmark Documentation**: https://postmarkapp.com/developer
- **Postmark Support**: support@postmarkapp.com
- **Supabase Functions Docs**: https://supabase.com/docs/guides/functions
- **Project Issues**: GitHub repository issues tab

---

## Next Steps

After completing this setup:

1. ✅ Test outbound emails via Postmark
2. ✅ Verify inbound parsing works
3. ✅ Monitor health endpoint for both services
4. ✅ Compare deliverability metrics (Resend vs Postmark)
5. ✅ Proceed to Phase 3B: Gradual migration
