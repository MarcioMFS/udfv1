-- =====================================================================
-- Corrige: "null value in column pioneerrank violates not-null constraint"
-- ao criar turma / importar planilha de instrutor novo.
--
-- CAUSA
-- recalculate_instructor_stats() calcula o "rank de pioneiro" olhando só os
-- 100 instrutores mais antigos:
--
--   WITH pioneer_ranking AS (
--     SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rank
--     FROM instructors ORDER BY created_at ASC LIMIT 100
--   )
--   SELECT COALESCE(pr.rank, 0) INTO pioneer_rank
--   FROM pioneer_ranking pr WHERE pr.id = instructor_uuid;
--
-- Quando o instrutor esta FORA desse top-100 (o sistema ja passou de 100
-- instrutores), o SELECT nao retorna nenhuma linha. Em PL/pgSQL, um
-- "SELECT ... INTO" sem linha zera a variavel para NULL -- o COALESCE so age
-- sobre linhas retornadas e o ":= 0" inicial e sobrescrito. O INSERT seguinte
-- grava NULL em instructor_stats.pioneerrank (NOT NULL) e a transacao inteira
-- (incluindo a criacao da turma) falha.
--
-- Efeito observado: com 146 instrutores, toda importacao de instrutor novo
-- (alem do top-100) quebrava. Apenas 11 instrutores tinham stats.
--
-- FIX
-- Transformar o SELECT num agregado (MAX), que SEMPRE retorna exatamente uma
-- linha. Sem match, MAX() e NULL e o COALESCE externo garante 0. Nenhuma outra
-- logica muda -- e o unico SELECT INTO da funcao que podia retornar 0 linhas.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.recalculate_instructor_stats(instructor_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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
      SELECT COUNT(*) INTO classes_count
      FROM classes
      WHERE instructor_id = instructor_uuid;

      SELECT COUNT(DISTINCT cp.player_id) INTO students_count
      FROM classes c
      JOIN class_players cp ON c.id = cp.class_id
      WHERE c.instructor_id = instructor_uuid;

      SELECT COUNT(m.id) INTO matches_count
      FROM classes c
      JOIN events e ON c.id = e.class_id
      JOIN matches m ON e.id = m.event_id
      WHERE c.instructor_id = instructor_uuid;

      SELECT COUNT(*) INTO events_count
      FROM events e
      JOIN classes c ON e.class_id = c.id
      WHERE c.instructor_id = instructor_uuid;

      SELECT COUNT(DISTINCT i.id) INTO leaders_count
      FROM classes c
      JOIN class_players cp ON c.id = cp.class_id
      JOIN instructors i ON cp.player_id = i.id
      WHERE c.instructor_id = instructor_uuid AND c.instructor_id != i.id;

      SELECT
          COALESCE(SUM(mr.lucro), 0),
          COALESCE(SUM(CASE WHEN mr.lucro > 0 THEN 1 ELSE 0 END), 0)
      INTO total_profit, profitable_matches
      FROM classes c
      JOIN events e ON c.id = e.class_id
      JOIN match_results mr ON e.id = mr.event_id
      WHERE c.instructor_id = instructor_uuid;

      SELECT COALESCE(ROUND(AVG(mr.satisfacao)), 0) INTO engagement_avg
      FROM classes c
      JOIN events e ON c.id = e.class_id
      JOIN match_results mr ON e.id = mr.event_id
      WHERE c.instructor_id = instructor_uuid AND mr.satisfacao IS NOT NULL;

      -- FIX: agregado MAX() sempre retorna 1 linha; COALESCE externo garante nao-nulo.
      SELECT COALESCE(MAX(pr.rank), 0) INTO pioneer_rank
      FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rank
          FROM instructors
          ORDER BY created_at ASC
          LIMIT 100
      ) pr
      WHERE pr.id = instructor_uuid;

      WITH class_rankings AS (
          SELECT
              c.id,
              ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(mr.lucro), 0) DESC, c.id ASC) as rank
          FROM classes c
          LEFT JOIN events e ON c.id = e.class_id
          LEFT JOIN match_results mr ON e.id = mr.event_id
          GROUP BY c.id, c.instructor_id
      )
      SELECT
          COUNT(*) FILTER (WHERE cr.rank <= 10),
          COUNT(*) FILTER (WHERE cr.rank <= 5),
          COUNT(*) FILTER (WHERE cr.rank <= 3)
      INTO top10_classes, top5_classes, top3_classes
      FROM class_rankings cr
      WHERE cr.id IN (SELECT id FROM classes WHERE instructor_id = instructor_uuid);

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

-- Blindagem defensiva: mesmo que algo volte a passar NULL, o default cobre.
ALTER TABLE public.instructor_stats ALTER COLUMN pioneerrank SET DEFAULT 0;
