-- Adiciona constraints para garantir que códigos de eventos e classes tenham exatamente 8 caracteres

-- Constraint para tabela events
ALTER TABLE public.events
ADD CONSTRAINT events_code_length_check
CHECK (char_length(code) = 8);

-- Constraint para tabela classes
ALTER TABLE public.classes
ADD CONSTRAINT classes_code_length_check
CHECK (char_length(code) = 8);

-- Comentário explicativo
COMMENT ON CONSTRAINT events_code_length_check ON public.events IS 'Garante que o código do evento tenha exatamente 8 caracteres';
COMMENT ON CONSTRAINT classes_code_length_check ON public.classes IS 'Garante que o código da turma tenha exatamente 8 caracteres';
