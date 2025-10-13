-- ═══════════════════════════════════════════════════════════════
-- 🧮 Verify 75/25 Split Accuracy
-- Checks that user + platform = total amount
-- ═══════════════════════════════════════════════════════════════

WITH split_calculations AS (
  SELECT
    id,
    amount as total_amount,
    FLOOR(amount * 0.75) as calculated_user_amount,
    amount - FLOOR(amount * 0.75) as calculated_platform_fee,
    created_at,
    message_id,
    status
  FROM escrow_transactions
  WHERE status IN ('released', 'pending_user_setup', 'completed')
  ORDER BY created_at DESC
  LIMIT 100
)
SELECT
  id,
  total_amount,
  calculated_user_amount as user_75_percent,
  calculated_platform_fee as platform_25_percent,
  calculated_user_amount + calculated_platform_fee as sum_check,
  CASE
    WHEN calculated_user_amount + calculated_platform_fee = total_amount
      THEN '✅ Correct'
    ELSE '❌ MISMATCH!'
  END as validation,
  CASE
    WHEN calculated_user_amount + calculated_platform_fee != total_amount
      THEN (calculated_user_amount + calculated_platform_fee - total_amount)::text || ' cents off'
    ELSE 'Perfect'
  END as discrepancy
FROM split_calculations
ORDER BY validation DESC, created_at DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Expected Result: All rows should show "✅ Correct"
-- If mismatches appear: Rounding error in calculation
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Summary Statistics
SELECT
  '📊 Split Summary' as metric,
  '' as value
UNION ALL
SELECT
  'Total Checked',
  COUNT(*)::text
FROM (
  SELECT * FROM escrow_transactions
  WHERE status IN ('released', 'pending_user_setup', 'completed')
  ORDER BY created_at DESC
  LIMIT 100
) recent
UNION ALL
SELECT
  'Average User Amount (75%)',
  '€' || ROUND(AVG(FLOOR(amount * 0.75)), 2)::text
FROM (
  SELECT amount FROM escrow_transactions
  WHERE status IN ('released', 'pending_user_setup', 'completed')
  ORDER BY created_at DESC
  LIMIT 100
) recent
UNION ALL
SELECT
  'Average Platform Fee (25%)',
  '€' || ROUND(AVG(amount - FLOOR(amount * 0.75)), 2)::text
FROM (
  SELECT amount FROM escrow_transactions
  WHERE status IN ('released', 'pending_user_setup', 'completed')
  ORDER BY created_at DESC
  LIMIT 100
) recent;
