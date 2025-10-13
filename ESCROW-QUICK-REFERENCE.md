# ⚡ Escrow System Quick Reference Card

**For**: Daily operations and emergency troubleshooting
**Version**: 2.0 (Post-Audit - 2025-10-13)

---

## 🚨 Emergency Commands

### Check for Stuck Transactions (RUN DAILY)
```sql
-- Paste in Supabase SQL Editor
SELECT COUNT(*) FROM escrow_transactions
WHERE status = 'held' AND expires_at < NOW() - INTERVAL '20 minutes';
```
**Expected**: 0 rows
**If > 0**: 🚨 CRITICAL - Investigate immediately!

---

### Manually Trigger Timeout Check
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-escrow-timeouts \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

---

### Force Distribution for Specific Transaction
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/distribute-escrow-funds \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"escrowTransactionId": "TRANSACTION_ID_HERE"}'
```

---

## 📊 Daily Monitoring

### Run This Query Every Morning
```bash
# Location: tests/sql/escrow-monitoring-dashboard.sql
psql YOUR_DB_URL -f tests/sql/escrow-monitoring-dashboard.sql
```

**Key Metrics to Watch**:
- Stuck transactions: Should be **0**
- Refund rate: Should be **<25%**
- Webhook detection: Should be **>90%**
- Grace period usage: Should be **<15%**

---

## 🔧 Common Issues & Fixes

### Issue: Transaction Stuck in 'held' Status

**Symptoms**: expires_at passed but status still 'held'

**Diagnosis**:
1. Check GitHub Actions: https://github.com/YOUR_REPO/actions
2. Check cron logs: `npx supabase functions logs check-escrow-timeouts`

**Fix**:
1. Manually trigger timeout check (command above)
2. If Stripe error, cancel in Stripe Dashboard
3. Update DB: `UPDATE escrow_transactions SET status = 'refunded' WHERE id = 'xxx';`

---

### Issue: Duplicate Webhook Processing

**Symptoms**: email_response_tracking has duplicate inbound_email_id

**Diagnosis**:
```sql
SELECT inbound_email_id, COUNT(*)
FROM email_response_tracking
GROUP BY inbound_email_id
HAVING COUNT(*) > 1;
```

**Fix**: Already prevented by deduplication check (as of 2025-10-13)

---

### Issue: 75/25 Split Doesn't Add Up

**Symptoms**: user_amount + platform_fee ≠ total_amount

**Diagnosis**:
```bash
psql YOUR_DB_URL -f tests/sql/verify-75-25-split.sql
```

**Fix**: Redeploy distribute-escrow-funds with improved rounding

---

## 📁 Important Files

### Edge Functions (Production)
- `check-escrow-timeouts` - Refunds expired transactions
- `distribute-escrow-funds` - Releases escrowed funds (75/25)
- `postmark-inbound-webhook` - Detects email responses

### Deployment
```bash
npx supabase functions deploy check-escrow-timeouts
npx supabase functions deploy distribute-escrow-funds
npx supabase functions deploy postmark-inbound-webhook
```

### Monitoring Scripts
- `tests/sql/escrow-monitoring-dashboard.sql` - Full dashboard
- `tests/sql/verify-stuck-transactions.sql` - Critical check
- `tests/sql/verify-75-25-split.sql` - Financial accuracy
- `tests/test-escrow-flows.sh` - Automated testing

---

## 🎯 System Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Grace Period | **15 minutes** | After deadline for late responses |
| User Payout | **75%** | Receiver's share |
| Platform Fee | **25%** | Platform's share |
| Cron Frequency | **10 minutes** | GitHub Actions schedule |
| Deadline Options | 24h, 48h, 72h | Configurable per message |

---

## 🔐 Security Checklist

- ✅ Stripe idempotency keys on all API calls
- ✅ Webhook deduplication (inbound_email_id check)
- ✅ Status gating (only 'held' transactions processed)
- ✅ Service role key protection (JWT verification)
- ✅ Grace period consistency (15min everywhere)

---

## 📞 Escalation Path

**Level 1** (Self-Service):
1. Check monitoring dashboard
2. Review function logs
3. Run verification queries

**Level 2** (Manual Intervention):
1. Manually trigger functions
2. Check Stripe Dashboard
3. Update database status if needed

**Level 3** (Code Changes Required):
1. Review audit documentation
2. Check for new edge cases
3. Deploy fixes via Supabase CLI

---

## 🔗 Quick Links

- **GitHub Actions**: https://github.com/YOUR_REPO/actions/workflows/escrow-timeout-check.yml
- **Supabase Functions**: https://supabase.com/dashboard/project/YOUR_PROJECT/functions
- **Stripe Dashboard**: https://dashboard.stripe.com/test/payments
- **Postmark Activity**: https://account.postmarkapp.com/servers/YOUR_SERVER/streams/outbound/activity

---

## 📚 Full Documentation

- `AUDIT-COMPLETE-SUMMARY.md` - Executive summary
- `ESCROW-AUDIT-DETAILED-ANALYSIS.md` - Technical deep-dive
- `ESCROW-AUDIT-TRACKER.md` - Audit progress
- `CLAUDE.md` - Complete system documentation

---

**Last Updated**: 2025-10-13
**Version**: 2.0 (Post-Audit)
**Status**: Production-Ready ✅
