#!/bin/bash

# Test script for file attachment upload
# Created: 2025-12-10

set -e

echo "=========================================="
echo "File Attachment Upload Test"
echo "=========================================="
echo ""

# Get Supabase URL and anon key from environment
SUPABASE_URL="${SUPABASE_URL:-$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2)}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2)}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "ERROR: Missing environment variables"
    echo "Please set SUPABASE_URL and SUPABASE_ANON_KEY"
    exit 1
fi

# Create test files
echo "Creating test files..."
mkdir -p /tmp/attachment-test

# Create a small text file
echo "This is a test attachment for FastPass" > /tmp/attachment-test/test-document.txt

# Create a small PDF-like file (for testing only)
echo "%PDF-1.4 Test PDF Content" > /tmp/attachment-test/test-document.pdf

echo "Test files created in /tmp/attachment-test/"
echo ""

# Test 1: Upload single file
echo "Test 1: Uploading single file..."
RESPONSE=$(curl -X POST \
  "${SUPABASE_URL}/functions/v1/upload-message-attachment" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -F "file0=@/tmp/attachment-test/test-document.txt" \
  2>/dev/null)

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✓ Test 1 PASSED: Single file upload successful"
else
    echo "✗ Test 1 FAILED: Single file upload failed"
fi
echo ""

# Test 2: Upload multiple files
echo "Test 2: Uploading multiple files..."
RESPONSE=$(curl -X POST \
  "${SUPABASE_URL}/functions/v1/upload-message-attachment" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -F "file0=@/tmp/attachment-test/test-document.txt" \
  -F "file1=@/tmp/attachment-test/test-document.pdf" \
  2>/dev/null)

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✓ Test 2 PASSED: Multiple file upload successful"

    # Extract URLs
    URLS=$(echo "$RESPONSE" | grep -o '"urls":\[[^]]*\]')
    echo "Uploaded URLs: $URLS"
else
    echo "✗ Test 2 FAILED: Multiple file upload failed"
fi
echo ""

# Test 3: Upload with no files (should fail)
echo "Test 3: Upload with no files (expected to fail)..."
RESPONSE=$(curl -X POST \
  "${SUPABASE_URL}/functions/v1/upload-message-attachment" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  2>/dev/null)

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":false'; then
    echo "✓ Test 3 PASSED: Correctly rejected no files"
else
    echo "✗ Test 3 FAILED: Should have rejected no files"
fi
echo ""

# Cleanup
echo "Cleaning up test files..."
rm -rf /tmp/attachment-test
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "All basic tests completed."
echo ""
echo "Manual testing required:"
echo "1. Open browser to /pay/:userId"
echo "2. Upload various file types"
echo "3. Complete payment flow"
echo "4. Check email for attachment links"
echo "5. Verify file downloads work"
echo ""
echo "For detailed testing guide, see:"
echo "  ATTACHMENT-FEATURE-GUIDE.md"
