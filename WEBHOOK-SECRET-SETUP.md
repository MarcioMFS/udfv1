# Webhook Secret - Setup Rápido

## 🔐 Autenticação de Webhooks

Sistema híbrido aceita 2 tipos:
- **Webhook Secret** → Aplicação UDF (produção)
- **Bearer Token** → Admin (testes)

---

## 🚀 Setup Aplicação UDF

### 1. Gerar Secret
```bash
openssl rand -base64 32
```

### 2. Configurar Supabase
```bash
supabase secrets set WEBHOOK_SECRET="valor-gerado"
```

Ou via Dashboard: Settings > Edge Functions > Secrets

### 3. Configurar Aplicação UDF
```bash
export WEBHOOK_SECRET="mesmo-valor-acima"
```

### 4. Usar em Requisições
```php
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-Webhook-Secret: ' . getenv('WEBHOOK_SECRET'),
    'Content-Type: application/json'
]);
```

---

## 🧪 Setup Admin (Testes)

### Gerar Token
```bash
curl -X POST https://projeto.supabase.co/functions/v1/generate-api-token \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","password":"senha","expiresIn":90}'
```

### Usar Token
```bash
curl -X POST https://projeto.supabase.co/functions/v1/webhook-players \
  -H "Authorization: Bearer TOKEN" \
  -d '{...}'
```

---

## 📋 Webhooks Disponíveis

Todos aceitam webhook secret OU token:

- webhook-players
- webhook-instructors
- webhook-classes
- webhook-events
- webhook-match-results
- webhook-influencers
- webhook-create-match

---

## ✅ Teste

### Com Secret (UDF)
```bash
curl -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  https://projeto.supabase.co/functions/v1/webhook-players \
  -d '{"nome":"Test","email":"test@test.com","udf-id":"T123","class-code":"T000TEST"}'
```

### Com Token (Admin)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://projeto.supabase.co/functions/v1/webhook-players \
  -d '{"nome":"Test","email":"test@test.com","udf-id":"T123","class-code":"T000TEST"}'
```

### Sem Auth (deve falhar com 401)
```bash
curl https://projeto.supabase.co/functions/v1/webhook-players \
  -d '{"nome":"Test"}'
```

---

## 🔧 Troubleshooting

**401 Unauthorized**
- Verificar WEBHOOK_SECRET configurado no Supabase
- Verificar header `X-Webhook-Secret` sendo enviado
- Verificar valor do secret é idêntico

**Secret não funciona**
```bash
# Verificar se secret está configurado
supabase secrets list

# Reconfigurar se necessário
supabase secrets set WEBHOOK_SECRET="novo-valor"
```

**Token não funciona**
- Token expirado? Gerar novo
- Token revogado? Gerar novo
- Verificar header `Authorization: Bearer TOKEN`

---

Data: 07/01/2026
