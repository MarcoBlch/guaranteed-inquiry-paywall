# Quick Reference: transfer_failed Status Issue

**Date:** 2025-12-10
**Status:** CRITICAL BUG IDENTIFIED
**Affected:** Transaction for devilpepito@hotmail.fr (€1.50, ~12/1/2025)

---

## The Problem (In 3 Sentences)

1. A transaction is stuck with `status = 'transfer_failed'` because Stripe had insufficient balance
2. Now funds ARE available, but the retry function doesn't work
3. **Bug:** `distribute-escrow-funds` only accepts `status = 'held'`, not `status = 'transfer_failed'`

---

## All Transaction Statuses

| Status | Meaning | Who Sets It | Can Be Retried? |
|--------|---------|-------------|-----------------|
| `pending` | Initial (unused) | - | N/A |
| `held` | Awaiting response | `process-escrow-payment` | Via cron timeout |
| `processing` | Being distributed | `distribute-escrow-funds` | Automatic rollback |
| `released` | Success, paid out | `distribute-escrow-funds` | No (final) |
| `refunded` | No response, refunded | `check-escrow-timeouts` | No (final) |
| `failed` | Payment error | Various | Depends on error |
| `pending_user_setup` | Waiting for Stripe | `distribute-escrow-funds` | Via `process-pending-transfers` |
| `transfer_failed` | Transfer failed | `distribute-escrow-funds` | **BROKEN** |

---

## Edge Functions That Handle Status

| Function | Status Query | Action |
|----------|-------------|---------|
| `distribute-escrow-funds` | `.eq('status', 'held')` | **BUG: Rejects 'transfer_failed'** |
| `retry-failed-transfers` | `.eq('status', 'transfer_failed')` | Calls distribute (fails) |
| `process-pending-transfers` | `.eq('status', 'pending_user_setup')` | Works correctly |
| `check-escrow-timeouts` | `.eq('status', 'held')` | Refunds expired |

---

## Immediate Fix (Manual)

### Step 1: Find the Transaction
```sql
SELECT id, status, amount, sender_email, recipient_user_id
FROM escrow_transactions
WHERE sender_email = 'devilpepito@hotmail.fr'
  AND status = 'transfer_failed'
  AND created_at >= '2025-11-28'
  AND created_at <= '2025-12-05'
ORDER BY created_at DESC;
```

### Step 2: Verify Stripe is Ready
```sql
SELECT
  et.id,
  p.stripe_account_id,
  p.stripe_onboarding_completed,
  CASE
    WHEN p.stripe_onboarding_completed = true THEN 'READY'
    ELSE 'NOT_READY'
  END
FROM escrow_transactions et
JOIN profiles p ON p.id = et.recipient_user_id
WHERE et.id = 'TRANSACTION_ID_FROM_STEP_1';
```

### Step 3: Reset Status (ONLY if READY)
```sql
UPDATE escrow_transactions
SET status = 'held', updated_at = NOW()
WHERE id = 'TRANSACTION_ID_FROM_STEP_1'
  AND status = 'transfer_failed';
```

### Step 4: Retry Distribution
```javascript
// Via Supabase dashboard or code
const { data, error } = await supabase.functions.invoke('distribute-escrow-funds', {
  body: { escrowTransactionId: 'TRANSACTION_ID_FROM_STEP_1' }
})
```

### Step 5: Verify Success
```sql
SELECT id, status, updated_at
FROM escrow_transactions
WHERE id = 'TRANSACTION_ID_FROM_STEP_1';
-- Should show status = 'released'
```

---

## Permanent Fix (Code Change)

**File:** `supabase/functions/distribute-escrow-funds/index.ts`

**Change Line 31 from:**
```typescript
.eq('status', 'held')
```

**To:**
```typescript
.in('status', ['held', 'transfer_failed'])
```

**Update Error Message (Line 42):**
```typescript
throw new Error(`Transaction not available (must be 'held' or 'transfer_failed'): ${lockError?.message || 'Not found'}`)
```

**Deploy:**
```bash
npx supabase functions deploy distribute-escrow-funds
```

---

## SQL Investigation Queries

### Find ALL Stuck Transactions
```sql
-- Ready to retry (Stripe configured, response received)
SELECT et.id, et.status, et.amount, et.sender_email,
       p.stripe_onboarding_completed, mr.has_response
FROM escrow_transactions et
JOIN profiles p ON p.id = et.recipient_user_id
LEFT JOIN message_responses mr ON mr.escrow_transaction_id = et.id
WHERE et.status = 'transfer_failed'
  AND p.stripe_onboarding_completed = true
  AND mr.has_response = true;
```

### Find Stuck in Processing (>1 hour)
```sql
SELECT id, status, amount, updated_at,
       EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_stuck
FROM escrow_transactions
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '1 hour';
```

### Count by Status
```sql
SELECT status, COUNT(*) as count, SUM(amount) as total
FROM escrow_transactions
GROUP BY status
ORDER BY count DESC;
```

---

## Why retry-failed-transfers Doesn't Work

**Current Flow (Broken):**
```
retry-failed-transfers:
  Finds: status = 'transfer_failed' ✓
  Calls: distribute-escrow-funds(txnId)
    ↓
distribute-escrow-funds:
  Tries to lock: .eq('status', 'held')  ✗ (status is 'transfer_failed')
  Error: "Transaction not in held status"
    ↓
  FAILS
```

**Fixed Flow:**
```
retry-failed-transfers:
  Finds: status = 'transfer_failed' ✓
  Calls: distribute-escrow-funds(txnId)
    ↓
distribute-escrow-funds:
  Tries to lock: .in('status', ['held', 'transfer_failed'])  ✓
  Updates to: 'processing'
  Attempts transfer
    ↓
  SUCCESS: status = 'released'
```

---

## Files Created

1. **investigate-transfer-failed.sql** - Comprehensive SQL investigation queries
2. **TRANSACTION-STATUS-ANALYSIS.md** - Full technical analysis with all edge functions
3. **fix-transfer-failed-transaction.sql** - Step-by-step manual fix script
4. **PROPOSED-FIX-transfer-failed.md** - Code change proposal with testing plan
5. **QUICK-REFERENCE-transfer-failed.md** - This document (quick ref)

---

## Testing Checklist

After deploying the fix:

- [ ] Test normal flow (held → released)
- [ ] Test retry flow (transfer_failed → released)
- [ ] Test concurrent retries (no double-processing)
- [ ] Test invalid status rejection (security)
- [ ] Verify specific transaction (devilpepito@hotmail.fr)
- [ ] Monitor for 24 hours
- [ ] Check Stripe dashboard for transfers
- [ ] Verify no stuck 'processing' transactions

---

## Monitoring Alerts to Add

1. **transfer_failed > 24 hours**
   - Query: `status = 'transfer_failed' AND updated_at < NOW() - INTERVAL '24 hours'`
   - Action: Manual review required

2. **Stuck in processing > 1 hour**
   - Query: `status = 'processing' AND updated_at < NOW() - INTERVAL '1 hour'`
   - Action: Immediate investigation

3. **Held past deadline**
   - Query: `status = 'held' AND expires_at < NOW() - INTERVAL '15 minutes'`
   - Action: check-escrow-timeouts should have caught this

---

## Who to Contact

- **Database Issues:** Check RLS policies and Supabase logs
- **Stripe Issues:** Check Stripe Dashboard → Transfers
- **Email Issues:** Check Postmark Activity dashboard
- **Webhook Issues:** Check `email_response_tracking` table

---

## Key Takeaways

1. **Root Cause:** Atomic lock too restrictive (only 'held')
2. **Impact:** Cannot retry failed transfers automatically
3. **Fix:** One-line change to accept ['held', 'transfer_failed']
4. **Risk:** LOW (atomic lock still prevents race conditions)
5. **Timeline:** Can deploy immediately
6. **Workaround:** Manually reset status to 'held' before retry

---

**Next Steps:**
1. Run investigation queries to find the specific transaction
2. Apply manual fix to unblock the customer (devilpepito@hotmail.fr)
3. Deploy permanent code fix
4. Add monitoring alerts
5. Test thoroughly
6. Document in RUNBOOK.md
