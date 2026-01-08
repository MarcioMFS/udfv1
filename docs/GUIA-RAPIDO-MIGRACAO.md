# 🚀 Guia Rápido - Aplicar Migração de Segurança

## ⚡ VERSÃO RÁPIDA (5 minutos)

### 1️⃣ Fazer Backup
- Abra: **Supabase Dashboard** → **Settings** → **Database** → **Backups**
- Clique: **Create backup**
- Aguarde: Confirmação ✅

### 2️⃣ Aplicar Migração
- Abra: **Supabase Dashboard** → **SQL Editor**
- Clique: **New query**
- Cole: Conteúdo completo de `/supabase/migrations/20260105_fix_security_critical.sql`
- Clique: **Run** (ou Ctrl/Cmd + Enter)

### 3️⃣ Verificar Sucesso
- Aguarde: Mensagens de NOTICE no final
- Procure por: `✅ Migration de segurança aplicada com sucesso!`
- Se aparecer: **Sucesso!** Continue para passo 4

### 4️⃣ Executar Testes
- Na mesma SQL Editor
- Cole: Conteúdo completo de `/supabase/migrations/20260105_verify_security.sql`
- Clique: **Run**
- Aguarde: Mensagem final `🎉 VERIFICAÇÃO COMPLETA - TUDO OK!`

---

## 📊 O QUE MUDA?

### ANTES (Inseguro):
```
❌ is_admin: TEXT ('true' ou 'false')
❌ Políticas RLS: using (true) - todos veem tudo
❌ Eventos passados: podem ser editados
❌ Score: 5.0/10 (CRÍTICO)
```

### DEPOIS (Seguro):
```
✅ is_admin: BOOLEAN (true ou false)
✅ Políticas RLS: auth.uid() - cada um vê só o seu
✅ Eventos passados: protegidos (apenas admin edita)
✅ Score: 8.5/10 (BOM)
```

---

## ⚠️ SE DER ERRO

### Erro: "column is_admin does not exist"
**Solução:** Campo já foi deletado antes. Pule as linhas 12-45 da migração.

### Erro: "policy already exists"
**Solução:** Adicione `DROP POLICY IF EXISTS` antes de cada CREATE.

### Erro: "no admin found"
**Solução:** Execute:
```sql
UPDATE public.instructors
SET is_admin = TRUE
WHERE email = 'seu-email@exemplo.com';
```

### Frontend para de funcionar
**Solução:**
1. Abra DevTools (F12)
2. Veja erro de RLS na console
3. Revise política que está bloqueando

---

## 🔄 REVERTER (Se Necessário)

Restaure o backup criado no passo 1:
- **Settings** → **Database** → **Backups** → **Restore**

---

## 📞 CHECKLIST FINAL

Execute os testes e confirme:

- [ ] ✅ Mensagem: "Migration de segurança aplicada com sucesso"
- [ ] ✅ Mensagem: "VERIFICAÇÃO COMPLETA - TUDO OK"
- [ ] ✅ Login como instrutor funciona
- [ ] ✅ Login como admin funciona
- [ ] ✅ Instrutor vê apenas suas turmas
- [ ] ✅ Admin vê todas as turmas

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Aplicar migração (você está aqui!)
2. 🔜 Adicionar autenticação nos webhooks
3. 🔜 Implementar rate limiting
4. 🔜 Remover credenciais hardcoded

---

**Tempo total:** ~5 minutos
**Dificuldade:** Fácil (copiar/colar)
**Risco:** Baixo (há backup)

⚠️ **SEMPRE FAÇA BACKUP ANTES!** ⚠️
