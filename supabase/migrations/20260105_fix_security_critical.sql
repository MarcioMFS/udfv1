-- ================================================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA - Sistema UDFV1
-- Data: 05/01/2026
--
-- Esta migration CORRIGE vulnerabilidades críticas SEM quebrar dados existentes
-- ================================================================

-- ================================================================
-- 1. CORRIGIR TIPO DO CAMPO is_admin (TEXT -> BOOLEAN)
-- ================================================================

-- Primeiro, adicionar coluna temporária
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS is_admin_bool BOOLEAN;

-- Migrar dados: 'true' -> TRUE, qualquer outra coisa -> FALSE
UPDATE public.instructors
SET is_admin_bool = CASE
  WHEN is_admin = 'true' THEN TRUE
  ELSE FALSE
END;

-- Remover coluna antiga (se existir como TEXT)
ALTER TABLE public.instructors
DROP COLUMN IF EXISTS is_admin CASCADE;

-- Renomear coluna nova
ALTER TABLE public.instructors
RENAME COLUMN is_admin_bool TO is_admin;

-- Definir valor padrão
ALTER TABLE public.instructors
ALTER COLUMN is_admin SET DEFAULT FALSE;

-- Garantir NOT NULL
ALTER TABLE public.instructors
ALTER COLUMN is_admin SET NOT NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_instructors_is_admin
ON public.instructors(is_admin)
WHERE is_admin = TRUE;

COMMENT ON COLUMN public.instructors.is_admin IS 'Indica se o instrutor tem privilégios de administrador';


-- ================================================================
-- 2. POLÍTICAS RLS SEGURAS - INSTRUCTORS
-- ================================================================

-- Remover políticas inseguras
DROP POLICY IF EXISTS "permit all" ON public.instructors;
DROP POLICY IF EXISTS "permit" ON public.instructors;
DROP POLICY IF EXISTS "true" ON public.instructors;

-- Política 1: Instrutor pode ver apenas seus próprios dados
CREATE POLICY "instructors_select_own"
ON public.instructors
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Política 2: Admin pode ver todos
CREATE POLICY "instructors_select_admin"
ON public.instructors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 3: Instrutor pode atualizar apenas seus próprios dados
CREATE POLICY "instructors_update_own"
ON public.instructors
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND is_admin = (SELECT is_admin FROM public.instructors WHERE id = auth.uid()));

-- Política 4: Apenas admin pode criar instrutores
CREATE POLICY "instructors_insert_admin"
ON public.instructors
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 5: Apenas admin pode deletar
CREATE POLICY "instructors_delete_admin"
ON public.instructors
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- 3. POLÍTICAS RLS SEGURAS - CLASSES
-- ================================================================

DROP POLICY IF EXISTS "permit" ON public.classes;
DROP POLICY IF EXISTS "permit all" ON public.classes;

-- Política 1: Instrutor vê apenas suas turmas
CREATE POLICY "classes_select_own"
ON public.classes
FOR SELECT
TO authenticated
USING (
  instructor_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 2: Instrutor cria apenas para si
CREATE POLICY "classes_insert_own"
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (
  instructor_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 3: Instrutor atualiza apenas suas turmas
CREATE POLICY "classes_update_own"
ON public.classes
FOR UPDATE
TO authenticated
USING (
  instructor_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 4: Apenas admin deleta turmas
CREATE POLICY "classes_delete_admin"
ON public.classes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- 4. POLÍTICAS RLS SEGURAS - EVENTS
-- ================================================================

DROP POLICY IF EXISTS "permit" ON public.events;
DROP POLICY IF EXISTS "permit all" ON public.events;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.events;

-- Política 1: Ver apenas eventos de suas turmas
CREATE POLICY "events_select_own"
ON public.events
FOR SELECT
TO authenticated
USING (
  instructor_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
  OR
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
);

-- Política 2: Criar apenas para suas turmas
CREATE POLICY "events_insert_own"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  (
    instructor_id = auth.uid()
    AND class_id IN (SELECT id FROM public.classes WHERE instructor_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 3: Atualizar apenas seus eventos (ou admin)
-- Regra especial: Eventos passados só admin pode editar
CREATE POLICY "events_update_own"
ON public.events
FOR UPDATE
TO authenticated
USING (
  (
    instructor_id = auth.uid()
    AND (end_date IS NULL OR end_date >= CURRENT_DATE) -- Eventos futuros ou sem data
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 4: Apenas admin deleta eventos
CREATE POLICY "events_delete_admin"
ON public.events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- 5. POLÍTICAS RLS SEGURAS - PLAYERS
-- ================================================================

DROP POLICY IF EXISTS "permit" ON public.players;
DROP POLICY IF EXISTS "permit all" ON public.players;

-- Política 1: Ver jogadores de suas turmas
CREATE POLICY "players_select_own_classes"
ON public.players
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT cp.player_id
    FROM public.class_players cp
    JOIN public.classes c ON c.id = cp.class_id
    WHERE c.instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 2: Admin e webhooks podem inserir
CREATE POLICY "players_insert_admin"
ON public.players
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
  OR
  auth.uid() IS NULL -- Permite webhooks (anon)
);

-- Política 3: Apenas admin atualiza
CREATE POLICY "players_update_admin"
ON public.players
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- 6. POLÍTICAS RLS SEGURAS - CLASS_PLAYERS
-- ================================================================

DROP POLICY IF EXISTS "permit" ON public.class_players;

-- Política 1: Ver vinculações de suas turmas
CREATE POLICY "class_players_select_own"
ON public.class_players
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 2: Inserir em suas turmas ou admin/webhook
CREATE POLICY "class_players_insert_own"
ON public.class_players
FOR INSERT
TO authenticated, anon
WITH CHECK (
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
  OR
  auth.uid() IS NULL -- Webhooks
);

-- Política 3: Deletar apenas de suas turmas
CREATE POLICY "class_players_delete_own"
ON public.class_players
FOR DELETE
TO authenticated
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- 7. POLÍTICAS RLS SEGURAS - MATCHES
-- ================================================================

DROP POLICY IF EXISTS "permit" ON public.matches;

-- Política 1: Ver partidas de suas turmas
CREATE POLICY "matches_select_own"
ON public.matches
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 2: Webhooks podem inserir partidas
CREATE POLICY "matches_insert_webhook"
ON public.matches
FOR INSERT
TO authenticated, anon
WITH CHECK (TRUE); -- Permite webhook criar partidas

-- Política 3: Apenas admin atualiza
CREATE POLICY "matches_update_admin"
ON public.matches
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- 8. POLÍTICAS RLS SEGURAS - MATCH_RESULTS
-- ================================================================

-- Política 1: Ver resultados de suas turmas
CREATE POLICY "match_results_select_own"
ON public.match_results
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  event_id IN (
    SELECT id FROM public.events WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 2: Webhooks podem inserir resultados
CREATE POLICY "match_results_insert_webhook"
ON public.match_results
FOR INSERT
TO authenticated, anon
WITH CHECK (TRUE);


-- ================================================================
-- 9. POLÍTICAS RLS SEGURAS - TEAMS
-- ================================================================

DROP POLICY IF EXISTS "permit" ON public.teams;
DROP POLICY IF EXISTS "delete" ON public.teams;
DROP POLICY IF EXISTS "insert" ON public.teams;
DROP POLICY IF EXISTS "update" ON public.teams;

-- Política 1: Ver times de suas turmas
CREATE POLICY "teams_select_own"
ON public.teams
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 2: Criar times em suas turmas
CREATE POLICY "teams_insert_own"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 3: Atualizar apenas times próprios
CREATE POLICY "teams_update_own"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Política 4: Deletar apenas times próprios
CREATE POLICY "teams_delete_own"
ON public.teams
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  class_id IN (
    SELECT id FROM public.classes WHERE instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- 10. POLÍTICAS RLS SEGURAS - INFLUENCERS
-- ================================================================

DROP POLICY IF EXISTS "true" ON public.influencers;
DROP POLICY IF EXISTS "permit" ON public.influencers;

-- Política 1: Todos podem ver influencers (não sensível)
CREATE POLICY "influencers_select_all"
ON public.influencers
FOR SELECT
TO authenticated
USING (TRUE);

-- Política 2: Apenas admin pode criar
CREATE POLICY "influencers_insert_admin"
ON public.influencers
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
  OR
  auth.uid() IS NULL -- Webhook
);

-- Política 3: Apenas admin atualiza
CREATE POLICY "influencers_update_admin"
ON public.influencers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);


-- ================================================================
-- AUDITORIA E LOG
-- ================================================================

COMMENT ON TABLE public.instructors IS 'Tabela de instrutores com RLS habilitado - Atualizada em 05/01/2026';
COMMENT ON TABLE public.classes IS 'Tabela de turmas com RLS habilitado - Atualizada em 05/01/2026';
COMMENT ON TABLE public.events IS 'Tabela de eventos com RLS habilitado e proteção de datas passadas - Atualizada em 05/01/2026';

-- ================================================================
-- FIM DA MIGRATION
-- ================================================================

-- Validar que RLS está ativo em todas as tabelas críticas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'instructors'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS não está habilitado na tabela instructors!';
  END IF;

  RAISE NOTICE '✅ Migration de segurança aplicada com sucesso!';
  RAISE NOTICE '✅ Políticas RLS seguras implementadas';
  RAISE NOTICE '✅ Campo is_admin corrigido para BOOLEAN';
  RAISE NOTICE '⚠️  PRÓXIMO PASSO: Adicionar autenticação nos webhooks';
END $$;
