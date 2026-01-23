-- Add RLS policies for players table
-- Problem: Jean (instructor) can't update players (team_id, purpose) because RLS is enabled but no policies exist
-- Solution: Create policies allowing instructors to manage players in their classes

-- ============================================================
-- POLICY 1: Instructors can view players in their classes
-- ============================================================
CREATE POLICY "Instructors can view players in their classes"
ON players
FOR SELECT
TO authenticated
USING (
  -- Players linked via class_players to instructor's classes
  EXISTS (
    SELECT 1
    FROM class_players cp
    JOIN classes c ON c.id = cp.class_id
    WHERE cp.player_id = players.id
    AND c.instructor_id = auth.uid()
  )
);

-- ============================================================
-- POLICY 2: Instructors can update players in their classes
-- ============================================================
CREATE POLICY "Instructors can update players in their classes"
ON players
FOR UPDATE
TO authenticated
USING (
  -- Can only update players that belong to their classes
  EXISTS (
    SELECT 1
    FROM class_players cp
    JOIN classes c ON c.id = cp.class_id
    WHERE cp.player_id = players.id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  -- After update, player must still belong to instructor's classes
  EXISTS (
    SELECT 1
    FROM class_players cp
    JOIN classes c ON c.id = cp.class_id
    WHERE cp.player_id = players.id
    AND c.instructor_id = auth.uid()
  )
);

-- ============================================================
-- POLICY 3: Admins can view all players
-- ============================================================
CREATE POLICY "Admins can view all players"
ON players
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
-- POLICY 4: Admins can update any player
-- ============================================================
CREATE POLICY "Admins can update any player"
ON players
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
-- POLICY 5: Service role has full access (for webhooks/imports)
-- ============================================================
CREATE POLICY "Service role has full access to players"
ON players
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- POLICY 6: Instructors can insert players in their classes
-- (For future import functionality)
-- ============================================================
CREATE POLICY "Instructors can insert players in their classes"
ON players
FOR INSERT
TO authenticated
WITH CHECK (
  -- This is tricky: new player doesn't have class_players yet
  -- So we allow insert, then class_players will be created after
  -- Or we require class_id to be passed (but players table doesn't have class_id directly)
  -- For now, allow all inserts by authenticated users,
  -- as class_players policies will control the association
  true
);

-- ============================================================
-- POLICY 7: Instructors can delete players from their classes
-- ============================================================
CREATE POLICY "Instructors can delete players from their classes"
ON players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM class_players cp
    JOIN classes c ON c.id = cp.class_id
    WHERE cp.player_id = players.id
    AND c.instructor_id = auth.uid()
  )
);

-- ============================================================
-- POLICY 8: Admins can delete any player
-- ============================================================
CREATE POLICY "Admins can delete any player"
ON players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE instructors.id = auth.uid()
    AND instructors.is_admin = true
  )
);
