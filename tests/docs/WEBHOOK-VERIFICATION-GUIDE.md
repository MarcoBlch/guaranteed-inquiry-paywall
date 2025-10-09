# 🔍 Postmark Webhook Date Parsing Fix - Verification Guide

## ✅ What Was Fixed

**Problem**: Webhook crashed with HTTP 500 when Postmark sent invalid date formats
**Solution**: Added defensive date parsing with fallbacks and validation
**Status**: ✅ Deployed (Version 8 - 2025-10-08 13:00:04 UTC)

---

## 📊 Verification Methods

### Method 1: Supabase Dashboard SQL Queries (Recommended)

**Step 1**: Open Supabase SQL Editor
- Go to: https://supabase.com/dashboard/project/znncfayiwfamujvrprvf
- Navigate to: **SQL Editor** in left sidebar

**Step 2**: Run These Queries

#### Query 1: Check Recent Webhook Activity
```sql
SELECT
  LEFT(message_id::text, 8) || '...' as msg_id,
  response_email_from,
  response_email_subject,
  response_received_at,
  response_detected_method,
  within_deadline,
  grace_period_used,
  created_at
FROM email_response_tracking
ORDER BY created_at DESC
LIMIT 10;
```
**Expected**: Recent records showing webhook detections

---

#### Query 2: Check for Date Parsing Issues
```sql
SELECT
  LEFT(message_id::text, 8) || '...' as msg_id,
  response_received_at,
  created_at,
  ABS(EXTRACT(EPOCH FROM (response_received_at - created_at))) as seconds_diff,
  CASE
    WHEN ABS(EXTRACT(EPOCH FROM (response_received_at - created_at))) < 5 THEN '⚠️ FALLBACK_USED'
    ELSE '✅ NORMAL'
  END as timestamp_source
FROM email_response_tracking
WHERE response_detected_method = 'webhook'
ORDER BY created_at DESC
LIMIT 10;
```
**Expected**:
- `✅ NORMAL` = Date parsed successfully
- `⚠️ FALLBACK_USED` = Fix prevented crash (used current time)

---

#### Query 3: Check Email Logs for NULL Dates
```sql
SELECT
  LEFT(message_id::text, 8) || '...' as msg_id,
  email_type,
  sender_email,
  sent_at,
  CASE
    WHEN sent_at IS NULL THEN '❌ NULL_DATE'
    ELSE '✅ OK'
  END as date_status,
  created_at
FROM email_logs
WHERE email_service_provider = 'postmark'
  OR email_type = 'inbound_response'
ORDER BY created_at DESC
LIMIT 10;
```
**Expected**: No `❌ NULL_DATE` entries (or if they exist, no crashes)

---

#### Query 4: Webhook Success Rate (Last 24h)
```sql
SELECT
  COUNT(*) as total_responses,
  COUNT(*) FILTER (WHERE response_detected_method = 'webhook') as webhook_detected,
  COUNT(*) FILTER (WHERE within_deadline = true) as within_deadline,
  COUNT(*) FILTER (WHERE grace_period_used = true) as grace_period_used
FROM email_response_tracking
WHERE created_at >= NOW() - INTERVAL '24 hours';
```
**Expected**: Positive numbers indicating webhook activity

---

#### Query 5: Transaction Status After Webhook
```sql
SELECT
  LEFT(et.message_id::text, 8) || '...' as msg_id,
  et.status,
  et.amount / 100.0 as amount_usd,
  mr.detection_method,
  ert.within_deadline,
  EXTRACT(EPOCH FROM (et.updated_at - ert.response_received_at))/60 as mins_to_release
FROM escrow_transactions et
LEFT JOIN message_responses mr ON et.message_id = mr.message_id
LEFT JOIN email_response_tracking ert ON et.message_id = ert.message_id
WHERE ert.response_detected_method = 'webhook'
  AND et.created_at >= NOW() - INTERVAL '7 days'
ORDER BY et.created_at DESC
LIMIT 10;
```
**Expected**: Status = `released` after webhook detection

---

### Method 2: Check Supabase Function Logs

**Step 1**: Navigate to Edge Functions
- Go to: https://supabase.com/dashboard/project/znncfayiwfamujvrprvf/functions

**Step 2**: Click on `postmark-inbound-webhook`

**Step 3**: Go to "Logs" or "Invocations" tab

**What to Look For**:
- ✅ HTTP 200 responses (not HTTP 500)
- ✅ Log messages: `"⚠️ Invalid date format: ... - using current time"`
- ✅ Log messages: `"✅ Found message via ..."`
- ❌ No error messages about "Invalid time value"

---

### Method 3: Check Postmark Dashboard

**Step 1**: Go to Postmark Account
- Navigate to: **Activity** → **Inbound**

**Step 2**: Check Recent Emails

**What to Look For**:
- ✅ Status: `Processed` (green checkmark)
- ❌ NOT: `Failed` or `Retrying`

---

## 🧪 Testing the Fix with Real Email

### Option A: Use Existing Test Script

```bash
# Run the existing test script
./test-postmark-webhook.sh

# Follow the instructions to reply to the test email
```

### Option B: Manual Test Flow

1. **Send a test payment** through your payment page
2. **Wait for the email** to arrive
3. **Reply to the email** from the recipient's email client
4. **Check webhook processing** using the SQL queries above

---

## 📋 Success Indicators

### ✅ Fix is Working If:
- [x] No HTTP 500 errors in function logs
- [x] Postmark shows "Processed" status
- [x] `email_response_tracking` table receives new entries
- [x] Transactions change to `released` status after webhook
- [x] Log messages show fallback behavior when dates are invalid

### ❌ Issues If:
- [ ] HTTP 500 errors still appearing
- [ ] Postmark shows "Failed" or "Retrying"
- [ ] Empty `email_response_tracking` table
- [ ] Transactions stuck in `held` status after response

---

## 🔧 Troubleshooting

### No Webhook Activity
**Possible Causes**:
- Postmark inbound not configured correctly
- Reply-To address not matching pattern
- No test emails sent yet

**Solution**: Send a test email using `./test-postmark-webhook.sh`

---

### Dates Still NULL
**Check**: Are emails reaching the webhook?
```sql
SELECT COUNT(*) FROM email_logs WHERE email_type = 'inbound_response';
```

**If 0**: Webhook not receiving emails (check Postmark configuration)
**If > 0**: Check `sent_at` field - should not be NULL

---

### Fallback Used for All Emails
**Check**: What dates is Postmark sending?
```sql
SELECT
  response_received_at,
  created_at,
  email_headers
FROM email_response_tracking
WHERE response_detected_method = 'webhook'
ORDER BY created_at DESC
LIMIT 1;
```

Look in `email_headers` for the `Date` field to see the raw format.

---

## 📁 Additional Resources

- **Detailed SQL Queries**: `verify-webhook-fix.sql`
- **Test Script**: `test-postmark-webhook.sh`
- **Edge Function Code**: `supabase/functions/postmark-inbound-webhook/index.ts`

---

## 🎯 Quick Start

**Fastest way to verify everything works**:

1. Open Supabase SQL Editor
2. Run Query 1 (Recent Webhook Activity)
3. If you see recent entries → ✅ Fix is working
4. If empty → Send a test email and reply to it
5. Run Query 1 again to see the results

---

## 💡 Understanding the Fix

The date parsing fix uses a **three-layer defense strategy**:

```typescript
// Layer 1: Check if date exists
if (!inboundEmail.Date) {
  responseTime = new Date(); // Use current time
}

// Layer 2: Parse and validate
responseTime = new Date(inboundEmail.Date);
if (isNaN(responseTime.getTime())) {
  responseTime = new Date(); // Use current time
}

// Layer 3: Catch any unexpected errors
try { ... } catch (error) {
  responseTime = new Date(); // Use current time
}
```

**Result**: Webhook NEVER crashes, even with malformed dates. Uses current timestamp as safe fallback, preserving the 15-minute grace period logic.

---

## 📞 Need Help?

If you're still seeing issues after following this guide:

1. Check the function logs in Supabase Dashboard
2. Run all SQL queries and save the results
3. Check Postmark Activity page for delivery status
4. Review the `email_headers` field in `email_response_tracking` for raw date values

---

**Deployment Status**: ✅ Live in Production (Version 8)
**Last Updated**: 2025-10-08
**Fix Applied**: Date parsing with defensive validation and fallbacks
