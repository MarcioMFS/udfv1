-- Fix import scoping: Add composite unique keys to prevent cross-instructor collisions
-- Problem: Importing same Excel for different instructors causes data overwrite
-- Solution: Scope uniqueness by instructor_id and class_id

-- ============================================================
-- PART 1: Fix classes table - Add composite unique key
-- ============================================================

-- Drop old global UNIQUE constraint on code
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_code_key;
DROP INDEX IF EXISTS classes_code_key;

-- Create NEW composite unique constraint: (code, instructor_id)
-- This allows same code for different instructors
CREATE UNIQUE INDEX classes_code_instructor_key
ON classes (code, instructor_id);

ALTER TABLE classes
ADD CONSTRAINT classes_code_instructor_key
UNIQUE USING INDEX classes_code_instructor_key;

-- ============================================================
-- PART 2: Fix events table - Add composite unique key
-- ============================================================

-- Drop old global UNIQUE constraint on code
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_code_key;
DROP INDEX IF EXISTS events_code_key;

-- Create NEW composite unique constraint: (code, class_id)
-- This allows same event code in different classes
CREATE UNIQUE INDEX events_code_class_key
ON events (code, class_id);

ALTER TABLE events
ADD CONSTRAINT events_code_class_key
UNIQUE USING INDEX events_code_class_key;

-- ============================================================
-- PART 3: Add helpful indexes for import queries
-- ============================================================

-- Index for finding classes by code + instructor (already created above as unique)
-- Index for finding events by class_id (already exists: idx_events_class_id)

-- Add index for faster event deletion/replacement by class_id
CREATE INDEX IF NOT EXISTS idx_events_class_id_created_at
ON events (class_id, created_at DESC);

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. This migration is SAFE because:
--    - We drop global uniqueness and add scoped uniqueness
--    - If there are existing collisions, migration will FAIL (good!)
--    - User should manually resolve conflicts before migration
--
-- 2. Import behavior AFTER this migration:
--    - Same Excel → Same Instructor → UPSERT (idempotent) ✅
--    - Same Excel → Different Instructor → NEW class created ✅
--    - Events scoped by class_id → No cross-class pollution ✅
--
-- 3. Potential conflicts to resolve BEFORE migration:
--    - Check: SELECT code, instructor_id, COUNT(*) FROM classes
--             GROUP BY code, instructor_id HAVING COUNT(*) > 1;
--    - Check: SELECT code, class_id, COUNT(*) FROM events
--             GROUP BY code, class_id HAVING COUNT(*) > 1;
-- ============================================================
