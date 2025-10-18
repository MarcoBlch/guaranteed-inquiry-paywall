# RLS Security Deployment Checklist

**Migration**: `20251017000000_secure_analytics_and_rls.sql`
**Date**: 2025-10-17
**Impact**: Database-level security (non-breaking)

---

## ⚠️ Pre-Deployment

### 1. Backup Database

```bash
# Via Supabase Dashboard
# Settings → Database → Backup → Create backup

# Or via CLI (if configured)
npx supabase db dump > backup-$(date +%Y%m%d).sql
```

### 2. Review Migration

```bash
# Read the migration file
cat supabase/migrations/20251017000000_secure_analytics_and_rls.sql

# Check for any conflicts with your existing schema
```

### 3. Test Locally (Optional but Recommended)

```bash
# Start local Supabase
npx supabase start

# Apply migration locally
npx supabase db push

# Run verification
# Open http://localhost:54323 → SQL Editor
# Run: tests/sql/verify-rls-security.sql
```

---

## 🚀 Deployment Steps

### Step 1: Apply Migration to Production

**Option A: Via Supabase Dashboard** (Recommended for safety)

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251017000000_secure_analytics_and_rls.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Check for errors (should see "All critical tables have RLS enabled ✓")

**Option B: Via CLI** (Faster but less control)

```bash
# Push migration to linked project
npx supabase db push

# You should see:
# Applying migration 20251017000000_secure_analytics_and_rls.sql...
# Success!
```

### Step 2: Verify RLS is Active

1. Open Supabase Dashboard → SQL Editor
2. Run verification script:

```bash
# Copy contents from
cat tests/sql/verify-rls-security.sql

# Paste into SQL Editor → Run
```

Expected output:
```
✓ All critical tables have RLS enabled
✓ You have admin access
✓ Has policies (2-3 per table)
✓ Platform stats return data (admin only)
```

### Step 3: Test Frontend

#### As Regular User

1. Create/login with non-admin test account
2. Go to `/dashboard`
3. **Expected behavior**:
   - ✅ See own messages and transactions
   - ✅ No "Admin Analytics" tab visible
   - ✅ All queries return only personal data
   - ❌ Cannot see other users' data

#### As Admin

1. Login with `marc.bernard@ece-france.com`
2. Go to `/dashboard`
3. **Expected behavior**:
   - ✅ See all messages and transactions (if any exist)
   - ✅ "Admin Analytics" tab appears
   - ✅ Analytics show platform-wide stats
   - ✅ Can view all users' data

### Step 4: Test Edge Functions

Ensure Edge Functions can still create records:

```bash
# Test payment flow
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/process-escrow-payment \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "amount": 1000,
    "senderEmail": "test@example.com"
  }'

# Should succeed (service role bypasses RLS)
```

---

## ✅ Post-Deployment Verification

### Database Checks

Run these queries in SQL Editor:

```sql
-- 1. Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'messages', 'escrow_transactions');
-- All should show: rowsecurity = true

-- 2. Count policies
SELECT tablename, COUNT(*) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;
-- Each table should have 2-3 policies

-- 3. Test admin function
SELECT auth.is_admin();
-- Should return true if logged in as admin

-- 4. Check your admin status
SELECT u.email, p.is_admin
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.id = auth.uid();
-- Should show is_admin = true for marc.bernard@ece-france.com
```

### Frontend Checks

- [ ] Dashboard loads without errors
- [ ] Regular users see only their data
- [ ] Admin sees "Admin Analytics" tab
- [ ] No console errors in browser
- [ ] Payment flow still works (anonymous users)

### Security Checks

Try to bypass frontend (should FAIL):

```javascript
// Open browser console while logged in as regular user
const { data, error } = await supabase
  .from('escrow_transactions')
  .select('*');

console.log(data);
// Should return ONLY transactions for current user
// NOT all platform transactions
```

```javascript
// Try to read admin analytics
const { data, error } = await supabase
  .from('email_service_stats')
  .select('*');

console.log(data);
// Regular user: Returns empty array
// Admin: Returns platform stats
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied for table X"

**Cause**: RLS policy too restrictive

**Fix**: Check policy with:
```sql
SELECT * FROM pg_policies WHERE tablename = 'X';
```

### Issue: Dashboard shows no data

**Cause**: Possibly RLS blocking legitimate access

**Debug**:
```sql
-- Check your auth status
SELECT auth.uid(), auth.is_admin();

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'messages';

-- Temporarily disable RLS for testing (CAUTION: Production risk!)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- Re-enable after testing:
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

### Issue: Edge Functions failing

**Cause**: Using anon key instead of service role key

**Fix**: Verify Edge Functions use:
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  // ✅ This!
);
```

### Issue: False positive secret alerts

**Cause**: Build artifacts in git

**Fix**: Already handled in `.gitignore`, but if issues persist:
```bash
# Remove cached files
git rm -r --cached supabase/.temp/
git commit -m "chore: remove cached build artifacts"
```

---

## 🔄 Rollback Plan

If deployment causes issues:

### Quick Rollback (Disable RLS)

```sql
-- Temporarily disable RLS on critical tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions DISABLE ROW LEVEL SECURITY;

-- NOTE: This removes all RLS protection!
-- Use only for emergency rollback
-- Re-enable ASAP after fixing issues
```

### Full Rollback (Restore from Backup)

1. Go to Supabase Dashboard → Settings → Database → Backups
2. Select backup from before migration
3. Click "Restore"
4. Wait for restoration to complete
5. Verify data integrity

---

## 📊 Success Criteria

Deployment is successful when:

- [ ] All tables have RLS enabled
- [ ] Regular users see only own data
- [ ] Admin sees platform-wide data
- [ ] Edge Functions work normally
- [ ] Payment flow works for anonymous users
- [ ] No errors in Supabase logs
- [ ] Frontend loads without issues
- [ ] Security bypass attempts fail gracefully

---

## 📚 Documentation References

- **Implementation Guide**: `tests/docs/RLS-SECURITY-GUIDE.md`
- **Verification Script**: `tests/sql/verify-rls-security.sql`
- **Migration File**: `supabase/migrations/20251017000000_secure_analytics_and_rls.sql`
- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security

---

## 🎯 Next Steps After Deployment

1. Monitor Supabase logs for RLS-related errors (first 24 hours)
2. Test all user workflows (payment, response, analytics)
3. Update `CLAUDE.md` with RLS details
4. Consider adding RLS monitoring/alerting
5. Plan for future permission enhancements (roles, time-based access)

---

**Remember**: RLS is non-breaking. Existing functionality should work identically, just with better security! 🔒
