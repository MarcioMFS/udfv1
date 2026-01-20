-- Adicionar coluna bonus_money na tabela match_results
ALTER TABLE public.match_results
ADD COLUMN IF NOT EXISTS bonus_money numeric DEFAULT 0;

-- Comentário explicando a diferença entre bonus e bonus_money
COMMENT ON COLUMN public.match_results.bonus IS 'Contagem de localizações que atingiram o bonus target (usado para lógica de jogo)';
COMMENT ON COLUMN public.match_results.bonus_money IS 'Valor monetário de bônus acumulado (soma de bonusValue de todas as entregas)';
