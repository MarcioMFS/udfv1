-- =====================================================
-- Script para corrigir códigos de turmas/eventos com "IMP-"
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Verificar turmas com códigos problemáticos (IMP- ou diferentes de 8 caracteres)
SELECT
  id,
  code,
  description,
  instructor_id,
  LENGTH(code) as code_length,
  CASE
    WHEN code LIKE 'IMP-%' THEN 'Prefixo IMP-'
    WHEN LENGTH(code) != 8 THEN 'Tamanho diferente de 8'
    ELSE 'OK'
  END as problema
FROM classes
WHERE code LIKE 'IMP-%' OR LENGTH(code) != 8
ORDER BY created_at DESC;

-- 2. Verificar eventos com códigos problemáticos
SELECT
  e.id,
  e.code as event_code,
  e.name,
  c.code as class_code,
  c.description as class_description,
  LENGTH(e.code) as code_length,
  CASE
    WHEN e.code LIKE 'IMP-%' THEN 'Prefixo IMP-'
    WHEN LENGTH(e.code) != 8 THEN 'Tamanho diferente de 8'
    ELSE 'OK'
  END as problema
FROM events e
LEFT JOIN classes c ON e.class_id = c.id
WHERE e.code LIKE 'IMP-%' OR LENGTH(e.code) != 8
ORDER BY e.created_at DESC;

-- 3. Verificar players com udf_id problemático (IMP-)
SELECT
  id,
  name,
  email,
  udf_id,
  CASE
    WHEN udf_id LIKE 'IMP-%' THEN 'Prefixo IMP-'
    ELSE 'OK'
  END as problema
FROM players
WHERE udf_id LIKE 'IMP-%'
ORDER BY created_at DESC;

-- =====================================================
-- CORREÇÕES (descomente para executar)
-- =====================================================

-- 4. Corrigir código das turmas com IMP-
-- Gera um novo código baseado no hash do ID (determinístico)
/*
UPDATE classes
SET
  code = UPPER(SUBSTRING(MD5(id::text), 1, 8)),
  updated_at = NOW()
WHERE code LIKE 'IMP-%' OR LENGTH(code) != 8;
*/

-- 5. Corrigir código dos eventos para corresponder ao class_id
-- (segue o mesmo padrão do código atual)
/*
UPDATE events
SET
  code = UPPER(SUBSTRING(class_id::text, 1, 8)),
  updated_at = NOW()
WHERE code LIKE 'IMP-%' OR LENGTH(code) != 8;
*/

-- 6. Corrigir udf_id dos players com IMP-
-- Gera um novo udf_id baseado no código da turma + parte do email
/*
UPDATE players p
SET
  udf_id = (
    SELECT UPPER(SUBSTRING(MD5(cp.class_id::text), 1, 8)) || '-' || SPLIT_PART(p.email, '@', 1)
    FROM class_players cp
    WHERE cp.player_id = p.id
    LIMIT 1
  ),
  updated_at = NOW()
WHERE p.udf_id LIKE 'IMP-%';
*/

-- =====================================================
-- VERIFICAÇÃO APÓS CORREÇÕES
-- =====================================================

-- 7. Contar registros problemáticos (deve retornar 0 após correções)
/*
SELECT
  'Classes' as tabela,
  COUNT(*) as total_problematicos
FROM classes
WHERE code LIKE 'IMP-%' OR LENGTH(code) != 8

UNION ALL

SELECT
  'Events' as tabela,
  COUNT(*) as total_problematicos
FROM events
WHERE code LIKE 'IMP-%' OR LENGTH(code) != 8

UNION ALL

SELECT
  'Players' as tabela,
  COUNT(*) as total_problematicos
FROM players
WHERE udf_id LIKE 'IMP-%';
*/
