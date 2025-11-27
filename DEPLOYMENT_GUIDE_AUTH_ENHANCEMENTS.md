# Authentication Enhancements - Deployment Guide

**Branch**: `feature/auth-enhancements`
**Created**: 2025-11-27
**Status**: Ready for Deployment

## Summary of Changes

This feature branch implements three critical authentication enhancements:

1. **Account Deletion Backend** - Secure, GDPR-compliant account deletion
2. **Language Standardization** - All French text converted to English
3. **Rate Limiting** - Protection against brute-force attacks

## Commits

```
414f3b7 docs: update database schema documentation with rate_limits table
c0547aa docs: add comprehensive testing guide for authentication enhancements
2c69acf feat: enable account deletion UI in AccountSettings
ed6b63e feat: implement secure account deletion with cascade handling
fd7a417 feat: implement comprehensive rate limiting for authentication endpoints
7c1a373 fix: standardize all authentication error messages to English
```

## Files Changed

### Frontend
- `/src/components/auth/AuthForm.tsx` - English error messages
- `/src/pages/AccountSettings.tsx` - Account deletion UI (new file)
- `/src/pages/Dashboard.tsx` - Added Account Settings button
- `/src/App.tsx` - Added /settings route

### Backend
- `/supabase/functions/delete-user-account/index.ts` - New Edge Function
- `/supabase/functions/_shared/rateLimiter.ts` - Reusable rate limiting utility
- `/supabase/config.toml` - Added delete-user-account function config
- `/supabase/migrations/20251127000001_create_rate_limits_table.sql` - New table

### Documentation
- `/AUTH_ENHANCEMENTS_TESTING.md` - Comprehensive testing guide
- `/DATABASE_SCHEMA.md` - Updated schema documentation

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] Review all commits for security issues
- [ ] Verify no sensitive data in commits
- [ ] Check that no French text remains in codebase
- [ ] Verify rate limiting logic is correct
- [ ] Review account deletion cascade logic

### 2. Testing
- [ ] Run frontend build: `npm run build`
- [ ] Test French → English changes in auth flow
- [ ] Test account deletion happy path
- [ ] Test account deletion edge cases (active transactions)
- [ ] Test rate limiting on login attempts
- [ ] Verify database migration syntax

### 3. Environment Variables
**Required** (should already exist):
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_ANON_KEY`

**Optional** (testing only):
- [ ] `BYPASS_RATE_LIMIT` (set to `true` for testing, remove for production)

---

## Deployment Steps

### Step 1: Deploy Database Migration

```bash
# Navigate to project root
cd /home/marc/code/MarcoBlch/guaranteed-inquiry-paywall

# Apply migration to create rate_limits table
npx supabase db push

# Verify table created
# Query: SELECT * FROM public.rate_limits LIMIT 1;
```

**Expected Output**: Table `rate_limits` created with indexes and RLS policies

### Step 2: Deploy Edge Function

```bash
# Deploy delete-user-account function
npx supabase functions deploy delete-user-account

# Verify deployment
npx supabase functions list
# Should show: delete-user-account (verify_jwt: true)
```

**Expected Output**: Function deployed successfully, appears in function list

### Step 3: Test Edge Function

```bash
# Check function logs
npx supabase functions logs delete-user-account --tail

# Make test request (requires valid JWT)
# Use Postman or curl with Authorization header
```

### Step 4: Deploy Frontend (Vercel)

**Option A: Via GitHub** (Recommended)
```bash
# Push feature branch
git push origin feature/auth-enhancements

# Create Pull Request on GitHub
# Merge to main branch
# Vercel auto-deploys on merge to main
```

**Option B: Manual Deployment** (Not recommended)
```bash
# Build locally
npm run build

# Deploy via Vercel CLI (if configured)
vercel --prod
```

### Step 5: Verify Deployment

**Frontend**:
- [ ] Visit production site
- [ ] Test login with wrong password (English error message)
- [ ] Navigate to Account Settings
- [ ] Verify "Delete Account" button is enabled
- [ ] Test opening delete dialog (DO NOT ACTUALLY DELETE)

**Backend**:
- [ ] Check Supabase dashboard → Edge Functions
- [ ] Verify `delete-user-account` is deployed
- [ ] Check function logs for errors
- [ ] Query `rate_limits` table to verify it's empty

```sql
SELECT COUNT(*) FROM public.rate_limits;
-- Should return: 0 (or small number if testing)
```

### Step 6: Monitor for Issues

**First 24 hours after deployment**:
- Monitor function logs: `npx supabase functions logs delete-user-account`
- Check rate limit table growth: `SELECT COUNT(*) FROM public.rate_limits;`
- Watch for user error reports
- Monitor Vercel deployment logs

---

## Testing After Deployment

See `/AUTH_ENHANCEMENTS_TESTING.md` for comprehensive test cases.

### Quick Smoke Tests

**1. Language Standardization**
- Go to `/auth`
- Enter wrong password
- Verify error: "Invalid email or password" (English)

**2. Account Settings Access**
- Login to `/dashboard`
- Click "Account" button in header
- Verify redirect to `/settings`
- Verify "Delete Account" button is visible and enabled

**3. Rate Limiting** (Use test account)
- Attempt login 6 times with wrong password
- 6th attempt should return HTTP 429
- Error should mention rate limiting

**4. Database Migration**
```sql
-- Verify rate_limits table exists
\dt public.rate_limits

-- Check structure
\d public.rate_limits

-- Should show columns: id, limit_key, limit_type, ip_address, identifier, created_at
```

---

## Rollback Plan

If critical issues are discovered:

### 1. Rollback Frontend

**Option A: Revert on GitHub**
```bash
# On GitHub, create new PR to revert the merge commit
# Or manually revert locally:
git revert <merge_commit_hash>
git push origin main
# Vercel auto-deploys revert
```

**Option B: Redeploy Previous Version**
- Go to Vercel Dashboard
- Select previous deployment
- Click "Promote to Production"

### 2. Rollback Backend

**Disable Account Deletion Function**
```bash
# In supabase/config.toml, set:
# [functions.delete-user-account]
# verify_jwt = false  # Makes it inaccessible

# Or simply remove the function config entirely
# Then redeploy:
npx supabase functions deploy delete-user-account
```

**Drop Rate Limits Table** (if causing issues)
```sql
-- CAUTION: This deletes all rate limit data
DROP TABLE IF EXISTS public.rate_limits CASCADE;
```

### 3. Revert Code Changes

```bash
# Checkout main branch
git checkout main

# Revert to commit before merge
git reset --hard <commit_before_merge>
git push origin main --force  # Use with caution!

# Or create revert commit (safer)
git revert <merge_commit_hash>
git push origin main
```

---

## Known Limitations

### Account Deletion
1. **Cannot delete with active transactions**
   - Status: `held` or `processing`
   - User must wait for transactions to complete or expire
   - Clear error message provided

2. **Cannot delete with pending payouts**
   - Status: `pending_user_setup`
   - User must configure Stripe Connect first
   - Clear error message provided

3. **Messages are anonymized, not deleted**
   - Reason: Legal/tax compliance
   - Content replaced with `[DELETED]`
   - Sender email replaced with `deleted@fastpass.email`

### Rate Limiting
1. **Fails open on database errors**
   - Reason: Availability over strict security
   - Errors are logged for monitoring
   - Consider alerting if rate limit table is down

2. **IP-based limiting may affect shared IPs**
   - Corporate networks/VPNs may share IPs
   - Multiple users behind same IP count toward same limit
   - Mitigation: Generous limits (5 attempts per 15 min)

---

## Post-Deployment Monitoring

### Metrics to Track

**1. Account Deletions**
```sql
-- Daily account deletions
SELECT DATE(created_at) as date, COUNT(*) as deletions
FROM public.admin_actions
WHERE action_type = 'account_deletion'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
```

**2. Rate Limit Hits**
```sql
-- Rate limit events by type (last 24 hours)
SELECT limit_type, COUNT(*) as hits
FROM public.rate_limits
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY limit_type
ORDER BY hits DESC;
```

**3. Edge Function Performance**
```bash
# Check function logs for errors
npx supabase functions logs delete-user-account

# Look for:
# - Error rates
# - Execution time (should be < 500ms)
# - Rate limit violations
```

**4. Rate Limits Table Size**
```sql
-- Check table size and record count
SELECT
  pg_size_pretty(pg_total_relation_size('public.rate_limits')) as size,
  COUNT(*) as records
FROM public.rate_limits;

-- Expected: < 10,000 records under normal load
-- If growing too large, check cleanup logic
```

### Alerting Recommendations

**Set up alerts for**:
- Rate limit table exceeds 100,000 rows
- Account deletion function error rate > 5%
- Edge function execution time > 2 seconds
- Unusual spike in account deletions (> 10 per hour)

---

## Security Considerations

### Account Deletion
- ✓ Requires JWT authentication
- ✓ Requires password re-authentication
- ✓ Requires explicit confirmation text
- ✓ Rate limited to prevent abuse
- ✓ Audit trail in admin_actions table
- ✓ GDPR compliant (data anonymization)

### Rate Limiting
- ✓ IP-based tracking
- ✓ User-based tracking (where applicable)
- ✓ Proper HTTP 429 responses
- ✓ Service-role-only database access
- ✓ Automatic cleanup of expired records
- ✓ Fail-open strategy (availability)

### Best Practices
- Never expose service role key in frontend
- Always verify JWT for authenticated endpoints
- Log all account deletion attempts
- Monitor rate limit table for abuse patterns
- Regularly review admin_actions audit logs

---

## Support & Troubleshooting

### Common Issues

**1. "Cannot delete account with active transactions"**
- **Cause**: User has transactions with status `held` or `processing`
- **Solution**: User must wait for transactions to complete/expire
- **Admin Fix**: Manually resolve transaction if stuck

**2. Rate limit table growing too large**
- **Cause**: Cleanup logic not running
- **Solution**: Check rate limiting utility logic
- **Manual Fix**: Run cleanup query
```sql
DELETE FROM public.rate_limits
WHERE created_at < NOW() - INTERVAL '24 hours';
```

**3. Edge function failing with "service role key not found"**
- **Cause**: Environment variable not set in Supabase
- **Solution**: Add `SUPABASE_SERVICE_ROLE_KEY` in Supabase dashboard

**4. Rate limiting not working**
- **Cause**: `BYPASS_RATE_LIMIT=true` still set
- **Solution**: Remove environment variable
- **Verify**: Check Supabase → Edge Functions → Environment Variables

### Debug Commands

```bash
# View function logs
npx supabase functions logs delete-user-account --tail

# Check function environment
npx supabase functions inspect delete-user-account

# Test rate limiting locally
# Set BYPASS_RATE_LIMIT=true in .env for testing

# Query rate limit records
# psql or Supabase SQL Editor:
SELECT * FROM public.rate_limits ORDER BY created_at DESC LIMIT 10;
```

---

## Documentation Updates Needed

After successful deployment:

1. **Update CLAUDE.md**
   - Add account deletion to "Core Data Flow"
   - Add rate limiting to "Security Best Practices"
   - Update "Key Files to Know" section

2. **Update DATABASE_SCHEMA.md**
   - Verify rate_limits table is documented ✓ (already done)

3. **Update README** (if exists)
   - Add account deletion feature
   - Note rate limiting for security

---

## Success Criteria

Deployment is successful when:

- [x] All commits merged to main
- [x] Frontend deployed to production (Vercel)
- [x] Edge function deployed (Supabase)
- [x] Database migration applied
- [x] All smoke tests pass
- [ ] No critical errors in logs (first 24 hours)
- [ ] No user complaints about broken functionality
- [ ] Rate limiting working as expected
- [ ] Account deletion working for test account

---

## Contact

**For deployment issues**:
- Check function logs: `npx supabase functions logs delete-user-account`
- Check Vercel deployment logs
- Review testing guide: `/AUTH_ENHANCEMENTS_TESTING.md`

**For code questions**:
- Reference: `/CLAUDE.md` (project context)
- Reference: `/DATABASE_SCHEMA.md` (database structure)
- Git history: `git log --oneline feature/auth-enhancements`

---

**Deployment Date**: _To be filled after deployment_
**Deployed By**: _To be filled after deployment_
**Production URL**: https://fastpass.email
**Status**: ✅ Ready for Deployment

---

**End of Deployment Guide**
