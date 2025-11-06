# Webhook Security Setup Guide

## 🔒 Critical Security Update

**VULNERABILITY FIXED**: Postmark inbound webhook now requires authentication to prevent unauthorized payout triggers.

**Risk Before Fix**: Attackers could forge webhook requests to mark messages as "responded" and trigger payouts without actual email responses.

**Risk After Fix**: Only authenticated requests from Postmark are accepted.

---

## Setup Instructions

### 1. Generate Webhook Credentials

Create a strong username and password for webhook authentication:

```bash
# Generate random credentials (recommended)
USERNAME="fastpass_webhook_$(openssl rand -hex 8)"
PASSWORD="$(openssl rand -hex 32)"

echo "Username: $USERNAME"
echo "Password: $PASSWORD"
echo "Combined: $USERNAME:$PASSWORD"
```

**Example output**:
```
Username: fastpass_webhook_a3f2c9d1e4b7f8a2
Password: 7d9f3e2a1c5b8d4f6e9a2b1c3d5f7e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
Combined: fastpass_webhook_a3f2c9d1e4b7f8a2:7d9f3e2a1c5b8d4f6e9a2b1c3d5f7e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
```

⚠️ **IMPORTANT**: Save these credentials securely! You'll need them for both Supabase and Postmark configuration.

### 2. Configure Supabase Environment Variable

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Edge Functions** → **Environment Variables**
4. Click **Add variable**
5. Set:
   - **Name**: `POSTMARK_INBOUND_WEBHOOK_SECRET`
   - **Value**: `username:password` (the combined format from step 1)
6. Click **Save**

### 3. Configure Postmark Webhook

1. Log in to [Postmark](https://account.postmarkapp.com/)
2. Go to **Servers** → Select your server
3. Navigate to **Webhooks** → **Inbound**
4. Click **Add webhook** or edit existing webhook
5. Set:
   - **URL**: `https://your-project.supabase.co/functions/v1/postmark-inbound-webhook`
   - **Authentication**: Enable **Basic Authentication**
   - **Username**: Your generated username
   - **Password**: Your generated password
6. Click **Save webhook**

### 4. Deploy Updated Function

```bash
# Deploy the secured webhook function
npx supabase functions deploy postmark-inbound-webhook

# Verify deployment
npx supabase functions list | grep postmark-inbound-webhook
```

### 5. Test Webhook Security

#### Test #1: Verify Authentication Works
```bash
# This should SUCCEED (200 OK)
curl -X POST "https://your-project.supabase.co/functions/v1/postmark-inbound-webhook" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "test@example.com",
    "To": "reply+test@reply.fastpass.email",
    "Subject": "Test",
    "MessageID": "test-123",
    "TextBody": "Test message",
    "HtmlBody": "<p>Test message</p>",
    "Headers": [],
    "Date": "2025-11-06T10:00:00Z",
    "ToFull": [{"Email": "reply+test@reply.fastpass.email", "Name": ""}],
    "FromFull": {"Email": "test@example.com", "Name": "Test User"}
  }'
```

#### Test #2: Verify Unauthorized Requests Fail
```bash
# This should FAIL (401 Unauthorized)
curl -X POST "https://your-project.supabase.co/functions/v1/postmark-inbound-webhook" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response**:
```json
{
  "error": "Unauthorized - Invalid authentication"
}
```

#### Test #3: Verify Wrong Credentials Fail
```bash
# This should FAIL (401 Unauthorized)
curl -X POST "https://your-project.supabase.co/functions/v1/postmark-inbound-webhook" \
  -H "Authorization: Basic $(echo -n 'wrong:credentials' | base64)" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Security Best Practices

### 1. Credential Rotation

Rotate webhook credentials every 90 days:

```bash
# Generate new credentials
NEW_USERNAME="fastpass_webhook_$(openssl rand -hex 8)"
NEW_PASSWORD="$(openssl rand -hex 32)"

# 1. Update Supabase environment variable
# 2. Update Postmark webhook configuration
# 3. Deploy function to pick up new env var
# 4. Test with new credentials
# 5. Verify old credentials no longer work
```

### 2. Monitor Authentication Failures

Check Supabase Function logs for repeated 401 errors:

```bash
# View recent function logs
npx supabase functions logs postmark-inbound-webhook --limit 50
```

**Red flags**:
- Multiple 401 errors in short time (possible attack)
- 401 errors after credential rotation (Postmark not updated)
- 500 errors about missing secret (env var not set)

### 3. Audit Trail

All webhook authentication attempts are logged:

```sql
-- Query Supabase logs (via Dashboard or SQL Editor)
SELECT
  timestamp,
  event_message,
  metadata
FROM
  edge_logs
WHERE
  function_name = 'postmark-inbound-webhook'
  AND event_message LIKE '%authentication%'
ORDER BY
  timestamp DESC
LIMIT 100;
```

### 4. Rate Limiting (Future Enhancement)

Consider adding rate limiting to prevent brute-force attacks:

```typescript
// Track failed attempts by IP
const failedAttempts = new Map<string, number>()

const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
const attempts = failedAttempts.get(clientIP) || 0

if (attempts > 5) {
  return new Response('Rate limit exceeded', { status: 429 })
}

// On auth failure:
failedAttempts.set(clientIP, attempts + 1)
```

---

## Troubleshooting

### Issue: "Webhook authentication not configured"

**Cause**: `POSTMARK_INBOUND_WEBHOOK_SECRET` environment variable not set in Supabase.

**Fix**:
1. Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables
2. Add `POSTMARK_INBOUND_WEBHOOK_SECRET` with value `username:password`
3. Redeploy function: `npx supabase functions deploy postmark-inbound-webhook`

### Issue: "Unauthorized - Invalid credentials"

**Cause**: Mismatch between Postmark webhook credentials and Supabase environment variable.

**Fix**:
1. Verify Postmark webhook Basic Auth username/password
2. Verify Supabase env var format is `username:password` (colon-separated, no spaces)
3. Ensure credentials match exactly (case-sensitive)

### Issue: Webhooks stopped working after update

**Cause**: Postmark wasn't updated with authentication credentials.

**Fix**:
1. Go to Postmark → Webhooks → Inbound
2. Edit webhook
3. Enable Basic Authentication
4. Enter username and password
5. Save webhook
6. Test with "Send test webhook" button

### Issue: 500 errors in function logs

**Cause**: Environment variable not loaded or malformed.

**Fix**:
1. Check env var is exactly `POSTMARK_INBOUND_WEBHOOK_SECRET` (no typos)
2. Check value format is `username:password` (not URL-encoded, not JSON)
3. Redeploy function to pick up changes
4. Wait 30 seconds for function cold start

---

## Migration Checklist

Use this checklist when deploying webhook security:

- [ ] Generate strong username and password
- [ ] Save credentials securely (password manager)
- [ ] Add `POSTMARK_INBOUND_WEBHOOK_SECRET` to Supabase
- [ ] Update Postmark webhook with Basic Auth credentials
- [ ] Deploy updated function
- [ ] Test: Valid credentials → 200 OK
- [ ] Test: No credentials → 401 Unauthorized
- [ ] Test: Wrong credentials → 401 Unauthorized
- [ ] Test: End-to-end (send real email, verify response triggers payout)
- [ ] Monitor logs for 24 hours
- [ ] Document credentials location in team wiki/password manager
- [ ] Schedule next credential rotation (90 days)

---

## Related Security Updates

This webhook security fix is part of a broader security audit. See also:

- **SECURITY-AUDIT-REPORT.md** - Full security audit findings
- **ALERTS-SETUP.md** - GitHub Actions monitoring setup
- Daily reconciliation deployment (detects fraud patterns)
- Stripe webhook signature verification (already implemented ✅)

---

## Questions?

**Webhook not receiving requests at all?**
- Check Postmark Activity → Webhooks tab for delivery status
- Verify webhook URL is correct
- Check Supabase Function logs for incoming requests

**Need to temporarily disable authentication?**
- NOT RECOMMENDED for production
- For testing only: Comment out auth check in code (lines 43-88)
- Remember to re-enable before merging to main

**Multiple environments (dev/staging/prod)?**
- Use different credentials for each environment
- Set separate env vars in each Supabase project
- Use different Postmark webhooks pointing to different projects

---

**Last Updated**: 2025-11-06
**Status**: Production-Ready
**Risk Level**: HIGH (without this fix) → LOW (with this fix)
