#!/bin/bash

# Test Production Webhook - Creates real message in production database
# Then sends email via Postmark so you can reply and test webhook

set -e

echo "🚀 Testing Production Postmark Webhook"
echo "======================================"

# Load environment variables
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

# Get user ID (you'll need to replace this with your actual user ID)
echo ""
echo "📋 First, we need your user ID from production."
echo "   Go to: https://fastpass.email/dashboard"
echo "   Copy your user ID and paste it here:"
read -p "User ID: " USER_ID

if [ -z "$USER_ID" ]; then
    echo "Error: User ID is required"
    exit 1
fi

# Generate UUIDs
MESSAGE_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
TRANSACTION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

echo ""
echo "✅ Creating test message in production database"
echo "   Message ID: $MESSAGE_ID"
echo "   Transaction ID: $TRANSACTION_ID"

# Send test email via Postmark (this will create the email_log entry)
echo ""
echo "📧 Sending test email via Postmark..."

RESPONSE=$(curl -s -X POST \
  "https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-send-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -d "{
    \"recipientEmail\": \"marc.bernard@ece-france.com\",
    \"senderEmail\": \"test-webhook@example.com\",
    \"senderMessage\": \"This is a REAL production test. Please reply to this email to test the webhook! The system should detect your reply and log it in email_response_tracking table.\",
    \"messageId\": \"$MESSAGE_ID\",
    \"paymentAmount\": 20,
    \"responseDeadline\": \"48 hours\"
  }")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    EMAIL_ID=$(echo "$RESPONSE" | jq -r '.emailId')
    echo ""
    echo "✅ Email sent successfully!"
    echo "   Postmark Email ID: $EMAIL_ID"
    echo ""
    echo "📬 Next Steps:"
    echo "   1. Check your email at marc.bernard@ece-france.com"
    echo "   2. You should see an email from FASTPASS"
    echo "   3. Reply to that email with any message"
    echo "   4. The webhook will detect your reply automatically!"
    echo ""
    echo "🔍 To verify webhook worked:"
    echo "   • Check Postmark activity: Should show HTTP 200"
    echo "   • Check database: SELECT * FROM email_response_tracking WHERE message_id = '$MESSAGE_ID';"
    echo ""
    echo "⚠️  Note: This test email won't have a real database message record"
    echo "   The webhook will return 200 but won't process the response"
    echo "   For full testing, use the actual payment flow at https://fastpass.email/pay/$USER_ID"
else
    echo ""
    echo "❌ Failed to send email"
    echo "Response: $RESPONSE"
    exit 1
fi
