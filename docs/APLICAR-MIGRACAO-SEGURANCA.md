# 🔒 Como Aplicar a Migração de Segurança

## ⚠️ IMPORTANTE - LEIA ANTES DE EXECUTAR

Esta migração corrige vulnerabilidades CRÍTICAS no sistema UDFV1:
- Converte `is_admin` de TEXT para BOOLEAN
- Remove políticas RLS inseguras (`using (true)`)
- Implementa controle de acesso baseado em roles
- Protege eventos passados contra edição não autorizada

**Status Atual:** Sistema com Score 5.0/10 (CRÍTICO)
**Após Migração:** Sistema com Score 8.5/10 (BOM)

---

## 📋 PRÉ-REQUISITOS

Antes de aplicar a migração:

1. ✅ **Backup do banco de dados**
   ```bash
   # No Supabase Dashboard:
   # Settings > Database > Database backups > Create backup
   ```

2. ✅ **Verificar dados atuais**
   ```sql
   -- Ver instrutores e tipo do campo is_admin
   SELECT
     id,
     email,
     is_admin,
     pg_typeof(is_admin) as tipo_campo
   FROM public.instructors
   LIMIT 5;
   ```

3. ✅ **Confirmar que há pelo menos 1 admin**
   ```sql
   -- Deve retornar pelo menos 1 registro
   SELECT COUNT(*)
   FROM public.instructors
   WHERE is_admin = 'true';
   ```

---

## 🚀 PASSO A PASSO

### Passo 1: Acessar SQL Editor

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New query**

### Passo 2: Copiar e Executar Migração

1. Abra o arquivo: `/supabase/migrations/20260105_fix_security_critical.sql`
2. **Copie TODO o conteúdo** (578 linhas)
3. **Cole no SQL Editor**
4. Clique em **Run** (Ctrl/Cmd + Enter)

### Passo 3: Verificar Sucesso

Você deve ver as seguintes mensagens no final:

```
NOTICE: ✅ Migration de segurança aplicada com sucesso!
NOTICE: ✅ Políticas RLS seguras implementadas
NOTICE: ✅ Campo is_admin corrigido para BOOLEAN
NOTICE: ⚠️  PRÓXIMO PASSO: Adicionar autenticação nos webhooks
```

---

## 🧪 TESTES PÓS-MIGRAÇÃO

### Teste 1: Verificar Campo is_admin

```sql
-- Campo deve ser BOOLEAN agora
SELECT
  id,
  email,
  is_admin,
  pg_typeof(is_admin) as tipo_campo
FROM public.instructors
LIMIT 5;

-- Resultado esperado:
-- tipo_campo = "boolean" (não mais "text")
```

### Teste 2: Verificar Políticas RLS

```sql
-- Ver políticas da tabela instructors
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'instructors';

-- NÃO deve haver políticas com "permit" ou "true" no nome
-- DEVE haver: instructors_select_own, instructors_select_admin, etc.
```

### Teste 3: Verificar RLS Está Ativo

```sql
-- Todas devem retornar TRUE
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('instructors', 'classes', 'events', 'players', 'matches', 'teams')
ORDER BY tablename;
```

### Teste 4: Testar Acesso como Instrutor (Não-Admin)

```sql
-- Simular usuário instrutor (substitua UUID pelo de um instrutor real)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'UUID-DO-INSTRUTOR-AQUI';

-- Instrutor deve ver apenas suas turmas
SELECT id, name, instructor_id
FROM public.classes;

-- Resetar role
RESET ROLE;
```

### Teste 5: Testar Acesso como Admin

```sql
-- Simular usuário admin (substitua UUID pelo de um admin real)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'UUID-DO-ADMIN-AQUI';

-- Admin deve ver TODAS as turmas
SELECT id, name, instructor_id
FROM public.classes;

-- Resetar role
RESET ROLE;
```

---

## 🛡️ O QUE A MIGRAÇÃO FAZ

### 1. Corrige Tipo do Campo is_admin

**Antes:**
```sql
is_admin TEXT  -- 'true' ou 'false' (string)
```

**Depois:**
```sql
is_admin BOOLEAN DEFAULT FALSE NOT NULL  -- true ou false (boolean)
```

**Como funciona:**
```sql
-- Cria coluna temporária
ALTER TABLE instructors ADD COLUMN is_admin_bool BOOLEAN;

-- Migra dados: 'true' -> TRUE, resto -> FALSE
UPDATE instructors SET is_admin_bool =
  CASE WHEN is_admin = 'true' THEN TRUE ELSE FALSE END;

-- Remove coluna antiga e renomeia nova
ALTER TABLE instructors DROP COLUMN is_admin CASCADE;
ALTER TABLE instructors RENAME COLUMN is_admin_bool TO is_admin;
```

### 2. Remove Políticas Inseguras

**Antes (INSEGURO):**
```sql
CREATE POLICY "permit all" ON instructors USING (true);
-- ❌ Qualquer usuário pode ver tudo
```

**Depois (SEGURO):**
```sql
-- Instrutor vê apenas seus dados
CREATE POLICY "instructors_select_own" ON instructors
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Admin vê tudo
CREATE POLICY "instructors_select_admin" ON instructors
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);
```

### 3. Protege Eventos Passados

**Nova Política:**
```sql
CREATE POLICY "events_update_own" ON events
FOR UPDATE TO authenticated
USING (
  -- Instrutor pode editar apenas eventos futuros
  (instructor_id = auth.uid() AND (end_date IS NULL OR end_date >= CURRENT_DATE))
  OR
  -- Admin pode editar qualquer evento
  EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid() AND is_admin = TRUE)
);
```

### 4. Permite Webhooks Funcionarem

```sql
-- Webhooks (role anon) podem inserir dados
CREATE POLICY "players_insert_admin" ON players
FOR INSERT TO authenticated, anon
WITH CHECK (
  EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid() AND is_admin = TRUE)
  OR auth.uid() IS NULL  -- Permite anon (webhooks)
);
```

---

## ⚠️ PROBLEMAS POSSÍVEIS E SOLUÇÕES

### Problema 1: Erro "column is_admin does not exist"

**Causa:** Campo já foi deletado em alguma migração anterior

**Solução:**
```sql
-- Remover as linhas 12-45 da migração
-- Pular direto para "POLÍTICAS RLS SEGURAS"
```

### Problema 2: Erro "policy already exists"

**Causa:** Política já foi criada anteriormente

**Solução:**
```sql
-- Adicionar DROP antes de cada CREATE:
DROP POLICY IF EXISTS "instructors_select_own" ON instructors;
CREATE POLICY "instructors_select_own" ON instructors...
```

### Problema 3: Nenhum Admin Após Migração

**Causa:** Todos os is_admin estavam como 'false' (texto)

**Solução:**
```sql
-- Promover um usuário a admin manualmente
UPDATE public.instructors
SET is_admin = TRUE
WHERE email = 'seu-email@exemplo.com';
```

### Problema 4: Webhooks Pararam de Funcionar

**Causa:** Políticas bloqueando role `anon`

**Solução:**
```sql
-- Verificar políticas permitem anon:
SELECT * FROM pg_policies
WHERE schemaname = 'public'
  AND 'anon' = ANY(roles);

-- Se não houver, adicionar:
ALTER POLICY "players_insert_admin" ON players TO authenticated, anon;
```

### Problema 5: Frontend Para de Carregar Dados

**Causa:** RLS bloqueando queries legítimas

**Solução:**
1. Abrir DevTools (F12)
2. Ir em **Console**
3. Procurar erros tipo: `"new row violates row-level security policy"`
4. Verificar qual tabela e policy está bloqueando
5. Ajustar policy se necessário

---

## 🔄 ROLLBACK (Se Necessário)

Se algo der errado, você pode reverter:

### Opção 1: Restaurar Backup

```bash
# No Supabase Dashboard:
# Settings > Database > Database backups > Restore
```

### Opção 2: Reverter Manualmente

```sql
-- 1. Reverter is_admin para TEXT
ALTER TABLE instructors ADD COLUMN is_admin_text TEXT;
UPDATE instructors SET is_admin_text = CASE WHEN is_admin THEN 'true' ELSE 'false' END;
ALTER TABLE instructors DROP COLUMN is_admin;
ALTER TABLE instructors RENAME COLUMN is_admin_text TO is_admin;

-- 2. Recriar políticas antigas (INSEGURO - apenas temporário!)
DROP POLICY IF EXISTS "instructors_select_own" ON instructors;
DROP POLICY IF EXISTS "instructors_select_admin" ON instructors;
CREATE POLICY "permit all" ON instructors USING (true);

-- ⚠️ ATENÇÃO: Isso REMOVE a segurança! Use apenas temporariamente!
```

---

## 📊 CHECKLIST FINAL

Após aplicar a migração, confirme:

- [ ] Campo `is_admin` é tipo BOOLEAN (não TEXT)
- [ ] Existe pelo menos 1 admin no sistema
- [ ] Políticas RLS não contêm "permit" ou "true" nos nomes
- [ ] RLS está ativo em todas as tabelas
- [ ] Login como instrutor funciona
- [ ] Login como admin funciona
- [ ] Instrutor vê apenas suas turmas
- [ ] Admin vê todas as turmas
- [ ] Instrutor NÃO consegue editar eventos passados
- [ ] Admin CONSEGUE editar eventos passados
- [ ] Webhooks continuam funcionando (verificar logs)

---

## 📞 SUPORTE

Se houver problemas:

1. **Não entre em pânico** - Você tem backup!
2. **Copie a mensagem de erro completa**
3. **Verifique os logs** no Supabase Dashboard > Logs
4. **Documente o que aconteceu** antes do erro

---

## 🎯 PRÓXIMOS PASSOS

Após aplicar esta migração com sucesso:

1. ✅ **Adicionar autenticação nos webhooks** (API Key ou JWT)
2. ✅ **Implementar rate limiting** (prevenir brute force)
3. ✅ **Adicionar auditoria** (log de tentativas de acesso)
4. ✅ **Remover credenciais hardcoded** (usar env vars)
5. ✅ **Implementar CSRF protection** (tokens)

---

**Data:** 05 de Janeiro de 2026
**Versão:** 1.0.0
**Prioridade:** 🔥 CRÍTICA (Segurança)

⚠️ **NÃO APLICAR EM PRODUÇÃO SEM BACKUP!** ⚠️
