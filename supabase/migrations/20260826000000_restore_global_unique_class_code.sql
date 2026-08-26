-- =====================================================================
-- Código de turma volta a ser único no sistema inteiro.
--
-- CONTEXTO
-- A migration 20250123000005 trocou a UNIQUE global de classes.code por uma
-- UNIQUE composta (code, instructor_id) para permitir que a mesma planilha
-- fosse importada por instrutores diferentes. Isso resolveu o import, mas
-- quebrou tudo que trata o código como identificador global:
--
--   * webhook-players busca a turma por .eq('code', ...).single() — com código
--     repetido, o cadastro de aluno vindo do Unity falha.
--   * webhook-classes faz upsert com onConflict: 'code' — sem a UNIQUE global,
--     o Postgres devolve 42P10 e o webhook fica inutilizável.
--
-- A causa da colisão em massa era o gerador de código no frontend, que fazia
-- hash do NOME da turma: toda planilha com a célula A1 no texto padrão "TURMA"
-- gerava o mesmo T1BQQF90. Isso já foi corrigido (o código passou a ser
-- sorteado); esta migration limpa o que ficou no banco e restaura a garantia.
--
-- ORDEM: rodar DEPOIS de publicar o frontend novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Gerador de código no mesmo alfabeto usado pelo frontend
--    (sem 0/O e 1/I/L: o código é digitado à mão pelos alunos)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_class_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE code = candidate);
  END LOOP;

  RETURN candidate;
END;
$$;

COMMENT ON FUNCTION public.generate_class_code() IS
  'Sorteia um código de turma de 8 caracteres ainda não usado. Alfabeto sem caracteres ambíguos.';

-- ---------------------------------------------------------------------
-- 2. Resolver as colisões existentes
--    A turma MAIS ANTIGA de cada código mantém o código original (é a que
--    provavelmente já foi distribuída aos alunos). As demais recebem código novo.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  duplicada record;
  novo_codigo text;
  total int := 0;
BEGIN
  FOR duplicada IN
    SELECT id, code
    FROM (
      SELECT
        id,
        code,
        row_number() OVER (PARTITION BY code ORDER BY created_at ASC NULLS LAST, id ASC) AS posicao
      FROM public.classes
    ) ranked
    WHERE posicao > 1
    ORDER BY code
  LOOP
    novo_codigo := public.generate_class_code();

    UPDATE public.classes
    SET code = novo_codigo,
        updated_at = now()
    WHERE id = duplicada.id;

    RAISE NOTICE 'Turma % : código % -> %', duplicada.id, duplicada.code, novo_codigo;
    total := total + 1;
  END LOOP;

  RAISE NOTICE 'Códigos de turma reatribuídos: %', total;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Restaurar a unicidade global
-- ---------------------------------------------------------------------
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_code_instructor_key;
DROP INDEX IF EXISTS public.classes_code_instructor_key;

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_code_key;
DROP INDEX IF EXISTS public.classes_code_key;

CREATE UNIQUE INDEX classes_code_key ON public.classes (code);

ALTER TABLE public.classes
  ADD CONSTRAINT classes_code_key UNIQUE USING INDEX classes_code_key;

COMMENT ON CONSTRAINT classes_code_key ON public.classes IS
  'O código da turma é um identificador global: os webhooks do Unity localizam a turma por ele.';
