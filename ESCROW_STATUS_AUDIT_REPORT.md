# Escrow Transaction Status Audit Report

**Date**: 2025-12-10
**Critical Issue**: Transaction stuck in `transfer_failed` status with no automatic recovery
**Impact**: High - Funds captured but not distributed, manual intervention required

---

## Executive Summary

This audit identified a **critical gap in error recovery** for the `transfer_failed` status. While the system correctly marks transactions as `transfer_failed` when Stripe transfers fail, the recovery mechanisms have significant limitations:

1. **`retry-failed-transfers` function exists but:**
   - Only retries `distribute-escrow-funds` which expects `held` status
   - Does NOT reset status from `transfer_failed` to `held` before retry
   - Will fail immediately due to atomic lock in `distribute-escrow-funds`

2. **`distribute-escrow-funds` has a fatal flaw:**
   - Uses atomic lock: `UPDATE ... WHERE status = 'held'`
   - Transactions in `transfer_failed` status cannot be retried via this function
   - No alternative code path for retry logic

3. **`check-escrow-timeouts` could accidentally refund:**
   - Currently only processes `held` status (safe)
   - But if extended to other statuses, could refund `transfer_failed` transactions

---

## Database Schema: Allowed Status Values

From migration `20251114124736_add_missing_escrow_statuses.sql`:

```sql
CHECK (status IN (
  'pending',            -- Initial state (not currently used)
  'held',               -- Funds held in escrow, awaiting response
  'processing',         -- Being processed by distribute-escrow-funds (atomic lock)
  'released',           -- Funds distributed to recipient
  'refunded',           -- No response, funds refunded to sender
  'failed',             -- Payment failed (used as 'payment_failed' in code)
  'pending_user_setup', -- Response received but recipient hasn't configured Stripe
  'transfer_failed'     -- Stripe transfer to recipient failed (needs retry)
))
```

**Inconsistency Found**: Code uses `payment_failed` but schema allows `failed` (see stripe-connect-webhook.ts:148)

---

## Complete Function Audit

### 1. **distribute-escrow-funds** (Critical Path)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/distribute-escrow-funds/index.ts`

**Status Reads**:
- Line 31: `WHERE status = 'held'` - Atomic lock, only processes `held` status

**Status Writes**:
- Line 27: `status = 'processing'` - Atomic lock during processing
- Line 77: `status = 'held'` - Rollback on PaymentIntent retrieval error
- Line 95: `status = 'held'` - Rollback if payment not succeeded
- Line 133: `status = 'released'` - Success, transfer completed
- Line 146: `status = 'transfer_failed'` - Transfer failed, marked for retry
- Line 173: `status = 'pending_user_setup'` - No Stripe account configured

**Error Handling**:
- Lines 73-82: Rollback to `held` on PaymentIntent error (GOOD)
- Lines 92-100: Rollback to `held` if payment not succeeded (GOOD)
- Lines 137-164: Marks as `transfer_failed` on Stripe transfer error (PROBLEM)

**Critical Issue**:
- When transfer fails (line 146), sets `status = 'transfer_failed'`
- Returns 500 error but does NOT rollback to `held`
- Subsequent calls to `distribute-escrow-funds` will fail atomic lock (line 31)
- **NO CODE PATH TO RETRY `transfer_failed` TRANSACTIONS**

**Retry Logic**: None for `transfer_failed`

---

### 2. **retry-failed-transfers** (Supposed Recovery Function)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/retry-failed-transfers/index.ts`

**Status Reads**:
- Line 24: `WHERE status = 'transfer_failed'` - Correctly finds failed transfers

**Status Writes**: None - delegates to `distribute-escrow-funds`

**Logic**:
- Lines 21-26: Queries for `transfer_failed` transactions
- Lines 44-48: Calls `distribute-escrow-funds` directly
- Lines 54-62: Logs success/failure

**Critical Flaw**:
- Calls `distribute-escrow-funds` which expects `status = 'held'` (line 31)
- Does NOT reset status from `transfer_failed` to `held` before retry
- **WILL FAIL 100% OF THE TIME** due to atomic lock mismatch

**Recommendation**: This function needs to reset status to `held` before calling distribute

---

### 3. **process-pending-transfers** (For `pending_user_setup`)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/process-pending-transfers/index.ts`

**Status Reads**:
- Line 28: `WHERE status = 'pending_user_setup'` - Correctly targets pending setup

**Status Writes**: None - delegates to `distribute-escrow-funds`

**Logic**:
- Works correctly for `pending_user_setup` because:
  - User completes Stripe Connect setup
  - `stripe-connect-webhook` triggers this function (line 123)
  - But `distribute-escrow-funds` expects `held`, not `pending_user_setup`

**Problem**: Same as retry-failed-transfers - needs to reset status to `held` before retry

---

### 4. **check-escrow-timeouts** (Refund Logic)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/check-escrow-timeouts/index.ts`

**Status Reads**:
- Line 28: `WHERE status = 'held'` - ONLY processes held transactions (SAFE)

**Status Writes**:
- Line 183: `status = 'refunded'` - Missing PaymentIntent (test data cleanup)
- Line 247: `status = 'refunded'` - Expired transaction refunded

**Error Handling**:
- Lines 104-118: Grace period check - calls `distribute-escrow-funds` if response within 15min
- Lines 169-194: Missing PaymentIntent - marks as refunded (safe for test data)

**Assessment**:
- Currently SAFE - only processes `held` status
- Will NOT accidentally refund `transfer_failed` transactions
- Grace period logic is sound

---

### 5. **mark-response-received** (Trigger Distribution)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/mark-response-received/index.ts`

**Status Reads**: None (reads from `message_responses`)

**Status Writes**: None - delegates to `distribute-escrow-funds`

**Logic**:
- Lines 23-35: Updates `message_responses` table
- Lines 38-42: Calls `distribute-escrow-funds`
- Lines 44-52: Continues even if distribution fails

**Assessment**: Correctly handles response marking, delegates distribution

---

### 6. **postmark-inbound-webhook** (Email Response Detection)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/postmark-inbound-webhook/index.ts`

**Status Reads**:
- Line 169: `WHERE status = 'held'` - Only processes active escrows

**Status Writes**: None - delegates to `mark-response-received`

**Logic**:
- Lines 134-146: Queries for transaction by message_id
- Lines 168-179: Verifies status is `held`
- Lines 183-233: Grace period validation
- Lines 287-301: Calls `mark-response-received`

**Assessment**: Correctly validates status before processing

---

### 7. **stripe-connect-webhook** (Stripe Events)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/stripe-connect-webhook/index.ts`

**Status Reads**: None

**Status Writes**:
- Line 148: `status = 'payment_failed'` - Payment failed (INCONSISTENT with schema)
- Line 172: `status = 'transfer_failed'` - Transfer failed event

**Logic**:
- Lines 141-153: `payment_intent.payment_failed` event
- Lines 161-195: `transfer.failed` event - marks transaction and creates admin alert
- Lines 198-219: `transfer.reversed` event - creates admin alert

**Inconsistency**: Uses `payment_failed` but schema defines `failed`

**Assessment**: Correctly detects transfer failures and creates alerts

---

### 8. **process-escrow-payment** (Initial Transaction Creation)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/process-escrow-payment/index.ts`

**Status Reads**: None

**Status Writes**:
- Line 102: `status = 'held'` - Initial transaction creation

**Assessment**: Correctly creates transaction in `held` status

---

### 9. **send-deadline-reminders** (Reminder Emails)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/send-deadline-reminders/index.ts`

**Status Reads**:
- Line 172: `WHERE status = 'held'` - Only reminds for active escrows

**Status Writes**: None

**Assessment**: Correctly targets active transactions only

---

### 10. **escrow-health-check** (Monitoring)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/escrow-health-check/index.ts`

**Status Reads**:
- Lines 12-15: Aggregates all transactions by status
- Line 29: `WHERE status = 'held'` - Near-timeout check
- Line 35: `WHERE status = 'pending_user_setup'` - Pending setup check

**Status Writes**: None (read-only)

**Assessment**: Provides visibility into all statuses

---

### 11. **daily-reconciliation** (Audit Report)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/daily-reconciliation/index.ts`

**Status Reads**:
- Lines 33-37: Queries all transactions for date range
- Lines 42-62: Aggregates by status including `transfer_failed`

**Status Writes**: None (read-only)

**Alert Logic**:
- Lines 70-71: Alerts if `transfer_failed` count > 0
- Lines 74-75: Alerts if `processing` count > 0 (stuck transactions)

**Assessment**: Correctly identifies problem statuses

---

### 12. **admin-analytics** (Reporting)

**File**: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/supabase/functions/admin-analytics/index.ts`

**Status Reads**:
- Lines 57-59: Queries all transactions
- Lines 88-89: Filters `status = 'released'` for revenue
- Line 168: `status = 'held'` for pending count
- Line 169: `status = 'refunded'` for refund metrics

**Status Writes**: None (read-only)

**Assessment**: Read-only reporting function

---

## Status Transition Map

```
Initial Payment:
  [none] → held (process-escrow-payment)

Response Received Path:
  held → processing (distribute-escrow-funds, atomic lock)
    ├→ released (transfer succeeded)
    ├→ transfer_failed (transfer failed, NO RETRY PATH)
    ├→ pending_user_setup (no Stripe account)
    └→ held (rollback on error)

No Response Path:
  held → refunded (check-escrow-timeouts)

Payment Failure:
  held → payment_failed (stripe-connect-webhook)

User Completes Setup:
  pending_user_setup → ??? (process-pending-transfers calls distribute-escrow-funds)
    └→ PROBLEM: distribute-escrow-funds expects 'held', not 'pending_user_setup'

Transfer Retry:
  transfer_failed → ??? (retry-failed-transfers calls distribute-escrow-funds)
    └→ PROBLEM: distribute-escrow-funds expects 'held', not 'transfer_failed'
```

---

## Critical Gaps Identified

### Gap 1: `transfer_failed` Recovery (CRITICAL)

**Problem**: No valid code path to retry failed transfers

**Root Cause**:
1. `distribute-escrow-funds` line 31: `WHERE status = 'held'` (atomic lock)
2. `distribute-escrow-funds` line 146: Sets `status = 'transfer_failed'` on error
3. `retry-failed-transfers` calls `distribute-escrow-funds` without resetting status

**Impact**: Transactions stuck forever, funds captured but not distributed

**Fix Required**:
```typescript
// Option A: Reset status in retry-failed-transfers BEFORE calling distribute
await supabase
  .from('escrow_transactions')
  .update({ status: 'held' })
  .eq('id', transaction.id)
  .eq('status', 'transfer_failed')

// Then call distribute-escrow-funds

// Option B: Add separate retry path in distribute-escrow-funds
.update({ status: 'processing' })
.eq('id', escrowTransactionId)
.in('status', ['held', 'transfer_failed', 'pending_user_setup'])
```

---

### Gap 2: `pending_user_setup` Recovery (HIGH)

**Problem**: Same as Gap 1 - `process-pending-transfers` calls `distribute-escrow-funds` which expects `held`

**Root Cause**: Atomic lock mismatch

**Fix Required**: Reset status to `held` before calling distribute

---

### Gap 3: Status Value Inconsistency (MEDIUM)

**Problem**: Code uses `payment_failed` but schema defines `failed`

**Location**: `stripe-connect-webhook.ts` line 148

**Fix Required**: Change to `failed` to match schema constraint

---

### Gap 4: No Manual Recovery Endpoint (HIGH)

**Problem**: No admin function to manually trigger retry with status reset

**Impact**: Requires direct database manipulation for recovery

**Fix Required**: Create admin endpoint to safely retry with status reset

---

## Current Transaction State Analysis

To check for stuck transactions, run:

```sql
-- Find all transfer_failed transactions
SELECT
  id,
  message_id,
  amount,
  recipient_user_id,
  sender_email,
  status,
  created_at,
  updated_at,
  expires_at,
  stripe_payment_intent_id
FROM escrow_transactions
WHERE status = 'transfer_failed'
ORDER BY updated_at DESC;

-- Check if Stripe has the funds
SELECT
  id,
  status,
  amount,
  (amount * 0.75) as recipient_amount,
  (amount * 0.25) as platform_fee,
  created_at,
  updated_at
FROM escrow_transactions
WHERE status = 'transfer_failed';

-- Find pending_user_setup that might be stuck
SELECT
  id,
  status,
  amount,
  recipient_user_id,
  created_at,
  updated_at
FROM escrow_transactions
WHERE status = 'pending_user_setup'
AND created_at < NOW() - INTERVAL '7 days';
```

---

## Recommended Fixes (Priority Order)

### Priority 1: Fix retry-failed-transfers (CRITICAL)

**File**: `supabase/functions/retry-failed-transfers/index.ts`

**Change Required** (lines 39-71):
```typescript
for (const transaction of failedTransactions) {
  try {
    console.log(`Retrying transfer for transaction ${transaction.id}`)

    // CRITICAL FIX: Reset status to 'held' before calling distribute-escrow-funds
    const { error: resetError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)
      .eq('status', 'transfer_failed') // Atomic check

    if (resetError) {
      console.error(`Failed to reset status for ${transaction.id}:`, resetError)
      failedCount++
      continue
    }

    // Now safe to invoke distribute-escrow-funds
    const { data, error: retryError } = await supabase.functions.invoke(
      'distribute-escrow-funds',
      { body: { escrowTransactionId: transaction.id } }
    )

    retriedCount++

    if (retryError) {
      console.error(`Retry failed for ${transaction.id}:`, retryError)
      failedCount++
    } else if (data?.success === false) {
      console.error(`Transfer still failing for ${transaction.id}:`, data.error)
      failedCount++
    } else {
      console.log(`✅ Transfer succeeded for ${transaction.id}`)
      successCount++
    }

    // Small delay between retries to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000))

  } catch (retryError) {
    console.error(`Error retrying transaction ${transaction.id}:`, retryError)
    failedCount++
  }
}
```

---

### Priority 2: Fix process-pending-transfers (HIGH)

**File**: `supabase/functions/process-pending-transfers/index.ts`

**Change Required** (lines 46-64):
```typescript
for (const transaction of pendingTransactions) {
  try {
    // CRITICAL FIX: Reset status to 'held' before calling distribute-escrow-funds
    const { error: resetError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)
      .eq('status', 'pending_user_setup') // Atomic check

    if (resetError) {
      console.error(`Failed to reset status for ${transaction.id}:`, resetError)
      errorCount++
      continue
    }

    // Déclencher distribution maintenant que Stripe est configuré
    const { error: distributeError } = await supabase.functions.invoke('distribute-escrow-funds', {
      body: { escrowTransactionId: transaction.id }
    })

    if (distributeError) {
      console.error(`Failed to process transaction ${transaction.id}:`, distributeError)
      errorCount++
    } else {
      console.log(`Successfully processed transaction ${transaction.id}`)
      processedCount++
    }
  } catch (error) {
    console.error(`Error processing transaction ${transaction.id}:`, error)
    errorCount++
  }
}
```

---

### Priority 3: Fix status value inconsistency (MEDIUM)

**File**: `supabase/functions/stripe-connect-webhook/index.ts`

**Change Required** (line 148):
```typescript
// Change from:
status: 'payment_failed',

// To:
status: 'failed',
```

---

### Priority 4: Create manual recovery endpoint (HIGH)

**New File**: `supabase/functions/admin-retry-transaction/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactionId } = await req.json()

    if (!transactionId) {
      throw new Error('transactionId required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin access (implement your auth check here)
    // const { data: { user } } = await supabase.auth.getUser(req.headers.get('authorization'))
    // if (!user?.is_admin) throw new Error('Admin access required')

    // Get current transaction state
    const { data: transaction, error: fetchError } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (fetchError || !transaction) {
      throw new Error('Transaction not found')
    }

    console.log(`Admin retry request for transaction ${transactionId}`, {
      current_status: transaction.status,
      amount: transaction.amount,
      recipient: transaction.recipient_user_id
    })

    // Only allow retry for certain statuses
    const retryableStatuses = ['transfer_failed', 'pending_user_setup', 'processing']
    if (!retryableStatuses.includes(transaction.status)) {
      throw new Error(`Cannot retry transaction in status: ${transaction.status}`)
    }

    // Reset to 'held' status (atomic)
    const { error: resetError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('status', transaction.status) // Atomic check - only update if status unchanged

    if (resetError) {
      throw new Error(`Failed to reset status: ${resetError.message}`)
    }

    console.log(`✅ Status reset to 'held' for transaction ${transactionId}`)

    // Trigger distribution
    const { data: distributeResult, error: distributeError } = await supabase.functions.invoke(
      'distribute-escrow-funds',
      { body: { escrowTransactionId: transactionId } }
    )

    if (distributeError) {
      throw new Error(`Distribution failed: ${distributeError.message}`)
    }

    // Log admin action
    await supabase.from('admin_actions').insert({
      action_type: 'manual_retry_transaction',
      description: `Manually retried transaction ${transactionId}`,
      metadata: {
        transaction_id: transactionId,
        previous_status: transaction.status,
        amount: transaction.amount,
        recipient_user_id: transaction.recipient_user_id,
        distribute_result: distributeResult
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        previous_status: transaction.status,
        new_status: distributeResult?.status || 'check database',
        distribute_result: distributeResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Admin retry error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
```

---

## Testing Strategy

After implementing fixes:

1. **Test retry-failed-transfers**:
```bash
# Manually set a transaction to transfer_failed
UPDATE escrow_transactions
SET status = 'transfer_failed'
WHERE id = 'test-transaction-id';

# Call retry function
curl -X POST https://your-project.supabase.co/functions/v1/retry-failed-transfers \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Verify status changed to 'released'
SELECT status FROM escrow_transactions WHERE id = 'test-transaction-id';
```

2. **Test process-pending-transfers**:
```bash
# Similar test for pending_user_setup status
```

3. **Monitor with daily-reconciliation**:
```bash
# Check for lingering transfer_failed or processing statuses
SELECT status, count(*), sum(amount)
FROM escrow_transactions
WHERE status IN ('transfer_failed', 'processing', 'pending_user_setup')
GROUP BY status;
```

---

## Immediate Action Required

For the current stuck transaction:

```sql
-- Verify transaction state
SELECT * FROM escrow_transactions WHERE status = 'transfer_failed';

-- Check if PaymentIntent succeeded in Stripe
-- (Use Stripe Dashboard or API)

-- If funds are in platform account, manually reset and retry:
UPDATE escrow_transactions
SET status = 'held', updated_at = NOW()
WHERE id = 'YOUR_TRANSACTION_ID'
AND status = 'transfer_failed';

-- Then invoke distribute-escrow-funds via Supabase dashboard or:
-- Call the function manually through Supabase Functions UI
```

---

## Long-Term Recommendations

1. **Add Status Validation**: Create database function to validate status transitions
2. **Add Metrics**: Track time spent in each status
3. **Add Alerting**: Alert on transactions stuck in `processing` > 5 minutes
4. **Add Circuit Breaker**: Prevent distribute-escrow-funds from running if platform balance insufficient
5. **Add Audit Trail**: Log all status transitions to separate table
6. **Add Retry Backoff**: Exponential backoff for retry-failed-transfers
7. **Add Health Check**: Include `transfer_failed` count in escrow-health-check alerts

---

## Summary

**Critical Findings**:
1. `retry-failed-transfers` is broken - will never succeed due to atomic lock mismatch
2. `process-pending-transfers` has same issue
3. No manual recovery mechanism exists
4. Status value inconsistency (`payment_failed` vs `failed`)

**Impact**: Funds can be stuck indefinitely after Stripe transfer failures

**Recommended Action**: Implement Priority 1 and Priority 2 fixes immediately, then deploy Priority 4 for manual recovery capability.

**Files to Modify**:
1. `supabase/functions/retry-failed-transfers/index.ts` (CRITICAL)
2. `supabase/functions/process-pending-transfers/index.ts` (HIGH)
3. `supabase/functions/stripe-connect-webhook/index.ts` (MEDIUM)
4. Create `supabase/functions/admin-retry-transaction/index.ts` (HIGH)
