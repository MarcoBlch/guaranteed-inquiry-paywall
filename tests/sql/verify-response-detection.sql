-- ═══════════════════════════════════════════════════════════════
-- 📊 Response Detection Analysis
-- Verify webhook automation is working properly
-- ═══════════════════════════════════════════════════════════════

-- Response Detection Methods
SELECT
  '🔍 Detection Methods (Last 30 Days)' as section,
  '' as method,
  '' as count,
  '' as percentage
UNION ALL
SELECT
  '',
  CASE response_detected_method
    WHEN 'webhook' THEN 'Webhook (Automated)'
    WHEN 'manual' THEN 'Manual Override'
    WHEN 'grace_period' THEN 'Grace Period'
    ELSE response_detected_method
  END,
  COUNT(*)::text,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)::text || '%'
FROM email_response_tracking
WHERE response_received_at > NOW() - INTERVAL '30 days'
GROUP BY response_detected_method
ORDER BY COUNT(*) DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Target: >90% webhook detection (automation)
-- If manual >10%: Webhook may be failing
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Timing Analysis
SELECT
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '⏱️  Timing Analysis',
  '',
  '',
  ''
UNION ALL
SELECT
  '',
  'On-Time Responses',
  COUNT(*) FILTER (WHERE within_deadline = true)::text,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE within_deadline = true) / COUNT(*),
    2
  )::text || '%'
FROM email_response_tracking
WHERE response_received_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  '',
  'Grace Period Used',
  COUNT(*) FILTER (WHERE grace_period_used = true)::text,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE grace_period_used = true) / COUNT(*),
    2
  )::text || '%'
FROM email_response_tracking
WHERE response_received_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  '',
  'After Grace Period',
  COUNT(*) FILTER (WHERE within_deadline = false AND grace_period_used = false)::text,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE within_deadline = false AND grace_period_used = false) / COUNT(*),
    2
  )::text || '%'
FROM email_response_tracking
WHERE response_received_at > NOW() - INTERVAL '30 days';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Grace period usage >15%: Consider longer deadlines
-- After grace period >5%: Should not happen (webhook late detection?)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Recent Responses Detail
SELECT
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '📋 Recent Responses (Last 10)',
  '',
  '',
  ''
UNION ALL
SELECT
  '',
  'Message ID',
  'Detection Method',
  'Timing'
FROM (SELECT 1) dummy  -- Header row
LIMIT 0;

-- Actual data
SELECT
  '',
  LEFT(message_id::text, 8) || '...',
  response_detected_method,
  CASE
    WHEN within_deadline THEN 'On-time'
    WHEN grace_period_used THEN 'Grace period'
    ELSE 'Late'
  END
FROM email_response_tracking
ORDER BY response_received_at DESC
LIMIT 10;
