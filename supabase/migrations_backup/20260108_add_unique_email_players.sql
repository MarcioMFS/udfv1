-- ================================================================
-- Adicionar UNIQUE constraint em players.email
-- Data: 08/01/2026
-- ================================================================

-- 1. Primeiro, limpar duplicados existentes (manter o mais recente)
DO $$
DECLARE
  duplicate_email TEXT;
  player_to_keep UUID;
  players_to_delete UUID[];
BEGIN
  -- Para cada email duplicado
  FOR duplicate_email IN
    SELECT email
    FROM players
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Encontrado email duplicado: %', duplicate_email;

    -- Pegar o player mais recente para manter
    SELECT id INTO player_to_keep
    FROM players
    WHERE email = duplicate_email
    ORDER BY created_at DESC
    LIMIT 1;

    -- Pegar IDs dos players duplicados (exceto o que vamos manter)
    SELECT ARRAY_AGG(id) INTO players_to_delete
    FROM players
    WHERE email = duplicate_email
    AND id != player_to_keep;

    IF players_to_delete IS NOT NULL THEN
      RAISE NOTICE '  Mantendo player: %, deletando: %', player_to_keep, players_to_delete;

      -- Atualizar referências antes de deletar
      -- matches (atualizar diretamente, não tem constraint UNIQUE)
      UPDATE matches
      SET player_id = player_to_keep
      WHERE player_id = ANY(players_to_delete);

      -- match_results (atualizar diretamente, não tem constraint UNIQUE)
      UPDATE match_results
      SET player_id = player_to_keep
      WHERE player_id = ANY(players_to_delete);

      -- class_players (deletar duplicados, manter apenas vinculações únicas)
      DELETE FROM class_players
      WHERE player_id = ANY(players_to_delete)
      AND class_id IN (
        SELECT class_id FROM class_players WHERE player_id = player_to_keep
      );

      -- Atualizar os que não conflitam
      UPDATE class_players
      SET player_id = player_to_keep
      WHERE player_id = ANY(players_to_delete);

      -- event_participants (deletar duplicados, manter apenas vinculações únicas)
      DELETE FROM event_participants
      WHERE player_id = ANY(players_to_delete)
      AND event_id IN (
        SELECT event_id FROM event_participants WHERE player_id = player_to_keep
      );

      -- Atualizar os que não conflitam
      UPDATE event_participants
      SET player_id = player_to_keep
      WHERE player_id = ANY(players_to_delete);

      -- Deletar players duplicados
      DELETE FROM players WHERE id = ANY(players_to_delete);

      RAISE NOTICE '  ✅ Duplicados removidos';
    END IF;
  END LOOP;
END $$;

-- 2. Adicionar constraint UNIQUE em email
CREATE UNIQUE INDEX IF NOT EXISTS players_email_unique ON public.players(email) WHERE email IS NOT NULL;

ALTER TABLE public.players
ADD CONSTRAINT players_email_unique UNIQUE USING INDEX players_email_unique;

-- 3. Atualizar webhooks para usar email como chave de upsert
COMMENT ON COLUMN public.players.email IS 'Email único do jogador - usado como identificador principal';

-- ================================================================
-- FIM DA MIGRATION
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ UNIQUE constraint adicionada em players.email';
  RAISE NOTICE '✅ Duplicados removidos e consolidados';
  RAISE NOTICE '⚠️  Agora não é mais possível cadastrar mesmo email duas vezes';
END $$;
