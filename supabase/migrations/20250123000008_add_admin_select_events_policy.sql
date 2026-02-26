-- Add admin SELECT policy for events table
-- Problem: Admin cannot see all events in AdminEmailsPage - only sees events filtered by RLS
-- Root cause: "Instructors can read own events" policy restricts SELECT to own events only
-- Solution: Add policy that allows admins to view all events

-- ============================================================
-- Add admin read policy for events
-- ============================================================

CREATE POLICY "Admins can read any event"
ON events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);

-- ============================================================
-- Also add admin policies for classes if not exists
-- (so admin can see all classes in email page)
-- ============================================================

DO $$
BEGIN
  -- Check if admin select policy exists for classes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classes'
    AND policyname = 'Admins can read any class'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can read any class"
    ON classes
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM instructors
        WHERE instructors.id = auth.uid()
        AND instructors.is_admin = true
      )
    )';
  END IF;
END $$;

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. This policy allows admins to see ALL events regardless of ownership
-- 2. Combined with existing "Instructors can read own events", this gives:
--    - Regular instructors: can see only their events
--    - Admins: can see all events
-- 3. The AdminEmailsPage needs this to populate the event dropdown
-- ============================================================
