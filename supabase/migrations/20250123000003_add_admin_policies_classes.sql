-- Add admin policies for classes table
-- Problem: Admins can only see their own classes, not all classes in the system
-- Solution: Add policy that allows admins to view and manage any class

-- Policy: Admins can view all classes
CREATE POLICY "Admins can view all classes"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);

-- Policy: Admins can create classes for any instructor
CREATE POLICY "Admins can create any class"
ON classes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);

-- Policy: Admins can update any class
CREATE POLICY "Admins can update any class"
ON classes
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

-- Policy: Admins can delete any class
CREATE POLICY "Admins can delete any class"
ON classes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);
