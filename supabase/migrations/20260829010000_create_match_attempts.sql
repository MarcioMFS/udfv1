-- =====================================================================
-- Registro de tentativas de partida REJEITADAS por identificacao.
--
-- Hoje, quando um jogador manda partida com email que nao existe ou que nao
-- esta inscrito na turma do evento, o webhook-create-match apenas dispara um
-- email de alerta ao admin e DESCARTA a partida -- nada fica no banco. O
-- instrutor reclama que "os dados nao apareceram" e a unica pista e print de
-- tela do jogador.
--
-- Esta tabela passa a guardar cada tentativa rejeitada para o ADMIN gerenciar:
--   - jogador legitimo que digitou email errado  -> admin corrige e reprocessa
--   - email de quem NAO esta inscrito (burla)     -> admin marca p/ cobranca
--
-- Preenchida pelo webhook-create-match (service_role). Lida so pelo admin.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.match_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- o que o jogo enviou
  player_email text NOT NULL,          -- email digitado pelo jogador
  event_code   text NOT NULL,          -- codigo do evento digitado
  app_serial   text,                   -- dados da partida (permite REPROCESSAR)
  match_number integer,

  -- valores opcionais que o jogo pode ter mandado ja calculados
  lucro        numeric,
  satisfacao   integer,
  bonus_money  numeric,

  -- contexto resolvido no momento da rejeicao (quando da p/ resolver)
  event_id      uuid REFERENCES public.events(id) ON DELETE SET NULL,
  class_id      uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL,

  -- por que foi rejeitada
  reason text NOT NULL CHECK (reason IN ('email_not_found', 'not_enrolled', 'event_not_found')),

  -- tratativa do admin
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'ignored', 'flagged')),
  resolved_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  resolved_by        uuid REFERENCES public.instructors(id) ON DELETE SET NULL,
  resolved_at        timestamptz,
  admin_note text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_attempts_status     ON public.match_attempts (status);
CREATE INDEX IF NOT EXISTS idx_match_attempts_class      ON public.match_attempts (class_id);
CREATE INDEX IF NOT EXISTS idx_match_attempts_instructor ON public.match_attempts (instructor_id);
CREATE INDEX IF NOT EXISTS idx_match_attempts_email      ON public.match_attempts (lower(player_email));
CREATE INDEX IF NOT EXISTS idx_match_attempts_created    ON public.match_attempts (created_at DESC);

-- Evita empilhar a mesma tentativa repetida (mesmo email+evento+partida ainda pendente).
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_attempts_dedupe
  ON public.match_attempts (lower(player_email), event_code, match_number)
  WHERE status = 'pending';

ALTER TABLE public.match_attempts ENABLE ROW LEVEL SECURITY;

-- Somente admin le/gerencia. O webhook grava via service_role (que ignora RLS).
CREATE POLICY "Admins can view match attempts"
ON public.match_attempts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM instructors WHERE instructors.id = auth.uid() AND instructors.is_admin = true)
);

CREATE POLICY "Admins can update match attempts"
ON public.match_attempts FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM instructors WHERE instructors.id = auth.uid() AND instructors.is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM instructors WHERE instructors.id = auth.uid() AND instructors.is_admin = true)
);

COMMENT ON TABLE public.match_attempts IS
  'Tentativas de partida rejeitadas por identificacao (email errado / nao inscrito). Gerenciadas pelo admin.';
