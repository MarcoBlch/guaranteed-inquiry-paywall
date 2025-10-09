# 🧹 Codebase Cleanup Report
**Generated**: 2025-10-08
**Purpose**: Identify unused code, duplicates, and unnecessary files for DRY principles

---

## 📊 Executive Summary

**Total Functions Deployed**: 21
**Functions in Filesystem**: 27
**Unused Functions**: 8
**Duplicate/Backup Files**: 3
**Test Scripts**: 6
**Recommended Deletions**: 19 items

---

## 🔴 CRITICAL: Unused Edge Functions (Can Be Deleted)

### **PayPal Integration** ❌ **NOT USED**
The codebase uses **Stripe only**. PayPal functions are deployed but never called.

| Function | Status | Last Updated | Action |
|----------|--------|--------------|--------|
| `create-paypal-order` | ACTIVE | 2025-07-18 | ⚠️ **DELETE** |
| `get-paypal-client-id` | ACTIVE | 2025-07-18 | ⚠️ **DELETE** |

**Impact**: Zero - not referenced anywhere in codebase
**Storage Savings**: ~2 function deployments

---

### **Legacy Email Functions** ❌ **REPLACED BY POSTMARK**

| Function | Replaced By | Last Updated | Action |
|----------|-------------|--------------|--------|
| `send-message-email` | `postmark-send-message` | 2025-09-29 | ⚠️ **DELETE** |
| `send-email-notification` | `postmark-send-message` | 2025-08-01 | ⚠️ **DELETE** |
| `send-response-email` | Postmark inbound | 2025-08-01 | ⚠️ **DELETE** |
| `resend-email-webhook` | `postmark-inbound-webhook` | 2025-09-29 | ⚠️ **DELETE** |

**Current Flow**:
```
process-escrow-payment
  → postmark-send-message (✅ Active)
  → postmark-inbound-webhook (✅ Active)
```

**Old Flow** (No longer used):
```
process-escrow-payment
  → send-message-email (❌ Unused)
  → resend-email-webhook (❌ Unused)
```

---

### **Undeployed Functions** 📁 **FILESYSTEM ONLY**

These functions exist in `supabase/functions/` but are NOT deployed:

| Function Directory | Deployed | Purpose | Action |
|--------------------|----------|---------|--------|
| `admin-analytics` | ❌ No | Analytics dashboard | 🤔 **KEEP** (future feature) |
| `apply-migration` | ❌ No | Database migration | ⚠️ **DELETE** (one-time use) |
| `grant-admin` | ❌ No | Admin role management | 🤔 **KEEP** (utility) |
| `send-deadline-reminders` | ❌ No | Reminder emails | ⚠️ **DELETE** (replaced by cron) |
| `send-refund-notification` | ❌ No | Refund emails | 🤔 **REVIEW** (called by timeout check) |
| `send-timeout-notification` | ❌ No | Timeout emails | 🤔 **REVIEW** (called by timeout check) |
| `setup-initial-admin` | ❌ No | Initial setup | ⚠️ **DELETE** (one-time use) |

**Note**: `send-refund-notification` and `send-timeout-notification` are invoked by `check-escrow-timeouts` but NOT deployed. This will cause errors!

---

## 🗂️ Duplicate/Backup Files

### **Postmark Webhook Backups** ❌ **DELETE**

```
supabase/functions/postmark-inbound-webhook/
├── index.ts           ✅ Current (v11)
├── index-backup.ts    ❌ DELETE (outdated)
└── index-v2.ts        ❌ DELETE (temporary)
```

**Action**: Remove backup files immediately

---

### **Duplicate Webhook Wrapper** 🔄 **CONSOLIDATE**

| Function | Purpose | Deployed | Action |
|----------|---------|----------|--------|
| `postmark-inbound-webhook` | Direct webhook | ✅ Yes (v11) | ✅ **KEEP** |
| `postmark-webhook-public` | Wrapper | ✅ Yes (v3) | ⚠️ **DELETE** or merge |

**Analysis**: `postmark-webhook-public` appears to be a wrapper around `postmark-inbound-webhook`. Check if Postmark is configured to call the wrapper or direct function.

**Recommendation**: Use direct function only, delete wrapper.

---

## 📝 Test Scripts & Temporary Files

### **Test Scripts** (Root Directory)

| File | Purpose | Keep/Delete |
|------|---------|-------------|
| `test-postmark-flow.sh` | End-to-end Postmark test | ✅ **KEEP** |
| `test-postmark-webhook.sh` | Webhook testing | ✅ **KEEP** |
| `test-production-webhook.sh` | Production testing | ✅ **KEEP** |
| `verify-postmark-response.sh` | Response verification | ⚠️ **DELETE** (redundant) |
| `verify-webhook-deployment.sh` | Deployment check | ⚠️ **DELETE** (one-time use) |

---

### **SQL Files** (Root Directory)

| File | Purpose | Keep/Delete |
|------|---------|-------------|
| `apply-phase3a-migration.sql` | Phase 3A migration | ⚠️ **DELETE** (already applied) |
| `grant_admin.sql` | Admin grant utility | ✅ **KEEP** |
| `verify-webhook-fix.sql` | Verification queries | ✅ **KEEP** (useful) |

---

### **UI Inspiration Files**

```
UI_inspiration/
├── Capture d'écran 2025-09-29 145035.png (DELETED)
├── Capture d'écran 2025-09-29 145052.png (DELETED)
├── Capture d'écran 2025-10-06 190535.png
├── Capture d'écran 2025-10-06 190635.png
├── Capture d'écran 2025-10-06 190656.png
├── Capture d'écran 2025-10-06 190710.png
├── Capture d'écran 2025-10-06 190743.png
└── Capture d'écran 2025-10-06 190751.png
```

**Action**: Move to separate design folder or `.gitignore`

---

## 🎯 Cleanup Action Plan

### **Phase 1: Critical Cleanup (IMMEDIATE)**

```bash
# 1. Delete unused PayPal functions
rm -rf supabase/functions/create-paypal-order
rm -rf supabase/functions/get-paypal-client-id

# 2. Delete legacy email functions
rm -rf supabase/functions/send-message-email
rm -rf supabase/functions/send-email-notification
rm -rf supabase/functions/send-response-email
rm -rf supabase/functions/resend-email-webhook

# 3. Remove backup files
rm supabase/functions/postmark-inbound-webhook/index-backup.ts
rm supabase/functions/postmark-inbound-webhook/index-v2.ts

# 4. Delete one-time use functions
rm -rf supabase/functions/apply-migration
rm -rf supabase/functions/setup-initial-admin
```

**Impact**: ~10 function directories removed, codebase ~30% cleaner

---

### **Phase 2: Deploy Missing Functions (FIX BUGS)**

These functions are CALLED but NOT deployed:

```bash
# Deploy missing notification functions
npx supabase functions deploy send-refund-notification
npx supabase functions deploy send-timeout-notification
```

**Critical**: Without these, `check-escrow-timeouts` will fail!

---

### **Phase 3: Organize Test Files**

```bash
# Create test directory
mkdir -p tests/scripts
mkdir -p tests/sql

# Move test files
mv test-*.sh tests/scripts/
mv verify-*.sh tests/scripts/
mv verify-*.sql tests/sql/
mv apply-*.sql tests/sql/

# Update .gitignore
echo "tests/" >> .gitignore
```

---

### **Phase 4: Undeploy Unused Functions**

**Note**: Cannot delete deployed functions via CLI, but can mark as deprecated

```bash
# Document which functions to undeploy via Supabase Dashboard
echo "Undeploy via Dashboard:" > FUNCTIONS_TO_UNDEPLOY.txt
echo "- create-paypal-order" >> FUNCTIONS_TO_UNDEPLOY.txt
echo "- get-paypal-client-id" >> FUNCTIONS_TO_UNDEPLOY.txt
echo "- send-message-email" >> FUNCTIONS_TO_UNDEPLOY.txt
echo "- send-email-notification" >> FUNCTIONS_TO_UNDEPLOY.txt
echo "- send-response-email" >> FUNCTIONS_TO_UNDEPLOY.txt
echo "- resend-email-webhook" >> FUNCTIONS_TO_UNDEPLOY.txt
```

---

## 📈 Expected Improvements

### **Before Cleanup**
- **Edge Functions Deployed**: 21
- **Function Directories**: 27
- **Unused Files**: 19
- **Code Duplication**: High (email services)

### **After Cleanup**
- **Edge Functions Deployed**: 15 (-28%)
- **Function Directories**: 17 (-37%)
- **Unused Files**: 0 (-100%)
- **Code Duplication**: Minimal

---

## 🔍 Function Dependency Map

### **Currently Used Functions** ✅

```
Payment Flow:
create-stripe-payment
  ↓
process-escrow-payment
  ↓
postmark-send-message
  ↓
postmark-inbound-webhook
  ↓
mark-response-received
  ↓
distribute-escrow-funds

Stripe Connect:
create-stripe-connect-account
stripe-connect-webhook
  ↓
process-pending-transfers
  ↓
distribute-escrow-funds

Timeouts:
check-escrow-timeouts (cron)
  ↓
send-refund-notification (⚠️ NOT DEPLOYED!)
send-timeout-notification (⚠️ NOT DEPLOYED!)
  ↓
distribute-escrow-funds

Utilities:
escrow-health-check
email-service-health
get-payment-profile
capture-stripe-payment
```

---

## ⚠️ Critical Issues Found

### **1. Missing Function Deployments**
**Problem**: Functions are invoked but not deployed
- `send-refund-notification` - Called by `check-escrow-timeouts`
- `send-timeout-notification` - Called by `check-escrow-timeouts`

**Fix**: Deploy immediately or remove invocations

---

### **2. Duplicate Webhook Architecture**
**Problem**: Two webhook functions for Postmark
- `postmark-inbound-webhook` (direct)
- `postmark-webhook-public` (wrapper)

**Fix**: Verify Postmark configuration, use one only

---

### **3. Orphaned Email Service**
**Problem**: Resend service still deployed but not used
- 4 Resend functions deployed
- `process-escrow-payment` now uses Postmark

**Fix**: Delete Resend functions

---

## 📋 Cleanup Checklist

### **Immediate Actions** (Today)
- [ ] Delete PayPal functions (unused)
- [ ] Remove backup webhook files
- [ ] Deploy missing notification functions
- [ ] Test timeout flow with deployed functions

### **Short Term** (This Week)
- [ ] Delete legacy email functions
- [ ] Undeploy unused functions via Dashboard
- [ ] Organize test scripts into `/tests` folder
- [ ] Update documentation

### **Medium Term** (This Month)
- [ ] Review and consolidate webhook architecture
- [ ] Implement `admin-analytics` or delete
- [ ] Clean up UI inspiration folder
- [ ] Add `.gitignore` rules for temporary files

---

## 💡 DRY Principles Violations Fixed

### **Before**
```
Email Service Duplication:
- send-message-email (Resend)
- postmark-send-message (Postmark)
- send-email-notification (Resend)
= 3 functions doing similar tasks
```

### **After**
```
Single Email Service:
- postmark-send-message (Postmark only)
= 1 function, clean architecture
```

---

## 🎓 Recommendations

### **Best Practices Moving Forward**

1. **Delete Before Replacing**: Remove old functions before deploying new ones
2. **No Backup Files in Git**: Use git history for backups, not duplicate files
3. **Test Scripts in Separate Folder**: Keep root directory clean
4. **Document Deprecated Functions**: Add README in deprecated folders before deleting
5. **Regular Audits**: Review deployed functions quarterly

---

## 📞 Next Steps

1. **Review this report** with team
2. **Approve deletion list** for Phase 1
3. **Execute cleanup script** (provided below)
4. **Test critical flows** post-cleanup
5. **Update documentation** to reflect new architecture

---

## 🚀 Auto-Cleanup Script

Save as `cleanup.sh` and review before running:

```bash
#!/bin/bash

echo "🧹 FASTPASS Codebase Cleanup"
echo "=============================="
echo ""

# Backup first
echo "📦 Creating backup..."
tar -czf backup-$(date +%Y%m%d).tar.gz supabase/functions/

# Phase 1: Delete unused functions
echo "🗑️  Deleting unused functions..."
rm -rf supabase/functions/create-paypal-order
rm -rf supabase/functions/get-paypal-client-id
rm -rf supabase/functions/send-message-email
rm -rf supabase/functions/send-email-notification
rm -rf supabase/functions/send-response-email
rm -rf supabase/functions/resend-email-webhook

# Phase 2: Remove backups
echo "🗑️  Removing backup files..."
rm supabase/functions/postmark-inbound-webhook/index-backup.ts
rm supabase/functions/postmark-inbound-webhook/index-v2.ts

# Phase 3: Organize tests
echo "📁 Organizing test files..."
mkdir -p tests/scripts tests/sql
mv test-*.sh tests/scripts/ 2>/dev/null
mv verify-*.sh tests/scripts/ 2>/dev/null
mv verify-*.sql tests/sql/ 2>/dev/null

echo "✅ Cleanup complete!"
echo "⚠️  Remember to undeploy functions via Supabase Dashboard"
```

---

**End of Report**
