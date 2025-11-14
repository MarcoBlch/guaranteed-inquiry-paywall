# Postmark Email Issues - Complete Fix Guide

## Issues Found (from screenshots)

### Issue 1: No Outbound Emails Being Sent ❌ CRITICAL
**Evidence**: Screenshot 1 shows only authentication emails (Nov 13), but NO "Guaranteed Message" emails
**Impact**: Payments complete but recipients never get notified
**Root Cause**: `process-escrow-payment` calls `postmark-send-message` but doesn't check if it succeeds

### Issue 2: No Webhooks Configured ❌ CRITICAL
**Evidence**: Screenshot 3 shows "You haven't set up any webhooks yet"
**Impact**: System can't track email delivery, opens, bounces, or failures
**Root Cause**: Webhooks not configured in Postmark dashboard

### Issue 3: Inbound Emails Not Recent
**Evidence**: Screenshot 2 shows last inbound email was Nov 12 (nothing from Nov 13-14)
**Impact**: Can't detect responses if no outbound emails were sent
**Related**: This is a consequence of Issue 1

---

## Fix 1: Configure Postmark Transactional Webhooks

### Steps:

1. **Go to Postmark Dashboard**
   - Navigate to: https://account.postmarkapp.com/
   - Select "FASTPASS Transactional" server
   - Click "Settings" → "Webhooks" tab

2. **Add Webhook URL**
   - Click "Add webhook"
   - URL: `https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-webhook-public`
   - Note: This is the public webhook that routes to `postmark-inbound-webhook`

3. **Select Events to Track**
   Enable these webhooks:
   - ✅ **Delivery** - Email successfully delivered
   - ✅ **Bounce** - Email bounced (hard or soft)
   - ✅ **Spam Complaint** - Recipient marked as spam
   - ✅ **Open** - Email was opened (optional, for tracking)
   - ✅ **Click** - Link was clicked (optional, for tracking)

   **Do NOT enable for inbound** (that uses a different webhook)

4. **Test the Webhook**
   - Use Postmark's "Send test" button
   - Check Supabase function logs for `postmark-webhook-public`
   - Verify webhook is receiving events

---

## Fix 2: Add Error Handling to Email Sending

### Problem
Current code in `process-escrow-payment/index.ts` (line 140):
```typescript
await supabase.functions.invoke('postmark-send-message', {
  body: { ... }
})
// NO ERROR CHECKING!
return new Response(...)
```

If email fails, the payment still succeeds but recipient never gets notified.

### Solution
Add proper error handling and logging:

```typescript
// Send email to recipient using Postmark email service
console.log('Attempting to send email via postmark-send-message function')
const emailResult = await supabase.functions.invoke('postmark-send-message', {
  body: {
    senderEmail: messageData.senderEmail,
    senderMessage: sanitizedContent,
    responseDeadline: responseDeadline,
    paymentAmount: messageData.price,
    messageId: message.id,
    recipientEmail: recipientEmail
  }
})

// Check if email sending failed
if (emailResult.error) {
  console.error('Email sending failed:', emailResult.error)
  throw new Error(`Failed to send email notification: ${emailResult.error.message || 'Unknown error'}`)
}

// Log email result data
const emailData = emailResult.data as any
console.log('Email sent successfully:', emailData)

// Verify email was actually sent
if (!emailData?.success) {
  console.error('Email function returned failure:', emailData)
  throw new Error(`Email sending returned failure: ${emailData?.error || 'Unknown error'}`)
}
```

---

## Fix 3: Verify Postmark Environment Variables

### Check in Supabase Dashboard

1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Verify these variables are set:

```bash
POSTMARK_SERVER_TOKEN=<your-token-here>
POSTMARK_ACCOUNT_TOKEN=<your-account-token>  # Optional
POSTMARK_INBOUND_WEBHOOK_SECRET=<your-webhook-secret>
```

3. **Most Important**: `POSTMARK_SERVER_TOKEN` must be valid
   - Get it from Postmark Dashboard → API Tokens
   - Should be a long alphanumeric string
   - Test it with curl:

```bash
curl "https://api.postmarkapp.com/server" \
  -X GET \
  -H "Accept: application/json" \
  -H "X-Postmark-Server-Token: YOUR_TOKEN_HERE"
```

If token is valid, you'll get server details. If invalid, you'll get an authentication error.

---

## Diagnostic Commands

### 1. Check Recent Escrow Transactions
Run in Supabase SQL Editor to see if payments exist without emails:

```sql
SELECT
  et.id as transaction_id,
  et.message_id,
  et.created_at as transaction_created,
  et.status,
  et.amount,
  et.sender_email,
  m.id as message_exists,
  el.id as email_log_exists,
  el.sent_at as email_sent_at
FROM escrow_transactions et
LEFT JOIN messages m ON m.id = et.message_id
LEFT JOIN email_logs el ON el.message_id = et.message_id
WHERE et.created_at > NOW() - INTERVAL '3 days'
ORDER BY et.created_at DESC
LIMIT 20;
```

**Expected**: If `email_log_exists` is NULL, emails were never sent.

### 2. Check Supabase Function Logs

```bash
# Check process-escrow-payment logs
# Go to: Supabase Dashboard → Edge Functions → process-escrow-payment → Logs
# Look for recent invocations and errors
```

### 3. Test Email Function Directly

```bash
curl -X POST \
  'https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-send-message' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubmNmYXlpd2ZhbXVqdnJwcnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTY5MDQsImV4cCI6MjA2MDM3MjkwNH0.NcM9yKGoQsttzE4cYfqhyV1aG7fvt-lQCHZKy5CPHCk' \
  -H 'Content-Type: application/json' \
  -d '{
    "senderEmail": "test@example.com",
    "senderMessage": "Test message to verify email sending",
    "responseDeadline": "48 hours",
    "paymentAmount": 10,
    "messageId": "test-message-id-'.$(date +%s)'",
    "recipientEmail": "marc.bernard@ece-france.com"
  }'
```

**Expected**: Should return `{"success": true, "emailId": "..."}` and you should receive the email.

---

## Priority Order

1. **IMMEDIATE**: Test email function directly (diagnostic command #3) to verify it works
2. **HIGH**: Add error handling to `process-escrow-payment`
3. **HIGH**: Configure Postmark webhooks for delivery tracking
4. **MEDIUM**: Verify environment variables are set correctly

---

## Next Steps

1. Run diagnostic queries to see if payments exist without emails
2. Test email function directly to verify it works
3. Apply Fix 2 (error handling) to process-escrow-payment
4. Deploy updated function
5. Configure webhooks (Fix 1)
6. Test full payment flow
7. Verify email appears in Postmark Activity dashboard
