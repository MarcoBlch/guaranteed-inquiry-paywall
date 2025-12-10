#!/bin/bash

# Deployment script for file attachment feature
# Created: 2025-12-10

set -e  # Exit on error

echo "=========================================="
echo "File Attachment Feature Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Database Migration
echo -e "${YELLOW}Step 1/4: Applying database migration...${NC}"
npx supabase db push
echo -e "${GREEN}✓ Database migration completed${NC}"
echo ""

# Step 2: Deploy Edge Functions
echo -e "${YELLOW}Step 2/4: Deploying Edge Functions...${NC}"

echo "  - Deploying upload-message-attachment..."
npx supabase functions deploy upload-message-attachment --no-verify-jwt
echo -e "${GREEN}  ✓ upload-message-attachment deployed${NC}"

echo "  - Deploying postmark-send-message..."
npx supabase functions deploy postmark-send-message --no-verify-jwt
echo -e "${GREEN}  ✓ postmark-send-message deployed${NC}"

echo "  - Deploying process-escrow-payment..."
npx supabase functions deploy process-escrow-payment --no-verify-jwt
echo -e "${GREEN}  ✓ process-escrow-payment deployed${NC}"

echo -e "${GREEN}✓ All Edge Functions deployed${NC}"
echo ""

# Step 3: Verify Storage Bucket
echo -e "${YELLOW}Step 3/4: Verifying Storage bucket...${NC}"
echo "Please manually verify in Supabase Dashboard:"
echo "  1. Go to Storage"
echo "  2. Check 'message-attachments' bucket exists"
echo "  3. Verify RLS policies are active"
read -p "Press Enter to continue after verification..."
echo -e "${GREEN}✓ Storage bucket verified${NC}"
echo ""

# Step 4: Frontend Build
echo -e "${YELLOW}Step 4/4: Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend build completed${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Push frontend to main branch (auto-deploys via Vercel)"
echo "2. Run manual tests (see ATTACHMENT-FEATURE-GUIDE.md)"
echo "3. Monitor Edge Function logs"
echo "4. Check Postmark email delivery"
echo ""
echo "Verification commands:"
echo "  npx supabase functions logs upload-message-attachment"
echo "  npx supabase storage ls message-attachments"
echo ""
echo -e "${YELLOW}Happy testing!${NC}"
