-- ============================================================
-- TEST: Verify message_responses query with multiple IDs works
-- ============================================================
--
-- This test simulates the Dashboard query that was causing 500 errors
-- when querying message_responses with 32+ message IDs
--
-- ============================================================

-- Set user context (replace with actual user ID for testing)
-- User: marc.bernard@ece-france.com
SET request.jwt.claim.sub = '1a20e70f-86e6-406d-a09f-b4959b3cc0d0';

-- STEP 1: Get user's message IDs (simulating what Dashboard does)
DO $$
DECLARE
  message_id_array UUID[];
  message_count INTEGER;
  response_count INTEGER;
  query_start TIMESTAMP;
  query_end TIMESTAMP;
  query_duration INTERVAL;
BEGIN
  query_start := clock_timestamp();

  -- Get user's message IDs
  SELECT ARRAY_AGG(id)
  INTO message_id_array
  FROM messages
  WHERE user_id = '1a20e70f-86e6-406d-a09f-b4959b3cc0d0'::UUID;

  message_count := COALESCE(array_length(message_id_array, 1), 0);

  RAISE NOTICE 'Found % messages for user', message_count;

  -- Test the query that was failing (with RLS)
  IF message_count > 0 THEN
    SELECT COUNT(*)
    INTO response_count
    FROM message_responses
    WHERE message_id = ANY(message_id_array);

    query_end := clock_timestamp();
    query_duration := query_end - query_start;

    RAISE NOTICE 'Found % message_responses in %', response_count, query_duration;
    RAISE NOTICE 'Query completed successfully ✓';

    -- Performance check: query should complete in < 1 second
    IF query_duration > INTERVAL '1 second' THEN
      RAISE WARNING 'Query took longer than expected: %', query_duration;
    ELSE
      RAISE NOTICE 'Performance: GOOD (% < 1s) ✓', query_duration;
    END IF;
  ELSE
    RAISE NOTICE 'No messages found for user (this is OK for testing)';
  END IF;
END $$;

-- STEP 2: Explain plan for the query (to verify index usage)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM message_responses
WHERE message_id IN (
  SELECT id FROM messages
  WHERE user_id = '1a20e70f-86e6-406d-a09f-b4959b3cc0d0'::UUID
  LIMIT 32
);

-- STEP 3: Verify RLS policy is using indexes
SELECT
  'Index Scan' AS expected_scan_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'message_responses'
        AND indexname = 'idx_message_responses_message_id'
    )
    THEN 'EXISTS ✓'
    ELSE 'MISSING ✗'
  END AS message_id_index,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'messages'
        AND indexname = 'idx_messages_user_id'
    )
    THEN 'EXISTS ✓'
    ELSE 'MISSING ✗'
  END AS messages_user_id_index;

-- STEP 4: Verify RLS policy structure
SELECT
  policyname,
  cmd,
  CASE
    WHEN pg_get_expr(qual, 'message_responses'::regclass) LIKE '%EXISTS%'
    THEN 'Uses EXISTS (optimized) ✓'
    WHEN pg_get_expr(qual, 'message_responses'::regclass) LIKE '%IN%'
    THEN 'Uses IN (needs optimization) ✗'
    ELSE 'Unknown structure'
  END AS policy_optimization_status
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'message_responses'
  AND p.policyname = 'responses_select_policy';
