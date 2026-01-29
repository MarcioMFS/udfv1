-- Fix events UPDATE policy: Add missing WITH CHECK clause
-- Problem: Jean (instructor) cannot update event schedules
-- Root cause: UPDATE policy has USING but no WITH CHECK (defaults to false)
-- Solution: Add WITH CHECK to allow instructors to update their own events

-- ============================================================
-- Drop and recreate the UPDATE policy with WITH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Instructors can update own events" ON events;

CREATE POLICY "Instructors can update own events"
ON events
FOR UPDATE
TO authenticated
USING (
  -- Can update if user is the event owner
  instructor_id IN (
    SELECT id FROM instructors
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  -- After update, event must still belong to the same instructor
  instructor_id IN (
    SELECT id FROM instructors
    WHERE id = auth.uid()
  )
);

-- ============================================================
-- OPTIONAL: Also add admin override policy
-- ============================================================

CREATE POLICY "Admins can update any event"
ON events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. USING clause: Controls which rows can be SELECTED for update
-- 2. WITH CHECK clause: Controls if the NEW row values are allowed after update
-- 3. Without WITH CHECK, Postgres defaults to blocking all updates
--
-- 4. Now instructors can:
--    - Update schedule, name, description, etc. of THEIR events
--    - Cannot change instructor_id (would fail WITH CHECK)
--
-- 5. Admins can:
--    - Update any event regardless of ownership
--    - Useful for fixing mistakes or managing all events
-- ============================================================
