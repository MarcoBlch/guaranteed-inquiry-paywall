#!/bin/bash
# Test postmark-send-message function directly

echo "Testing postmark-send-message function..."
echo ""

curl -X POST \
  'https://znncfayiwfamujvrprvf.supabase.co/functions/v1/postmark-send-message' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubmNmYXlpd2ZhbXVqdnJwcnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTY5MDQsImV4cCI6MjA2MDM3MjkwNH0.NcM9yKGoQsttzE4cYfqhyV1aG7fvt-lQCHZKy5CPHCk' \
  -H 'Content-Type: application/json' \
  -d "{
    \"senderEmail\": \"test@example.com\",
    \"senderMessage\": \"This is a test message to verify email sending works. Timestamp: $(date)\",
    \"responseDeadline\": \"48 hours\",
    \"paymentAmount\": 10,
    \"messageId\": \"test-$(date +%s)\",
    \"recipientEmail\": \"marc.bernard@ece-france.com\"
  }" | jq .

echo ""
echo "Check your inbox at marc.bernard@ece-france.com"
echo "Also check Postmark Activity dashboard: https://account.postmarkapp.com/"
