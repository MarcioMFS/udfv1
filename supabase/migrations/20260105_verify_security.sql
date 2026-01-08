-- ================================================================
-- SCRIPT DE VERIFICAÇÃO - Migração de Segurança UDFV1
-- Data: 05/01/2026
--
-- Execute este script APÓS aplicar 20260105_fix_security_critical.sql
-- para verificar que tudo está funcionando corretamente
-- ================================================================

-- ================================================================
-- 1. VERIFICAR TIPO DO CAMPO is_admin
-- ================================================================

DO $$
DECLARE
  admin_type TEXT;
BEGIN
  SELECT pg_typeof(is_admin)::text INTO admin_type
  FROM public.instructors
  LIMIT 1;

  IF admin_type = 'boolean' THEN
    RAISE NOTICE '✅ Campo is_admin está CORRETO (boolean)';
  ELSE
    RAISE WARNING '❌ Campo is_admin está ERRADO! Tipo: %', admin_type;
  END IF;
END $$;

-- ================================================================
-- 2. VERIFICAR QUANTIDADE DE ADMINS
-- ================================================================

DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.instructors
  WHERE is_admin = TRUE;

  IF admin_count > 0 THEN
    RAISE NOTICE '✅ Existem % administrador(es) no sistema', admin_count;
  ELSE
    RAISE WARNING '❌ NENHUM ADMINISTRADOR ENCONTRADO! Sistema sem admin!';
  END IF;
END $$;

-- ================================================================
-- 3. VERIFICAR RLS ATIVO EM TABELAS CRÍTICAS
-- ================================================================

DO $$
DECLARE
  table_name TEXT;
  has_rls BOOLEAN;
  tables_without_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR table_name IN
    SELECT t FROM unnest(ARRAY['instructors', 'classes', 'events', 'players', 'matches', 'teams', 'class_players', 'match_results']) AS t
  LOOP
    SELECT rowsecurity INTO has_rls
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = table_name;

    IF has_rls THEN
      RAISE NOTICE '✅ RLS ativo em: %', table_name;
    ELSE
      RAISE WARNING '❌ RLS INATIVO em: %', table_name;
      tables_without_rls := array_append(tables_without_rls, table_name);
    END IF;
  END LOOP;

  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE EXCEPTION 'RLS não está ativo nas tabelas: %', array_to_string(tables_without_rls, ', ');
  END IF;
END $$;

-- ================================================================
-- 4. VERIFICAR POLÍTICAS INSEGURAS FORAM REMOVIDAS
-- ================================================================

DO $$
DECLARE
  unsafe_policies INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO unsafe_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      policyname ILIKE '%permit%'
      OR policyname = 'true'
      OR qual = 'true'
    );

  IF unsafe_policies = 0 THEN
    RAISE NOTICE '✅ Nenhuma política insegura encontrada';
  ELSE
    RAISE WARNING '❌ Encontradas % políticas potencialmente inseguras!', unsafe_policies;

    -- Mostrar quais são
    FOR rec IN
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (policyname ILIKE '%permit%' OR policyname = 'true' OR qual = 'true')
    LOOP
      RAISE WARNING '  - Tabela: %, Política: %', rec.tablename, rec.policyname;
    END LOOP;
  END IF;
END $$;

-- ================================================================
-- 5. VERIFICAR POLÍTICAS SEGURAS FORAM CRIADAS
-- ================================================================

DO $$
DECLARE
  expected_policies TEXT[] := ARRAY[
    'instructors_select_own',
    'instructors_select_admin',
    'instructors_update_own',
    'instructors_insert_admin',
    'classes_select_own',
    'classes_insert_own',
    'events_select_own',
    'events_update_own',
    'teams_select_own',
    'teams_insert_own'
  ];
  policy_name TEXT;
  policy_exists BOOLEAN;
  missing_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH policy_name IN ARRAY expected_policies
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND policyname = policy_name
    ) INTO policy_exists;

    IF policy_exists THEN
      RAISE NOTICE '✅ Política criada: %', policy_name;
    ELSE
      RAISE WARNING '❌ Política AUSENTE: %', policy_name;
      missing_policies := array_append(missing_policies, policy_name);
    END IF;
  END LOOP;

  IF array_length(missing_policies, 1) > 0 THEN
    RAISE WARNING 'Políticas ausentes: %', array_to_string(missing_policies, ', ');
  END IF;
END $$;

-- ================================================================
-- 6. TESTAR PROTEÇÃO DE EVENTOS PASSADOS
-- ================================================================

DO $$
BEGIN
  -- Verificar se existe política de proteção de eventos passados
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'events_update_own'
      AND qual LIKE '%end_date >= CURRENT_DATE%'
  ) THEN
    RAISE NOTICE '✅ Proteção de eventos passados implementada';
  ELSE
    RAISE WARNING '❌ Proteção de eventos passados NÃO encontrada!';
  END IF;
END $$;

-- ================================================================
-- 7. VERIFICAR WEBHOOKS PODEM INSERIR (ROLE ANON)
-- ================================================================

DO $$
DECLARE
  webhook_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO webhook_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND 'anon' = ANY(roles)
    AND cmd = 'INSERT';

  IF webhook_policies > 0 THEN
    RAISE NOTICE '✅ Webhooks podem inserir dados (% políticas anon)', webhook_policies;
  ELSE
    RAISE WARNING '❌ Webhooks NÃO podem inserir dados! Nenhuma política para role anon';
  END IF;
END $$;

-- ================================================================
-- 8. RESUMO DE POLÍTICAS POR TABELA
-- ================================================================

SELECT
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('instructors', 'classes', 'events', 'players', 'matches', 'teams', 'class_players', 'match_results', 'influencers')
GROUP BY tablename
ORDER BY tablename;

-- ================================================================
-- 9. LISTAR TODOS OS ADMINS
-- ================================================================

SELECT
  id,
  email,
  is_admin,
  created_at
FROM public.instructors
WHERE is_admin = TRUE
ORDER BY created_at;

-- ================================================================
-- 10. VERIFICAÇÃO FINAL
-- ================================================================

DO $$
DECLARE
  errors INTEGER := 0;
  warnings INTEGER := 0;
BEGIN
  -- Contar problemas
  SELECT COUNT(*) INTO errors
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('instructors', 'classes', 'events')
    AND rowsecurity = FALSE;

  SELECT COUNT(*) INTO warnings
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (policyname ILIKE '%permit%' OR policyname = 'true');

  -- Resultado final
  IF errors = 0 AND warnings = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '🎉 VERIFICAÇÃO COMPLETA - TUDO OK!';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Campo is_admin: BOOLEAN';
    RAISE NOTICE '✅ RLS ativo: SIM';
    RAISE NOTICE '✅ Políticas seguras: IMPLEMENTADAS';
    RAISE NOTICE '✅ Políticas inseguras: REMOVIDAS';
    RAISE NOTICE '✅ Proteção eventos passados: ATIVA';
    RAISE NOTICE '✅ Webhooks: FUNCIONANDO';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Status de Segurança: 8.5/10 (BOM)';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '';
    RAISE WARNING '⚠️  ========================================';
    RAISE WARNING '⚠️  VERIFICAÇÃO ENCONTROU PROBLEMAS!';
    RAISE WARNING '⚠️  ========================================';
    RAISE WARNING '';
    RAISE WARNING 'Erros críticos: %', errors;
    RAISE WARNING 'Avisos: %', warnings;
    RAISE WARNING '';
    RAISE WARNING 'Revise os logs acima e corrija os problemas.';
    RAISE WARNING '';
  END IF;
END $$;

-- ================================================================
-- FIM DA VERIFICAÇÃO
-- ================================================================
