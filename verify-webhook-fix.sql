-- ============================================================================
-- POSTMARK WEBHOOK FIX VERIFICATION QUERIES
-- Use these queries in Supabase SQL Editor to verify the date parsing fix
-- ============================================================================

-- Query 1: Check Recent Email Response Tracking
-- This shows if webhook is successfully processing responses with timestamps
-- ============================================================================
SELECT
  message_id,
  response_email_from,
  response_email_subject,
  response_received_at,
  response_detected_method,
  within_deadline,
  grace_period_used,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS minutes_ago
FROM email_response_tracking
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Recent records showing webhook detection with valid timestamps


-- Query 2: Check Email Logs for Inbound Processing
-- This shows all inbound emails received and their processing status
-- ============================================================================
SELECT
  message_id,
  email_type,
  sender_email,
  recipient_email,
  email_service_provider,
  sent_at,
  response_detected_at,
  delivered_at,
  failed_at,
  metadata,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS minutes_ago
FROM email_logs
WHERE email_type = 'inbound_response'
  OR email_service_provider = 'postmark'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Inbound responses with sent_at timestamps (should not be NULL)


-- Query 3: Check Messages with Response Status
-- This shows which messages have received responses
-- ============================================================================
SELECT
  m.id,
  m.sender_email,
  m.message_subject,
  m.created_at AS message_sent_at,
  m.response_deadline_hours,
  mr.has_response,
  mr.responded_at,
  mr.detection_method,
  et.status AS transaction_status,
  et.expires_at AS deadline,
  CASE
    WHEN mr.responded_at IS NOT NULL AND et.expires_at IS NOT NULL THEN
      mr.responded_at <= et.expires_at
    ELSE NULL
  END AS within_deadline,
  EXTRACT(EPOCH FROM (NOW() - m.created_at))/3600 AS hours_since_sent
FROM messages m
LEFT JOIN message_responses mr ON m.id = mr.message_id
LEFT JOIN escrow_transactions et ON m.id = et.message_id
ORDER BY m.created_at DESC
LIMIT 10;

-- Expected: Messages with has_response=true and detection_method='webhook'


-- Query 4: Check for Date Parsing Issues (Error Detection)
-- This searches metadata for any date-related error indicators
-- ============================================================================
SELECT
  message_id,
  email_type,
  sender_email,
  sent_at,
  metadata,
  created_at
FROM email_logs
WHERE
  email_service_provider = 'postmark'
  AND (
    sent_at IS NULL
    OR metadata::text ILIKE '%invalid%date%'
    OR metadata::text ILIKE '%date%error%'
  )
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Empty result set (no date parsing errors)


-- Query 5: Webhook Activity Summary (Last 24 Hours)
-- Overview of webhook processing success rate
-- ============================================================================
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS total_responses,
  COUNT(*) FILTER (WHERE response_detected_method = 'webhook') AS webhook_detected,
  COUNT(*) FILTER (WHERE within_deadline = true) AS within_deadline,
  COUNT(*) FILTER (WHERE grace_period_used = true) AS grace_period_used,
  AVG(EXTRACT(EPOCH FROM (response_received_at - created_at))) AS avg_processing_seconds
FROM email_response_tracking
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Expected: Recent activity showing successful webhook detection


-- Query 6: Transaction Status After Webhook Processing
-- Verify that transactions are being released after response detection
-- ============================================================================
SELECT
  et.id AS transaction_id,
  et.message_id,
  et.status,
  et.amount,
  et.expires_at AS deadline,
  et.created_at AS transaction_created,
  et.updated_at AS transaction_updated,
  mr.responded_at,
  mr.detection_method,
  ert.response_received_at,
  ert.within_deadline,
  EXTRACT(EPOCH FROM (et.updated_at - ert.response_received_at))/60 AS minutes_to_release
FROM escrow_transactions et
LEFT JOIN message_responses mr ON et.message_id = mr.message_id
LEFT JOIN email_response_tracking ert ON et.message_id = ert.message_id
WHERE ert.response_detected_method = 'webhook'
  AND et.created_at >= NOW() - INTERVAL '7 days'
ORDER BY et.created_at DESC
LIMIT 10;

-- Expected: Status should be 'released' after webhook detection


-- Query 7: Most Recent Webhook Invocation Details
-- Detailed view of the last webhook call
-- ============================================================================
WITH latest_tracking AS (
  SELECT *
  FROM email_response_tracking
  WHERE response_detected_method = 'webhook'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  lt.message_id,
  lt.response_email_from,
  lt.response_email_subject,
  lt.response_received_at,
  lt.within_deadline,
  lt.grace_period_used,
  lt.email_headers,
  lt.response_content_preview,
  lt.created_at,
  m.sender_email,
  m.message_subject,
  et.status AS transaction_status,
  et.expires_at AS deadline
FROM latest_tracking lt
LEFT JOIN messages m ON lt.message_id = m.id
LEFT JOIN escrow_transactions et ON lt.message_id = et.message_id;

-- Expected: Complete details of most recent webhook processing


-- Query 8: Date Parsing Fallback Detection
-- Check if any responses used current time fallback (indicates date parsing issues)
-- ============================================================================
SELECT
  message_id,
  response_received_at,
  created_at,
  ABS(EXTRACT(EPOCH FROM (response_received_at - created_at))) AS seconds_difference,
  CASE
    WHEN ABS(EXTRACT(EPOCH FROM (response_received_at - created_at))) < 5 THEN 'LIKELY_FALLBACK'
    ELSE 'NORMAL'
  END AS timestamp_source
FROM email_response_tracking
WHERE response_detected_method = 'webhook'
ORDER BY created_at DESC
LIMIT 20;

-- Expected: 'LIKELY_FALLBACK' entries indicate date parsing used current time
-- This is GOOD - it means the fix is working and preventing crashes


-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/znncfayiwfamujvrprvf
-- 2. Navigate to SQL Editor
-- 3. Copy and paste each query individually
-- 4. Run each query and check the results
-- 5. Look for the "Expected" comment to understand what you should see
-- ============================================================================
