-- ================================================================
-- CORREÇÃO: Recursão Infinita nas Políticas RLS
-- Data: 08/01/2026
-- ================================================================

-- ================================================================
-- SOLUÇÃO: Usar JWT claim ao invés de consulta recursiva
-- ================================================================

-- 1. Remover políticas recursivas
DROP POLICY IF EXISTS "instructors_select_admin" ON public.instructors;
DROP POLICY IF EXISTS "instructors_insert_admin" ON public.instructors;
DROP POLICY IF EXISTS "instructors_delete_admin" ON public.instructors;
DROP POLICY IF EXISTS "instructors_update_own" ON public.instructors;

-- 2. Criar função helper para verificar admin (SECURITY DEFINER evita recursão)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$;

-- 3. Recriar políticas usando a função helper
CREATE POLICY "instructors_select_admin"
ON public.instructors
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "instructors_update_own"
ON public.instructors
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND NOT (
  -- Não pode remover próprio admin sem ser único admin
  (SELECT is_admin FROM public.instructors WHERE id = auth.uid()) = TRUE
  AND is_admin = FALSE
  AND (SELECT COUNT(*) FROM public.instructors WHERE is_admin = TRUE) = 1
));

CREATE POLICY "instructors_insert_admin"
ON public.instructors
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "instructors_delete_admin"
ON public.instructors
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ================================================================
-- ATUALIZAR OUTRAS POLÍTICAS QUE USAM RECURSÃO
-- ================================================================

-- Classes
DROP POLICY IF EXISTS "classes_select_own" ON public.classes;
CREATE POLICY "classes_select_own"
ON public.classes
FOR SELECT
TO authenticated
USING (instructor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "classes_insert_own" ON public.classes;
CREATE POLICY "classes_insert_own"
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (instructor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "classes_update_own" ON public.classes;
CREATE POLICY "classes_update_own"
ON public.classes
FOR UPDATE
TO authenticated
USING (instructor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "classes_delete_admin" ON public.classes;
CREATE POLICY "classes_delete_admin"
ON public.classes
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Events
DROP POLICY IF EXISTS "events_select_own" ON public.events;
CREATE POLICY "events_select_own"
ON public.events
FOR SELECT
TO authenticated
USING (
  instructor_id = auth.uid()
  OR public.is_admin()
  OR class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
);

DROP POLICY IF EXISTS "events_insert_own" ON public.events;
CREATE POLICY "events_insert_own"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  (instructor_id = auth.uid() AND class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid()))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "events_update_own" ON public.events;
CREATE POLICY "events_update_own"
ON public.events
FOR UPDATE
TO authenticated
USING (
  (instructor_id = auth.uid() AND (end_date IS NULL OR end_date >= CURRENT_DATE))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "events_delete_admin" ON public.events;
CREATE POLICY "events_delete_admin"
ON public.events
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Players
DROP POLICY IF EXISTS "players_select_own_classes" ON public.players;
CREATE POLICY "players_select_own_classes"
ON public.players
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT cp.player_id FROM public.class_players cp
    JOIN public.classes c ON c.id = cp.class_id
    WHERE c.instructor_id = auth.uid()
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "players_insert_admin" ON public.players;
CREATE POLICY "players_insert_admin"
ON public.players
FOR INSERT
TO authenticated, anon
WITH CHECK (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "players_update_admin" ON public.players;
CREATE POLICY "players_update_admin"
ON public.players
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Class Players
DROP POLICY IF EXISTS "class_players_select_own" ON public.class_players;
CREATE POLICY "class_players_select_own"
ON public.class_players
FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "class_players_insert_own" ON public.class_players;
CREATE POLICY "class_players_insert_own"
ON public.class_players
FOR INSERT
TO authenticated, anon
WITH CHECK (
  class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR public.is_admin()
  OR auth.uid() IS NULL
);

DROP POLICY IF EXISTS "class_players_delete_own" ON public.class_players;
CREATE POLICY "class_players_delete_own"
ON public.class_players
FOR DELETE
TO authenticated
USING (
  class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR public.is_admin()
);

-- Matches
DROP POLICY IF EXISTS "matches_select_own" ON public.matches;
CREATE POLICY "matches_select_own"
ON public.matches
FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "matches_update_admin" ON public.matches;
CREATE POLICY "matches_update_admin"
ON public.matches
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Match Results
DROP POLICY IF EXISTS "match_results_select_own" ON public.match_results;
CREATE POLICY "match_results_select_own"
ON public.match_results
FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.classes c ON c.id = e.class_id
    WHERE c.instructor_id = auth.uid()
  )
  OR public.is_admin()
);

-- Teams
DROP POLICY IF EXISTS "teams_select_own" ON public.teams;
CREATE POLICY "teams_select_own"
ON public.teams
FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR created_by = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "teams_insert_own" ON public.teams;
CREATE POLICY "teams_insert_own"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "teams_update_own" ON public.teams;
CREATE POLICY "teams_update_own"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "teams_delete_own" ON public.teams;
CREATE POLICY "teams_delete_own"
ON public.teams
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  OR public.is_admin()
);

-- Influencers
DROP POLICY IF EXISTS "influencers_insert_admin" ON public.influencers;
CREATE POLICY "influencers_insert_admin"
ON public.influencers
FOR INSERT
TO authenticated, anon
WITH CHECK (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "influencers_update_admin" ON public.influencers;
CREATE POLICY "influencers_update_admin"
ON public.influencers
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- ================================================================
-- FIM DA CORREÇÃO
-- ================================================================

COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user is admin - prevents RLS recursion';

DO $$
BEGIN
  RAISE NOTICE '✅ Recursão infinita corrigida!';
  RAISE NOTICE '✅ Função is_admin() criada com SECURITY DEFINER';
  RAISE NOTICE '✅ Todas as políticas atualizadas';
END $$;
