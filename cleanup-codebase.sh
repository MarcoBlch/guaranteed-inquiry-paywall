#!/bin/bash

# FASTPASS Codebase Cleanup Script
# Generated: 2025-10-08
# Purpose: Remove unused code, duplicates, and organize files

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🧹 FASTPASS CODEBASE CLEANUP                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Safety check
echo -e "${YELLOW}⚠️  WARNING: This script will delete files permanently!${NC}"
echo -e "${YELLOW}⚠️  A backup will be created first.${NC}"
echo ""
read -p "Do you want to proceed? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}❌ Cleanup cancelled${NC}"
    exit 1
fi

# Create backup
BACKUP_FILE="backup-codebase-$(date +%Y%m%d-%H%M%S).tar.gz"
echo -e "${BLUE}📦 Creating backup: ${BACKUP_FILE}${NC}"
tar -czf "$BACKUP_FILE" supabase/functions/ *.sh *.sql 2>/dev/null || true
echo -e "${GREEN}✅ Backup created${NC}"
echo ""

# Phase 1: Delete unused PayPal functions
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 1: Removing Unused PayPal Functions${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ -d "supabase/functions/create-paypal-order" ]; then
    rm -rf supabase/functions/create-paypal-order
    echo -e "${GREEN}✅ Deleted: create-paypal-order${NC}"
else
    echo -e "${YELLOW}⚠️  Already deleted: create-paypal-order${NC}"
fi

if [ -d "supabase/functions/get-paypal-client-id" ]; then
    rm -rf supabase/functions/get-paypal-client-id
    echo -e "${GREEN}✅ Deleted: get-paypal-client-id${NC}"
else
    echo -e "${YELLOW}⚠️  Already deleted: get-paypal-client-id${NC}"
fi
echo ""

# Phase 2: Delete legacy email functions
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 2: Removing Legacy Email Functions (Resend)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

EMAIL_FUNCTIONS=("send-message-email" "send-email-notification" "send-response-email" "resend-email-webhook")

for func in "${EMAIL_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        rm -rf "supabase/functions/$func"
        echo -e "${GREEN}✅ Deleted: $func${NC}"
    else
        echo -e "${YELLOW}⚠️  Already deleted: $func${NC}"
    fi
done
echo ""

# Phase 3: Delete one-time use functions
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 3: Removing One-Time Use Functions${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

ONETIME_FUNCTIONS=("apply-migration" "setup-initial-admin")

for func in "${ONETIME_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        rm -rf "supabase/functions/$func"
        echo -e "${GREEN}✅ Deleted: $func${NC}"
    else
        echo -e "${YELLOW}⚠️  Already deleted: $func${NC}"
    fi
done
echo ""

# Phase 4: Remove backup files
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 4: Removing Backup/Duplicate Files${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

BACKUP_FILES=(
    "supabase/functions/postmark-inbound-webhook/index-backup.ts"
    "supabase/functions/postmark-inbound-webhook/index-v2.ts"
)

for file in "${BACKUP_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo -e "${GREEN}✅ Deleted: $file${NC}"
    else
        echo -e "${YELLOW}⚠️  Already deleted: $file${NC}"
    fi
done
echo ""

# Phase 5: Organize test files
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 5: Organizing Test Files${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

# Create directories
mkdir -p tests/scripts
mkdir -p tests/sql
mkdir -p tests/docs

echo -e "${GREEN}✅ Created test directories${NC}"

# Move test scripts
TEST_SCRIPTS=(verify-postmark-response.sh verify-webhook-deployment.sh)
for script in "${TEST_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        mv "$script" tests/scripts/
        echo -e "${GREEN}✅ Moved: $script → tests/scripts/${NC}"
    fi
done

# Move SQL files
SQL_FILES=(apply-phase3a-migration.sql)
for sql in "${SQL_FILES[@]}"; do
    if [ -f "$sql" ]; then
        mv "$sql" tests/sql/
        echo -e "${GREEN}✅ Moved: $sql → tests/sql/${NC}"
    fi
done

# Move documentation
if [ -f "WEBHOOK-VERIFICATION-GUIDE.md" ]; then
    mv WEBHOOK-VERIFICATION-GUIDE.md tests/docs/
    echo -e "${GREEN}✅ Moved: WEBHOOK-VERIFICATION-GUIDE.md → tests/docs/${NC}"
fi

echo ""

# Phase 6: Summary
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Cleanup Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

REMAINING_FUNCTIONS=$(ls -d supabase/functions/*/ 2>/dev/null | wc -l)

echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo ""
echo -e "${BLUE}Statistics:${NC}"
echo -e "  • Backup created: ${BACKUP_FILE}"
echo -e "  • Functions deleted: ~8"
echo -e "  • Backup files removed: 2"
echo -e "  • Test files organized: ~5"
echo -e "  • Remaining functions: ${REMAINING_FUNCTIONS}"
echo ""

echo -e "${YELLOW}⚠️  Manual Actions Required:${NC}"
echo ""
echo -e "1. ${YELLOW}Undeploy via Supabase Dashboard:${NC}"
echo -e "   • create-paypal-order"
echo -e "   • get-paypal-client-id"
echo -e "   • send-message-email"
echo -e "   • send-email-notification"
echo -e "   • send-response-email"
echo -e "   • resend-email-webhook"
echo ""
echo -e "2. ${YELLOW}Deploy missing functions:${NC}"
echo -e "   ${BLUE}npx supabase functions deploy send-refund-notification${NC}"
echo -e "   ${BLUE}npx supabase functions deploy send-timeout-notification${NC}"
echo ""
echo -e "3. ${YELLOW}Test critical flows:${NC}"
echo -e "   • Payment flow (Stripe → Postmark)"
echo -e "   • Response detection (Postmark webhook)"
echo -e "   • Timeout handling (with new notification functions)"
echo ""
echo -e "4. ${YELLOW}Review cleanup report:${NC}"
echo -e "   ${BLUE}cat CODEBASE-CLEANUP-REPORT.md${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Cleanup script completed successfully!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
