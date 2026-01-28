-- SQL Script to Revert "Delivered" Status
-- This script:
-- 1. Deletes all "Delivered" (status = 3) records from panel_status_histories
-- 2. Updates all panels with status "Delivered" (3) back to "Proceed for Delivery" (2)
--
-- IMPORTANT: Review the counts before running the DELETE and UPDATE statements!
-- Run this in a transaction so you can rollback if needed.

BEGIN;

-- Step 1: Check how many history records will be deleted
SELECT 
    COUNT(*) as records_to_delete,
    COUNT(DISTINCT panel_id) as affected_panels
FROM panel_status_histories
WHERE status = 3; -- "Delivered"

-- Step 2: Check how many panels will be updated
SELECT 
    COUNT(*) as panels_to_update
FROM panels
WHERE status = 3; -- "Delivered"

-- Step 3: Show which panels will be affected (optional - for review)
SELECT 
    p.id,
    p.name,
    p.status,
    COUNT(h.id) as delivered_history_count
FROM panels p
LEFT JOIN panel_status_histories h ON p.id = h.panel_id AND h.status = 3
WHERE p.status = 3
GROUP BY p.id, p.name, p.status
ORDER BY p.name;

-- ============================================
-- EXECUTE THE FOLLOWING AFTER REVIEWING ABOVE
-- ============================================

-- Step 4: Delete all "Delivered" status history records
DELETE FROM panel_status_histories
WHERE status = 3; -- "Delivered"

-- Step 5: Update all panels with "Delivered" status back to "Proceed for Delivery"
UPDATE panels
SET status = 2 -- "Proceed for Delivery"
WHERE status = 3; -- "Delivered"

-- Step 6: Verify the changes
SELECT 
    'Remaining Delivered history records' as check_type,
    COUNT(*) as count
FROM panel_status_histories
WHERE status = 3
UNION ALL
SELECT 
    'Panels still with Delivered status' as check_type,
    COUNT(*) as count
FROM panels
WHERE status = 3
UNION ALL
SELECT 
    'Panels now with Proceed for Delivery status' as check_type,
    COUNT(*) as count
FROM panels
WHERE status = 2;

-- If everything looks good, commit the transaction:
-- COMMIT;

-- If something went wrong, rollback:
-- ROLLBACK;
