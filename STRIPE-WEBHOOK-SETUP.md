# 🔧 Stripe Webhook Configuration Guide

**Status**: Optional (not blocking operations)
**Time Required**: 5 minutes
**When to do it**: Anytime - enables automatic Stripe event tracking

---

## 🎯 What This Enables

### Without Webhook Configuration:
- ✅ Payments work normally
- ✅ Refunds work normally
- ✅ Transfers work normally
- ⚠️ No automatic detection of Stripe-side failures
- ⚠️ Manual investigation needed if transfer fails

### With Webhook Configuration:
- ✅ Everything above +
- ✅ Automatic detection of transfer failures
- ✅ Automatic alerts in `admin_actions` table
- ✅ Payment failures logged automatically
- ✅ Account status updates tracked

**Bottom line**: System works fine without it, but webhooks give you automatic visibility into Stripe-side issues.

---

## 📋 Step-by-Step Setup

### Step 1: Open Stripe Dashboard
1. Go to: https://dashboard.stripe.com/webhooks
2. Make sure you're in the correct Stripe account
3. Click **"Add endpoint"** button (top right)

### Step 2: Configure Endpoint URL
**Endpoint URL**:
```
https://znncfayiwfamujvrprvf.supabase.co/functions/v1/stripe-connect-webhook
```

**Description** (optional):
```
Fastpass Escrow - Production webhook handler
```

### Step 3: Select Events to Listen To

Click **"Select events"** and choose these 6 events:

#### Account Events
- ✅ `account.updated` - Tracks Stripe Connect account status changes

#### Payment Events
- ✅ `payment_intent.succeeded` - Logs successful payments
- ✅ `payment_intent.payment_failed` - Logs payment failures

#### Transfer Events (Most Important)
- ✅ `transfer.created` - Logs when transfer initiated
- ✅ `transfer.failed` - **CRITICAL** - Auto-detects transfer failures
- ✅ `transfer.reversed` - Alerts on reversals/chargebacks

**Why these events?**
- `transfer.failed` creates automatic alerts when payouts fail
- `transfer.reversed` catches chargebacks immediately
- Others provide operational visibility

### Step 4: Save and Get Signing Secret
1. Click **"Add endpoint"** at bottom
2. You'll see the new endpoint in your list
3. Click on the endpoint to open details
4. Find **"Signing secret"** section
5. Click **"Reveal"** to show the secret
6. Copy the secret (starts with `whsec_...`)

### Step 5: Add Secret to Supabase
1. Go to: https://supabase.com/dashboard/project/znncfayiwfamujvrprvf/settings/functions
2. Find **"Secrets"** section
3. Click **"Add new secret"**
4. Enter:
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_...` (paste the secret from Step 4)
5. Click **"Save"**

### Step 6: Verify It Works
1. In Stripe Dashboard, click your webhook endpoint
2. Click **"Send test webhook"** button (top right)
3. Select event: `transfer.created`
4. Click **"Send test webhook"**
5. Should see: ✅ "200 OK" response

**If you see error**: Check that `STRIPE_WEBHOOK_SECRET` is set correctly in Supabase

---

## 🧪 Testing After Setup

### Test 1: Send Test Webhook from Stripe
```bash
# In Stripe Dashboard → Webhooks → Your endpoint → "Send test webhook"
# Choose: transfer.created
# Expected: 200 OK response
```

### Test 2: Check Supabase Logs
```bash
# In Supabase Dashboard → Edge Functions → stripe-connect-webhook
# Look for: "✅ Webhook signature verified: transfer.created"
```

### Test 3: Verify Secret Works
```bash
# Send fake webhook (should fail with 400)
curl -X POST https://znncfayiwfamujvrprvf.supabase.co/functions/v1/stripe-connect-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"transfer.created","data":{"object":{}}}'

# Expected response: "Invalid signature" (400 Bad Request)
# This confirms signature verification is working
```

---

## 🔍 What Gets Tracked

### Automatic Event Handling

#### 1. `account.updated`
**What it does**: Logs Stripe Connect account status changes
**Example**: User completes onboarding → logged to database
**Use case**: Track when users become eligible for payouts

#### 2. `payment_intent.succeeded`
**What it does**: Logs successful payment captures
**Example**: Escrow payment captured → confirmed in logs
**Use case**: Audit trail for financial reconciliation

#### 3. `payment_intent.payment_failed`
**What it does**: Marks transaction as `payment_failed`
**Example**: Credit card declined → transaction status updated
**Use case**: Automatic cleanup of failed payments

#### 4. `transfer.created`
**What it does**: Logs transfer initiation
**Example**: 75% transfer to receiver initiated → logged
**Use case**: Confirm transfers sent to Stripe

#### 5. `transfer.failed` (MOST IMPORTANT)
**What it does**:
1. Updates transaction status to `transfer_failed`
2. Creates alert in `admin_actions` table
3. Logs failure reason

**Example**: Receiver's bank rejects transfer → automatic alert
**Use case**: Immediate notification of payout issues

#### 6. `transfer.reversed`
**What it does**: Creates high-priority alert for investigation
**Example**: Chargeback filed → alert created
**Use case**: Fraud detection and dispute handling

---

## 📊 Monitoring Webhook Activity

### In Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your endpoint
3. View **"Event history"** tab
4. See all events sent + responses

**What to look for**:
- ✅ All events showing "200 OK" response
- ⚠️ Any 400/500 errors (investigate immediately)

### In Supabase Dashboard:
1. Go to: Edge Functions → stripe-connect-webhook
2. View function logs
3. Look for: "✅ Webhook signature verified"

### In Database (admin_actions table):
```sql
-- Check for webhook-generated alerts
SELECT *
FROM admin_actions
WHERE action_type IN ('transfer_failed_alert', 'transfer_reversed_alert')
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Issue: "Invalid signature" errors
**Cause**: Wrong `STRIPE_WEBHOOK_SECRET` in Supabase
**Fix**:
1. Get secret from Stripe Dashboard → Webhooks → Your endpoint → "Signing secret"
2. Update in Supabase → Settings → Functions → Secrets
3. Make sure name is exactly: `STRIPE_WEBHOOK_SECRET`

### Issue: Webhook endpoint returning 500 errors
**Cause**: Function error in webhook handler
**Fix**:
1. Check Supabase function logs for error details
2. Verify all environment variables set correctly
3. Test function manually with curl

### Issue: Events not appearing in Supabase logs
**Cause**: Wrong endpoint URL in Stripe
**Fix**:
1. Verify endpoint URL is exactly: `https://znncfayiwfamujvrprvf.supabase.co/functions/v1/stripe-connect-webhook`
2. Check no typos in URL
3. Ensure endpoint is enabled in Stripe Dashboard

### Issue: Test webhooks work but real events fail
**Cause**: Using test mode secret for live mode (or vice versa)
**Fix**:
1. Check Stripe Dashboard mode (test vs live)
2. Ensure `STRIPE_SECRET_KEY` matches mode
3. Use correct webhook secret for the mode

---

## 🔐 Security Notes

### Webhook Signature Verification
✅ **Your system now verifies ALL webhook signatures**

**What this means**:
- Only Stripe can send valid webhooks to your endpoint
- Fake webhooks are automatically rejected with 400
- Protects against financial manipulation attacks

**Code that does this** (in `stripe-connect-webhook/index.ts`):
```typescript
event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
```

### Best Practices:
1. ✅ Never expose your webhook secret publicly
2. ✅ Always verify signatures (your code does this)
3. ✅ Use HTTPS endpoints only (Supabase handles this)
4. ✅ Log all webhook events for audit trail
5. ✅ Handle idempotently (your code does this)

---

## 📈 When You'll Appreciate Having This

### Scenario 1: Transfer Failure
**Without webhook**:
- User complains "I responded but didn't get paid"
- You check Stripe manually
- Find transfer failed
- Manual investigation: 15 minutes

**With webhook**:
- Alert appears in `admin_actions` immediately
- You see failure reason automatically
- Proactive fix before user complains
- Time saved: 15 minutes per failure

### Scenario 2: Account Suspended
**Without webhook**:
- Transfers keep failing
- No automatic detection
- Multiple failed attempts before you notice

**With webhook**:
- `account.updated` event received
- Status change logged
- Can pause payouts automatically
- Proactive user notification possible

### Scenario 3: Chargeback Filed
**Without webhook**:
- Discover chargeback when Stripe notifies you
- Already days old
- Less time to respond

**With webhook**:
- `transfer.reversed` event received immediately
- Alert created instantly
- Maximum time to gather evidence
- Better dispute success rate

---

## 🎯 Summary

**Setup Time**: 5 minutes
**Required?**: No (system works without it)
**Recommended?**: Yes (better visibility and automatic alerts)
**When to do it**: Anytime - enables automatic issue detection

**What you get**:
- ✅ Automatic transfer failure detection
- ✅ Chargeback/reversal alerts
- ✅ Payment failure tracking
- ✅ Complete audit trail
- ✅ Proactive issue detection

**What you don't get** (if you skip it):
- ⚠️ Manual investigation needed for Stripe-side failures
- ⚠️ Reactive vs proactive issue handling
- ⚠️ No automatic alerts for transfers/reversals

---

**Your system is production-ready either way. Webhooks just make operations smoother. 🚀**

---

**Last Updated**: 2025-10-13
**Supabase Project**: znncfayiwfamujvrprvf
**Function Version**: stripe-connect-webhook v43
