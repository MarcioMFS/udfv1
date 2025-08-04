-- Auto-update instructor_stats with triggers
-- This migration creates PostgreSQL triggers to automatically update instructor stats

-- Function to recalculate instructor stats
CREATE OR REPLACE FUNCTION recalculate_instructor_stats(instructor_uuid uuid)
RETURNS void AS $$
DECLARE
    classes_count integer := 0;
    students_count integer := 0;
    matches_count integer := 0;
    events_count integer := 0;
    leaders_count integer := 0;
    total_profit numeric := 0;
    packages_sold integer := 0;
    engagement_avg integer := 0;
    pioneer_rank integer := 0;
    top10_classes integer := 0;
    top5_classes integer := 0;
    top3_classes integer := 0;
BEGIN
    -- Count classes
    SELECT COUNT(*) INTO classes_count
    FROM classes 
    WHERE instructor_id = instructor_uuid;
    
    -- Count unique students
    SELECT COUNT(DISTINCT cp.player_id) INTO students_count
    FROM classes c
    JOIN class_players cp ON c.id = cp.class_id
    WHERE c.instructor_id = instructor_uuid;
    
    -- Count matches
    SELECT COUNT(m.id) INTO matches_count
    FROM classes c
    JOIN matches m ON c.id = m.class_id
    WHERE c.instructor_id = instructor_uuid;
    
    -- Count events
    SELECT COUNT(*) INTO events_count
    FROM events 
    WHERE instructor_id = instructor_uuid;
    
    -- Count leaders (students who became instructors)
    SELECT COUNT(DISTINCT i.id) INTO leaders_count
    FROM classes c
    JOIN class_players cp ON c.id = cp.class_id
    JOIN instructors i ON cp.player_id::text = i.id::text
    WHERE c.instructor_id = instructor_uuid;
    
    -- Calculate total profit
    SELECT COALESCE(SUM(mr.lucro), 0) INTO total_profit
    FROM classes c
    JOIN match_results mr ON c.id = mr.class_id
    WHERE c.instructor_id = instructor_uuid;
    
    -- Count packages sold
    SELECT COUNT(*) INTO packages_sold
    FROM sales 
    WHERE instructor_id = instructor_uuid;
    
    -- Calculate engagement (average satisfaction)
    SELECT COALESCE(ROUND(AVG(mr.satisfacao)), 0) INTO engagement_avg
    FROM classes c
    JOIN match_results mr ON c.id = mr.class_id
    WHERE c.instructor_id = instructor_uuid 
    AND mr.satisfacao IS NOT NULL;
    
    -- Calculate pioneer rank (position among first 100 instructors)
    WITH pioneer_ranking AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rank
        FROM instructors
        ORDER BY created_at ASC
        LIMIT 100
    )
    SELECT COALESCE(pr.rank, 0) INTO pioneer_rank
    FROM pioneer_ranking pr
    WHERE pr.id = instructor_uuid;
    
    -- Calculate class rankings for top10/5/3
    WITH class_rankings AS (
        SELECT 
            c.id,
            c.instructor_id,
            COALESCE(AVG(mr.lucro), 0) as avg_profit,
            ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(mr.lucro), 0) DESC) as rank
        FROM classes c
        LEFT JOIN match_results mr ON c.id = mr.class_id
        GROUP BY c.id, c.instructor_id
    )
    SELECT 
        COUNT(CASE WHEN cr.rank <= 10 THEN 1 END),
        COUNT(CASE WHEN cr.rank <= 5 THEN 1 END),
        COUNT(CASE WHEN cr.rank <= 3 THEN 1 END)
    INTO top10_classes, top5_classes, top3_classes
    FROM class_rankings cr
    WHERE cr.instructor_id = instructor_uuid;
    
    -- Upsert the calculated stats
    INSERT INTO instructor_stats (
        instructor_id,
        classes,
        students,
        matches,
        events,
        leaders,
        totalprofit,
        packagessold,
        engagement,
        pioneerrank,
        top10classes,
        top5classes,
        top3classes,
        updated_at
    ) VALUES (
        instructor_uuid,
        classes_count,
        students_count,
        matches_count,
        events_count,
        leaders_count,
        total_profit,
        packages_sold,
        engagement_avg,
        pioneer_rank,
        top10_classes,
        top5_classes,
        top3_classes,
        NOW()
    )
    ON CONFLICT (instructor_id) 
    DO UPDATE SET
        classes = EXCLUDED.classes,
        students = EXCLUDED.students,
        matches = EXCLUDED.matches,
        events = EXCLUDED.events,
        leaders = EXCLUDED.leaders,
        totalprofit = EXCLUDED.totalprofit,
        packagessold = EXCLUDED.packagessold,
        engagement = EXCLUDED.engagement,
        pioneerrank = EXCLUDED.pioneerrank,
        top10classes = EXCLUDED.top10classes,
        top5classes = EXCLUDED.top5classes,
        top3classes = EXCLUDED.top3classes,
        updated_at = EXCLUDED.updated_at;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle class changes
CREATE OR REPLACE FUNCTION handle_class_changes()
RETURNS trigger AS $$
BEGIN
    -- Handle INSERT/UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_instructor_stats(NEW.instructor_id);
        -- If instructor changed, recalculate old instructor too
        IF TG_OP = 'UPDATE' AND OLD.instructor_id != NEW.instructor_id THEN
            PERFORM recalculate_instructor_stats(OLD.instructor_id);
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_instructor_stats(OLD.instructor_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle class_players changes
CREATE OR REPLACE FUNCTION handle_class_players_changes()
RETURNS trigger AS $$
DECLARE
    instructor_uuid uuid;
BEGIN
    -- Get instructor_id from class
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT instructor_id INTO instructor_uuid
        FROM classes WHERE id = NEW.class_id;
        
        IF instructor_uuid IS NOT NULL THEN
            PERFORM recalculate_instructor_stats(instructor_uuid);
        END IF;
        
        -- If class changed, recalculate old class instructor too
        IF TG_OP = 'UPDATE' AND OLD.class_id != NEW.class_id THEN
            SELECT instructor_id INTO instructor_uuid
            FROM classes WHERE id = OLD.class_id;
            IF instructor_uuid IS NOT NULL THEN
                PERFORM recalculate_instructor_stats(instructor_uuid);
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        SELECT instructor_id INTO instructor_uuid
        FROM classes WHERE id = OLD.class_id;
        
        IF instructor_uuid IS NOT NULL THEN
            PERFORM recalculate_instructor_stats(instructor_uuid);
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle match_results changes
CREATE OR REPLACE FUNCTION handle_match_results_changes()
RETURNS trigger AS $$
DECLARE
    instructor_uuid uuid;
BEGIN
    -- Get instructor_id from class
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT instructor_id INTO instructor_uuid
        FROM classes WHERE id = NEW.class_id;
        
        IF instructor_uuid IS NOT NULL THEN
            PERFORM recalculate_instructor_stats(instructor_uuid);
        END IF;
        
        -- If class changed, recalculate old class instructor too
        IF TG_OP = 'UPDATE' AND OLD.class_id != NEW.class_id THEN
            SELECT instructor_id INTO instructor_uuid
            FROM classes WHERE id = OLD.class_id;
            IF instructor_uuid IS NOT NULL THEN
                PERFORM recalculate_instructor_stats(instructor_uuid);
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        SELECT instructor_id INTO instructor_uuid
        FROM classes WHERE id = OLD.class_id;
        
        IF instructor_uuid IS NOT NULL THEN
            PERFORM recalculate_instructor_stats(instructor_uuid);
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle matches changes
CREATE OR REPLACE FUNCTION handle_matches_changes()
RETURNS trigger AS $$
DECLARE
    instructor_uuid uuid;
BEGIN
    -- Get instructor_id from class
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT instructor_id INTO instructor_uuid
        FROM classes WHERE id = NEW.class_id;
        
        IF instructor_uuid IS NOT NULL THEN
            PERFORM recalculate_instructor_stats(instructor_uuid);
        END IF;
        
        -- If class changed, recalculate old class instructor too
        IF TG_OP = 'UPDATE' AND OLD.class_id != NEW.class_id THEN
            SELECT instructor_id INTO instructor_uuid
            FROM classes WHERE id = OLD.class_id;
            IF instructor_uuid IS NOT NULL THEN
                PERFORM recalculate_instructor_stats(instructor_uuid);
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        SELECT instructor_id INTO instructor_uuid
        FROM classes WHERE id = OLD.class_id;
        
        IF instructor_uuid IS NOT NULL THEN
            PERFORM recalculate_instructor_stats(instructor_uuid);
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle events changes
CREATE OR REPLACE FUNCTION handle_events_changes()
RETURNS trigger AS $$
BEGIN
    -- Handle INSERT/UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_instructor_stats(NEW.instructor_id);
        -- If instructor changed, recalculate old instructor too
        IF TG_OP = 'UPDATE' AND OLD.instructor_id != NEW.instructor_id THEN
            PERFORM recalculate_instructor_stats(OLD.instructor_id);
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_instructor_stats(OLD.instructor_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle sales changes
CREATE OR REPLACE FUNCTION handle_sales_changes()
RETURNS trigger AS $$
BEGIN
    -- Handle INSERT/UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_instructor_stats(NEW.instructor_id);
        -- If instructor changed, recalculate old instructor too
        IF TG_OP = 'UPDATE' AND OLD.instructor_id != NEW.instructor_id THEN
            PERFORM recalculate_instructor_stats(OLD.instructor_id);
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_instructor_stats(OLD.instructor_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_classes_stats ON classes;
CREATE TRIGGER trigger_classes_stats
    AFTER INSERT OR UPDATE OR DELETE ON classes
    FOR EACH ROW EXECUTE FUNCTION handle_class_changes();

DROP TRIGGER IF EXISTS trigger_class_players_stats ON class_players;
CREATE TRIGGER trigger_class_players_stats
    AFTER INSERT OR UPDATE OR DELETE ON class_players
    FOR EACH ROW EXECUTE FUNCTION handle_class_players_changes();

DROP TRIGGER IF EXISTS trigger_matches_stats ON matches;
CREATE TRIGGER trigger_matches_stats
    AFTER INSERT OR UPDATE OR DELETE ON matches
    FOR EACH ROW EXECUTE FUNCTION handle_matches_changes();

DROP TRIGGER IF EXISTS trigger_match_results_stats ON match_results;
CREATE TRIGGER trigger_match_results_stats
    AFTER INSERT OR UPDATE OR DELETE ON match_results
    FOR EACH ROW EXECUTE FUNCTION handle_match_results_changes();

DROP TRIGGER IF EXISTS trigger_events_stats ON events;
CREATE TRIGGER trigger_events_stats
    AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION handle_events_changes();

DROP TRIGGER IF EXISTS trigger_sales_stats ON sales;
CREATE TRIGGER trigger_sales_stats
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION handle_sales_changes();

-- Initial population of instructor_stats for existing instructors
INSERT INTO instructor_stats (instructor_id, classes, students, matches, events, leaders, totalprofit, packagessold, engagement, pioneerrank, top10classes, top5classes, top3classes, created_at, updated_at)
SELECT 
    i.id,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    NOW(),
    NOW()
FROM instructors i
WHERE NOT EXISTS (
    SELECT 1 FROM instructor_stats WHERE instructor_id = i.id
);

-- Recalculate stats for all existing instructors
DO $$
DECLARE
    instructor_record RECORD;
BEGIN
    FOR instructor_record IN SELECT id FROM instructors LOOP
        PERFORM recalculate_instructor_stats(instructor_record.id);
    END LOOP;
END $$;