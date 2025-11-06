# Security Fixes Testing Guide

## Overview

This guide provides step-by-step testing procedures for all security fixes deployed in the `fix/security-webhook-reconciliation` branch.

---

## ✅ Test Checklist

- [ ] Test 1: Daily Reconciliation Function Deployed
- [ ] Test 2: Reconciliation Runs Without Errors
- [ ] Test 3: GitHub Actions Alerts (Setup Only - Wait for Real Failure)
- [ ] Test 4: Postmark Webhook Authentication - Valid Credentials
- [ ] Test 5: Postmark Webhook Authentication - Invalid Credentials
- [ ] Test 6: Postmark Webhook Authentication - No Credentials
- [ ] Test 7: Rate Limiting on get-payment-profile
- [ ] Test 8: End-to-End Payment Flow Still Works

---

## Test 1: Daily Reconciliation Function Deployed

**Purpose**: Verify the function that was missing is now deployed.

```bash
npx supabase functions list | grep daily-reconciliation
```

**Expected Output**:
```
... | daily-reconciliation | daily-reconciliation | ACTIVE | 1 | 2025-11-06 ...
```

✅ **Pass Criteria**: Function appears in list with `ACTIVE` status

---

## Test 2: Reconciliation Runs Without Errors

**Purpose**: Verify the function executes successfully and returns valid data.

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/daily-reconciliation" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -s | jq '.'
```

**Expected Output**:
```json
{
  "success": true,
  "date": "2025-11-05",
  "stats": {
    "total_transactions": 0,
    "total_amount": 0,
    "held": { "count": 0, "amount": 0 },
    ...
  },
  "issues": [],
  "refund_rate": "0.00%"
}
```

✅ **Pass Criteria**:
- `success: true`
- `stats` object present
- `issues` array empty (or populated if real issues exist)
- HTTP 200 status

---

## Test 3: GitHub Actions Alerts

**Purpose**: Verify Discord webhook notifications are configured.

### Setup Required:

1. **Create Discord Webhook**:
   - Open Discord server → Server Settings → Integrations → Webhooks
   - Click "New Webhook" → Name it "FastPass Alerts"
   - Copy webhook URL

2. **Add to GitHub Secrets**:
   - GitHub repo → Settings → Secrets and variables → Actions
   - New repository secret: `DISCORD_WEBHOOK_URL`
   - Paste Discord webhook URL

3. **Test Manually** (Option A - Recommended):
   ```bash
   # Go to GitHub Actions tab
   # Select "Daily Reconciliation" workflow
   # Click "Run workflow"
   # Check Discord channel for notification
   ```

4. **Wait for Scheduled Run** (Option B):
   - Daily reconciliation runs at 9 AM UTC
   - Escrow timeout runs every 10 minutes
   - Check Discord for notifications

✅ **Pass Criteria**:
- Discord webhook URL added to GitHub secrets
- Manual workflow run triggers Discord notification
- Notification includes workflow name, status, and link to logs

---

## Test 4: Postmark Webhook - Valid Credentials

**Purpose**: Verify webhook accepts authenticated requests.

### Prerequisites:
- `POSTMARK_INBOUND_WEBHOOK_SECRET` must be set in Supabase (format: `username:password`)

**Test**:
```bash
# Generate Base64 credentials
echo -n 'your_username:your_password' | base64

# Test webhook with valid auth
curl -X POST "https://your-project.supabase.co/functions/v1/postmark-inbound-webhook" \
  -H "Authorization: Basic BASE64_CREDENTIALS_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "test@example.com",
    "To": "reply+00000000-0000-0000-0000-000000000000@reply.fastpass.email",
    "Subject": "Test",
    "MessageID": "test-123",
    "TextBody": "Test message",
    "HtmlBody": "<p>Test</p>",
    "Headers": [],
    "Date": "2025-11-06T10:00:00Z",
    "ToFull": [{"Email": "reply+test@reply.fastpass.email", "Name": ""}],
    "FromFull": {"Email": "test@example.com", "Name": "Test"}
  }' \
  -v
```

**Expected Output**:
- HTTP 200 OK (or 400 if transaction not found - that's fine)
- Log shows: `✅ Webhook authentication verified`
- Response JSON includes `received: true`

✅ **Pass Criteria**:
- Request not rejected with 401
- Authentication check passes
- Function processes request (even if transaction not found)

---

## Test 5: Postmark Webhook - Invalid Credentials

**Purpose**: Verify webhook rejects requests with wrong credentials.

**Test**:
```bash
# Generate wrong credentials
echo -n 'wrong:credentials' | base64

curl -X POST "https://your-project.supabase.co/functions/v1/postmark-inbound-webhook" \
  -H "Authorization: Basic BASE64_WRONG_CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -i
```

**Expected Output**:
```
HTTP/1.1 401 Unauthorized
...
{
  "error": "Unauthorized - Invalid credentials"
}
```

✅ **Pass Criteria**:
- HTTP 401 status
- Error message about invalid credentials
- Request blocked before processing

---

## Test 6: Postmark Webhook - No Credentials

**Purpose**: Verify webhook rejects unauthenticated requests.

**Test**:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/postmark-inbound-webhook" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -i
```

**Expected Output**:
```
HTTP/1.1 401 Unauthorized
...
{
  "error": "Unauthorized - Invalid authentication"
}
```

✅ **Pass Criteria**:
- HTTP 401 status
- Error about missing authentication
- Request blocked immediately

---

## Test 7: Rate Limiting on get-payment-profile

**Purpose**: Verify rate limiting prevents abuse (60 req/hour per IP).

### Test 7a: Normal Usage (Under Limit)

**Test**:
```bash
# Make 5 requests (well under 60/hour limit)
for i in {1..5}; do
  curl -s "https://your-project.supabase.co/functions/v1/get-payment-profile?userId=VALID_UUID" \
    -H "Authorization: Bearer YOUR_ANON_KEY" | jq '.success'
  sleep 1
done
```

**Expected Output**:
```
true
true
true
true
true
```

✅ **Pass Criteria**: All requests succeed (HTTP 200)

### Test 7b: Excessive Usage (Over Limit)

**Test**:
```bash
# Make 65 requests rapidly (exceeds 60/hour limit)
for i in {1..65}; do
  response=$(curl -s -w "%{http_code}" "https://your-project.supabase.co/functions/v1/get-payment-profile?userId=VALID_UUID" \
    -H "Authorization: Bearer YOUR_ANON_KEY")

  http_code="${response: -3}"

  if [ "$i" -gt 60 ] && [ "$http_code" = "429" ]; then
    echo "✅ Rate limit triggered at request $i (expected)"
    break
  fi
done
```

**Expected Output**:
```
...
✅ Rate limit triggered at request 61 (expected)
```

**Check Headers**:
```bash
curl -I "https://your-project.supabase.co/functions/v1/get-payment-profile?userId=VALID_UUID" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Should Include**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: XX
X-RateLimit-Reset: 2025-11-06T11:00:00.000Z
Retry-After: XXXX
```

✅ **Pass Criteria**:
- Requests 1-60 succeed (HTTP 200)
- Request 61+ fails (HTTP 429)
- `Retry-After` header present
- Error message: "Too many requests"

---

## Test 8: End-to-End Payment Flow

**Purpose**: Verify security fixes don't break existing functionality.

### Manual Test Steps:

1. **Access Payment Page**:
   - Navigate to `/pay/:validUserId` in browser
   - Verify profile loads (uses `get-payment-profile`)

2. **Make Test Payment**:
   - Fill in sender details
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete payment

3. **Verify Escrow Created**:
   ```sql
   -- Query in Supabase SQL Editor
   SELECT * FROM escrow_transactions
   ORDER BY created_at DESC
   LIMIT 1;
   ```

4. **Simulate Email Response**:
   - Use Postmark test webhook (with valid auth!)
   - Or send real email response

5. **Verify Payout Triggered**:
   ```sql
   SELECT * FROM email_response_tracking
   WHERE message_id = 'YOUR_MESSAGE_ID';
   ```

✅ **Pass Criteria**:
- Payment flow completes without errors
- Escrow transaction created with `status: held`
- Email sent successfully
- (If response sent) Payout triggered

---

## Common Issues & Solutions

### Issue: Test 4 fails with "Webhook authentication not configured"

**Cause**: `POSTMARK_INBOUND_WEBHOOK_SECRET` not set in Supabase environment variables.

**Fix**:
1. Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables
2. Add `POSTMARK_INBOUND_WEBHOOK_SECRET` with value `username:password`
3. Redeploy function: `npx supabase functions deploy postmark-inbound-webhook`

---

### Issue: Test 7 shows rate limit triggered immediately

**Cause**: You've already exceeded the limit from previous tests.

**Fix**: Wait 1 hour for the rate limit window to reset, or test from a different IP address.

---

### Issue: Test 3 doesn't show Discord notifications

**Cause**: `DISCORD_WEBHOOK_URL` secret not configured or webhook URL is invalid.

**Fix**:
1. Verify webhook URL works: `curl -X POST "YOUR_WEBHOOK_URL" -H "Content-Type: application/json" -d '{"content":"Test"}'`
2. Check GitHub secret name is exactly `DISCORD_WEBHOOK_URL`
3. Re-run workflow manually

---

## Security Verification Summary

After completing all tests, verify:

✅ Daily reconciliation deployed and functional
✅ GitHub Actions send alerts to Discord
✅ Postmark webhook requires authentication
✅ Invalid/missing auth returns 401
✅ Rate limiting prevents excessive requests
✅ Payment flow still works end-to-end
✅ Stripe keys remain environment variables
✅ CORS configured appropriately

---

## Post-Deployment Checklist

After merging to main:

- [ ] Configure `POSTMARK_INBOUND_WEBHOOK_SECRET` in Postmark dashboard
- [ ] Update Postmark inbound webhook with Basic Auth credentials
- [ ] Configure `DISCORD_WEBHOOK_URL` in GitHub repository secrets
- [ ] Monitor Supabase Function logs for first 24 hours
- [ ] Check Discord for any workflow failure notifications
- [ ] Review rate limiting metrics after 1 week
- [ ] Schedule credential rotation reminder (90 days)

---

**Questions or Issues?**
Check function logs: Supabase Dashboard → Edge Functions → Select function → Logs
