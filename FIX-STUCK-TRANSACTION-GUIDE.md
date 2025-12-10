# How to Fix Your Stuck Transaction (devilpepito@hotmail.fr)

## Current Status
- **Transaction**: devilpepito@hotmail.fr, €1.50, Date: 12/1/2025
- **Problem**: Status is `transfer_failed` (Stripe had insufficient balance)
- **Fix Deployed**: ✅ `distribute-escrow-funds` now accepts `transfer_failed` status
- **Next Step**: Trigger the retry

---

## Option 1: Automatic Retry via Cron Job (RECOMMENDED)

The `retry-failed-transfers` function runs automatically and will pick up this transaction on its next run.

**How to trigger it manually:**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/znncfayiwfamujvrprvf/functions

2. Find the `retry-failed-transfers` function

3. Click "Invoke" with an empty request body: `{}`

4. The function will:
   - Find all `transfer_failed` transactions
   - Call `distribute-escrow-funds` for each one
   - Report success/failure counts

**Expected Output:**
```json
{
  "success": true,
  "found": 1,
  "retried": 1,
  "succeeded": 1,
  "still_failing": 0
}
```

---

## Option 2: Manual Retry via SQL + Function Call

If you prefer more control, you can manually trigger the specific transaction:

### Step 1: Find the Transaction ID

Run this query in Supabase SQL Editor:

```sql
SELECT
  id,
  message_id,
  amount,
  currency,
  status,
  sender_email,
  recipient_user_id,
  created_at
FROM escrow_transactions
WHERE sender_email = 'devilpepito@hotmail.fr'
  AND status = 'transfer_failed'
ORDER BY created_at DESC
LIMIT 1;
```

Copy the `id` value (it will look like a UUID).

### Step 2: Verify Response Was Received

```sql
SELECT
  et.id as transaction_id,
  mr.has_response,
  mr.response_received_at,
  ert.received_at as email_received_at
FROM escrow_transactions et
LEFT JOIN message_responses mr ON mr.escrow_transaction_id = et.id
LEFT JOIN email_response_tracking ert ON ert.message_id = et.message_id
WHERE et.sender_email = 'devilpepito@hotmail.fr'
  AND et.status = 'transfer_failed';
```

Make sure `has_response = true`.

### Step 3: Verify Recipient's Stripe Connect

```sql
SELECT
  et.id as transaction_id,
  p.stripe_account_id,
  p.stripe_onboarding_completed
FROM escrow_transactions et
LEFT JOIN profiles p ON p.id = et.recipient_user_id
WHERE et.sender_email = 'devilpepito@hotmail.fr'
  AND et.status = 'transfer_failed';
```

Make sure `stripe_onboarding_completed = true`.

### Step 4: Invoke the Function

Go to Supabase Dashboard → Edge Functions → `distribute-escrow-funds` → Click "Invoke"

Use this JSON body (replace `YOUR_TRANSACTION_ID` with the actual ID):

```json
{
  "escrowTransactionId": "YOUR_TRANSACTION_ID"
}
```

### Step 5: Verify Success

```sql
SELECT
  id,
  status,
  amount,
  sender_email,
  updated_at
FROM escrow_transactions
WHERE sender_email = 'devilpepito@hotmail.fr'
ORDER BY created_at DESC
LIMIT 1;
```

Expected result: `status = 'released'`

---

## What If It Fails Again?

If the transfer fails again, check:

1. **Stripe Balance**: Go to Stripe Dashboard → Balance
   - Ensure you have at least €1.50 available
   - Check that auto-payouts are disabled (or scheduled for later)

2. **Recipient's Stripe Connect**: Verify onboarding is complete
   ```sql
   SELECT stripe_account_id, stripe_onboarding_completed
   FROM profiles
   WHERE id = (SELECT recipient_user_id FROM escrow_transactions WHERE sender_email = 'devilpepito@hotmail.fr' LIMIT 1);
   ```

3. **Check Function Logs**: Go to Supabase Dashboard → Edge Functions → `distribute-escrow-funds` → Logs
   - Look for error messages
   - Common issues: insufficient funds, invalid Stripe Connect account, network errors

---

## Monitoring Future Issues

To prevent this from happening again:

### 1. Set Up Stripe Alerts

In Stripe Dashboard → Settings → Notifications:
- Enable "Low balance" alerts (set threshold to €100)
- Enable "Transfer failed" notifications

### 2. Monitor Stuck Transactions

Run this query weekly:

```sql
SELECT
  id,
  sender_email,
  amount,
  status,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_stuck
FROM escrow_transactions
WHERE status = 'transfer_failed'
ORDER BY updated_at ASC;
```

Any transaction stuck for >24 hours needs investigation.

### 3. Check Cron Job Health

Verify `retry-failed-transfers` is running:

```sql
SELECT *
FROM admin_actions
WHERE action_type = 'retry_failed_transfers'
ORDER BY created_at DESC
LIMIT 10;
```

Should see entries every 30 minutes (if configured as cron job).

---

## Summary

**Immediate Action**: Go to Supabase Dashboard and manually invoke `retry-failed-transfers` function.

**Expected Outcome**: Transaction status changes from `transfer_failed` to `released`, and €1.13 (75%) is transferred to recipient's Stripe Connect account.

**If Issues Persist**: Check the detailed documentation files created by the investigation agents:
- [ESCROW_STATUS_AUDIT_REPORT.md](ESCROW_STATUS_AUDIT_REPORT.md)
- [TRANSACTION-STATUS-ANALYSIS.md](TRANSACTION-STATUS-ANALYSIS.md)
- [PROPOSED-FIX-transfer-failed.md](PROPOSED-FIX-transfer-failed.md)
