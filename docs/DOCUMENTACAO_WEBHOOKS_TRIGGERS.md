# Documentação dos Webhooks e Triggers do Sistema UDF

## 📋 Visão Geral

Este documento descreve a arquitetura de webhooks e triggers do sistema UDF, que automatizam o processamento de dados e cálculos em tempo real para turmas, instrutores, jogadores e resultados de partidas.

## 🔗 Webhooks (Edge Functions)

### 1. webhook-classes

**Arquivo:** `supabase/functions/webhook-classes/index.ts`

**Finalidade:** Criação e atualização de turmas baseadas em eventos.

**Payload:**
```json
{
  "event-type": "training|group",
  "event-code": "string",
  "event-name": "string",
  "schedule": [
    {
      "initial-time": "ISO date",
      "end-time": "ISO date"
    }
  ],
  "instructor-email": "email@example.com",
  "co-instructor-email": "email@example.com",
  "influencer": "influencer@example.com"
}
```

**Funcionalidades:**
- Valida tipos de evento (training/group)
- Busca instrutor pelo email
- Vincula influencer opcional
- Cria/atualiza evento e turma
- Calcula datas de início e fim baseadas no cronograma

### 2. webhook-create-match

**Arquivo:** `supabase/functions/webhook-create-match/index.ts`

**Finalidade:** Registro de novas partidas no sistema.

**Payload:**
```json
{
  "player-email": "player@example.com",
  "class-code": "CLASS123",
  "app-serial": "SERIAL123",
  "match-number": 1
}
```

**Funcionalidades:**
- Valida existência do jogador
- Valida existência da turma
- Cria registro da partida
- Retorna ID da partida e do jogador

### 3. webhook-instructors

**Arquivo:** `supabase/functions/webhook-instructors/index.ts`

**Finalidade:** Gestão completa de instrutores (criação/atualização).

**Payload:**
```json
{
  "name": "Nome do Instrutor",
  "email": "instrutor@example.com",
  "cpf": "12345678900",
  "udf-id": "UDF123"
}
```

**Funcionalidades:**
- Valida duplicatas por email, CPF e UDF-ID
- Cria usuário de autenticação
- Vincula dados do instrutor
- Atualiza dados existentes
- Gerencia rollback em caso de erro

### 4. webhook-players

**Arquivo:** `supabase/functions/webhook-players/index.ts`

**Finalidade:** Gerenciamento de jogadores e vinculação a turmas.

**Payload:**
```json
{
  "nome": "Nome do Jogador",
  "email": "jogador@example.com",
  "udf-id": "UDF456",
  "class-code": "CLASS123",
  "registration": "REG789",
  "external-id": "EXT123"
}
```

**Funcionalidades:**
- Para turmas de treinamento: cria instrutor + jogador
- Para turmas regulares: apenas vincula jogador
- Gerencia usuários de autenticação
- Vincula jogador à turma

### 5. webhook-influencers

**Arquivo:** `supabase/functions/webhook-influencers/index.ts`

**Finalidade:** Gestão simples de influenciadores.

**Payload:**
```json
{
  "name": "Nome do Influencer",
  "email": "influencer@example.com"
}
```

**Funcionalidades:**
- Cria/atualiza influenciador
- Busca por email como chave única

### 6. webhook-events

**Arquivo:** `supabase/functions/webhook-events/index.ts`

**Finalidade:** Criação de eventos com participantes (treinamentos e cursos).

**Payload:**
```json
{
  "event-code": "string",
  "event-type": "training|course",
  "event-name": "string",
  "event-description": "string",
  "event-subject": "string",
  "schedule": [
    {
      "initial-time": "ISO date",
      "end-time": "ISO date"
    }
  ],
  "participants": [
    {
      "registration": "string",
      "participant-code": "string", 
      "name": "string",
      "email": "string",
      "role": "leader|training-leader|participant"
    }
  ]
}
```

**Funcionalidades:**
- Cria eventos com múltiplos participantes
- Suporte a diferentes tipos (training/course)
- Vincula participantes com roles específicos
- Processa cronograma de eventos

### 7. promote-to-instructor

**Arquivo:** `supabase/functions/promote-to-instructor/index.ts`

**Finalidade:** Promoção de jogadores a instrutores.

**Payload:**
```json
{
  "player_name": "Nome do Jogador",
  "player_email": "jogador@example.com",
  "player_id": "uuid_opcional"
}
```

**Funcionalidades:**
- Promove jogador existente para instrutor
- Cria registro na tabela de instrutores
- Mantém vínculo com histórico como jogador
- Permite promoção por email ou ID

## ⚡ Triggers e Functions do Banco de Dados

### 1. Sistema de Estatísticas de Instrutores

**Arquivo:** `supabase/migrations/20250803220000_auto_instructor_stats_triggers.sql`

#### Functions Principais:

##### `recalculate_instructor_stats(instructor_uuid uuid)`
Calcula todas as estatísticas de um instrutor:
- **classes**: Número total de turmas
- **students**: Número único de estudantes
- **matches**: Total de partidas
- **events**: Número de eventos
- **leaders**: Estudantes que se tornaram instrutores
- **totalprofit**: Soma dos lucros
- **packagessold**: Pacotes vendidos
- **engagement**: Média de satisfação
- **pioneerrank**: Posição entre os 100 primeiros instrutores
- **top10classes/top5classes/top3classes**: Classes ranqueadas

##### Functions de Manipulação:
- `handle_direct_instructor_changes()`: Para tabelas `classes` e `events`
- `handle_related_table_changes()`: Para tabelas relacionadas (`class_players`, `matches`, `match_results`)

#### Triggers Ativos:
```sql
-- Tabelas monitoradas
trigger_classes_stats        -> classes
trigger_class_players_stats  -> class_players  
trigger_matches_stats        -> matches
trigger_match_results_stats  -> match_results
trigger_events_stats         -> events
```

### 2. Sistema de Cálculo Automático de Resultados

**Arquivo:** `supabase/migrations/20250702002720_steep_hall.sql`

#### Function: `trigger_calculate_match_results()`
**Trigger:** `trg_after_match_insert_update`

**Funcionamento:**
- Dispara após INSERT/UPDATE na tabela `matches` quando `app_serial` é preenchido
- Obtém dados do jogador (udf_id) e da turma (code)
- Chama Edge Function via HTTP para calcular resultados
- Trata erros sem falhar a transação principal

### 3. Triggers de Sistema (Supabase)

#### Controle de Partidas:
- `on_new_match_result_update_count`: Atualiza contadores ao inserir `match_results`
- `on_new_or_updated_match`: Processa novas partidas na tabela `matches`

#### Realtime (Supabase):
- `tr_check_filters`: Valida filtros de subscrição em tempo real

#### Storage:
- `update_objects_updated_at`: Atualiza timestamps de objetos

## 🔄 Fluxo de Dados

### 1. Criação de Turma
```
Webhook Classes → Valida Instrutor → Cria/Atualiza Evento → Cria/Atualiza Turma → Trigger Stats
```

### 2. Registro de Jogador
```
Webhook Players → Valida Turma → Cria/Atualiza Jogador → Vincula à Turma → Trigger Stats
```

### 3. Partida Completa
```
Webhook Create Match → Cria Match → Trigger Calculate → Edge Function → Match Results → Trigger Stats
```

### 4. Criação de Evento com Participantes
```
Webhook Events → Valida Participantes → Cria Evento → Processa Participantes → Vincula Roles → Trigger Stats
```

### 5. Promoção para Instrutor
```
Promote to Instructor → Valida Jogador → Cria Instrutor → Mantém Histórico → Trigger Stats
```

## 📊 Tabelas Impactadas

### Principais:
- `instructors` - Dados dos instrutores
- `classes` - Informações das turmas  
- `players` - Dados dos jogadores
- `class_players` - Relacionamento turma-jogador
- `matches` - Registro das partidas
- `match_results` - Resultados e cálculos das partidas
- `events` - Eventos do sistema
- `instructor_stats` - Estatísticas calculadas dos instrutores

### Auxiliares:
- `influencers` - Dados dos influenciadores
- `sales` - Vendas de pacotes

## 🛡️ Segurança e Confiabilidade

### Webhooks:
- Headers CORS configurados
- Validação de campos obrigatórios
- Tratamento de erros com rollback
- Logs detalhados para debug

### Triggers:
- Functions com `SECURITY DEFINER`
- Tratamento de exceções
- Operações atômicas
- Recálculo automático em cascata

### Políticas RLS:
- `instructor_stats`: Instrutores podem ver apenas suas próprias estatísticas
- Controle de acesso baseado em `auth.uid()`

## 🔧 Configuração e Manutenção

### Deploy das Edge Functions:
```bash
# Instalar Supabase CLI
npm install -g supabase
# ou via Scoop (Windows)
scoop install supabase

# Login no Supabase
supabase login

# Deploy de todas as functions
supabase functions deploy

# Deploy individual por function
supabase functions deploy webhook-classes
supabase functions deploy webhook-instructors  
supabase functions deploy webhook-players
supabase functions deploy webhook-create-match
supabase functions deploy webhook-match-results
supabase functions deploy webhook-influencers
supabase functions deploy webhook-events
supabase functions deploy promote-to-instructor

# Verificar functions deployadas
supabase functions list
```

### Variáveis de Ambiente:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### Configurações do Banco:
```sql
-- Para o trigger de cálculo de resultados
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://your-project.supabase.co/functions/v1/webhook-match-results';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'your-anon-key';
```

### Monitoramento:
- Logs das Edge Functions disponíveis no dashboard Supabase
- Triggers logam via `RAISE LOG` para debug
- Métricas de performance das functions

## 📈 Performance

### Otimizações Implementadas:
- Índices em campos de busca frequente
- Cálculos assíncronos via Edge Functions  
- Upsert operations para evitar duplicatas
- Triggers condicionais (só disparam quando necessário)

### Recomendações:
- Monitore os logs de performance das Edge Functions
- Execute `ANALYZE` periódico nas tabelas principais
- Configure alertas para falhas nos webhooks

## 📋 Lista Completa de Edge Functions

| Function | Finalidade | Status | Deploy |
|----------|------------|--------|---------|
| `webhook-classes` | Criação e atualização de turmas | ✅ Ativo | `supabase functions deploy webhook-classes` |
| `webhook-instructors` | Gestão completa de instrutores | ✅ Ativo | `supabase functions deploy webhook-instructors` |
| `webhook-players` | Gerenciamento de jogadores e vinculação | ✅ Ativo | `supabase functions deploy webhook-players` |
| `webhook-create-match` | Registro de novas partidas | ✅ Ativo | `supabase functions deploy webhook-create-match` |
| `webhook-match-results` | Processamento automático de resultados | ✅ Ativo | `supabase functions deploy webhook-match-results` |
| `webhook-influencers` | Gestão simples de influenciadores | ✅ Ativo | `supabase functions deploy webhook-influencers` |
| `webhook-events` | Criação de eventos com participantes | ✅ Ativo | `supabase functions deploy webhook-events` |
| `promote-to-instructor` | Promoção de jogadores a instrutores | ✅ Ativo | `supabase functions deploy promote-to-instructor` |

### Comando para Deploy Completo:
```bash
supabase functions deploy
```

Este comando faz o deploy de todas as Edge Functions de uma vez.