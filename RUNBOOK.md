# 📖 Escrow System Operations Runbook

**Version**: 2.0
**Last Updated**: 2025-10-13
**On-Call**: Check Slack #engineering for current rotation

---

## 📞 Emergency Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Payment failures | Stripe Support: support@stripe.com | 1-2 hours |
| Email issues | Postmark Support: support@postmarkapp.com | 1 hour |
| System outage | Supabase Support: support@supabase.com | 30 minutes |
| Security incident | security@yourcompany.com | Immediate |

---

## 🔍 Daily Operations

### Morning Health Check (5 minutes)

**1. Check for Stuck Transactions** ⚠️ **CRITICAL**
```sql
-- Paste in Supabase SQL Editor
SELECT COUNT(*) as stuck_count
FROM escrow_transactions
WHERE status = 'held'
  AND expires_at < NOW() - INTERVAL '20 minutes';
```

**Expected**: `stuck_count = 0`

**If > 0**: 🚨 **PROCEED TO EMERGENCY PROCEDURE** → [Stuck Transaction Recovery](#stuck-transaction-recovery)

---

**2. Run Monitoring Dashboard**
```bash
# Location: tests/sql/escrow-monitoring-dashboard.sql
# Copy/paste into Supabase SQL Editor
```

**Key Metrics to Check**:
- ✅ Refund Rate: Should be **<25%**
- ✅ Webhook Detection: Should be **>90%**
- ✅ Grace Period Usage: Should be **<15%**
- ✅ Pending Stripe Setup: Note count

**Take Action If**:
- Refund rate >30% → Investigate email delivery
- Webhook detection <80% → Check Postmark webhook status
- Grace period usage >20% → Consider extending deadlines

---

**3. Verify Cron Job Ran**
```bash
# Check GitHub Actions
https://github.com/YOUR_REPO/actions/workflows/escrow-timeout-check.yml

# Should see runs every 10 minutes
# Latest run should be within last 15 minutes
```

**If Not Running**:
1. Check if workflow is enabled in repo settings
2. Manually trigger: `gh workflow run escrow-timeout-check.yml`
3. Check function logs: `npx supabase functions logs check-escrow-timeouts`

---

### Weekly Operations (15 minutes)

**Monday Morning**:
1. **Review last 7 days metrics**
   ```bash
   # Run: tests/sql/escrow-monitoring-dashboard.sql
   # Look for trends
   ```

2. **Check financial reconciliation**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as transactions,
     SUM(amount) FILTER (WHERE status = 'completed') as paid_out,
     SUM(amount) FILTER (WHERE status = 'refunded') as refunded,
     SUM(amount) FILTER (WHERE status = 'held') as pending
   FROM escrow_transactions
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

3. **Verify no transfer failures**
   ```sql
   SELECT COUNT(*)
   FROM escrow_transactions
   WHERE status IN ('transfer_failed', 'captured_pending_transfer', 'payment_failed')
     AND created_at > NOW() - INTERVAL '7 days';
   ```
   **Expected**: 0 (or investigate each one)

4. **Check Stripe Dashboard**
   - Any failed transfers?
   - Any disputed charges?
   - Any unusual patterns?

---

## 🚨 Emergency Procedures

### Stuck Transaction Recovery

**Symptoms**:
- Transaction shows `status = 'held'`
- `expires_at` has passed (>20 minutes ago)
- No response detected

**Diagnosis**:
```sql
-- Get details
SELECT
  id,
  status,
  amount,
  stripe_payment_intent_id,
  expires_at,
  NOW() - expires_at as overdue_by,
  message_id,
  sender_email
FROM escrow_transactions
WHERE id = 'TRANSACTION_ID_HERE';
```

**Recovery Steps**:

**Step 1: Check Stripe Dashboard**
- Go to: https://dashboard.stripe.com/payments
- Search for `payment_intent_id`
- Check status:
  - **Requires Capture**: Expected (funds held in escrow)
  - **Canceled**: Refund already processed (DB out of sync)
  - **Succeeded**: Captured but never transferred (manual distribution needed)

**Step 2: Manually Trigger Timeout Check**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-escrow-timeouts \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Step 3: Check Function Logs**
```bash
npx supabase functions logs check-escrow-timeouts --limit 50
```

**Step 4: Manual Intervention** (if automation failed)
```sql
-- If Stripe shows canceled but DB doesn't:
UPDATE escrow_transactions
SET status = 'refunded', updated_at = NOW()
WHERE id = 'TRANSACTION_ID_HERE';

-- If response was received but missed:
-- First verify in email_response_tracking
SELECT * FROM email_response_tracking WHERE message_id = 'MESSAGE_ID_HERE';

-- If response exists, manually trigger distribution:
```
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/distribute-escrow-funds \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"escrowTransactionId": "TRANSACTION_ID_HERE"}'
```

**Step 5: Document Incident**
```sql
INSERT INTO admin_actions (action_type, description, metadata)
VALUES (
  'manual_intervention',
  'Manually resolved stuck transaction',
  jsonb_build_object(
    'transaction_id', 'TRANSACTION_ID_HERE',
    'reason', 'Cron job failed / Stripe API error / etc',
    'resolution', 'Manually triggered refund/distribution'
  )
);
```

---

### High Refund Rate Alert

**Trigger**: Refund rate >30% for 24 hours

**Possible Causes**:
1. **Email delivery issues** (Postmark down/blocked)
2. **Deadlines too short** (users can't respond in time)
3. **Price too high** (not worth responding)
4. **Target audience wrong** (receivers not interested)

**Investigation**:
```sql
-- Check email delivery rate
SELECT
  COUNT(*) as total_sent,
  COUNT(delivered_at) as delivered,
  COUNT(failed_at) as failed,
  COUNT(bounced_at) as bounced,
  ROUND(100.0 * COUNT(delivered_at) / COUNT(*), 2) as delivery_rate
FROM email_logs
WHERE email_type = 'outbound_message'
  AND sent_at > NOW() - INTERVAL '24 hours';
```

**Actions**:
1. **If delivery_rate <90%**: Check Postmark status/reputation
2. **If delivery_rate >90%**: Check deadline patterns
   ```sql
   SELECT
     response_deadline_hours,
     COUNT(*) as messages,
     COUNT(mr.has_response) as responses,
     ROUND(100.0 * COUNT(mr.has_response) / COUNT(*), 2) as response_rate
   FROM messages m
   LEFT JOIN message_responses mr ON m.id = mr.message_id
   WHERE m.created_at > NOW() - INTERVAL '7 days'
   GROUP BY response_deadline_hours;
   ```
3. **If 24h deadline has low response**: Consider 48h default

---

### Duplicate Transaction Processing

**Symptoms**:
- Customer complains they were charged twice
- Stripe shows duplicate captures/transfers for same transaction
- Database shows duplicate entries in `email_response_tracking`

**Diagnosis**:
```sql
-- Check for duplicate webhook processing
SELECT
  inbound_email_id,
  COUNT(*) as occurrences,
  array_agg(id) as tracking_ids
FROM email_response_tracking
GROUP BY inbound_email_id
HAVING COUNT(*) > 1;
```

**If Duplicates Found** (shouldn't happen after 2025-10-13 fixes):
1. Check webhook deduplication code is deployed
2. Verify Stripe idempotency keys are working
3. Check for database transaction issues

**Resolution**:
1. Verify actual money movement in Stripe Dashboard
2. If duplicate charge: Issue manual refund via Stripe
3. If duplicate transfer: Contact receiver to return funds
4. Update database to reflect reality
5. **Deploy latest code with deduplication**

---

### Stripe Transfer Failed

**Symptoms**:
- Webhook receives `transfer.failed` event
- Transaction stuck in `transfer_failed` status
- Funds captured but receiver didn't receive payment

**Diagnosis**:
```sql
SELECT
  et.id,
  et.amount,
  et.stripe_payment_intent_id,
  et.status,
  et.last_error,
  p.stripe_account_id,
  p.stripe_onboarding_completed
FROM escrow_transactions et
JOIN profiles p ON p.id = et.recipient_user_id
WHERE et.status = 'transfer_failed';
```

**Common Causes**:
1. **Receiver's Stripe account suspended**: Contact receiver, fix account
2. **Insufficient funds in platform account**: Check Stripe balance
3. **Currency mismatch**: Verify receiver's account accepts EUR
4. **Stripe Connect not completed**: Receiver needs to finish onboarding

**Resolution**:

**If Account Issue**:
1. Contact receiver: "Please complete Stripe Connect setup"
2. Mark transaction as `pending_user_setup`
   ```sql
   UPDATE escrow_transactions
   SET status = 'pending_user_setup'
   WHERE id = 'TRANSACTION_ID_HERE';
   ```
3. Funds will auto-transfer when they complete setup

**If Temporary Error**:
1. Manually retry distribution:
   ```bash
   curl -X POST .../functions/v1/distribute-escrow-funds \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -d '{"escrowTransactionId": "TRANSACTION_ID_HERE"}'
   ```

**If Persistent Error**:
1. Contact Stripe Support with transfer ID
2. May need manual payout via Stripe Dashboard
3. Update database manually after resolution

---

### Webhook Not Receiving Events

**Symptoms**:
- Email responses not triggering fund distribution
- Manual checking shows responses exist
- Postmark Activity shows emails delivered but not processed

**Diagnosis**:

**1. Check Postmark Webhook Configuration**
- Go to: https://account.postmarkapp.com/servers/YOUR_SERVER/webhooks
- Verify webhook URL: `https://YOUR_PROJECT.supabase.co/functions/v1/postmark-webhook-public`
- Check recent delivery attempts
- Look for 4xx/5xx errors

**2. Check Function Logs**
```bash
npx supabase functions logs postmark-inbound-webhook --limit 100
```

**3. Test Webhook Manually**
```bash
# Send test email to: reply+TEST_MESSAGE_ID@reply.fastpass.email
# Check logs to see if webhook received it
```

**Resolution**:
1. **If webhook URL wrong**: Update in Postmark
2. **If function returning errors**: Check logs, fix code, redeploy
3. **If network issues**: Check Supabase status page
4. **If authentication failing**: Verify webhook secret in env vars

**Manual Workaround** (if webhook broken):
1. Check email manually in Postmark Activity
2. Mark response received:
   ```bash
   curl -X POST .../functions/v1/mark-response-received \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -d '{"messageId": "MESSAGE_ID_HERE", "responseReceived": true}'
   ```

---

## 📊 Monitoring & Alerts

### Alerts to Set Up

**Critical Alerts** (Immediate Response):
1. Stuck transactions > 0
2. Transfer failures > 5 in 1 hour
3. Refund rate > 50% in 1 hour
4. Webhook delivery failure > 10 in 1 hour

**Warning Alerts** (Review in 24h):
1. Refund rate > 30% over 24h
2. Webhook detection < 80% over 24h
3. Grace period usage > 20% over 7 days
4. Pending Stripe setup > 10 transactions

### Monitoring Tools

**Supabase Dashboard**:
- Function logs: Check for errors
- Database: Run health check queries
- API analytics: Check response times

**Stripe Dashboard**:
- Payments: Check for failures
- Transfers: Check for failed payouts
- Balance: Verify sufficient funds

**Postmark Dashboard**:
- Activity: Check email delivery
- Webhooks: Check webhook delivery
- Reputation: Monitor spam reports

---

## 🔧 Common Maintenance Tasks

### Deploy Code Updates
```bash
# 1. Test locally first (if possible)
# 2. Deploy functions
npx supabase functions deploy check-escrow-timeouts
npx supabase functions deploy distribute-escrow-funds
npx supabase functions deploy postmark-inbound-webhook

# 3. Monitor logs for 30 minutes
npx supabase functions logs check-escrow-timeouts --tail

# 4. Run health check
# tests/sql/verify-stuck-transactions.sql
```

### Database Migrations
```bash
# 1. Backup database first
npx supabase db dump -f backup-$(date +%Y%m%d).sql

# 2. Create migration
npx supabase migration new migration_name

# 3. Apply migration
npx supabase db push

# 4. Verify schema
npx supabase db diff
```

### Update Webhook URLs
**Postmark**:
1. Go to: https://account.postmarkapp.com/servers/YOUR_SERVER/webhooks
2. Update URL if needed
3. Test delivery with sample webhook

**Stripe**:
1. Go to: https://dashboard.stripe.com/webhooks
2. Update URL if needed
3. Test with Stripe CLI: `stripe listen --forward-to localhost:54321`

---

## 📚 Reference Documentation

- **Technical Analysis**: `ESCROW-AUDIT-DETAILED-ANALYSIS.md`
- **Quick Reference**: `ESCROW-QUICK-REFERENCE.md`
- **Test Scripts**: `tests/test-escrow-flows.sh`
- **SQL Queries**: `tests/sql/*.sql`
- **System Architecture**: `CLAUDE.md`

---

## 🎓 Training & Onboarding

### New Team Member Checklist
- [ ] Read `CLAUDE.md` - System overview
- [ ] Read this RUNBOOK - Operations
- [ ] Get access to Stripe Dashboard
- [ ] Get access to Postmark Dashboard
- [ ] Get access to Supabase Dashboard
- [ ] Run monitoring dashboard query
- [ ] Shadow on-call engineer for 1 week
- [ ] Practice emergency procedures in staging

### Key Concepts to Understand
1. **Escrow Flow**: Payment → Hold → Response → Distribute
2. **Grace Period**: 15 minutes after deadline for late responses
3. **75/25 Split**: 75% to receiver, 25% to platform
4. **Idempotency**: Stripe operations can be safely retried
5. **Status Lifecycle**: held → processing → released → completed

---

## 🚀 Incident Response Template

```markdown
## Incident Report: [TITLE]

**Date**: YYYY-MM-DD HH:MM UTC
**Severity**: Critical / High / Medium / Low
**Status**: Investigating / Mitigating / Resolved
**On-Call**: @engineer-name

### Timeline
- HH:MM - Incident detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

### Impact
- X transactions affected
- €X funds stuck/lost
- X customers contacted

### Root Cause
[Description]

### Resolution
[What was done]

### Prevention
[What will prevent this in future]

### Action Items
- [ ] Item 1 (@owner)
- [ ] Item 2 (@owner)
```

---

**Runbook Version**: 2.0
**Last Reviewed**: 2025-10-13
**Next Review**: 2025-11-13
**Maintainer**: Engineering Team
