# Authentication Enhancements - Testing Guide

**Date**: 2025-11-27
**Branch**: `feature/auth-enhancements`
**Status**: Ready for Testing

## Overview

This document provides comprehensive testing instructions for three critical authentication enhancements:

1. **Account Deletion Backend** - Secure account deletion with cascading data cleanup
2. **Language Standardization** - All French text converted to English
3. **Rate Limiting** - Protection against brute-force attacks on auth endpoints

---

## 1. Account Deletion Testing

### Prerequisites
- User account with test data
- No active escrow transactions
- No pending payouts

### Test Cases

#### 1.1 Happy Path: Successful Account Deletion

**Steps**:
1. Login to dashboard at `/dashboard`
2. Navigate to Account Settings
3. Click "Security" tab
4. Scroll to "Danger Zone"
5. Click "Delete Account" button
6. In the dialog:
   - Enter your password
   - Type exactly: `DELETE MY ACCOUNT`
   - Click "Delete Account"

**Expected Result**:
- Success toast message: "Account deleted successfully. Goodbye!"
- User is signed out
- Redirect to homepage after 2 seconds
- User cannot login with same credentials

**Database Verification**:
```sql
-- Verify user deleted from auth.users
SELECT * FROM auth.users WHERE email = 'test@example.com';
-- Should return: 0 rows

-- Verify profile anonymized (may still exist briefly before cascade)
SELECT * FROM public.profiles WHERE id = '<user_id>';
-- Should return: 0 rows OR anonymized data

-- Verify messages anonymized
SELECT content, sender_email FROM public.messages WHERE user_id = '<user_id>';
-- Should return: content = '[DELETED]', sender_email = 'deleted@fastpass.email'

-- Verify audit log created
SELECT * FROM public.admin_actions
WHERE action_type = 'account_deletion'
ORDER BY created_at DESC LIMIT 1;
-- Should return: recent deletion record
```

#### 1.2 Validation: Incorrect Password

**Steps**:
1. Open delete account dialog
2. Enter wrong password
3. Type confirmation text
4. Click "Delete Account"

**Expected Result**:
- Error toast: "Incorrect password. Account deletion cancelled."
- Account NOT deleted
- Dialog remains open

#### 1.3 Validation: Wrong Confirmation Text

**Steps**:
1. Open delete account dialog
2. Enter correct password
3. Type: "delete my account" (lowercase)
4. Click "Delete Account"

**Expected Result**:
- Error toast: "Invalid confirmation text. Please type 'DELETE MY ACCOUNT' exactly."
- Account NOT deleted

#### 1.4 Validation: Missing Fields

**Steps**:
1. Open delete account dialog
2. Leave password empty OR confirmation text empty
3. Try to click "Delete Account"

**Expected Result**:
- Button is disabled (grayed out)
- Cannot submit

#### 1.5 Edge Case: Active Escrow Transactions

**Setup**: Create test transaction with status `held`

**Steps**:
1. Attempt to delete account with active transaction

**Expected Result**:
- Error toast: "Cannot delete account with 1 active transaction(s) totaling €X.XX. Please wait for transactions to complete or expire."
- Account NOT deleted

**SQL Setup**:
```sql
-- Create test held transaction
INSERT INTO public.escrow_transactions (
  recipient_user_id,
  sender_email,
  amount,
  status,
  expires_at
) VALUES (
  '<user_id>',
  'test@example.com',
  50.00,
  'held',
  NOW() + INTERVAL '24 hours'
);
```

#### 1.6 Edge Case: Pending Payouts

**Setup**: Create test transaction with status `pending_user_setup`

**Steps**:
1. Attempt to delete account with pending payout

**Expected Result**:
- Error toast: "Cannot delete account with 1 pending payout(s) totaling €X.XX. Please configure Stripe Connect or contact support."
- Account NOT deleted

#### 1.7 Rate Limiting: Multiple Deletion Attempts

**Steps**:
1. Attempt account deletion
2. Cancel dialog
3. Immediately try again (repeat 3+ times within 1 hour)

**Expected Result**:
- First attempt: Normal behavior
- Second attempt within 1 hour: HTTP 429 error
- Error toast: "Too many account deletion attempts. Please try again later."
- Response headers include `Retry-After` seconds

**SQL Verification**:
```sql
-- Check rate limit records
SELECT * FROM public.rate_limits
WHERE limit_type = 'account_deletion'
ORDER BY created_at DESC;
```

---

## 2. Language Standardization Testing

### Test Cases

#### 2.1 Login Errors (English)

**Steps**:
1. Go to `/auth`
2. Enter invalid email/password
3. Click "Login"

**Expected Result**:
- Error toast: "Invalid email or password" (NOT French)

#### 2.2 Signup Errors (English)

**Steps**:
1. Go to `/auth`
2. Click "Don't have an account? Sign up"
3. Enter email already in use
4. Click "Sign Up"

**Expected Result**:
- Error toast: "This email is already in use. Please try logging in." (NOT French)

**Steps**:
1. Enter short password (< 6 chars)
2. Click "Sign Up"

**Expected Result**:
- Error toast: "Password must be at least 6 characters long." (NOT French)

#### 2.3 Email Confirmation (English)

**Steps**:
1. Try to login with unconfirmed email

**Expected Result**:
- Error toast: "Please confirm your email before logging in" (NOT French)

#### 2.4 Signup Success (English)

**Steps**:
1. Sign up with new email
2. Check success message

**Expected Result**:
- Success toast: "Check your email to confirm your account!" (NOT French)

#### 2.5 Generic Errors (English)

**Steps**:
1. Simulate network error (disconnect internet)
2. Try to login

**Expected Result**:
- Error toast: "An error occurred. Please try again." (NOT French)

### Manual Code Review

**Files to verify have NO French text**:
- `/src/components/auth/AuthForm.tsx` ✓
- All toast messages in auth flow ✓
- Error messages in Edge Functions (check manually)

**Command to search for French**:
```bash
grep -r "erreur\|mot de passe\|adresse\|connexion\|compte\|email\|utilisateur" src/ --include="*.tsx" --include="*.ts"
```

---

## 3. Rate Limiting Testing

### Prerequisites
- Deployed Edge Functions with rate limiting
- Database migration applied (`rate_limits` table exists)

### Test Cases

#### 3.1 Rate Limit: Login Attempts

**Configuration**: 5 attempts per 15 minutes per IP

**Steps**:
1. Go to `/auth`
2. Enter wrong password 5 times quickly
3. Try 6th attempt

**Expected Result**:
- First 5 attempts: Normal error messages
- 6th attempt: HTTP 429 response
- Error toast: "Too many requests. Please try again in X minutes."
- Response headers:
  - `Retry-After`: seconds
  - `X-RateLimit-Remaining`: 0
  - `X-RateLimit-Reset`: ISO timestamp

**SQL Verification**:
```sql
-- Check rate limit records for login
SELECT * FROM public.rate_limits
WHERE limit_type = 'login'
AND ip_address = '<your_ip>'
ORDER BY created_at DESC;

-- Should see 5-6 records
```

#### 3.2 Rate Limit: Password Reset

**Configuration**: 3 attempts per hour per email

**Steps**:
1. Go to `/auth`
2. Click "Forgot Password?"
3. Request password reset 3 times for same email
4. Try 4th attempt

**Expected Result**:
- First 3 attempts: Success messages
- 4th attempt: HTTP 429 response
- Error: "Too many requests. Please try again in X minutes."

#### 3.3 Rate Limit: Email Change

**Configuration**: 3 attempts per hour per user

**Steps**:
1. Login to account settings
2. Attempt to change email 3 times
3. Try 4th attempt

**Expected Result**:
- First 3 attempts: Normal behavior
- 4th attempt: HTTP 429 error

#### 3.4 Rate Limit: Account Deletion

**Configuration**: 1 attempt per hour per user

**Steps**:
1. Open account deletion dialog
2. Cancel
3. Immediately try again

**Expected Result**:
- Second attempt within 1 hour: HTTP 429 error
- Error: "Too many account deletion attempts. Please try again later."

#### 3.5 Rate Limit Reset Window

**Steps**:
1. Hit rate limit (e.g., 5 failed logins)
2. Wait for window to expire (check `Retry-After` header)
3. Try again after window expires

**Expected Result**:
- After window expires: Rate limit resets
- New attempts allowed

#### 3.6 Rate Limit Bypass (Testing Only)

**Setup**: Set environment variable `BYPASS_RATE_LIMIT=true`

**Steps**:
1. Deploy Edge Function with bypass enabled
2. Make unlimited requests

**Expected Result**:
- No rate limiting applied
- All requests succeed

**Important**: Remove bypass before production deployment!

---

## Database Schema Verification

### Verify Tables Exist

```sql
-- Check rate_limits table
SELECT * FROM public.rate_limits LIMIT 1;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE tablename = 'rate_limits';

-- Expected indexes:
-- - idx_rate_limits_limit_key
-- - idx_rate_limits_created_at
-- - idx_rate_limits_limit_type

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename = 'rate_limits';
-- Should return: rowsecurity = true
```

### Verify Cascading Deletion

```sql
-- Create test user
-- Create test transaction for user
-- Delete user via Edge Function
-- Verify cascading:

SELECT * FROM public.messages WHERE user_id = '<deleted_user_id>';
-- Should be anonymized or deleted

SELECT * FROM public.pricing_tiers WHERE user_id = '<deleted_user_id>';
-- Should be deleted

SELECT * FROM public.profiles WHERE id = '<deleted_user_id>';
-- Should be deleted
```

---

## Edge Function Deployment

### Deploy Commands

```bash
# Deploy rate limits migration
npx supabase db push

# Deploy delete-user-account function
npx supabase functions deploy delete-user-account

# Verify deployment
npx supabase functions list

# Check logs after testing
npx supabase functions logs delete-user-account --tail
```

### Environment Variables Required

**Supabase Dashboard → Edge Functions → Secrets**:
- `SUPABASE_URL` ✓ (already set)
- `SUPABASE_SERVICE_ROLE_KEY` ✓ (already set)
- `SUPABASE_ANON_KEY` ✓ (already set)
- `BYPASS_RATE_LIMIT` (optional, testing only)

---

## Security Checklist

### Account Deletion
- [x] Requires authentication (JWT)
- [x] Requires password re-authentication
- [x] Requires explicit confirmation text
- [x] Blocks deletion with active transactions
- [x] Blocks deletion with pending payouts
- [x] Rate limited (1 per hour)
- [x] Audit log created
- [x] Data anonymization (GDPR compliant)

### Rate Limiting
- [x] IP-based tracking
- [x] User-based tracking (where applicable)
- [x] Automatic cleanup of expired records
- [x] Proper HTTP 429 responses
- [x] Retry-After headers
- [x] Fail-open on errors (availability over strict limiting)

### Language Standardization
- [x] All user-facing text in English
- [x] Consistent error messages
- [x] Professional tone
- [x] Clear instructions

---

## Rollback Plan

If critical issues found:

### 1. Disable Account Deletion
```typescript
// In AccountSettings.tsx, re-add disabled prop
<Button disabled>Delete Account</Button>
```

### 2. Revert Migration
```sql
-- Drop rate_limits table if needed
DROP TABLE IF EXISTS public.rate_limits CASCADE;
```

### 3. Revert Language Changes
```bash
git revert <commit_hash>
```

### 4. Undeploy Edge Function
```bash
# Note: Cannot "undeploy" but can deploy previous version
# Or set verify_jwt = false to make it inaccessible
```

---

## Performance Testing

### Rate Limit Table Growth

**Monitor table size**:
```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('public.rate_limits'));

-- Count records
SELECT COUNT(*) FROM public.rate_limits;

-- Check oldest record
SELECT MIN(created_at) FROM public.rate_limits;
```

**Expected**:
- Records auto-cleanup after window expires
- Table size should remain small (< 10,000 rows under normal load)

### Edge Function Performance

**Monitor function execution time**:
- Check Supabase function logs
- Look for slow queries
- Expected: < 500ms per request

---

## Known Issues & Limitations

### Account Deletion
- **Issue**: Messages are anonymized, not deleted (for audit trail)
- **Reason**: Legal/tax compliance may require retention
- **Mitigation**: Content replaced with `[DELETED]`

- **Issue**: Cannot delete account with active transactions
- **Reason**: Financial integrity - funds must be resolved first
- **Mitigation**: Clear error message guides user

### Rate Limiting
- **Issue**: Rate limits are per IP, not per user (for login)
- **Reason**: User may not be authenticated yet
- **Mitigation**: Combines IP + identifier where possible

- **Issue**: Rate limits fail-open on database errors
- **Reason**: Availability over strict security
- **Mitigation**: Errors are logged for monitoring

---

## Post-Deployment Monitoring

### Metrics to Track

1. **Account Deletions**
```sql
SELECT COUNT(*), DATE(created_at) as date
FROM public.admin_actions
WHERE action_type = 'account_deletion'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

2. **Rate Limit Hits**
```sql
SELECT limit_type, COUNT(*) as hits
FROM public.rate_limits
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY limit_type
ORDER BY hits DESC;
```

3. **Failed Deletions** (check function logs)
```bash
npx supabase functions logs delete-user-account --tail
```

### Alerts to Configure

- Rate limit table exceeds 100,000 rows
- Account deletion failures spike
- Edge function errors > 1%

---

## Testing Summary Checklist

### Before Merge
- [ ] All test cases pass
- [ ] No French text remains in codebase
- [ ] Rate limiting verified on all endpoints
- [ ] Database migration applied successfully
- [ ] Edge function deployed and tested
- [ ] No active bugs or critical issues
- [ ] Performance acceptable (< 500ms)
- [ ] Security review completed
- [ ] Documentation updated (CLAUDE.md)

### After Merge
- [ ] Monitor function logs for 24 hours
- [ ] Check rate limit table growth
- [ ] Verify no user complaints
- [ ] Update status in project board

---

## Contact & Support

**For Issues**:
- Check function logs: `npx supabase functions logs delete-user-account`
- Check database: Query `rate_limits` and `admin_actions` tables
- Review this document for troubleshooting

**For Questions**:
- Reference `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/CLAUDE.md`
- Check database schema: `/home/marc/code/MarcoBlch/guaranteed-inquiry-paywall/DATABASE_SCHEMA.md`

---

**End of Testing Guide**
