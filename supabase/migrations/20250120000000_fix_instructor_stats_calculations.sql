-- Fix instructor stats calculations to properly aggregate by player
-- Problem: Currently averaging ALL match_results, but should average per player first

CREATE OR REPLACE FUNCTION public.recalculate_instructor_stats(instructor_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
  DECLARE
      classes_count integer := 0;
      students_count integer := 0;
      matches_count integer := 0;
      events_count integer := 0;
      leaders_count integer := 0;
      total_profit numeric := 0;
      profitable_matches integer := 0;
      engagement_avg integer := 0;
      pioneer_rank integer := 0;
      top10_classes integer := 0;
      top5_classes integer := 0;
      top3_classes integer := 0;
  BEGIN
      -- Contar turmas (classes) - INALTERADO
      SELECT COUNT(*) INTO classes_count
      FROM classes
      WHERE instructor_id = instructor_uuid;

      -- Contar alunos únicos - INALTERADO
      SELECT COUNT(DISTINCT cp.player_id) INTO students_count
      FROM classes c
      JOIN class_players cp ON c.id = cp.class_id
      WHERE c.instructor_id = instructor_uuid;

      -- Contar partidas (matches) - ATUALIZADO para usar event_id
      SELECT COUNT(m.id) INTO matches_count
      FROM classes c
      JOIN events e ON c.id = e.class_id
      JOIN matches m ON e.id = m.event_id
      WHERE c.instructor_id = instructor_uuid;

      -- Contar eventos - CORRIGIDO
      SELECT COUNT(*) INTO events_count
      FROM events e
      JOIN classes c ON e.class_id = c.id
      WHERE c.instructor_id = instructor_uuid;

      -- Contar líderes - INALTERADO
      SELECT COUNT(DISTINCT i.id) INTO leaders_count
      FROM classes c
      JOIN class_players cp ON c.id = cp.class_id
      JOIN instructors i ON cp.player_id = i.id
      WHERE c.instructor_id = instructor_uuid AND c.instructor_id != i.id;

      -- Calcular lucro total e partidas com lucro - CORRIGIDO para agregar por player primeiro
      -- Agrupa por player e evento, calcula média de lucro por player, depois soma
      WITH player_avg_profits AS (
          SELECT
              mr.player_id,
              mr.event_id,
              AVG(mr.lucro) as avg_lucro
          FROM classes c
          JOIN events e ON c.id = e.class_id
          JOIN match_results mr ON e.id = mr.event_id
          WHERE c.instructor_id = instructor_uuid
          GROUP BY mr.player_id, mr.event_id
      )
      SELECT
          COALESCE(SUM(avg_lucro), 0),
          COALESCE(SUM(CASE WHEN avg_lucro > 0 THEN 1 ELSE 0 END), 0)
      INTO total_profit, profitable_matches
      FROM player_avg_profits;

      -- Calcular engajamento (satisfação) - CORRIGIDO para agregar por player primeiro
      -- Agrupa por player e evento, calcula média de satisfação por player, depois média geral
      WITH player_avg_satisfaction AS (
          SELECT
              mr.player_id,
              mr.event_id,
              AVG(mr.satisfacao) as avg_satisfacao
          FROM classes c
          JOIN events e ON c.id = e.class_id
          JOIN match_results mr ON e.id = mr.event_id
          WHERE c.instructor_id = instructor_uuid AND mr.satisfacao IS NOT NULL
          GROUP BY mr.player_id, mr.event_id
      )
      SELECT COALESCE(ROUND(AVG(avg_satisfacao)), 0) INTO engagement_avg
      FROM player_avg_satisfaction;

      -- Calcular rank de pioneiro - INALTERADO
      WITH pioneer_ranking AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rank
          FROM instructors
          ORDER BY created_at ASC
          LIMIT 100
      )
      SELECT COALESCE(pr.rank, 0) INTO pioneer_rank
      FROM pioneer_ranking pr
      WHERE pr.id = instructor_uuid;

      -- Calcular ranking de turmas - CORRIGIDO para agregar por player primeiro
      WITH class_rankings AS (
          SELECT
              c.id,
              ROW_NUMBER() OVER (
                  ORDER BY COALESCE(
                      (SELECT AVG(avg_lucro)
                       FROM (
                           SELECT AVG(mr.lucro) as avg_lucro
                           FROM match_results mr
                           JOIN events e ON mr.event_id = e.id
                           WHERE e.class_id = c.id
                           GROUP BY mr.player_id, mr.event_id
                       ) player_profits
                      ),
                      0
                  ) DESC,
                  c.id ASC
              ) as rank
          FROM classes c
          GROUP BY c.id, c.instructor_id
      )
      SELECT
          COUNT(*) FILTER (WHERE cr.rank <= 10),
          COUNT(*) FILTER (WHERE cr.rank <= 5),
          COUNT(*) FILTER (WHERE cr.rank <= 3)
      INTO top10_classes, top5_classes, top3_classes
      FROM class_rankings cr
      WHERE cr.id IN (SELECT id FROM classes WHERE instructor_id = instructor_uuid);

      -- Inserir ou atualizar (UPSERT) - INALTERADO
      INSERT INTO instructor_stats (
          instructor_id, classes, students, matches, events, leaders,
          totalprofit, profitablematches, engagement, pioneerrank,
          top10classes, top5classes, top3classes, updated_at
      ) VALUES (
          instructor_uuid, classes_count, students_count, matches_count, events_count, leaders_count,
          total_profit, profitable_matches, engagement_avg, pioneer_rank,
          top10_classes, top5_classes, top3_classes, NOW()
      )
      ON CONFLICT (instructor_id)
      DO UPDATE SET
          classes = EXCLUDED.classes,
          students = EXCLUDED.students,
          matches = EXCLUDED.matches,
          events = EXCLUDED.events,
          leaders = EXCLUDED.leaders,
          totalprofit = EXCLUDED.totalprofit,
          profitablematches = EXCLUDED.profitablematches,
          engagement = EXCLUDED.engagement,
          pioneerrank = EXCLUDED.pioneerrank,
          top10classes = EXCLUDED.top10classes,
          top5classes = EXCLUDED.top5classes,
          top3classes = EXCLUDED.top3classes,
          updated_at = EXCLUDED.updated_at;

      RAISE LOG 'Instructor stats updated for instructor_id: %', instructor_uuid;
  END;
  $function$
;

-- Recalcular estatísticas de todos os instrutores com a nova lógica
DO $$
DECLARE
    instructor_record RECORD;
BEGIN
    FOR instructor_record IN SELECT id FROM instructors LOOP
        PERFORM recalculate_instructor_stats(instructor_record.id);
    END LOOP;
    RAISE NOTICE 'Recalculated stats for all instructors';
END $$;
