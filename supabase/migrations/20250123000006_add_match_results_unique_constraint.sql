-- Add UNIQUE constraint to match_results to prevent logical duplicates
-- Problem: "Elis" shows 9 points instead of 6 due to duplicate match_results
-- Root cause: No uniqueness constraint on (player_id, event_id, match_number)
-- Solution: Add UNIQUE constraint + cleanup existing duplicates

-- ============================================================
-- STEP 1: Identify and log duplicates BEFORE cleanup
-- ============================================================
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT player_id, event_id, match_number
    FROM match_results
    GROUP BY player_id, event_id, match_number
    HAVING COUNT(*) > 1
  ) duplicates;

  RAISE NOTICE 'Found % groups with duplicates in match_results', duplicate_count;
END $$;

-- ============================================================
-- STEP 2: Create backup table (safety net)
-- ============================================================
CREATE TABLE IF NOT EXISTS match_results_backup_20250123 AS
SELECT * FROM match_results;

DO $$
BEGIN
  RAISE NOTICE 'Backup created: match_results_backup_20250123';
END $$;

-- ============================================================
-- STEP 3: Remove duplicates - Keep OLDEST record per logical key
-- ============================================================
-- Strategy: For each (player_id, event_id, match_number) group,
-- keep the record with MIN(created_at), delete others

DELETE FROM match_results
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY player_id, event_id, match_number
        ORDER BY created_at ASC, id ASC  -- Keep oldest, tie-break by id
      ) as rn
    FROM match_results
  ) ranked
  WHERE rn > 1
);

-- ============================================================
-- STEP 4: Add UNIQUE constraint
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS match_results_player_event_match_key
ON match_results (player_id, event_id, match_number);

ALTER TABLE match_results
ADD CONSTRAINT match_results_player_event_match_key
UNIQUE USING INDEX match_results_player_event_match_key;

-- ============================================================
-- STEP 5: Recalculate all instructor stats with clean data
-- ============================================================
DO $$
DECLARE
  instructor_record RECORD;
BEGIN
  FOR instructor_record IN SELECT id FROM instructors LOOP
    PERFORM recalculate_instructor_stats(instructor_record.id);
  END LOOP;
  RAISE NOTICE 'Recalculated stats for all instructors after deduplication';
END $$;

-- ============================================================
-- STEP 6: Verify fix
-- ============================================================
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT player_id, event_id, match_number
    FROM match_results
    GROUP BY player_id, event_id, match_number
    HAVING COUNT(*) > 1
  ) duplicates;

  IF remaining_duplicates > 0 THEN
    RAISE WARNING 'Still have % duplicate groups after cleanup!', remaining_duplicates;
  ELSE
    RAISE NOTICE 'Success: No duplicates remaining in match_results';
  END IF;
END $$;

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. This migration is SAFE because:
--    - Creates backup before deletion
--    - Keeps oldest record (likely the original)
--    - Recalculates stats after cleanup
--
-- 2. If migration FAILS:
--    - Check: SELECT * FROM match_results_backup_20250123;
--    - Restore: INSERT INTO match_results SELECT * FROM match_results_backup_20250123;
--
-- 3. To verify Elis's score after migration:
--    SELECT * FROM instructor_stats
--    WHERE instructor_id = (SELECT id FROM instructors WHERE name ILIKE '%elis%');
--
-- 4. Expected result:
--    - Elis should show 6 points (not 9)
--    - All instructors' stats recalculated correctly
-- ============================================================
