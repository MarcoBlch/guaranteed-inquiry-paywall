# FastPass Invite System - Manual Test Checklist

This document provides a step-by-step checklist for manually testing the invite system in the browser.

## Prerequisites

Before testing, ensure:
- [ ] Local development server is running (`npm run dev`)
- [ ] Supabase Edge Functions are deployed
- [ ] You have access to Supabase Dashboard for database inspection
- [ ] You have at least one valid test invite code (with `test-` prefix)

## Test Environment Setup

### Creating Test Codes (via Supabase Dashboard)

1. Go to Supabase Dashboard > Table Editor > `invite_codes`
2. Create test codes with these patterns:

| Code | Tier | max_uses | current_uses | expires_at | is_active |
|------|------|----------|--------------|------------|-----------|
| `test-valid-001` | founder | 1 | 0 | 30 days from now | true |
| `test-used-001` | founder | 1 | 1 | 30 days from now | true |
| `test-expired-001` | founder | 1 | 0 | yesterday | true |
| `test-inactive-001` | founder | 1 | 0 | 30 days from now | false |

---

## Test Cases

### 1. Platform Settings Check

**Objective**: Verify platform settings are accessible without authentication

**Steps**:
1. [ ] Open browser DevTools (F12) > Network tab
2. [ ] Navigate to the signup/auth page
3. [ ] Look for request to `get-platform-settings`
4. [ ] Verify response includes `invite_only_mode` setting

**Expected Result**:
- Response returns 200 OK
- JSON includes `invite_only_mode: true` or `false`
- No authentication errors

---

### 2. Auth Page - Invite Mode Display

**Objective**: Verify the auth page shows invite code field when invite-only mode is enabled

**Steps**:
1. [ ] Ensure `platform_settings.invite_only_mode = true` in database
2. [ ] Navigate to `/auth` (or signup page)
3. [ ] Observe the form

**Expected Result**:
- [ ] Invite code input field is visible
- [ ] Field is marked as required
- [ ] Appropriate messaging about invite-only access

---

### 3. Valid Invite Code Flow

**Objective**: Test successful signup with valid invite code

**Steps**:
1. [ ] Navigate to `/auth`
2. [ ] Enter a valid test email (e.g., `test+valid@example.com`)
3. [ ] Enter password meeting requirements
4. [ ] Enter valid invite code: `test-valid-001`
5. [ ] Submit the form

**Expected Result**:
- [ ] Form validates successfully
- [ ] Invite code shows as valid (green checkmark or similar)
- [ ] User is created (check Supabase Auth > Users)
- [ ] `user_tiers` record created with correct tier
- [ ] `invite_codes.current_uses` incremented by 1

---

### 4. Invalid Invite Code Flow

**Objective**: Test rejection of invalid invite codes

**Steps**:
1. [ ] Navigate to `/auth`
2. [ ] Fill in valid email and password
3. [ ] Enter invalid code: `FAKE-CODE-12345`
4. [ ] Submit or trigger validation

**Expected Result**:
- [ ] Error message displayed: "Invalid invite code" or similar
- [ ] Form submission blocked
- [ ] No user created

---

### 5. Already-Used Code Flow

**Objective**: Test rejection of exhausted invite codes

**Steps**:
1. [ ] Navigate to `/auth`
2. [ ] Fill in valid email and password
3. [ ] Enter used code: `test-used-001`
4. [ ] Submit or trigger validation

**Expected Result**:
- [ ] Error message: "This invite code has already been used" or similar
- [ ] Form submission blocked
- [ ] No user created

---

### 6. Expired Code Flow

**Objective**: Test rejection of expired invite codes

**Steps**:
1. [ ] Navigate to `/auth`
2. [ ] Fill in valid email and password
3. [ ] Enter expired code: `test-expired-001`
4. [ ] Submit or trigger validation

**Expected Result**:
- [ ] Error message: "This invite code has expired" or similar
- [ ] Form submission blocked
- [ ] No user created

---

### 7. Inactive Code Flow

**Objective**: Test rejection of deactivated invite codes

**Steps**:
1. [ ] Navigate to `/auth`
2. [ ] Fill in valid email and password
3. [ ] Enter inactive code: `test-inactive-001`
4. [ ] Submit or trigger validation

**Expected Result**:
- [ ] Error message: "Invalid invite code" or similar
- [ ] Form submission blocked
- [ ] No user created

---

### 8. Open Registration Mode

**Objective**: Verify signup works without code when invite-only is disabled

**Steps**:
1. [ ] Set `platform_settings.invite_only_mode = false` in database
2. [ ] Navigate to `/auth`
3. [ ] Fill in valid email and password
4. [ ] Submit (no invite code required)

**Expected Result**:
- [ ] Invite code field is hidden or optional
- [ ] User created successfully
- [ ] Default tier assigned (or `free` tier)

---

### 9. User Tier Assignment

**Objective**: Verify correct tier is assigned based on invite code

**Steps**:
1. [ ] Create new user with `founder` tier invite code
2. [ ] Check `user_tiers` table in Supabase

**Expected Result**:
- [ ] `user_tiers` record exists for new user
- [ ] `tier` field matches invite code tier
- [ ] `invite_code_used` field contains the code used

---

### 10. Real-time Code Validation (if implemented)

**Objective**: Test inline validation of invite codes

**Steps**:
1. [ ] Navigate to `/auth`
2. [ ] Start typing an invite code
3. [ ] Observe validation feedback

**Expected Result**:
- [ ] Validation triggers after user stops typing (debounced)
- [ ] Visual feedback shows valid/invalid state
- [ ] No excessive API calls (check Network tab)

---

## Database Verification Queries

Run these in Supabase SQL Editor to verify state:

### Check invite codes
```sql
SELECT code, tier, max_uses, current_uses, expires_at, is_active, created_at
FROM invite_codes
WHERE code LIKE 'test-%'
ORDER BY created_at DESC;
```

### Check user tiers
```sql
SELECT ut.*, p.email
FROM user_tiers ut
JOIN auth.users au ON ut.user_id = au.id
JOIN profiles p ON ut.user_id = p.id
ORDER BY ut.created_at DESC
LIMIT 10;
```

### Check platform settings
```sql
SELECT * FROM platform_settings;
```

---

## Cleanup After Testing

**Important**: Clean up test data after testing to avoid clutter.

### Delete test invite codes
```sql
DELETE FROM invite_codes WHERE code LIKE 'test-%';
```

### Delete test users (if needed)
```sql
-- First identify test users
SELECT id, email FROM auth.users WHERE email LIKE 'test+%@example.com';

-- Then delete their related records (cascade should handle most)
-- Be careful with this in production!
```

---

## Edge Function Logs

To debug issues, check Edge Function logs:

1. Go to Supabase Dashboard > Edge Functions
2. Select the function (e.g., `validate-invite-code`)
3. Click "Logs" tab
4. Look for recent invocations and any errors

---

## Common Issues & Solutions

### Issue: Invite code field not showing
- **Check**: `platform_settings.invite_only_mode` value
- **Check**: Frontend is fetching and using platform settings

### Issue: Valid code rejected
- **Check**: Code exists in `invite_codes` table
- **Check**: `is_active = true`
- **Check**: `current_uses < max_uses`
- **Check**: `expires_at > now()`

### Issue: User created but no tier assigned
- **Check**: `redeem-invite-code` function is called after user creation
- **Check**: Function logs for errors
- **Check**: RLS policies on `user_tiers` table

### Issue: 500 error on validation
- **Check**: Edge Function logs
- **Check**: Database connection
- **Check**: RLS policies allow service role access

---

## Sign-off

| Test Case | Tester | Date | Pass/Fail | Notes |
|-----------|--------|------|-----------|-------|
| 1. Platform Settings | | | | |
| 2. Auth Page Display | | | | |
| 3. Valid Code | | | | |
| 4. Invalid Code | | | | |
| 5. Used Code | | | | |
| 6. Expired Code | | | | |
| 7. Inactive Code | | | | |
| 8. Open Registration | | | | |
| 9. Tier Assignment | | | | |
| 10. Real-time Validation | | | | |

---

*Last Updated: $(date +%Y-%m-%d)*
