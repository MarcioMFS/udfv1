-- Add admin policies for class_players
-- Problem: Admins can't manage class students because policies only check if user is the class instructor
-- Solution: Add policies that allow admins to manage any class

-- Policy: Admins can insert students into any class
CREATE POLICY "Admins can add students to any class"
ON class_players
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);

-- Policy: Admins can view students in any class
CREATE POLICY "Admins can view all class students"
ON class_players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);

-- Policy: Admins can update students in any class
CREATE POLICY "Admins can update any class students"
ON class_players
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

-- Policy: Admins can delete students from any class
CREATE POLICY "Admins can remove students from any class"
ON class_players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);
