#!/bin/bash

# Test Postmark Webhook with Real Message
# This script creates a test message in the database and sends an email via Postmark

# Load environment variables
source .env

# Generate UUIDs
MESSAGE_ID=$(uuidgen)
TRANSACTION_ID=$(uuidgen)
USER_ID="64c9a3f4-e7b3-4c4f-b0c7-8c9f5c6d3e4f"  # Replace with actual receiver user ID

echo "Creating test message with ID: $MESSAGE_ID"
echo "Transaction ID: $TRANSACTION_ID"

# 1. Insert test transaction
psql "$DATABASE_URL" << EOF
-- Insert escrow transaction
INSERT INTO escrow_transactions (
  id,
  stripe_payment_intent_id,
  user_id,
  amount,
  status,
  message_id,
  expires_at
) VALUES (
  '$TRANSACTION_ID',
  'pi_test_webhook_$(date +%s)',
  '$USER_ID',
  1500,
  'held',
  '$MESSAGE_ID',
  NOW() + INTERVAL '48 hours'
);

-- Insert message
INSERT INTO messages (
  id,
  user_id,
  sender_email,
  subject,
  message,
  response_deadline_hours,
  created_at
) VALUES (
  '$MESSAGE_ID',
  '$USER_ID',
  'marc.bernard@ece-france.com',
  'Webhook Test Message',
  'This is a test message for webhook validation.',
  48,
  NOW()
);

-- Insert message response record (empty)
INSERT INTO message_responses (
  message_id,
  has_response,
  response_received_at
) VALUES (
  '$MESSAGE_ID',
  false,
  NULL
);

SELECT 'Test data inserted successfully' as result;
EOF

# 2. Send email via Postmark
echo ""
echo "Sending email via Postmark..."
curl -X POST \
  "https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-send-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -d "{
    \"recipientEmail\": \"marc.bernard@ece-france.com\",
    \"senderEmail\": \"webhook-test@example.com\",
    \"messageSubject\": \"Webhook Test Message\",
    \"senderMessage\": \"Please reply to this email to test the inbound webhook. This is a real database test.\",
    \"messageId\": \"$MESSAGE_ID\",
    \"paymentAmount\": 15,
    \"responseDeadline\": \"48 hours\"
  }"

echo ""
echo ""
echo "✅ Test setup complete!"
echo ""
echo "📧 Next steps:"
echo "1. Check your email at marc.bernard@ece-france.com"
echo "2. Reply to the email (use 'Reply All' if needed)"
echo "3. The webhook should process your reply automatically"
echo ""
echo "🔍 To check if webhook worked, run:"
echo "psql \"\$DATABASE_URL\" -c \"SELECT * FROM email_response_tracking WHERE message_id = '$MESSAGE_ID';\""
echo ""
echo "Message ID: $MESSAGE_ID"
