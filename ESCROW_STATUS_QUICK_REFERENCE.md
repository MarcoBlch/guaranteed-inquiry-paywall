# Escrow Transaction Status - Quick Reference

## Status Values (from schema constraint)

| Status | Description | Duration | Recovery Path |
|--------|-------------|----------|---------------|
| `pending` | Initial state | N/A | Not currently used |
| `held` | Funds in escrow, awaiting response | Until deadline or response | Auto-refund by `check-escrow-timeouts` |
| `processing` | Atomic lock during distribution | < 30 seconds | Auto-rollback to `held` on error |
| `released` | Funds distributed successfully | Terminal | None needed |
| `refunded` | No response, funds returned | Terminal | None needed |
| `failed` | Payment failed | Terminal | None available |
| `pending_user_setup` | Awaiting Stripe Connect setup | Until user completes | `process-pending-transfers` (BROKEN) |
| `transfer_failed` | Stripe transfer failed | Until retry | `retry-failed-transfers` (BROKEN) |

## Function Status Matrix

| Function | Reads Status | Writes Status | Purpose |
|----------|--------------|---------------|---------|
| `process-escrow-payment` | None | `held` | Create initial transaction |
| `distribute-escrow-funds` | `held` (atomic lock) | `processing`, `released`, `transfer_failed`, `pending_user_setup`, `held` (rollback) | Distribute funds to recipient |
| `mark-response-received` | None | None (delegates) | Trigger distribution |
| `retry-failed-transfers` | `transfer_failed` | None (delegates) | Retry failed transfers (BROKEN) |
| `process-pending-transfers` | `pending_user_setup` | None (delegates) | Process after Stripe setup (BROKEN) |
| `check-escrow-timeouts` | `held` | `refunded` | Auto-refund expired |
| `postmark-inbound-webhook` | `held` | None (delegates) | Detect email responses |
| `stripe-connect-webhook` | None | `payment_failed`, `transfer_failed` | Process Stripe events |
| `send-deadline-reminders` | `held` | None | Send reminder emails |
| `escrow-health-check` | All | None | Monitor system health |
| `daily-reconciliation` | All | None | Daily audit report |
| `admin-analytics` | `held`, `released`, `refunded` | None | Analytics dashboard |

## Critical Issues

### Issue 1: Broken Retry Logic

**Problem**: `retry-failed-transfers` calls `distribute-escrow-funds` without resetting status

**Flow**:
```
transfer_failed
  ↓
retry-failed-transfers
  ↓
distribute-escrow-funds (expects 'held', rejects 'transfer_failed')
  ↓
❌ FAILS - atomic lock mismatch
```

**Fix**: Reset to `held` before calling `distribute-escrow-funds`

### Issue 2: Broken Pending Setup Processing

**Problem**: Same as Issue 1 for `pending_user_setup` status

**Flow**:
```
pending_user_setup
  ↓
process-pending-transfers
  ↓
distribute-escrow-funds (expects 'held', rejects 'pending_user_setup')
  ↓
❌ FAILS - atomic lock mismatch
```

**Fix**: Reset to `held` before calling `distribute-escrow-funds`

## Status Transition Diagram

```
                    Initial Payment
                          ↓
                      [held]
                          ↓
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Response           No Response      Payment Failed
   Received            (timeout)       (Stripe event)
        ↓                 ↓                 ↓
   [processing] ←    [refunded]        [failed]
        │
        ├────────────┬─────────────┬────────────┐
        │            │             │            │
   Transfer      Transfer    Rollback    No Stripe
   Success       Failed      Error       Account
        ↓            ↓             ↓            ↓
   [released]  [transfer_failed] [held]  [pending_user_setup]
   (terminal)   (needs retry)    (retry)  (awaits setup)
                     │                          │
                     │                          │
                     └──────────┬───────────────┘
                                │
                         ❌ BROKEN PATH
                    (no status reset before retry)
```

## Quick Diagnosis Commands

### Find Stuck Transactions
```sql
-- Transactions stuck in non-terminal states
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  MAX(updated_at) as last_update
FROM escrow_transactions
WHERE status IN ('processing', 'transfer_failed', 'pending_user_setup')
GROUP BY status;
```

### Find Old Processing Transactions
```sql
-- Processing for > 5 minutes is abnormal
SELECT
  id,
  status,
  amount,
  created_at,
  updated_at,
  NOW() - updated_at as stuck_duration
FROM escrow_transactions
WHERE status = 'processing'
AND updated_at < NOW() - INTERVAL '5 minutes';
```

### Check Transfer Failed Details
```sql
SELECT
  et.id,
  et.amount,
  et.recipient_user_id,
  et.sender_email,
  et.created_at,
  et.updated_at,
  et.stripe_payment_intent_id,
  p.stripe_account_id,
  p.stripe_onboarding_completed
FROM escrow_transactions et
LEFT JOIN profiles p ON et.recipient_user_id = p.id
WHERE et.status = 'transfer_failed'
ORDER BY et.updated_at DESC;
```

## Manual Recovery Procedure

### For `transfer_failed` Transactions:

1. **Verify funds in Stripe**:
   - Check Stripe Dashboard → Payments
   - Verify PaymentIntent status is `succeeded`
   - Verify funds are in platform balance

2. **Check recipient Stripe setup**:
   ```sql
   SELECT
     stripe_account_id,
     stripe_onboarding_completed
   FROM profiles
   WHERE id = (SELECT recipient_user_id FROM escrow_transactions WHERE id = 'TRANSACTION_ID');
   ```

3. **Reset status** (if Stripe setup complete):
   ```sql
   UPDATE escrow_transactions
   SET status = 'held', updated_at = NOW()
   WHERE id = 'TRANSACTION_ID'
   AND status = 'transfer_failed';
   ```

4. **Trigger distribution**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/distribute-escrow-funds \
     -H "Authorization: Bearer SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"escrowTransactionId": "TRANSACTION_ID"}'
   ```

5. **Verify success**:
   ```sql
   SELECT status, updated_at FROM escrow_transactions WHERE id = 'TRANSACTION_ID';
   -- Should be 'released'
   ```

### For `pending_user_setup` Transactions:

1. **Check if user completed setup**:
   ```sql
   SELECT
     p.stripe_account_id,
     p.stripe_onboarding_completed,
     et.id,
     et.amount,
     et.created_at
   FROM escrow_transactions et
   JOIN profiles p ON et.recipient_user_id = p.id
   WHERE et.status = 'pending_user_setup'
   AND p.stripe_onboarding_completed = true;
   ```

2. **If setup complete, follow same reset procedure as above**

## Deployment Checklist

Before deploying fixes:

- [ ] Deploy `retry-failed-transfers` with status reset
- [ ] Deploy `process-pending-transfers` with status reset
- [ ] Deploy `admin-retry-transaction` for manual recovery
- [ ] Fix `payment_failed` → `failed` inconsistency
- [ ] Test with sandbox transaction
- [ ] Update monitoring alerts
- [ ] Document new manual recovery endpoint

## Monitoring Alerts to Add

1. **Stuck in processing**:
   - Alert if any transaction in `processing` for > 5 minutes
   - Severity: High

2. **Transfer failures**:
   - Alert if `transfer_failed` count > 0
   - Severity: High (requires manual intervention)

3. **Pending setup accumulation**:
   - Alert if `pending_user_setup` count > 10
   - Severity: Medium

4. **Daily reconciliation**:
   - Alert if any non-terminal status accumulating
   - Severity: Medium

## API Endpoints Needed

### Admin Retry Endpoint
```
POST /functions/v1/admin-retry-transaction
{
  "transactionId": "uuid"
}

Response:
{
  "success": true,
  "transaction_id": "uuid",
  "previous_status": "transfer_failed",
  "new_status": "released",
  "distribute_result": { ... }
}
```

### Batch Retry Endpoint (future)
```
POST /functions/v1/admin-retry-all-failed
{
  "limit": 10,
  "status": "transfer_failed"
}

Response:
{
  "success": true,
  "processed": 10,
  "succeeded": 8,
  "failed": 2,
  "failed_ids": ["uuid1", "uuid2"]
}
```
