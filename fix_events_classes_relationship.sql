-- Migração para corrigir relacionamento entre events e classes
-- Remove referência circular e estabelece: 1 turma → N eventos

BEGIN;

-- 1. Remover foreign key constraint circular de classes.event_id
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_event_id_fkey;

-- 2. Remover coluna event_id de classes (referência circular)
ALTER TABLE public.classes DROP COLUMN IF EXISTS event_id;

-- 3. Manter events.class_id (1 evento pertence a 1 turma)
-- Já existe: events.class_id → classes.id ✅

-- 4. Atualizar índices
DROP INDEX IF EXISTS idx_classes_event_id;

-- 5. Verificar se tudo está correto
DO $$
BEGIN
    -- Verificar se a coluna event_id foi removida de classes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' 
        AND column_name = 'event_id' 
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Falha: coluna event_id ainda existe em classes';
    END IF;
    
    -- Verificar se events.class_id ainda existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'class_id' 
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Falha: coluna class_id não existe em events';
    END IF;
    
    RAISE NOTICE 'Migração concluída com sucesso! Relacionamento: 1 turma → N eventos';
END $$;

COMMIT;