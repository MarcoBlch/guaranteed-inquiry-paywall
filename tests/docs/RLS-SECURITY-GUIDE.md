# Row Level Security (RLS) Implementation Guide

**Last Updated**: 2025-10-17
**Migration**: `20251017000000_secure_analytics_and_rls.sql`
**Status**: ✅ Production Ready

---

## 🎯 Overview

This guide documents the comprehensive Row Level Security (RLS) implementation for the Fastpass Escrow System. RLS provides database-level access control that works independently of frontend logic, ensuring data isolation even if UI security is bypassed.

---

## 🔐 Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Frontend (Dashboard.tsx)              │
│ - Conditional tab rendering based on isAdmin   │
│ - UI-level access control                      │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ Layer 2: Supabase Client SDK                   │
│ - JWT authentication                            │
│ - Session management                            │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ Layer 3: Database RLS (THIS IMPLEMENTATION)    │
│ - Table-level policies                         │
│ - SQL-enforced access control                  │
│ - Works even if frontend is bypassed           │
└─────────────────────────────────────────────────┘
```

### Key Principle

**Frontend shows, Backend enforces.**

Even if a user:
- Modifies frontend JavaScript
- Makes direct API calls
- Uses Supabase client bypassing UI

...the database will still enforce access control via RLS policies.

---

## 📊 User Access Patterns

### Regular Users (Receivers)

```sql
-- Can see ONLY their own data
messages         → WHERE user_id = auth.uid()
transactions     → WHERE recipient_user_id = auth.uid()
email_logs       → WHERE message_id IN (their messages)
profiles         → WHERE id = auth.uid()
```

### Admin Users

```sql
-- Can see ALL data across all users
messages         → ALL ROWS
transactions     → ALL ROWS
email_logs       → ALL ROWS
profiles         → ALL ROWS
analytics_views  → Platform-wide stats
```

### Anonymous Users (Senders)

```sql
-- NO database access (payments via Edge Functions with service role)
-- Edge Functions use service_role_key to bypass RLS
```

---

## 🛠️ Implementation Details

### Core Components

#### 1. Admin Detection Function

```sql
CREATE FUNCTION auth.is_admin()
RETURNS BOOLEAN
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

**Why SECURITY DEFINER?**
- Needs to read `profiles.is_admin` column
- Users might not have SELECT permission on profiles yet
- Safe because it only returns boolean, no data exposure

#### 2. Secured Analytics Views

**Before (INSECURE)**:
```sql
CREATE VIEW email_service_stats
WITH (security_barrier = true)
SECURITY DEFINER  -- ❌ Runs with elevated privileges
AS SELECT * FROM email_logs;
```

**After (SECURE)**:
```sql
CREATE VIEW email_service_stats AS
SELECT *
FROM email_logs
WHERE EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid()
  AND is_admin = true
);  -- ✅ Only returns data if user is admin
```

#### 3. RLS Policies Structure

Each critical table has 3 policies:

1. **SELECT Policy**: Who can read rows
2. **INSERT Policy**: Who can create rows
3. **UPDATE Policy**: Who can modify rows

Example for `messages` table:
```sql
-- SELECT: Users see own messages, admins see all
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.is_admin()
  );

-- INSERT: Only service role (via Edge Functions)
CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- UPDATE: Users update own, admins update any
CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.is_admin()
  );
```

---

## 🚀 Deployment

### Step 1: Apply Migration

```bash
# Push migration to database
npx supabase db push

# Or apply manually via Supabase Dashboard
# SQL Editor → Paste migration → Run
```

### Step 2: Verify RLS

Run verification script:
```bash
# Open Supabase Dashboard → SQL Editor
# Run: tests/sql/verify-rls-security.sql
```

Expected output:
```
✓ All critical tables have RLS enabled
✓ You have admin access
✓ Has policies (2-3 per table)
✓ Returns data for admin views
```

### Step 3: Test Frontend

1. **As Regular User**:
   - Login with non-admin account
   - Dashboard shows only personal data
   - No "Admin Analytics" tab visible
   - Queries return only own messages/transactions

2. **As Admin** (`marc.bernard@ece-france.com`):
   - Login with admin account
   - Dashboard shows "Admin Analytics" tab
   - Queries return platform-wide data
   - Can see all users' transactions

### Step 4: Security Testing

Try to bypass frontend (should FAIL):
```javascript
// Attempt to read all profiles via console
const { data } = await supabase
  .from('profiles')
  .select('*');

// Regular user: Returns only own profile
// Admin: Returns all profiles
```

Try to read analytics views (should FAIL for non-admins):
```javascript
const { data } = await supabase
  .from('email_service_stats')
  .select('*');

// Regular user: Returns empty array
// Admin: Returns platform stats
```

---

## 🔍 Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause**: Trying to INSERT without proper permissions

**Solution**:
- Inserts should happen via Edge Functions with `service_role_key`
- Or user must have admin privileges

### Issue: Queries return empty results

**Possible causes**:
1. RLS policy is too restrictive
2. User not properly authenticated
3. Admin flag not set correctly

**Debug**:
```sql
-- Check your admin status
SELECT
  auth.uid() as my_user_id,
  auth.is_admin() as am_i_admin;

-- Check your profile
SELECT * FROM profiles WHERE id = auth.uid();

-- Check policies on table
SELECT * FROM pg_policies
WHERE tablename = 'messages';
```

### Issue: Edge Functions can't insert data

**Cause**: Edge Functions using anon key instead of service role key

**Solution**:
```typescript
// ❌ Wrong: Uses anon key (subject to RLS)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY')
);

// ✅ Correct: Uses service role (bypasses RLS)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);
```

---

## 📋 Table-by-Table Policies

### `profiles`

| Operation | Regular User | Admin |
|-----------|-------------|-------|
| SELECT own profile | ✅ | ✅ |
| SELECT all profiles | ❌ | ✅ |
| UPDATE own profile | ✅ | ✅ |
| UPDATE any profile | ❌ | ✅ |
| INSERT profile | ❌ | ✅ |

### `messages`

| Operation | Regular User (recipient) | Admin |
|-----------|-------------------------|-------|
| SELECT own messages | ✅ | ✅ |
| SELECT all messages | ❌ | ✅ |
| INSERT message | ❌ (via Edge Function) | ✅ |
| UPDATE own message | ✅ | ✅ |

### `escrow_transactions`

| Operation | Regular User (recipient) | Admin |
|-----------|-------------------------|-------|
| SELECT own transactions | ✅ | ✅ |
| SELECT all transactions | ❌ | ✅ |
| INSERT transaction | ❌ (via Edge Function) | ✅ |
| UPDATE transaction | ❌ (via Edge Function) | ✅ |

### `email_logs`

| Operation | Regular User | Admin |
|-----------|-------------|-------|
| SELECT logs for own messages | ✅ | ✅ |
| SELECT all logs | ❌ | ✅ |
| INSERT/UPDATE | ❌ (via Edge Function) | ✅ |

### `message_responses`

| Operation | Regular User (recipient) | Admin |
|-----------|-------------------------|-------|
| SELECT responses for own messages | ✅ | ✅ |
| INSERT response for own message | ✅ | ✅ |
| UPDATE response for own message | ✅ | ✅ |

### `email_response_tracking`

| Operation | Regular User | Admin |
|-----------|-------------|-------|
| SELECT tracking for own messages | ✅ | ✅ |
| SELECT all tracking | ❌ | ✅ |
| INSERT/UPDATE | ❌ (via Edge Function) | ✅ |

---

## 🧪 Testing Checklist

### Pre-Deployment

- [ ] Migration syntax validated
- [ ] No breaking changes to existing queries
- [ ] Backup database before applying

### Post-Deployment

- [ ] All tables show `RLS enabled = true`
- [ ] Run verification script (all checks pass)
- [ ] Regular user can login and see own data
- [ ] Regular user CANNOT see other users' data
- [ ] Admin can see platform-wide data
- [ ] Admin Analytics tab shows correct stats
- [ ] Edge Functions can still insert/update (service role)
- [ ] Anonymous payment flow still works

### Security Validation

- [ ] Attempt to bypass frontend (fails gracefully)
- [ ] Direct API calls respect RLS
- [ ] Analytics views return empty for non-admins
- [ ] Admin helper function works correctly

---

## 📚 References

- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Migration File**: `supabase/migrations/20251017000000_secure_analytics_and_rls.sql`
- **Verification Script**: `tests/sql/verify-rls-security.sql`

---

## 🔄 Future Enhancements

### Considered but not implemented

1. **Granular permissions**: Role-based access (viewer, editor, admin)
   - Current: Binary (admin/non-admin)
   - Future: Multiple permission levels

2. **Audit logging**: Track who accessed what
   - Current: Manual via security_audit table
   - Future: Automatic RLS access logging

3. **Time-based access**: Expire admin privileges
   - Current: Permanent admin flag
   - Future: Expiring admin tokens

4. **IP-based restrictions**: Admin access only from certain IPs
   - Current: Any IP with valid credentials
   - Future: IP whitelist for admin operations

---

**Security is not a feature, it's a foundation.**

This RLS implementation ensures that even if frontend code is compromised, your database remains secure. Always test thoroughly after changes!
