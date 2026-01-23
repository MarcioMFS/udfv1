-- Add RLS policies for class_players table
-- Problem: RLS is enabled but no policies exist, blocking all operations
-- Solution: Create policies allowing instructors to manage their class students

-- Policy: Instructors can insert students into their own classes
CREATE POLICY "Instructors can add students to their classes"
ON class_players
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_players.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Policy: Instructors can view students in their classes
CREATE POLICY "Instructors can view their class students"
ON class_players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_players.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Policy: Instructors can update students in their classes
CREATE POLICY "Instructors can update their class students"
ON class_players
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_players.class_id
    AND classes.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_players.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Policy: Instructors can delete students from their classes
CREATE POLICY "Instructors can remove students from their classes"
ON class_players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_players.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Policy: Service role has full access (for webhooks and system operations)
CREATE POLICY "Service role has full access to class_players"
ON class_players
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
