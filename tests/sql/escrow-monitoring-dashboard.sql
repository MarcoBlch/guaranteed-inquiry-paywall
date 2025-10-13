-- ═══════════════════════════════════════════════════════════════
-- 📊 ESCROW SYSTEM MONITORING DASHBOARD
-- Single comprehensive query for daily monitoring
-- Run this in Supabase SQL Editor or via psql
-- ═══════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 1: Transaction Status Overview
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT
  '📊 TRANSACTION STATUS OVERVIEW' as section,
  '' as metric,
  '' as value,
  '' as percentage,
  '' as notes
UNION ALL

SELECT
  '',
  status,
  COUNT(*)::text as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)::text || '%' as percentage,
  CASE
    WHEN status = 'held' THEN 'Awaiting response'
    WHEN status = 'released' THEN 'Response received, funds distributed'
    WHEN status = 'refunded' THEN 'Timeout - funds returned'
    WHEN status = 'pending_user_setup' THEN 'Response received, Stripe Connect not setup'
    ELSE ''
  END as notes
FROM escrow_transactions
GROUP BY status

UNION ALL
SELECT '', '───────────', '─────', '──────', '────────────'
UNION ALL
SELECT '', 'TOTAL', COUNT(*)::text, '100%', '' FROM escrow_transactions

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 2: Response Metrics
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNION ALL
SELECT
  '',
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '📬 RESPONSE METRICS (Last 30 Days)',
  '',
  '',
  '',
  ''

UNION ALL
SELECT
  '',
  'Total Responses',
  COUNT(*)::text,
  '',
  ''
FROM email_response_tracking
WHERE response_received_at > NOW() - INTERVAL '30 days'

UNION ALL
SELECT
  '',
  'On-Time Responses',
  COUNT(*)::text,
  ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM email_response_tracking WHERE response_received_at > NOW() - INTERVAL '30 days'), 0), 2)::text || '%',
  'Within original deadline'
FROM email_response_tracking
WHERE within_deadline = true
AND response_received_at > NOW() - INTERVAL '30 days'

UNION ALL
SELECT
  '',
  'Grace Period Used',
  COUNT(*)::text,
  ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM email_response_tracking WHERE response_received_at > NOW() - INTERVAL '30 days'), 0), 2)::text || '%',
  'Replied 0-15min after deadline'
FROM email_response_tracking
WHERE grace_period_used = true
AND response_received_at > NOW() - INTERVAL '30 days'

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 3: Average Response Time
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNION ALL
SELECT
  '',
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '⏱️  RESPONSE TIME ANALYSIS',
  '',
  '',
  '',
  ''

UNION ALL
SELECT
  '',
  'Average Response Time',
  COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (ert.response_received_at - et.created_at)) / 3600
      )::numeric,
      1
    )::text || ' hours',
    'N/A'
  ),
  '',
  'From transaction creation to response'
FROM email_response_tracking ert
JOIN escrow_transactions et ON et.message_id = ert.message_id
WHERE ert.response_received_at > NOW() - INTERVAL '30 days'

UNION ALL
SELECT
  '',
  'Median Response Time',
  COALESCE(
    ROUND(
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (ert.response_received_at - et.created_at)) / 3600
      )::numeric,
      1
    )::text || ' hours',
    'N/A'
  ),
  '',
  '50th percentile'
FROM email_response_tracking ert
JOIN escrow_transactions et ON et.message_id = ert.message_id
WHERE ert.response_received_at > NOW() - INTERVAL '30 days'

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 4: Financial Metrics
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNION ALL
SELECT
  '',
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '💰 FINANCIAL METRICS (Last 30 Days)',
  '',
  '',
  '',
  ''

UNION ALL
SELECT
  '',
  'Total Volume',
  '€' || COALESCE(ROUND(SUM(amount), 2)::text, '0'),
  '',
  'All transactions'
FROM escrow_transactions
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL
SELECT
  '',
  'Released (Paid Out)',
  '€' || COALESCE(ROUND(SUM(amount), 2)::text, '0'),
  ROUND(100.0 * SUM(amount) / NULLIF((SELECT SUM(amount) FROM escrow_transactions WHERE created_at > NOW() - INTERVAL '30 days'), 0), 2)::text || '%',
  'Response received'
FROM escrow_transactions
WHERE status IN ('released', 'completed')
AND created_at > NOW() - INTERVAL '30 days'

UNION ALL
SELECT
  '',
  'Refunded (Timeout)',
  '€' || COALESCE(ROUND(SUM(amount), 2)::text, '0'),
  ROUND(100.0 * SUM(amount) / NULLIF((SELECT SUM(amount) FROM escrow_transactions WHERE created_at > NOW() - INTERVAL '30 days'), 0), 2)::text || '%',
  'No response within deadline'
FROM escrow_transactions
WHERE status = 'refunded'
AND created_at > NOW() - INTERVAL '30 days'

UNION ALL
SELECT
  '',
  'Platform Fees (25%)',
  '€' || COALESCE(ROUND(SUM(amount) * 0.25, 2)::text, '0'),
  '',
  'Estimated from released transactions'
FROM escrow_transactions
WHERE status IN ('released', 'completed')
AND created_at > NOW() - INTERVAL '30 days'

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 5: Detection Method Breakdown
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNION ALL
SELECT
  '',
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '🔍 RESPONSE DETECTION METHODS',
  '',
  '',
  '',
  ''

UNION ALL
SELECT
  '',
  CASE response_detected_method
    WHEN 'webhook' THEN 'Webhook (Automated)'
    WHEN 'manual' THEN 'Manual'
    WHEN 'grace_period' THEN 'Grace Period'
    ELSE response_detected_method
  END,
  COUNT(*)::text,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)::text || '%',
  CASE response_detected_method
    WHEN 'webhook' THEN 'Postmark webhook detected response'
    WHEN 'manual' THEN 'Admin manually marked'
    WHEN 'grace_period' THEN 'Detected in grace period'
    ELSE ''
  END
FROM email_response_tracking
WHERE response_received_at > NOW() - INTERVAL '30 days'
GROUP BY response_detected_method

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 6: Health Checks (CRITICAL ALERTS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNION ALL
SELECT
  '',
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '🚨 HEALTH CHECKS',
  '',
  '',
  '',
  ''

UNION ALL
SELECT
  '',
  '⚠️  Stuck Transactions',
  COUNT(*)::text,
  '',
  CASE
    WHEN COUNT(*) = 0 THEN '✅ Good - no stuck transactions'
    WHEN COUNT(*) < 5 THEN '⚠️  Warning - investigate'
    ELSE '🚨 Critical - immediate action needed'
  END
FROM escrow_transactions
WHERE status = 'held'
AND expires_at < NOW() - INTERVAL '20 minutes'

UNION ALL
SELECT
  '',
  'Pending Stripe Setup',
  COUNT(*)::text,
  '',
  CASE
    WHEN COUNT(*) = 0 THEN '✅ Good - all users configured'
    ELSE '⚠️  Users need to complete Stripe Connect'
  END
FROM escrow_transactions
WHERE status = 'pending_user_setup'

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 7: 75/25 Split Verification
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNION ALL
SELECT
  '',
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '🧮 75/25 SPLIT VERIFICATION',
  '',
  '',
  '',
  ''

UNION ALL
SELECT
  '',
  'Recent Transactions',
  COUNT(*)::text,
  '',
  'Checking last 100 completed transactions'
FROM escrow_transactions
WHERE status IN ('released', 'completed')
ORDER BY created_at DESC
LIMIT 100

UNION ALL
SELECT
  '',
  'Expected User Amount (75%)',
  '€' || COALESCE(ROUND(AVG(FLOOR(amount * 0.75)), 2)::text, '0'),
  '',
  'Average of user portion'
FROM (
  SELECT amount FROM escrow_transactions
  WHERE status IN ('released', 'completed')
  ORDER BY created_at DESC
  LIMIT 100
) recent

UNION ALL
SELECT
  '',
  'Expected Platform Fee (25%)',
  '€' || COALESCE(ROUND(AVG(amount - FLOOR(amount * 0.75)), 2)::text, '0'),
  '',
  'Average of platform portion'
FROM (
  SELECT amount FROM escrow_transactions
  WHERE status IN ('released', 'completed')
  ORDER BY created_at DESC
  LIMIT 100
) recent

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 8: Refund Rate Analysis
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNION ALL
SELECT
  '',
  '',
  '',
  '',
  ''
UNION ALL
SELECT
  '📉 REFUND RATE ANALYSIS',
  '',
  '',
  '',
  ''

UNION ALL
SELECT
  '',
  'Refund Rate',
  COUNT(*) FILTER (WHERE status = 'refunded')::text || ' / ' ||
  COUNT(*)::text,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'refunded') /
    NULLIF(COUNT(*), 0),
    2
  )::text || '%',
  CASE
    WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'refunded') / NULLIF(COUNT(*), 0), 2) < 10
      THEN '✅ Excellent (<10%)'
    WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'refunded') / NULLIF(COUNT(*), 0), 2) < 25
      THEN '⚠️  Moderate (10-25%)'
    ELSE '🚨 High (>25%) - investigate'
  END
FROM escrow_transactions
WHERE created_at > NOW() - INTERVAL '30 days'

ORDER BY 1, 2;

-- ═══════════════════════════════════════════════════════════════
-- END OF MONITORING DASHBOARD
-- ═══════════════════════════════════════════════════════════════

-- 📝 Notes:
-- - Run this query daily to monitor system health
-- - Pay attention to "🚨 HEALTH CHECKS" section
-- - Investigate any stuck transactions immediately
-- - Refund rate >25% may indicate pricing/value issues
-- - Grace period usage >10% may indicate deadline too short
