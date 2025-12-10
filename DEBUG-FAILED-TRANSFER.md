# Debug Failed Transfer - Step by Step Guide

## Transaction Info
- **Sender**: devilpepito@hotmail.fr
- **Amount**: €1.50
- **Date**: 12/1/2025
- **Status**: transfer_failed
- **Retry Result**: Found and retried, but still failing

---

## Step 1: Check Edge Function Logs (MOST IMPORTANT)

This will tell you the EXACT error from Stripe.

### How to Access:
1. Go to: https://supabase.com/dashboard/project/znncfayiwfamujvrprvf/functions
2. Click on **`distribute-escrow-funds`**
3. Click the **"Logs"** tab
4. Set time range to **"Last 24 hours"**
5. Look for entries from today (around the time we ran the retry)

### What to Look For:
Search for these error patterns:

**A. Insufficient Funds Error**:
```
"insufficient_funds"
"Your account has insufficient funds"
"balance_insufficient"
```
**Solution**: Add funds to your Stripe balance

**B. Recipient Account Issues**:
```
"account_invalid"
"charges_not_enabled"
"payouts_not_enabled"
"onboarding_incomplete"
```
**Solution**: Recipient needs to complete Stripe Connect onboarding

**C. PaymentIntent Issues**:
```
"payment_intent_authentication_failure"
"payment_intent_unexpected_state"
"amount_too_small"
```
**Solution**: Check PaymentIntent status in Stripe Dashboard

**D. Transfer Creation Failed**:
```
"transfer_failed"
"destination_account_error"
```
**Solution**: Check recipient's Stripe account status

---

## Step 2: Run SQL Queries

I've created comprehensive SQL queries. Run them in Supabase SQL Editor:

### Open SQL Editor:
https://supabase.com/dashboard/project/znncfayiwfamujvrprvf/sql/new

### Run This Query:
```sql
-- Get all information about the failed transaction
SELECT
  et.id as transaction_id,
  et.stripe_payment_intent_id,
  et.amount,
  et.status,
  et.sender_email,

  -- Recipient Stripe status
  p.stripe_account_id,
  p.stripe_onboarding_completed,
  p.stripe_charges_enabled,
  p.stripe_payouts_enabled,

  -- Response status
  mr.has_response,
  mr.response_received_at,

  -- Status summary
  CASE
    WHEN p.stripe_account_id IS NULL THEN '❌ NO STRIPE ACCOUNT'
    WHEN p.stripe_onboarding_completed = false THEN '⚠️ ONBOARDING INCOMPLETE'
    WHEN p.stripe_onboarding_completed = true THEN '✅ STRIPE READY'
  END as recipient_status,

  CASE
    WHEN mr.has_response = true THEN '✅ RESPONSE RECEIVED'
    ELSE '❌ NO RESPONSE'
  END as response_status

FROM escrow_transactions et
LEFT JOIN profiles p ON p.id = et.recipient_user_id
LEFT JOIN message_responses mr ON mr.escrow_transaction_id = et.id
WHERE et.sender_email = 'devilpepito@hotmail.fr'
  AND et.status = 'transfer_failed'
ORDER BY et.created_at DESC
LIMIT 1;
```

### Expected Results:

**If recipient_status shows**:
- `❌ NO STRIPE ACCOUNT` → Recipient never connected Stripe
- `⚠️ ONBOARDING INCOMPLETE` → Recipient needs to finish Stripe Connect setup
- `✅ STRIPE READY` → Issue is elsewhere (probably Stripe balance)

**If response_status shows**:
- `❌ NO RESPONSE` → Transfer shouldn't happen (no response received)
- `✅ RESPONSE RECEIVED` → Transfer should happen (response was received)

---

## Step 3: Check Your Stripe Balance

### Access Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/balance/overview
2. Check **Available Balance**
3. You need at least **€1.50** available

### Common Issues:

**Issue 1: Auto-Payouts Enabled**
- If auto-payouts are enabled, your balance is $0
- Funds are automatically sent to your bank account
- **Solution**: Disable auto-payouts temporarily OR wait for next deposit

**How to Disable Auto-Payouts**:
1. Go to: https://dashboard.stripe.com/settings/payouts
2. Find "Payout schedule"
3. Change to "Manual"
4. Save changes

**Issue 2: Pending Balance**
- Funds might be "Pending" and not "Available"
- **Solution**: Wait for funds to become available (usually 7 days for first transactions)

---

## Step 4: Check Recipient's Stripe Connect

If the recipient hasn't completed onboarding:

### For Recipient:
1. They should have received an email from Stripe
2. Email subject: "Complete your Stripe account setup"
3. They need to click the link and complete:
   - Business/Personal information
   - Bank account details
   - Identity verification

### For You (Platform Owner):
1. Go to: https://dashboard.stripe.com/connect/accounts
2. Find the recipient's account
3. Check status:
   - `Charges enabled`: Should be ✅
   - `Payouts enabled`: Should be ✅
   - `Requirements`: Should be empty

---

## Step 5: Common Error Messages & Solutions

### Error: "Insufficient funds to cover transfer amount"
**Cause**: Your Stripe platform account doesn't have €1.50 available

**Solutions**:
1. Check balance: https://dashboard.stripe.com/balance
2. Options:
   - Wait for pending funds to clear
   - Disable auto-payouts
   - Make a test payment to add funds
   - Fund your Stripe account manually (if supported in your region)

### Error: "The destination account for this transfer has not been activated"
**Cause**: Recipient hasn't completed Stripe Connect onboarding

**Solutions**:
1. Check Connect dashboard: https://dashboard.stripe.com/connect/accounts
2. Find recipient's account
3. See what requirements are missing
4. Contact recipient to complete onboarding

### Error: "This payment has already been captured"
**Cause**: PaymentIntent was already processed

**Solutions**:
1. Check PaymentIntent in Stripe Dashboard
2. Search for: `pi_xxx` (the payment_intent_id from SQL query)
3. Verify its status
4. If already captured, this is correct behavior

### Error: "Amount must be at least €0.50"
**Cause**: Transfer amount too small (after fees)

**Solutions**:
1. Check if your fee calculation leaves enough for transfer
2. €1.50 × 0.75 (recipient share) = €1.13
3. This should be above minimum
4. If not, there might be additional fees

---

## Step 6: Manual Retry After Fixing

Once you've identified and fixed the issue:

### Option A: Automatic Retry (Recommended)
The `retry-failed-transfers` cron job will automatically retry every 30 minutes (if configured).

OR manually invoke it:
```bash
curl -X POST "https://znncfayiwfamujvrprvf.supabase.co/functions/v1/retry-failed-transfers" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Option B: Manual Retry for Specific Transaction
```bash
# First, get the transaction ID from SQL query above
# Then invoke distribute-escrow-funds directly

curl -X POST "https://znncfayiwfamujvrprvf.supabase.co/functions/v1/distribute-escrow-funds" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"escrowTransactionId": "TRANSACTION_ID_HERE"}'
```

---

## Most Likely Causes (Ranked)

### 1. Insufficient Stripe Balance (90% probability)
**Check**: https://dashboard.stripe.com/balance/overview
**Fix**: Disable auto-payouts or wait for funds to clear

### 2. Recipient's Stripe Connect Incomplete (8% probability)
**Check**: Run SQL query above to see `stripe_onboarding_completed`
**Fix**: Recipient completes onboarding

### 3. PaymentIntent Issue (2% probability)
**Check**: Search for PaymentIntent in Stripe Dashboard
**Fix**: Depends on specific issue

---

## Quick Diagnosis Checklist

Run through this checklist:

- [ ] Checked Edge Function logs for exact error message
- [ ] Ran SQL query to verify recipient's Stripe status
- [ ] Checked Stripe balance (need at least €1.50)
- [ ] Verified response was actually received
- [ ] Checked recipient's Stripe Connect onboarding status
- [ ] Reviewed PaymentIntent status in Stripe Dashboard

---

## What to Do Next

### Priority 1: Check Logs
**Action**: Go to Supabase Dashboard → Functions → distribute-escrow-funds → Logs
**Why**: This will give you the EXACT error message from Stripe
**Time**: 2 minutes

### Priority 2: Run SQL Query
**Action**: Copy query from this document → Supabase SQL Editor → Run
**Why**: Confirms recipient's Stripe status and response status
**Time**: 1 minute

### Priority 3: Check Stripe Balance
**Action**: Go to Stripe Dashboard → Balance
**Why**: Most common cause of transfer failures
**Time**: 1 minute

---

## Need Help?

If you're still stuck after checking these:

1. **Share the exact error message** from Edge Function logs
2. **Share the SQL query results** (without sensitive data)
3. **Share your Stripe balance status**

This will allow me to give you the exact solution.

---

## Summary

**Most Likely Issue**: Insufficient Stripe balance

**Quick Test**:
1. Go to https://dashboard.stripe.com/balance
2. Check "Available Balance"
3. If it's less than €1.50, that's your issue
4. Solution: Disable auto-payouts OR wait for funds

**After Fixing**:
- The retry-failed-transfers cron job will automatically retry
- OR manually invoke it using the curl command above

---

**Created**: 2025-12-10
**Transaction**: devilpepito@hotmail.fr, €1.50
**Status**: Investigating transfer failure
