#!/bin/bash

# ============================================================================
# POSTMARK WEBHOOK DATE PARSING FIX - VERIFICATION SCRIPT
# ============================================================================
# This script helps verify the date parsing fix is working correctly
# It checks database activity and provides guidance for testing
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}POSTMARK WEBHOOK FIX VERIFICATION${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not found in environment${NC}"
    echo "Loading from .env file..."
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo -e "${RED}❌ No .env file found. Please set DATABASE_URL.${NC}"
        exit 1
    fi
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql command not found. Please install PostgreSQL client.${NC}"
    echo ""
    echo "Install with:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  macOS: brew install postgresql"
    exit 1
fi

echo -e "${GREEN}✅ Database connection configured${NC}"
echo ""

# ============================================================================
# Function: Run Query with Header
# ============================================================================
run_query() {
    local title=$1
    local query=$2

    echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}$title${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────${NC}"

    psql "$DATABASE_URL" -c "$query" 2>&1 | head -n 50

    echo ""
}

# ============================================================================
# Check 1: Recent Email Response Tracking
# ============================================================================
run_query "📊 Recent Email Response Tracking (Last 10)" "
SELECT
  LEFT(message_id::text, 8) || '...' as msg_id,
  LEFT(response_email_from, 30) as from_email,
  LEFT(response_email_subject, 40) as subject,
  response_received_at,
  response_detected_method as method,
  within_deadline,
  grace_period_used as grace,
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as mins_ago
FROM email_response_tracking
ORDER BY created_at DESC
LIMIT 10;
"

# ============================================================================
# Check 2: Inbound Email Processing
# ============================================================================
run_query "📧 Inbound Email Logs (Postmark)" "
SELECT
  LEFT(message_id::text, 8) || '...' as msg_id,
  email_type,
  LEFT(sender_email, 30) as sender,
  sent_at,
  CASE
    WHEN sent_at IS NULL THEN '⚠️ NULL'
    ELSE '✅ OK'
  END as date_status,
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as mins_ago
FROM email_logs
WHERE email_service_provider = 'postmark'
  OR email_type = 'inbound_response'
ORDER BY created_at DESC
LIMIT 10;
"

# ============================================================================
# Check 3: Date Parsing Fallback Detection
# ============================================================================
run_query "🔍 Date Parsing Fallback Detection" "
SELECT
  LEFT(message_id::text, 8) || '...' as msg_id,
  response_received_at,
  created_at,
  ABS(EXTRACT(EPOCH FROM (response_received_at - created_at))) as seconds_diff,
  CASE
    WHEN ABS(EXTRACT(EPOCH FROM (response_received_at - created_at))) < 5 THEN '⚠️ FALLBACK_USED'
    ELSE '✅ NORMAL'
  END as timestamp_source
FROM email_response_tracking
WHERE response_detected_method = 'webhook'
ORDER BY created_at DESC
LIMIT 10;
"

# ============================================================================
# Check 4: Webhook Success Rate (Last 24h)
# ============================================================================
run_query "📈 Webhook Activity Summary (Last 24 Hours)" "
SELECT
  COUNT(*) as total_responses,
  COUNT(*) FILTER (WHERE response_detected_method = 'webhook') as webhook_detected,
  COUNT(*) FILTER (WHERE within_deadline = true) as within_deadline,
  COUNT(*) FILTER (WHERE grace_period_used = true) as grace_period_used,
  ROUND(AVG(EXTRACT(EPOCH FROM (response_received_at - created_at)))) as avg_processing_sec
FROM email_response_tracking
WHERE created_at >= NOW() - INTERVAL '24 hours';
"

# ============================================================================
# Check 5: Recent Transactions After Webhook
# ============================================================================
run_query "💰 Transaction Status After Webhook Detection" "
SELECT
  LEFT(et.message_id::text, 8) || '...' as msg_id,
  et.status,
  et.amount,
  mr.detection_method,
  ert.within_deadline,
  ROUND(EXTRACT(EPOCH FROM (et.updated_at - ert.response_received_at))/60) as mins_to_release
FROM escrow_transactions et
LEFT JOIN message_responses mr ON et.message_id = mr.message_id
LEFT JOIN email_response_tracking ert ON et.message_id = ert.message_id
WHERE ert.response_detected_method = 'webhook'
  AND et.created_at >= NOW() - INTERVAL '7 days'
ORDER BY et.created_at DESC
LIMIT 10;
"

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ VERIFICATION COMPLETE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 What to Look For:${NC}"
echo ""
echo "✅ GOOD SIGNS:"
echo "  • Recent entries in email_response_tracking table"
echo "  • sent_at timestamps are NOT NULL in email_logs"
echo "  • '⚠️ FALLBACK_USED' entries = fix is working (preventing crashes)"
echo "  • Transaction status changes to 'released' after webhook detection"
echo ""
echo "❌ BAD SIGNS:"
echo "  • Empty email_response_tracking table = no webhooks received"
echo "  • sent_at is NULL = date parsing still failing"
echo "  • No recent activity = webhook not being triggered"
echo ""
echo -e "${YELLOW}🧪 To Test with Real Email:${NC}"
echo ""
echo "1. Run the test script:"
echo "   ${GREEN}./test-postmark-webhook.sh${NC}"
echo ""
echo "2. Check your email and reply to the test message"
echo ""
echo "3. Run this verification script again to see the results:"
echo "   ${GREEN}./verify-webhook-deployment.sh${NC}"
echo ""
echo -e "${YELLOW}📊 For More Detailed Analysis:${NC}"
echo ""
echo "Use the SQL queries in: ${GREEN}verify-webhook-fix.sql${NC}"
echo "Run them in Supabase Dashboard SQL Editor"
echo ""
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────${NC}"
