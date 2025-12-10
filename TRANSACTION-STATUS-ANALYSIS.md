# Transaction Status Analysis: transfer_failed Issue

**Date:** 2025-12-10
**Issue:** Transaction stuck in `transfer_failed` status cannot be automatically retried
**Impact:** Critical - Funds captured but not distributed to recipient

---

## Executive Summary

**CRITICAL BUG IDENTIFIED:** The `distribute-escrow-funds` function has an atomic lock that only processes transactions with `status = 'held'`. This means transactions that failed transfer and are in `transfer_failed` status **CANNOT be retried** even when Stripe Connect is now ready.

The `retry-failed-transfers` function attempts to call `distribute-escrow-funds`, but this will always fail because the atomic lock (line 31 in distribute-escrow-funds) rejects any transaction not in `held` status.

---

## All Transaction Status Values

Based on schema analysis (migration `20251114124736_add_missing_escrow_statuses.sql`):

| Status | Description | Usage |
|--------|-------------|-------|
| `pending` | Initial state (not currently used) | Not actively used in codebase |
| `held` | Funds in escrow, awaiting response | Default after payment capture |
| `processing` | Being distributed (atomic lock) | Temporary state during distribution |
| `released` | Funds distributed to recipient | Final success state |
| `refunded` | No response, refunded to sender | Final timeout state |
| `failed` | Payment failed | Payment processing error |
| `pending_user_setup` | Response received, but recipient hasn't configured Stripe Connect | Waiting for Stripe onboarding |
| `transfer_failed` | Stripe transfer to recipient failed (needs retry) | **PROBLEM STATUS** |

---

## Edge Functions and Status Handling

### Functions That Read Transaction Status

| Function | Status Query | Line | Purpose |
|----------|-------------|------|---------|
| `distribute-escrow-funds` | `.eq('status', 'held')` | 31 | **ATOMIC LOCK** - Only processes 'held' |
| `retry-failed-transfers` | `.eq('status', 'transfer_failed')` | 24 | Finds failed transfers to retry |
| `process-pending-transfers` | `.eq('status', 'pending_user_setup')` | 28 | Processes transfers after Stripe setup |
| `check-escrow-timeouts` | `.eq('status', 'held')` | 28 | Finds expired transactions to refund |
| `postmark-inbound-webhook` | `!== 'held'` | 169 | Rejects responses if not held |
| `send-deadline-reminders` | `.eq('status', 'held')` | 172 | Sends reminders for active escrow |
| `escrow-health-check` | `.eq('status', 'held')` | 29 | Monitors held transactions |
| `delete-user-account` | `.eq('status', 'pending_user_setup')` | 124 | Checks pending before deletion |

### Functions That Write Transaction Status

| Function | Status Written | Line | Condition |
|----------|---------------|------|-----------|
| `process-escrow-payment` | `'held'` | 102 | Initial transaction creation |
| `distribute-escrow-funds` | `'processing'` | 27 | Atomic lock acquired |
| `distribute-escrow-funds` | `'held'` | 77, 96 | Rollback on error |
| `distribute-escrow-funds` | `'released'` | 133 | Transfer succeeded |
| `distribute-escrow-funds` | `'transfer_failed'` | 146 | Transfer to recipient failed |
| `distribute-escrow-funds` | `'pending_user_setup'` | 173 | Recipient hasn't configured Stripe |
| `check-escrow-timeouts` | `'refunded'` | 247 | Transaction expired without response |

---

## Transaction Lifecycle Flow

```
Payment Page
    ↓
[process-escrow-payment]
    ↓
status = 'held'  (line 102)
    ↓
    ↓ ← Response received via webhook
    ↓
[mark-response-received]
    ↓
[distribute-escrow-funds]
    ↓
status = 'processing' (atomic lock, line 27)
    ↓
    ├─→ Stripe Connect not setup → status = 'pending_user_setup' (line 173)
    ├─→ Transfer fails → status = 'transfer_failed' (line 146)
    ├─→ Transfer succeeds → status = 'released' (line 133)
    └─→ Error → status = 'held' (rollback, lines 77, 96)
```

### Alternative Flow (No Response)

```
status = 'held'
    ↓
    ↓ ← Deadline expires
    ↓
[check-escrow-timeouts] (cron every 10 min)
    ↓
status = 'refunded' (line 247)
```

---

## The Critical Bug

### Problem Description

1. Transaction is created with `status = 'held'`
2. Response is received, `distribute-escrow-funds` is called
3. Transfer to recipient fails (insufficient Stripe balance)
4. Transaction is marked `status = 'transfer_failed'` (line 146)
5. **NOW STUCK**: `retry-failed-transfers` tries to call `distribute-escrow-funds`
6. **BUG**: `distribute-escrow-funds` ONLY accepts `status = 'held'` (line 31)
7. **Result**: Retry fails immediately, transaction never processes

### Code Evidence

**distribute-escrow-funds/index.ts (lines 24-43):**
```typescript
// 1. ATOMIC LOCK: Claim transaction before any Stripe operations
const { data: lockedTransaction, error: lockError } = await supabase
  .from('escrow_transactions')
  .update({
    status: 'processing',
    updated_at: new Date().toISOString()
  })
  .eq('id', escrowTransactionId)
  .eq('status', 'held')  // ← ONLY ACCEPTS 'held' STATUS
  .select(`
    *,
    profiles!escrow_transactions_recipient_user_id_fkey(
      stripe_account_id,
      stripe_onboarding_completed
    )
  `)
  .single()

if (lockError || !lockedTransaction) {
  throw new Error(`Transaction already processing or not in held status: ${lockError?.message || 'Not found'}`)
}
```

**retry-failed-transfers/index.ts (lines 21-49):**
```typescript
// Find all transactions that failed transfer
const { data: failedTransactions, error } = await supabase
  .from('escrow_transactions')
  .select('*')
  .eq('status', 'transfer_failed')  // ← Finds failed transactions
  .order('updated_at', { ascending: true })
  .limit(10)

for (const transaction of failedTransactions) {
  // Invoke distribute-escrow-funds to retry the transfer
  const { data, error: retryError } = await supabase.functions.invoke(
    'distribute-escrow-funds',
    {
      body: { escrowTransactionId: transaction.id }
    }
  )
  // ← THIS WILL ALWAYS FAIL because status is 'transfer_failed', not 'held'
}
```

---

## SQL Investigation Queries

I've created a comprehensive SQL investigation script at:
`/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/investigate-transfer-failed.sql`

### Key Queries

1. **Find specific transaction** (sender: devilpepito@hotmail.fr, ~12/1/2025)
2. **Count all transactions by status**
3. **Find ALL non-standard statuses**
4. **Check message_responses records for failed transactions**
5. **Verify recipient Stripe Connect status**
6. **Check email_response_tracking for webhook evidence**
7. **Comprehensive lifecycle audit**
8. **Data integrity checks**

---

## Recommended Solutions

### Immediate Fix (Manual Retry)

Since sufficient funds are now available, manually retry the specific transaction:

**Option 1: Reset to 'held' and retry**
```sql
-- STEP 1: Find the transaction ID
SELECT id, status, amount, sender_email, recipient_user_id
FROM escrow_transactions
WHERE sender_email = 'devilpepito@hotmail.fr'
  AND status = 'transfer_failed'
  AND created_at >= '2025-11-28'::timestamp
  AND created_at <= '2025-12-05'::timestamp;

-- STEP 2: Reset status to 'held' (ONLY if Stripe Connect is ready)
UPDATE escrow_transactions
SET
  status = 'held',
  updated_at = NOW()
WHERE id = 'REPLACE_WITH_ACTUAL_TRANSACTION_ID'
  AND status = 'transfer_failed';

-- STEP 3: Call distribute-escrow-funds via Edge Function
-- supabase.functions.invoke('distribute-escrow-funds', {
--   escrowTransactionId: 'REPLACE_WITH_ACTUAL_TRANSACTION_ID'
-- })
```

**Option 2: Create dedicated retry endpoint**
Create a new Edge Function that resets status before retrying.

### Permanent Fix (Code Changes Required)

**Fix 1: Modify distribute-escrow-funds to accept multiple statuses**

```typescript
// BEFORE (line 31):
.eq('status', 'held')

// AFTER:
.in('status', ['held', 'transfer_failed'])
```

**Fix 2: Add separate retry logic in distribute-escrow-funds**

```typescript
// After line 31, add:
if (!lockedTransaction) {
  // Try 'transfer_failed' status as a retry
  const { data: retryTransaction, error: retryError } = await supabase
    .from('escrow_transactions')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString()
    })
    .eq('id', escrowTransactionId)
    .eq('status', 'transfer_failed')  // Retry failed transfers
    .select(`
      *,
      profiles!escrow_transactions_recipient_user_id_fkey(
        stripe_account_id,
        stripe_onboarding_completed
      )
    `)
    .single()

  if (retryError || !retryTransaction) {
    throw new Error(`Transaction not found or invalid status`)
  }

  lockedTransaction = retryTransaction
}
```

**Fix 3: Create automated retry cron job**

Add to GitHub Actions cron jobs:
```yaml
- name: Retry Failed Transfers
  cron: '*/30 * * * *'  # Every 30 minutes
  run: |
    supabase functions invoke retry-failed-transfers
```

---

## Status Mismatch Scenarios

### Scenario 1: Transfer Failed, Stripe Now Ready
- **Current State:** `status = 'transfer_failed'`
- **Desired State:** `status = 'released'`
- **Blocker:** distribute-escrow-funds rejects non-'held' status
- **Solution:** Reset to 'held' OR modify function to accept 'transfer_failed'

### Scenario 2: Pending User Setup, User Completes Setup
- **Current State:** `status = 'pending_user_setup'`
- **Desired State:** `status = 'released'`
- **Handler:** `process-pending-transfers` function (works correctly)
- **Status:** NO BUG - This flow works

### Scenario 3: Processing Stuck (Crashed During Distribution)
- **Current State:** `status = 'processing'`
- **Desired State:** `status = 'released'` OR `status = 'held'` (retry)
- **Blocker:** No automatic recovery mechanism
- **Solution:** Add health check to detect stuck 'processing' > 1 hour

---

## Data Integrity Checks

Run these queries to find potential issues:

```sql
-- Stuck in 'processing' for > 1 hour
SELECT *
FROM escrow_transactions
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '1 hour';

-- 'transfer_failed' with Stripe now ready
SELECT et.*, p.stripe_onboarding_completed
FROM escrow_transactions et
JOIN profiles p ON p.id = et.recipient_user_id
WHERE et.status = 'transfer_failed'
  AND p.stripe_onboarding_completed = true;

-- 'pending_user_setup' with Stripe now ready
SELECT et.*, p.stripe_onboarding_completed
FROM escrow_transactions et
JOIN profiles p ON p.id = et.recipient_user_id
WHERE et.status = 'pending_user_setup'
  AND p.stripe_onboarding_completed = true;

-- 'held' past expiration (should be refunded)
SELECT *
FROM escrow_transactions
WHERE status = 'held'
  AND expires_at < NOW() - INTERVAL '15 minutes';  -- Grace period
```

---

## Testing After Fix

After implementing the fix, test the following scenarios:

1. **Transfer Failed Retry:**
   - Create transaction with status = 'transfer_failed'
   - Ensure recipient has Stripe Connect configured
   - Call `distribute-escrow-funds` or `retry-failed-transfers`
   - Verify status changes to 'released'

2. **Insufficient Funds:**
   - Create transaction, trigger transfer with empty Stripe balance
   - Verify status = 'transfer_failed'
   - Fund Stripe account
   - Call retry, verify success

3. **Concurrent Retries:**
   - Create multiple 'transfer_failed' transactions
   - Call `retry-failed-transfers`
   - Verify atomic locking prevents double-processing

4. **Edge Cases:**
   - 'processing' stuck > 1 hour
   - 'pending_user_setup' completed Stripe setup
   - 'held' past deadline with no response

---

## Monitoring Recommendations

### Add to `escrow-health-check` Function

```typescript
// Check for stuck 'transfer_failed' transactions
const { count: failedCount } = await supabase
  .from('escrow_transactions')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'transfer_failed')
  .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

if (failedCount > 0) {
  health.status = 'warning'
  health.warnings.push(`${failedCount} transfers failed > 24h ago`)
}

// Check for stuck 'processing' transactions
const { count: processingCount } = await supabase
  .from('escrow_transactions')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'processing')
  .lt('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

if (processingCount > 0) {
  health.status = 'critical'
  health.errors.push(`${processingCount} transactions stuck in processing`)
}
```

---

## Conclusion

**Root Cause:** The atomic locking mechanism in `distribute-escrow-funds` is too restrictive, only accepting `status = 'held'`. This prevents retrying failed transfers.

**Immediate Action:** Manually reset the specific transaction (devilpepito@hotmail.fr) to `status = 'held'` and retry distribution.

**Long-term Fix:** Modify `distribute-escrow-funds` to accept both `'held'` and `'transfer_failed'` statuses in the atomic lock query.

**Monitoring:** Add health checks for `'transfer_failed'` and stuck `'processing'` transactions.

---

**Files Modified:**
- `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/investigate-transfer-failed.sql` (Investigation queries)
- `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/TRANSACTION-STATUS-ANALYSIS.md` (This document)

**Files to Modify:**
- `supabase/functions/distribute-escrow-funds/index.ts` (Line 31 - Add 'transfer_failed' to atomic lock)
- `supabase/functions/escrow-health-check/index.ts` (Add monitoring for stuck statuses)
- `.github/workflows/cron-jobs.yml` (Add automated retry cron)
