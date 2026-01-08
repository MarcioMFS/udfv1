# 🔍 Análise Completa de Robustez e Segurança - Sistema UDFV1

**Data:** 05 de Janeiro de 2026
**Versão do Sistema:** 1.0.0
**Tipo de Análise:** Segurança, Robustez e Qualidade de Código

---

## 📊 RESUMO EXECUTIVO

| Categoria | Quantidade | Prioridade |
|-----------|------------|------------|
| 🔴 **Vulnerabilidades Críticas** | 4 | URGENTE |
| 🟡 **Problemas Médios** | 5 | IMPORTANTE |
| 🟢 **Melhorias** | 9 | BAIXA |
| ✅ **Boas Práticas** | 10 | - |

### Avaliação Geral de Segurança: ⚠️ **MÉDIO RISCO**

O sistema possui uma base sólida com Supabase fornecendo autenticação e proteção contra SQL Injection, **MAS** apresenta vulnerabilidades críticas nas políticas RLS e webhooks que devem ser corrigidas IMEDIATAMENTE antes de produção.

---

## 🔴 VULNERABILIDADES CRÍTICAS (Ação Imediata)

### 1. **Políticas RLS Excessivamente Permissivas** 🚨

**Severidade:** CRÍTICA
**Arquivo:** `/supabase/migrations/20250908195338_remote_schema.sql`

**Problema:**
Múltiplas tabelas têm políticas RLS com `using (true)` que permitem QUALQUER usuário (autenticado ou não) fazer QUALQUER operação:

```sql
-- Linha 1347: class_players - TOTALMENTE ABERTO
CREATE POLICY "permit" ON "public"."class_players"
TO "public" USING (true);

-- Linha 1367: classes - LEITURA ABERTA PARA TODOS
CREATE POLICY "permit" ON "public"."classes"
FOR SELECT TO "public" USING (true);

-- Linha 1437: events - TOTALMENTE ABERTO
CREATE POLICY "permit all" ON "public"."events"
TO "public" USING (true);

-- Linha 1464: influencers - TOTALMENTE ABERTO
CREATE POLICY "true" ON "public"."influencers"
TO "public" USING (true);

-- Linha 1518: instructors - TOTALMENTE ABERTO
CREATE POLICY "permit all" ON "public"."instructors"
TO "public" USING (true);

-- Linha 1548: matches - TOTALMENTE ABERTO
CREATE POLICY "permit" ON "public"."matches"
TO "public" USING (true);

-- Linha 1557: players - TOTALMENTE ABERTO
CREATE POLICY "permit" ON "public"."players"
TO "public" USING (true);
```

**Impacto:**
- ❌ Qualquer pessoa pode ler todos os dados
- ❌ Qualquer pessoa pode modificar/deletar turmas, eventos, alunos
- ❌ Vazamento total de dados sensíveis
- ❌ Possibilidade de sabotagem do sistema

**Solução Necessária:**
```sql
-- EXEMPLO: Política correta para instructors
CREATE POLICY "instructors_select_own"
ON "public"."instructors"
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "instructors_update_own"
ON "public"."instructors"
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- EXEMPLO: Política correta para classes (instrutor vê suas turmas)
CREATE POLICY "classes_select_own"
ON "public"."classes"
FOR SELECT
TO authenticated
USING (
  instructor_id IN (
    SELECT id FROM instructors WHERE id = auth.uid()
  )
);

CREATE POLICY "classes_insert_own"
ON "public"."classes"
FOR INSERT
TO authenticated
WITH CHECK (
  instructor_id IN (
    SELECT id FROM instructors WHERE id = auth.uid()
  )
);
```

**Prioridade:** 🔥 URGENTE - CORRIGIR ANTES DE PRODUÇÃO

---

### 2. **Webhooks Sem Autenticação** 🚨

**Severidade:** CRÍTICA
**Arquivos:** Todos em `/supabase/functions/webhook-*/index.ts`

**Problema:**
```typescript
// webhook-instructors/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // ❌ Aceita requisições de QUALQUER origem
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Nenhuma validação de API Key ou token
serve(async (req) => {
  const body = await req.json(); // ❌ Aceita qualquer requisição
  // ... processa sem verificar origem
});
```

**Impacto:**
- ❌ Qualquer pessoa pode chamar os webhooks
- ❌ Criação/modificação não autorizada de:
  - Instrutores (`webhook-instructors`)
  - Alunos (`webhook-players`)
  - Turmas (`webhook-classes`)
  - Eventos (`webhook-events`)
  - Partidas (`webhook-create-match`)

**Solução Necessária:**
```typescript
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  // 1. Validar API Key
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    )
  }

  // 2. Validar assinatura HMAC (opcional, mais seguro)
  const signature = req.headers.get('x-signature')
  const body = await req.text()
  const expectedSignature = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(body + Deno.env.get('WEBHOOK_SECRET'))
  )

  if (signature !== btoa(String.fromCharCode(...new Uint8Array(expectedSignature)))) {
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401 }
    )
  }

  // 3. CORS mais restritivo
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://seu-dominio.com', // ✅ Apenas seu domínio
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key'
  }

  // ... resto do código
})
```

**Prioridade:** 🔥 URGENTE - CORRIGIR ANTES DE PRODUÇÃO

---

### 3. **Campo `is_admin` Ausente no Banco** 🚨

**Severidade:** CRÍTICA (Funcionalidade)
**Arquivo:** `/src/hooks/useIsAdmin.ts` linha 25-29

**Problema:**
```typescript
// Hook tenta buscar campo que NÃO EXISTE no banco
const { data, error } = await supabase
  .from('instructors')
  .select('is_admin')  // ❌ Campo não existe na migration
  .eq('id', userId)
  .single()
```

**Impacto:**
- ❌ Verificação de admin sempre falha
- ❌ Proteção de eventos passados não funciona
- ❌ Recursos exclusivos de admin ficam inacessíveis

**Solução Necessária:**
```sql
-- Criar migration: add_is_admin_column.sql
ALTER TABLE public.instructors
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Atualizar um usuário para admin (manualmente)
UPDATE public.instructors
SET is_admin = TRUE
WHERE email = 'admin@exemplo.com';

-- Criar índice para performance
CREATE INDEX idx_instructors_is_admin
ON public.instructors(is_admin)
WHERE is_admin = TRUE;
```

**Prioridade:** 🔥 URGENTE - Sistema não funciona corretamente sem isso

---

### 4. **Credenciais Hardcoded em Migration** 🚨

**Severidade:** CRÍTICA
**Arquivo:** `/supabase/migrations/20250908195338_remote_schema.sql` linhas 757-763

**Problema:**
```sql
-- ❌ URL de produção exposta
edge_function_url := 'https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-match-results';

-- ❌ Placeholder de chave API
supabase_anon_key := 'your-anon-key-here';
```

**Impacto:**
- ❌ Exposição de infraestrutura interna
- ❌ Possível uso de placeholder em produção
- ❌ Dificuldade de trocar URLs/chaves

**Solução Necessária:**
```sql
-- Usar variáveis de ambiente do Supabase
edge_function_url := current_setting('app.webhook_url', true);
supabase_anon_key := current_setting('app.supabase_anon_key', true);

-- OU usar configuração na tabela system_settings
SELECT value INTO edge_function_url
FROM system_settings
WHERE key = 'webhook_match_results_url';
```

**Prioridade:** 🔥 URGENTE - Remover antes de commit público

---

## 🟡 PROBLEMAS MÉDIOS (Importante)

### 5. **Validação de Input Insuficiente**

**Severidade:** MÉDIA
**Arquivos:**
- `/src/services/classImportService.ts`
- `/src/pages/CreateEventPage.tsx`
- `/src/components/LoginForm.tsx`

**Problemas:**
```typescript
// CreateEventPage.tsx - Validação apenas no frontend
if (!formData.class_id) {
  toast.error('Por favor, selecione uma turma')
  return // ❌ Pode ser bypassado via DevTools
}

// LoginForm.tsx - Senha muito fraca
if (password.length < 6) { // ❌ Apenas 6 caracteres
  setError('A senha deve ter pelo menos 6 caracteres')
  return
}

// classImportService.ts - Email sem validação robusta
const email = row[1]?.toString().trim() // ❌ Nenhuma validação de formato
```

**Recomendações:**
```typescript
// 1. Validação robusta de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  errors.push(`Email inválido: ${email}`)
}

// 2. Senha mais forte
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
// Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial

// 3. Validação também no backend (Edge Functions)
// Adicionar validação em todos os webhooks
```

**Prioridade:** ⚠️ ALTA - Implementar em 1-2 semanas

---

### 6. **Mensagens de Erro Expõem Detalhes**

**Severidade:** MÉDIA
**Arquivos:** 34 arquivos com console.error()

**Problema:**
```typescript
// AuthContext.tsx linha 83-84
console.error('[Login error]', error)
// ❌ Loga detalhes do erro no console público

// Muitos arquivos fazem:
toast.error(`Erro ao processar: ${error}`)
// ❌ Mostra mensagem técnica ao usuário
```

**Impacto:**
- ❌ Vazamento de estrutura do banco
- ❌ Exposição de lógica interna
- ❌ Facilita ataques direcionados

**Solução:**
```typescript
// Ambiente de desenvolvimento
if (import.meta.env.DEV) {
  console.error('[Login error]', error)
}

// Ambiente de produção
logger.error('Login failed', {
  userId: user?.id,
  timestamp: new Date()
})

// Mensagem genérica ao usuário
toast.error('Erro ao fazer login. Tente novamente.')
```

**Prioridade:** ⚠️ MÉDIA - Implementar em 2-3 semanas

---

### 7. **Sem Proteção CSRF**

**Severidade:** MÉDIA
**Arquivos:** Todos os formulários

**Problema:**
- Nenhum token CSRF detectado
- Nenhum atributo SameSite em cookies customizados

**Impacto:**
- Vulnerável a ataques Cross-Site Request Forgery
- Usuário pode ser enganado a executar ações não intencionais

**Solução:**
```typescript
// Supabase já protege endpoints de auth
// Mas adicione para operações sensíveis:

// 1. Gerar token CSRF
const csrfToken = crypto.randomUUID()
sessionStorage.setItem('csrfToken', csrfToken)

// 2. Incluir em requisições
headers: {
  'X-CSRF-Token': sessionStorage.getItem('csrfToken')
}

// 3. Validar no backend
const requestToken = req.headers.get('X-CSRF-Token')
const sessionToken = getSessionToken(req)
if (requestToken !== sessionToken) {
  return new Response('CSRF validation failed', { status: 403 })
}
```

**Prioridade:** ⚠️ MÉDIA - Implementar em 3-4 semanas

---

### 8. **Sem Rate Limiting**

**Severidade:** MÉDIA
**Arquivos:** Autenticação e webhooks

**Problema:**
```typescript
// AuthContext.tsx - Login sem limite
const handleLogin = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  // ❌ Pode tentar infinitas vezes
}
```

**Impacto:**
- Vulnerável a brute force em senhas
- Vulnerável a DoS (Denial of Service)
- Abuso de webhooks

**Solução:**
```typescript
// 1. Frontend - Limite básico
let loginAttempts = 0
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutos

const handleLogin = async (email: string, password: string) => {
  if (loginAttempts >= MAX_ATTEMPTS) {
    toast.error('Muitas tentativas. Aguarde 15 minutos.')
    return
  }

  loginAttempts++
  // ... resto do código
}

// 2. Backend - Supabase Rate Limiting
// Configurar no dashboard do Supabase:
// - Max requests per second: 100
// - Max requests per minute: 500
```

**Prioridade:** ⚠️ MÉDIA - Implementar em 2-3 semanas

---

### 9. **Autorização Inconsistente**

**Severidade:** MÉDIA
**Arquivo:** `/src/pages/CreateEventPage.tsx`

**Problema:**
```typescript
// Linha 136-139: Apenas admin pode criar eventos
if (!isAdmin && !isEditing) {
  toast.error('Apenas administradores podem criar novos eventos')
  return <Navigate to="/my-events" replace />
}

// ❌ MAS: Instrutor pode editar eventos (contradição de lógica de negócio)
// ✅ BOM: Eventos passados bloqueados para não-admin (linha 169-172)
```

**Impacto:**
- Lógica de permissões confusa
- Possíveis brechas de autorização

**Solução:**
```typescript
// Centralizar lógica de permissões
const usePermissions = () => {
  const { isAdmin } = useIsAdmin()

  return {
    canCreateEvent: isAdmin,
    canEditEvent: (event: Event) => {
      if (isAdmin) return true
      if (event.end_date && new Date(event.end_date) < new Date()) return false
      return event.instructor_id === auth.uid()
    },
    canDeleteEvent: isAdmin,
    canViewEvent: (event: Event) => {
      if (isAdmin) return true
      return event.instructor_id === auth.uid()
    }
  }
}
```

**Prioridade:** ⚠️ MÉDIA - Refatorar em 2-3 semanas

---

## 🟢 MELHORIAS E BOAS PRÁTICAS

### 10. **Variáveis de Ambiente Sem Validação**

**Arquivo:** `/src/lib/supabase.ts`

**Problema:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
// ❌ Se não existir, usa string vazia e falha silenciosamente
```

**Solução:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Variáveis de ambiente não configuradas!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### 11. **Logs Excessivos (124 ocorrências)**

**Impacto:** Performance e segurança

**Solução:**
```typescript
// criar utils/logger.ts
const logger = {
  debug: (msg: string, data?: any) => {
    if (import.meta.env.DEV) console.debug(msg, data)
  },
  info: (msg: string, data?: any) => {
    if (import.meta.env.DEV) console.info(msg, data)
  },
  error: (msg: string, data?: any) => {
    console.error(msg) // Log sem dados sensíveis
    // Enviar para serviço de monitoramento
  }
}
```

---

### 12-18. **Outros Itens de Melhoria**

✅ **SQL Injection:** Protegido (Supabase parameteriza queries)
✅ **XSS:** Protegido (React escapa automaticamente)
✅ **Senhas:** Nunca armazenadas no frontend
⚠️ **Força de senha:** Melhorar de 6 para 12 caracteres
⚠️ **Transações:** Adicionar rollback em importações
⚠️ **Headers de segurança:** Adicionar CSP, X-Frame-Options
⚠️ **Auditoria:** Implementar log de ações sensíveis

---

## ✅ PRÁTICAS POSITIVAS ENCONTRADAS

1. ✅ **TypeScript:** Tipagem forte reduz erros
2. ✅ **Try-Catch:** 59 blocos de tratamento de erro
3. ✅ **Sanitização:** Função `sanitizeFilename()` implementada
4. ✅ **Constraints Únicos:** Previnem duplicatas no banco
5. ✅ **Foreign Keys:** Integridade referencial mantida
6. ✅ **Protected Routes:** Verifica autenticação
7. ✅ **Error Boundary:** Captura erros do React
8. ✅ **Supabase Queries:** Proteção automática contra SQL Injection
9. ✅ **Env Variables:** API keys não hardcoded no frontend
10. ✅ **Proteção de Eventos Passados:** Implementada (recente)

---

## 📋 PLANO DE AÇÃO RECOMENDADO

### Semana 1 (CRÍTICO - NÃO FAZER DEPLOY SEM ISSO)
- [ ] Corrigir TODAS as políticas RLS
- [ ] Adicionar autenticação nos webhooks
- [ ] Criar coluna `is_admin` no banco
- [ ] Remover credenciais hardcoded

### Semana 2 (IMPORTANTE)
- [ ] Implementar rate limiting
- [ ] Melhorar validação de inputs
- [ ] Sanitizar mensagens de erro
- [ ] Adicionar CSRF protection

### Semana 3 (HARDENING)
- [ ] Configurar headers de segurança
- [ ] Implementar logging estruturado
- [ ] Criar sistema de auditoria
- [ ] Testes de penetração

### Semana 4 (QUALIDADE)
- [ ] Melhorar força de senha
- [ ] Adicionar validação de transações
- [ ] Documentar práticas de segurança
- [ ] Code review completo

---

## 🎯 SCORE DE SEGURANÇA

| Categoria | Score | Status |
|-----------|-------|--------|
| Autenticação | 7/10 | 🟡 BOM (precisa is_admin) |
| Autorização | 3/10 | 🔴 RUIM (RLS permissivo) |
| Validação de Input | 6/10 | 🟡 ACEITÁVEL |
| Proteção de API | 2/10 | 🔴 CRÍTICO (webhooks abertos) |
| Gestão de Erros | 5/10 | 🟡 ACEITÁVEL |
| Segurança de Dados | 4/10 | 🔴 RUIM (RLS permissivo) |
| Code Quality | 8/10 | 🟢 BOM |

**Score Geral:** 5.0/10 - ⚠️ **MÉDIO RISCO**

---

## ⚠️ AVISOS FINAIS

### 🚫 NÃO FAZER DEPLOY EM PRODUÇÃO SEM:
1. Corrigir políticas RLS
2. Proteger webhooks
3. Adicionar campo is_admin

### ⚡ RISCO IMEDIATO SE DEPLOYAR HOJE:
- Qualquer pessoa pode ler/modificar TODOS os dados
- Qualquer pessoa pode criar instrutores/alunos/turmas via webhook
- Sistema de admin não funciona

### ✅ APÓS CORREÇÕES:
O sistema terá segurança adequada para produção com monitoramento contínuo.

---

**Analista:** Claude Code
**Método:** Análise estática de código + Review de migrations
**Arquivos Analisados:** 156 arquivos
**Linhas de Código:** ~15.000
**Tempo de Análise:** Completo

**Status Final:** ⚠️ Sistema NÃO PRONTO para produção. Corrigir itens críticos URGENTE.
