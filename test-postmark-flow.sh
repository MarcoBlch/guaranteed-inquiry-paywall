#!/bin/bash

# Phase 3A End-to-End Test Script
# Tests: Postmark outbound email → Manual reply → Inbound webhook detection

set -e

echo "=========================================="
echo "Phase 3A - Postmark Email Flow Test"
echo "=========================================="
echo ""

# Configuration
SUPABASE_URL="https://znncfayiwfamujvrprvf.supabase.co"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Check if service key is set
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
    echo ""
    echo "Please set it with:"
    echo "export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    exit 1
fi

# Prompt for test email
echo "📧 Enter YOUR email address to receive the test message:"
read -r RECIPIENT_EMAIL

if [ -z "$RECIPIENT_EMAIL" ]; then
    echo "❌ ERROR: Email address is required"
    exit 1
fi

echo ""
echo "=========================================="
echo "Test 1: Send Email via Postmark"
echo "=========================================="
echo ""

# Generate test message ID (simulated UUID)
TEST_MESSAGE_ID="test-$(date +%s)-$(( RANDOM % 1000 ))"

echo "Sending test email to: $RECIPIENT_EMAIL"
echo "Test Message ID: $TEST_MESSAGE_ID"
echo ""

# Send email via postmark-send-message function
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/postmark-send-message" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"senderEmail\": \"test-sender@example.com\",
    \"senderMessage\": \"This is a Phase 3A test message. Please REPLY to this email to test the inbound webhook detection system!\",
    \"responseDeadline\": \"48 hours\",
    \"paymentAmount\": 10.00,
    \"messageId\": \"${TEST_MESSAGE_ID}\",
    \"recipientEmail\": \"${RECIPIENT_EMAIL}\"
  }")

echo "Response from postmark-send-message:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if email was sent successfully
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
EMAIL_ID=$(echo "$RESPONSE" | jq -r '.emailId' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
    echo "✅ Email sent successfully via Postmark!"
    echo "📧 Postmark Message ID: $EMAIL_ID"
else
    echo "❌ Failed to send email"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "=========================================="
echo "Test 2: Email Service Health Check"
echo "=========================================="
echo ""

HEALTH_RESPONSE=$(curl -s -X GET \
  "${SUPABASE_URL}/functions/v1/email-service-health" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Health Check Response:"
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

POSTMARK_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.postmark.status' 2>/dev/null)
RESEND_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.resend.status' 2>/dev/null)

echo "Service Status Summary:"
echo "  Postmark: $POSTMARK_STATUS"
echo "  Resend: $RESEND_STATUS"
echo ""

echo "=========================================="
echo "Manual Testing Required"
echo "=========================================="
echo ""
echo "✅ Step 1 Complete: Email sent via Postmark"
echo ""
echo "📬 Next Steps (Manual):"
echo ""
echo "1. Check your email inbox: $RECIPIENT_EMAIL"
echo "2. You should receive an email from: FASTPASS <noreply@fastpass.email>"
echo "3. REPLY to that email with any message"
echo "4. Wait 30 seconds for webhook processing"
echo "5. Run the verification script to check if response was detected"
echo ""
echo "Postmark Inbound Email Address for debugging:"
echo "  3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com"
echo ""
echo "=========================================="
echo "Webhook URL (configured in Postmark):"
echo "  ${SUPABASE_URL}/functions/v1/postmark-inbound-webhook"
echo "=========================================="
echo ""

# Save test info for verification script
cat > /tmp/postmark-test-info.json <<EOF
{
  "messageId": "${TEST_MESSAGE_ID}",
  "recipientEmail": "${RECIPIENT_EMAIL}",
  "postmarkEmailId": "${EMAIL_ID}",
  "sentAt": "$(date -Iseconds)",
  "testType": "phase3a-end-to-end"
}
EOF

echo "Test info saved to: /tmp/postmark-test-info.json"
echo ""
echo "After you've replied to the email, run:"
echo "  ./verify-postmark-response.sh"
echo ""
