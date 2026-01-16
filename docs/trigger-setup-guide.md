# Guia de Configuração do Trigger de Match Results

## Visão Geral

Este sistema automatiza o cálculo de resultados de partidas usando um trigger de banco de dados que chama a Edge Function `webhook-match-results` sempre que uma nova partida é inserida ou o `app_serial` é atualizado.

## Passo a Passo para Configuração

### 1. Executar as Migrações

Execute os arquivos SQL na seguinte ordem:

```bash
# 1. Criar o trigger e função
psql -f supabase/migrations/20250702002720_steep_hall.sql

# 2. Configurar as variáveis
psql -f supabase/migrations/20250702002741_quiet_lodge.sql
```

### 2. Obter Informações do Seu Projeto

#### URL da Edge Function
1. Acesse o painel do Supabase
2. Vá em "Edge Functions"
3. Encontre a função `webhook-match-results`
4. A URL será: `https://SEU-PROJECT-ID.supabase.co/functions/v1/webhook-match-results`

#### Chave Anônima (Anon Key)
1. Acesse o painel do Supabase
2. Vá em "Settings" > "API"
3. Copie a "anon public" key

### 3. Atualizar as Configurações

Execute no SQL Editor do Supabase:

```sql
-- Substitua pelos seus valores reais
SELECT set_config('app.settings.edge_function_url', 
                  'https://SEU-PROJECT-ID.supabase.co/functions/v1/webhook-match-results', 
                  false);

SELECT set_config('app.settings.supabase_anon_key', 
                  'SUA-ANON-KEY-AQUI', 
                  false);
```

### 4. Testar o Sistema

Para testar se o trigger está funcionando:

```sql
-- Inserir uma partida de teste
INSERT INTO matches (
    app_serial, 
    match_date, 
    player_id, 
    class_id, 
    match_number
) VALUES (
    'test#1,2,3#0;1;true;0;1000;500|1;2;false;0;800;200#2#0#0#0',
    NOW(),
    (SELECT id FROM players LIMIT 1),
    (SELECT id FROM classes LIMIT 1),
    1
);

-- Verificar se os resultados foram calculados
SELECT * FROM match_results 
WHERE player_id = (SELECT id FROM players LIMIT 1)
  AND class_id = (SELECT id FROM classes LIMIT 1)
  AND match_number = 1;
```

## Como Funciona

### Fluxo de Execução

1. **Inserção/Atualização**: Uma nova linha é inserida na tabela `matches` ou o campo `app_serial` é atualizado
2. **Trigger Dispara**: O trigger `trg_after_match_insert_update` é executado automaticamente
3. **Busca de Dados**: A função busca o `udf_id` do player e o `code` da classe
4. **Chamada HTTP**: Faz uma requisição POST para a Edge Function com o payload necessário
5. **Cálculo**: A Edge Function desserializa o `app_serial` e calcula lucro, satisfação e bônus. **Importante: A Edge Function agora realiza validação rigorosa do formato do `app_serial`. Se o formato estiver incorreto, ela retornará um erro.**
6. **Armazenamento**: Os resultados são salvos na tabela `match_results`
7. **Estatísticas**: As estatísticas do jogador na turma são atualizadas

### Tratamento de Erros

- Se o `app_serial` estiver vazio, o trigger é pulado
- Se dados necessários não forem encontrados, apenas um log é gerado
- Erros na chamada HTTP (incluindo erros de validação do `app_serial` retornados pela Edge Function) não interrompem a transação principal, mas **são logados** para depuração.
- Todos os erros são logados para debugging

### Logs

Para ver os logs do trigger:

```sql
-- Ver logs recentes (PostgreSQL)
SELECT * FROM pg_stat_statements WHERE query LIKE '%trigger_calculate_match_results%';

-- No Supabase, você pode ver logs na aba "Logs" do painel
```

## Vantagens desta Abordagem

1. **Automático**: Não requer intervenção manual ou chamadas da aplicação
2. **Consistente**: Garante que todos os resultados sejam calculados
3. **Resiliente**: Erros não afetam a inserção da partida
4. **Auditável**: Todos os passos são logados
5. **Desacoplado**: A aplicação não precisa se preocupar com o cálculo

## Troubleshooting

### Problema: Trigger não está disparando
- Verifique se o `app_serial` não está NULL ou vazio
- Confirme que a extensão `http` está habilitada
- Verifique os logs do banco de dados

### Problema: Edge Function retorna erro
- Confirme se a URL está correta
- Verifique se a anon key está válida
- **Verifique o formato do `app_serial`**: A Edge Function agora é mais rigorosa. Consulte os logs para mensagens de erro específicas sobre o formato.
- Teste a Edge Function diretamente via HTTP

### Problema: Resultados não aparecem em match_results
- Verifique se o player e classe existem
- Confirme se o `app_serial` está no formato correto
- Veja os logs da Edge Function no painel do Supabase

## Formato do app_serial

O `app_serial` deve seguir o formato específico esperado pela Edge Function:

```
test#1,2,3#0;1;true;0;1000;500|1;2;false;0;800;200#2#0#0#0
```

Onde:
- **Parte 1**: Identificador do teste
- **Parte 2**: Travel log (códigos de localização separados por vírgula)
- **Parte 3**: Entregas (separadas por `|`, cada entrega com formato `source;destination;satisfaction;extra;value;cost`)
- **Parte 4**: Bonus target
- **Partes 5-7**: Dados adicionais

Se o formato estiver incorreto, a Edge Function retornará um erro detalhado que será logado pelo trigger.