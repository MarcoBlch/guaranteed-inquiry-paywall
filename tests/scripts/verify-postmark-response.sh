#!/bin/bash

# Phase 3A Response Verification Script
# Verifies that the inbound webhook detected the email reply

set -e

echo "=========================================="
echo "Phase 3A - Response Detection Verification"
echo "=========================================="
echo ""

# Configuration
SUPABASE_URL="https://znncfayiwfamujvrprvf.supabase.co"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Check if service key is set
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
    exit 1
fi

# Load test info
if [ ! -f /tmp/postmark-test-info.json ]; then
    echo "❌ ERROR: Test info not found. Run test-postmark-flow.sh first"
    exit 1
fi

TEST_MESSAGE_ID=$(jq -r '.messageId' /tmp/postmark-test-info.json)
RECIPIENT_EMAIL=$(jq -r '.recipientEmail' /tmp/postmark-test-info.json)
POSTMARK_EMAIL_ID=$(jq -r '.postmarkEmailId' /tmp/postmark-test-info.json)

echo "Checking for response detection..."
echo "Test Message ID: $TEST_MESSAGE_ID"
echo "Recipient: $RECIPIENT_EMAIL"
echo "Postmark Email ID: $POSTMARK_EMAIL_ID"
echo ""

echo "=========================================="
echo "Check 1: Email Logs"
echo "=========================================="
echo ""

# Query email_logs via REST API
EMAIL_LOGS=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/email_logs?message_id=eq.${TEST_MESSAGE_ID}&select=*" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Email Logs:"
echo "$EMAIL_LOGS" | jq '.' 2>/dev/null || echo "$EMAIL_LOGS"
echo ""

OUTBOUND_COUNT=$(echo "$EMAIL_LOGS" | jq '. | length' 2>/dev/null)
INBOUND_COUNT=$(echo "$EMAIL_LOGS" | jq '[.[] | select(.email_type == "inbound_response")] | length' 2>/dev/null)

echo "Summary:"
echo "  Total email logs: $OUTBOUND_COUNT"
echo "  Inbound responses detected: $INBOUND_COUNT"
echo ""

if [ "$INBOUND_COUNT" -gt 0 ]; then
    echo "✅ Inbound email detected in email_logs!"

    # Show inbound email details
    echo ""
    echo "Inbound Email Details:"
    echo "$EMAIL_LOGS" | jq '[.[] | select(.email_type == "inbound_response")][0]' 2>/dev/null
    echo ""
else
    echo "⚠️  No inbound email detected yet"
    echo ""
    echo "Possible reasons:"
    echo "  1. You haven't replied to the email yet"
    echo "  2. Webhook hasn't been triggered yet (wait 30 seconds)"
    echo "  3. Reply went to spam folder"
    echo "  4. Webhook configuration issue"
    echo ""
fi

echo "=========================================="
echo "Check 2: Response Tracking"
echo "=========================================="
echo ""

# Query email_response_tracking
RESPONSE_TRACKING=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/email_response_tracking?message_id=eq.${TEST_MESSAGE_ID}&select=*" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Response Tracking:"
echo "$RESPONSE_TRACKING" | jq '.' 2>/dev/null || echo "$RESPONSE_TRACKING"
echo ""

TRACKING_COUNT=$(echo "$RESPONSE_TRACKING" | jq '. | length' 2>/dev/null)

if [ "$TRACKING_COUNT" -gt 0 ]; then
    echo "✅ Response tracked in email_response_tracking!"

    DETECTED_METHOD=$(echo "$RESPONSE_TRACKING" | jq -r '.[0].response_detected_method' 2>/dev/null)
    WITHIN_DEADLINE=$(echo "$RESPONSE_TRACKING" | jq -r '.[0].within_deadline' 2>/dev/null)
    GRACE_PERIOD=$(echo "$RESPONSE_TRACKING" | jq -r '.[0].grace_period_used' 2>/dev/null)

    echo ""
    echo "Response Details:"
    echo "  Detection Method: $DETECTED_METHOD"
    echo "  Within Deadline: $WITHIN_DEADLINE"
    echo "  Grace Period Used: $GRACE_PERIOD"
    echo ""
else
    echo "⚠️  No response tracking record found"
    echo ""
fi

echo "=========================================="
echo "Check 3: Webhook Function Logs"
echo "=========================================="
echo ""

echo "To view webhook logs, run:"
echo "  npx supabase functions logs postmark-inbound-webhook --tail"
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""

if [ "$INBOUND_COUNT" -gt 0 ] && [ "$TRACKING_COUNT" -gt 0 ]; then
    echo "🎉 SUCCESS! Phase 3A is working perfectly!"
    echo ""
    echo "✅ Outbound email sent via Postmark"
    echo "✅ Inbound webhook detected the reply"
    echo "✅ Response tracked in database"
    echo ""
    echo "Your email response detection system is LIVE! 🚀"
else
    echo "⚠️  Test incomplete"
    echo ""
    if [ "$OUTBOUND_COUNT" -gt 0 ]; then
        echo "✅ Email sent successfully"
    else
        echo "❌ No email logs found"
    fi

    if [ "$INBOUND_COUNT" -eq 0 ]; then
        echo "❌ No inbound response detected"
        echo ""
        echo "Next steps:"
        echo "  1. Make sure you replied to the test email"
        echo "  2. Wait 1-2 minutes and run this script again"
        echo "  3. Check Postmark dashboard → Activity to see if reply was received"
        echo "  4. Check webhook logs for errors"
    fi
fi

echo ""
