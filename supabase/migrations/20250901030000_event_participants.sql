-- Migration: Create event_participants table for tracking participation status

-- Create event_participants table
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamp with time zone DEFAULT now(),
  participated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, player_id)
);

-- Add indexes
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_player_id ON event_participants(player_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

-- Add check constraint for status values
ALTER TABLE event_participants 
ADD CONSTRAINT chk_event_participants_status 
CHECK (status IN ('invited', 'participated', 'candidate_instructor'));

-- Enable RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view event participants they have access to" 
ON event_participants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN classes c ON e.class_id = c.id
    WHERE e.id = event_participants.event_id
    AND (
      c.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM class_players cp
        WHERE cp.class_id = c.id 
        AND cp.player_id IN (
          SELECT p.id FROM players p WHERE p.email = auth.email()
        )
      )
    )
  )
);

CREATE POLICY "Instructors can manage event participants" 
ON event_participants FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN classes c ON e.class_id = c.id
    WHERE e.id = event_participants.event_id
    AND c.instructor_id = auth.uid()
  )
);

-- Create function to automatically update participated status when player makes a match
CREATE OR REPLACE FUNCTION update_event_participation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to 'participated' when a match result is created
  UPDATE event_participants 
  SET 
    status = CASE 
      WHEN status = 'invited' THEN 'participated'
      ELSE status 
    END,
    participated_at = CASE 
      WHEN status = 'invited' THEN NEW.created_at
      ELSE participated_at
    END,
    updated_at = now()
  WHERE event_id = NEW.event_id 
    AND player_id = NEW.player_id
    AND status = 'invited';

  -- If it's a training event, update to candidate_instructor
  UPDATE event_participants 
  SET 
    status = 'candidate_instructor',
    updated_at = now()
  WHERE event_id = NEW.event_id 
    AND player_id = NEW.player_id
    AND status = 'participated'
    AND EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = NEW.event_id 
      AND e.event_type = 'training'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
CREATE TRIGGER trigger_update_event_participation_status
  AFTER INSERT ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participation_status();

-- Create function to get participant status with training eligibility
CREATE OR REPLACE FUNCTION get_event_participants_with_status(event_id_param uuid)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  player_id uuid,
  player_name text,
  player_email text,
  status text,
  invited_at timestamp with time zone,
  participated_at timestamp with time zone,
  total_matches bigint,
  can_promote_to_instructor boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id,
    ep.event_id,
    ep.player_id,
    p.name as player_name,
    p.email as player_email,
    ep.status,
    ep.invited_at,
    ep.participated_at,
    COALESCE(match_count.total, 0) as total_matches,
    (ep.status = 'candidate_instructor' 
     AND NOT EXISTS (
       SELECT 1 FROM instructors i WHERE i.email = p.email
     )) as can_promote_to_instructor
  FROM event_participants ep
  JOIN players p ON ep.player_id = p.id
  LEFT JOIN (
    SELECT 
      mr.player_id, 
      mr.event_id,
      COUNT(*) as total
    FROM match_results mr
    WHERE mr.event_id = event_id_param
    GROUP BY mr.player_id, mr.event_id
  ) match_count ON match_count.player_id = ep.player_id 
    AND match_count.event_id = ep.event_id
  WHERE ep.event_id = event_id_param
  ORDER BY 
    CASE ep.status 
      WHEN 'candidate_instructor' THEN 1
      WHEN 'participated' THEN 2
      WHEN 'invited' THEN 3
    END,
    ep.invited_at;
END;
$$ LANGUAGE plpgsql;