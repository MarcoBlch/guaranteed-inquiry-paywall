#!/bin/bash
# ============================================================================
# FastPass Invite System Test Script
# ============================================================================
# Tests the invite code system without burning real founder codes.
# Uses test codes with 'test-' prefix that are cleaned up after.
#
# Usage: ./tests/scripts/test-invite-system.sh
#
# Environment variables (can be set via .env file):
#   SUPABASE_URL              - Supabase project URL
#   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin operations
#   SUPABASE_ANON_KEY         - Anon key for public endpoint tests (optional)
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test data tracking
CREATED_CODES=()
TEST_USER_ID=""

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((TESTS_SKIPPED++))
}

log_section() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
}

# Load environment variables from .env if it exists
load_env() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(cd "$script_dir/../.." && pwd)"
    
    if [ -f "$project_root/.env" ]; then
        log_info "Loading environment from .env file..."
        set -a
        source "$project_root/.env"
        set +a
    fi
    
    # Also check for .env.local
    if [ -f "$project_root/.env.local" ]; then
        log_info "Loading environment from .env.local file..."
        set -a
        source "$project_root/.env.local"
        set +a
    fi
}

# Validate required environment variables
validate_env() {
    local missing=()
    
    # Map VITE_ prefixed vars if regular ones not set
    if [ -z "$SUPABASE_URL" ] && [ -n "$VITE_SUPABASE_URL" ]; then
        SUPABASE_URL="$VITE_SUPABASE_URL"
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        # Try to get from supabase CLI if available
        if command -v supabase &> /dev/null; then
            log_info "Attempting to get service role key from Supabase CLI..."
            SUPABASE_SERVICE_ROLE_KEY=$(supabase status --output json 2>/dev/null | jq -r '.SERVICE_ROLE_KEY // empty' 2>/dev/null || echo "")
        fi
    fi
    
    [ -z "$SUPABASE_URL" ] && missing+=("SUPABASE_URL")
    [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && missing+=("SUPABASE_SERVICE_ROLE_KEY")
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}ERROR: Missing required environment variables:${NC}"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Set these variables in your environment or in a .env file."
        exit 1
    fi
    
    log_info "Environment validated successfully"
    log_info "SUPABASE_URL: ${SUPABASE_URL:0:50}..."
}

# Execute SQL via Supabase REST API (service role)
exec_sql() {
    local sql="$1"
    local response
    
    response=$(curl -s -X POST \
        "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$sql\"}" 2>&1)
    
    echo "$response"
}

# Query table via REST API
query_table() {
    local table="$1"
    local filter="$2"
    local select="${3:-*}"
    
    local url="${SUPABASE_URL}/rest/v1/${table}?select=${select}"
    [ -n "$filter" ] && url="${url}&${filter}"
    
    curl -s -X GET "$url" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json"
}

# Insert into table via REST API
insert_record() {
    local table="$1"
    local data="$2"
    
    curl -s -X POST \
        "${SUPABASE_URL}/rest/v1/${table}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "$data"
}

# Update table via REST API
update_record() {
    local table="$1"
    local filter="$2"
    local data="$3"
    
    curl -s -X PATCH \
        "${SUPABASE_URL}/rest/v1/${table}?${filter}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "$data"
}

# Delete from table via REST API
delete_record() {
    local table="$1"
    local filter="$2"
    
    curl -s -X DELETE \
        "${SUPABASE_URL}/rest/v1/${table}?${filter}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json"
}

# Call Edge Function
call_function() {
    local function_name="$1"
    local method="${2:-GET}"
    local data="$3"
    local use_anon="${4:-false}"
    
    local auth_key="$SUPABASE_SERVICE_ROLE_KEY"
    if [ "$use_anon" = "true" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
        auth_key="$SUPABASE_ANON_KEY"
    elif [ "$use_anon" = "true" ] && [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
        auth_key="$VITE_SUPABASE_ANON_KEY"
    fi
    
    local curl_cmd="curl -s -X $method"
    curl_cmd+=" ${SUPABASE_URL}/functions/v1/${function_name}"
    curl_cmd+=" -H 'apikey: ${auth_key}'"
    curl_cmd+=" -H 'Authorization: Bearer ${auth_key}'"
    curl_cmd+=" -H 'Content-Type: application/json'"
    
    if [ -n "$data" ] && [ "$method" != "GET" ]; then
        curl_cmd+=" -d '$data'"
    fi
    
    eval "$curl_cmd"
}

# Generate unique test code
generate_test_code() {
    local prefix="test-"
    local timestamp=$(date +%s)
    local random=$(( RANDOM % 10000 ))
    echo "${prefix}${timestamp}-${random}"
}

# ============================================================================
# Setup Functions
# ============================================================================

setup_test_data() {
    log_section "Setting Up Test Data"
    
    # Generate unique test codes
    local valid_code=$(generate_test_code)
    local used_code=$(generate_test_code)
    local expired_code=$(generate_test_code)
    
    log_info "Creating test invite codes..."
    
    # Create a valid test code
    log_info "Creating valid code: $valid_code"
    local result=$(insert_record "invite_codes" "{
        \"code\": \"$valid_code\",
        \"tier\": \"founder\",
        \"max_uses\": 1,
        \"current_uses\": 0,
        \"expires_at\": \"$(date -d '+30 days' -Iseconds 2>/dev/null || date -v+30d -Iseconds)\",
        \"is_active\": true
    }")
    
    if echo "$result" | jq -e '.[0].code' > /dev/null 2>&1; then
        CREATED_CODES+=("$valid_code")
        log_info "Created valid code successfully"
    else
        log_info "Result: $result"
        # Try alternate date format for Linux
        result=$(insert_record "invite_codes" "{
            \"code\": \"$valid_code\",
            \"tier\": \"founder\",
            \"max_uses\": 1,
            \"current_uses\": 0,
            \"expires_at\": \"$(date -d '+30 days' '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S+0000')\",
            \"is_active\": true
        }")
        if echo "$result" | jq -e '.[0].code' > /dev/null 2>&1; then
            CREATED_CODES+=("$valid_code")
            log_info "Created valid code successfully (alternate date format)"
        fi
    fi
    
    # Create an already-used test code
    log_info "Creating used code: $used_code"
    result=$(insert_record "invite_codes" "{
        \"code\": \"$used_code\",
        \"tier\": \"founder\",
        \"max_uses\": 1,
        \"current_uses\": 1,
        \"expires_at\": \"$(date -d '+30 days' '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S+0000')\",
        \"is_active\": true
    }")
    
    if echo "$result" | jq -e '.[0].code' > /dev/null 2>&1; then
        CREATED_CODES+=("$used_code")
        log_info "Created used code successfully"
    fi
    
    # Create an expired test code
    log_info "Creating expired code: $expired_code"
    result=$(insert_record "invite_codes" "{
        \"code\": \"$expired_code\",
        \"tier\": \"founder\",
        \"max_uses\": 1,
        \"current_uses\": 0,
        \"expires_at\": \"$(date -d '-1 day' '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S+0000')\",
        \"is_active\": true
    }")
    
    if echo "$result" | jq -e '.[0].code' > /dev/null 2>&1; then
        CREATED_CODES+=("$expired_code")
        log_info "Created expired code successfully"
    fi
    
    # Export for use in tests
    export TEST_VALID_CODE="$valid_code"
    export TEST_USED_CODE="$used_code"
    export TEST_EXPIRED_CODE="$expired_code"
    
    log_info "Test codes created: ${#CREATED_CODES[@]}"
    for code in "${CREATED_CODES[@]}"; do
        log_info "  - $code"
    done
}

# ============================================================================
# Cleanup Functions
# ============================================================================

cleanup_test_data() {
    log_section "Cleaning Up Test Data"
    
    # Delete all test codes (codes starting with 'test-')
    log_info "Deleting test invite codes..."
    local result=$(delete_record "invite_codes" "code=like.test-*")
    log_info "Cleanup result: $result"
    
    # Also try to delete specific codes we tracked
    for code in "${CREATED_CODES[@]}"; do
        log_info "Deleting code: $code"
        delete_record "invite_codes" "code=eq.$code" > /dev/null 2>&1
    done
    
    # Clean up any test users (if created)
    if [ -n "$TEST_USER_ID" ]; then
        log_info "Cleaning up test user: $TEST_USER_ID"
        delete_record "user_tiers" "user_id=eq.$TEST_USER_ID" > /dev/null 2>&1
    fi
    
    log_info "Cleanup completed"
}

# ============================================================================
# Test Functions
# ============================================================================

test_database_tables_exist() {
    log_section "Testing Database Tables Exist"
    
    # Test invite_codes table
    log_info "Checking invite_codes table..."
    local result=$(query_table "invite_codes" "limit=1")
    if [ -n "$result" ] && [ "$result" != "[]" ] || [ "$result" = "[]" ]; then
        if ! echo "$result" | grep -q "error"; then
            log_success "invite_codes table exists and is accessible"
        else
            log_fail "invite_codes table error: $result"
        fi
    else
        log_fail "invite_codes table not accessible"
    fi
    
    # Test platform_settings table
    log_info "Checking platform_settings table..."
    result=$(query_table "platform_settings" "limit=1")
    if [ -n "$result" ] && ! echo "$result" | grep -q "error"; then
        log_success "platform_settings table exists and is accessible"
    else
        log_fail "platform_settings table error: $result"
    fi
    
    # Test user_tiers table
    log_info "Checking user_tiers table..."
    result=$(query_table "user_tiers" "limit=1")
    if [ -n "$result" ] && ! echo "$result" | grep -q "error"; then
        log_success "user_tiers table exists and is accessible"
    else
        log_fail "user_tiers table error: $result"
    fi
}

test_platform_settings() {
    log_section "Testing Platform Settings"
    
    # Test via Edge Function (public access)
    log_info "Testing get-platform-settings Edge Function..."
    local result=$(call_function "get-platform-settings" "GET" "" "true")
    
    if [ -z "$result" ]; then
        log_fail "get-platform-settings returned empty response"
        return
    fi
    
    # Check if it returns JSON
    if ! echo "$result" | jq . > /dev/null 2>&1; then
        log_fail "get-platform-settings returned invalid JSON: $result"
        return
    fi
    
    # Check for error
    if echo "$result" | jq -e '.error' > /dev/null 2>&1; then
        local error=$(echo "$result" | jq -r '.error')
        log_fail "get-platform-settings returned error: $error"
        return
    fi
    
    log_success "get-platform-settings returns valid JSON"
    
    # Check for invite_only_mode setting
    if echo "$result" | jq -e '.invite_only_mode' > /dev/null 2>&1; then
        local mode=$(echo "$result" | jq -r '.invite_only_mode')
        log_success "invite_only_mode setting present (value: $mode)"
    else
        log_info "invite_only_mode not in response - checking direct database..."
        local db_result=$(query_table "platform_settings" "key=eq.invite_only_mode" "value")
        if [ -n "$db_result" ] && [ "$db_result" != "[]" ]; then
            log_success "invite_only_mode exists in database"
        else
            log_skip "invite_only_mode setting not found (may need to be created)"
        fi
    fi
}

test_validate_invite_code_valid() {
    log_section "Testing Valid Invite Code Validation"
    
    if [ -z "$TEST_VALID_CODE" ]; then
        log_skip "No valid test code available"
        return
    fi
    
    log_info "Testing code: $TEST_VALID_CODE"
    local result=$(call_function "validate-invite-code" "POST" "{\"code\": \"$TEST_VALID_CODE\"}" "true")
    
    if [ -z "$result" ]; then
        log_fail "validate-invite-code returned empty response"
        return
    fi
    
    log_info "Response: $result"
    
    # Check if valid
    local valid=$(echo "$result" | jq -r '.valid // .isValid // "null"')
    
    if [ "$valid" = "true" ]; then
        log_success "Valid code correctly validated as valid"
    elif [ "$valid" = "null" ]; then
        # Check for different response format
        if echo "$result" | jq -e '.tier' > /dev/null 2>&1; then
            log_success "Valid code returned tier info (alternative success format)"
        else
            log_fail "validate-invite-code response format unexpected: $result"
        fi
    else
        log_fail "Valid code returned valid=$valid (expected true)"
    fi
}

test_validate_invite_code_invalid() {
    log_section "Testing Invalid Invite Code Validation"
    
    local invalid_code="INVALID-CODE-$(date +%s)"
    log_info "Testing invalid code: $invalid_code"
    
    local result=$(call_function "validate-invite-code" "POST" "{\"code\": \"$invalid_code\"}" "true")
    
    if [ -z "$result" ]; then
        log_fail "validate-invite-code returned empty response"
        return
    fi
    
    log_info "Response: $result"
    
    # Check if invalid
    local valid=$(echo "$result" | jq -r '.valid // .isValid // "null"')
    local error=$(echo "$result" | jq -r '.error // "null"')
    
    if [ "$valid" = "false" ]; then
        log_success "Invalid code correctly rejected (valid=false)"
    elif [ "$error" != "null" ]; then
        log_success "Invalid code correctly rejected with error: $error"
    else
        log_fail "Invalid code not properly rejected: $result"
    fi
}

test_validate_invite_code_used() {
    log_section "Testing Already-Used Invite Code Validation"
    
    if [ -z "$TEST_USED_CODE" ]; then
        log_skip "No used test code available"
        return
    fi
    
    log_info "Testing used code: $TEST_USED_CODE"
    local result=$(call_function "validate-invite-code" "POST" "{\"code\": \"$TEST_USED_CODE\"}" "true")
    
    if [ -z "$result" ]; then
        log_fail "validate-invite-code returned empty response"
        return
    fi
    
    log_info "Response: $result"
    
    # Check if rejected
    local valid=$(echo "$result" | jq -r '.valid // .isValid // "null"')
    local error=$(echo "$result" | jq -r '.error // "null"')
    
    if [ "$valid" = "false" ]; then
        log_success "Used code correctly rejected (valid=false)"
    elif echo "$error" | grep -qi "used\|exhausted\|limit"; then
        log_success "Used code correctly rejected with appropriate error"
    elif [ "$error" != "null" ]; then
        log_success "Used code rejected with error: $error"
    else
        log_fail "Used code not properly rejected: $result"
    fi
}

test_validate_invite_code_expired() {
    log_section "Testing Expired Invite Code Validation"
    
    if [ -z "$TEST_EXPIRED_CODE" ]; then
        log_skip "No expired test code available"
        return
    fi
    
    log_info "Testing expired code: $TEST_EXPIRED_CODE"
    local result=$(call_function "validate-invite-code" "POST" "{\"code\": \"$TEST_EXPIRED_CODE\"}" "true")
    
    if [ -z "$result" ]; then
        log_fail "validate-invite-code returned empty response"
        return
    fi
    
    log_info "Response: $result"
    
    # Check if rejected
    local valid=$(echo "$result" | jq -r '.valid // .isValid // "null"')
    local error=$(echo "$result" | jq -r '.error // "null"')
    
    if [ "$valid" = "false" ]; then
        log_success "Expired code correctly rejected (valid=false)"
    elif echo "$error" | grep -qi "expired"; then
        log_success "Expired code correctly rejected with expiry error"
    elif [ "$error" != "null" ]; then
        log_success "Expired code rejected with error: $error"
    else
        log_fail "Expired code not properly rejected: $result"
    fi
}

test_database_state() {
    log_section "Testing Database State"
    
    # Verify test codes exist in database
    log_info "Verifying test codes in database..."
    
    for code in "${CREATED_CODES[@]}"; do
        local result=$(query_table "invite_codes" "code=eq.$code")
        if echo "$result" | jq -e '.[0].code' > /dev/null 2>&1; then
            local db_code=$(echo "$result" | jq -r '.[0].code')
            local tier=$(echo "$result" | jq -r '.[0].tier')
            local uses=$(echo "$result" | jq -r '.[0].current_uses')
            local max=$(echo "$result" | jq -r '.[0].max_uses')
            log_success "Code $code exists (tier: $tier, uses: $uses/$max)"
        else
            log_fail "Code $code not found in database"
        fi
    done
    
    # Check platform_settings has defaults
    log_info "Checking platform_settings defaults..."
    local settings=$(query_table "platform_settings" "")
    local count=$(echo "$settings" | jq 'length')
    
    if [ "$count" -gt 0 ]; then
        log_success "platform_settings has $count settings configured"
    else
        log_info "platform_settings is empty (may need initialization)"
    fi
}

test_edge_function_health() {
    log_section "Testing Edge Function Health"
    
    # Test validate-invite-code function exists
    log_info "Testing validate-invite-code function..."
    local result=$(call_function "validate-invite-code" "POST" "{\"code\": \"health-check\"}" "true")
    
    if [ -z "$result" ]; then
        log_fail "validate-invite-code function not responding"
    elif echo "$result" | grep -qi "not found\|404"; then
        log_fail "validate-invite-code function not deployed"
    else
        log_success "validate-invite-code function is responding"
    fi
    
    # Test get-platform-settings function exists
    log_info "Testing get-platform-settings function..."
    result=$(call_function "get-platform-settings" "GET" "" "true")
    
    if [ -z "$result" ]; then
        log_fail "get-platform-settings function not responding"
    elif echo "$result" | grep -qi "not found\|404"; then
        log_fail "get-platform-settings function not deployed"
    else
        log_success "get-platform-settings function is responding"
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}   FastPass Invite System Test Suite${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
    
    # Load and validate environment
    load_env
    validate_env
    
    # Set up trap for cleanup on exit
    trap cleanup_test_data EXIT
    
    # Setup test data
    setup_test_data
    
    # Run tests
    test_database_tables_exist
    test_edge_function_health
    test_platform_settings
    test_validate_invite_code_valid
    test_validate_invite_code_invalid
    test_validate_invite_code_used
    test_validate_invite_code_expired
    test_database_state
    
    # Final report
    log_section "Test Results Summary"
    echo ""
    echo -e "${GREEN}Passed:${NC}  $TESTS_PASSED"
    echo -e "${RED}Failed:${NC}  $TESTS_FAILED"
    echo -e "${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
    echo ""
    
    local total=$((TESTS_PASSED + TESTS_FAILED))
    if [ $TESTS_FAILED -eq 0 ] && [ $total -gt 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    elif [ $TESTS_FAILED -gt 0 ]; then
        echo -e "${RED}Some tests failed. Please review the output above.${NC}"
        exit 1
    else
        echo -e "${YELLOW}No tests were executed.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
