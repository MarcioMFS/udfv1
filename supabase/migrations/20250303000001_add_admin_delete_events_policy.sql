-- Add admin DELETE policy for events table
-- Problem: Admin cannot delete events from the panel
-- Solution: Add policy that allows admins to delete any event

-- ============================================================
-- Add admin delete policy for events
-- ============================================================

CREATE POLICY "Admins can delete any event"
ON events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);

-- ============================================================
-- Also allow instructors to delete their OWN events
-- ============================================================

CREATE POLICY "Instructors can delete own events"
ON events
FOR DELETE
TO authenticated
USING (
  instructor_id IN (
    SELECT id FROM instructors
    WHERE id = auth.uid()
  )
);

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. Admins can delete ANY event
-- 2. Regular instructors can delete only THEIR OWN events
-- 3. The EventDetailsPage shows delete button only for admins,
--    but this policy allows flexibility if needed later
-- ============================================================
