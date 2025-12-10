#!/bin/bash

# Query the stuck transaction using Supabase REST API
SUPABASE_URL="https://znncfayiwfamujvrprvf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubmNmYXlpd2ZhbXVqdnJwcnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTY5MDQsImV4cCI6MjA2MDM3MjkwNH0.NcM9yKGoQsttzE4cYfqhyV1aG7fvt-lQCHZKy5CPHCk"

echo "=== Searching for stuck transaction (sender: devilpepito@hotmail.fr) ==="
echo ""

# Note: This query will likely fail due to RLS policies
# We need the service role key to query escrow_transactions directly
echo "Note: This requires service role key for full access"
echo "Please run this query manually in your Supabase SQL Editor:"
echo ""
echo "SELECT id, message_id, amount, currency, status, sender_email, created_at, updated_at"
echo "FROM escrow_transactions"
echo "WHERE sender_email = 'devilpepito@hotmail.fr'"
echo "  AND status = 'transfer_failed'"
echo "ORDER BY created_at DESC;"
