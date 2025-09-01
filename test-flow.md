# 🎯 Teste do Fluxo Completo: Sistema de Participantes e Promoção a Instrutor

## 📋 Resumo do Sistema Implementado

### ✅ **Componentes Criados:**

1. **webhook-events** → Cria eventos com schedule e participantes
2. **webhook-players** → Simplificado, sempre cria apenas players
3. **EventParticipants** → Gestão de participantes com status
4. **ClassInstructors** → Sistema de promoção a instrutor
5. **Banco de dados** → Tabela `event_participants` com triggers automáticos

### 🔄 **Fluxos de Status:**
```
1. "Convidado" → Adicionado manualmente ao evento
2. "Participou" → Sistema detecta partida jogada (automático)
3. "Candidato a Instrutor" → Se evento = training + participou (automático)
4. "Instrutor" → Promoção manual pelo instrutor
```

---

## 🧪 **Teste End-to-End**

### **Passo 1: Criar Evento via Webhook**
```bash
# URL: POST /functions/v1/webhook-events
# Payload: test-payloads/webhook-events-training.json
```

**Resultado esperado:**
- ✅ Classe "TRN001" criada/encontrada
- ✅ Evento "Treinamento de Liderança" criado com schedule
- ✅ 3 players criados e vinculados à classe
- ✅ Schedule no evento (não na classe)

---

### **Passo 2: Adicionar Player via Webhook**
```bash 
# URL: POST /functions/v1/webhook-players
# Payload: test-payloads/webhook-players-sample.json
```

**Resultado esperado:**
- ✅ Felipe Almeida criado como player
- ✅ Vinculado à classe TRN001
- ❌ NÃO criado como instrutor (diferente do sistema antigo)

---

### **Passo 3: Interface - Gestão de Participantes**

**EventDetailsPage → Aba "Participantes":**
1. ✅ Ver lista vazia de participantes
2. ✅ Clicar "Adicionar Participantes"
3. ✅ Selecionar João Silva, Maria Santos, Pedro Costa
4. ✅ Confirmar adição
5. ✅ Status inicial: "Convidado" (cinza)

---

### **Passo 4: Simular Partidas**

**Webhook match-results (simular jogadas):**
```json
{
  "player-udf-id": "USR001",
  "event-code": "TRN001", 
  "match-number": 1
}
```

**Resultado esperado:**
- ✅ Status automático: "Convidado" → "Participou" (verde)
- ✅ Como é training: "Participou" → "Candidato a Instrutor" (dourado)

---

### **Passo 5: Promoção a Instrutor**

**ClassDetailsPage → Aba "Instrutores":**
1. ✅ Ver João Silva em "Candidatos a Instrutor"
2. ✅ Clicar "Promover a Instrutor"
3. ✅ Confirmar promoção
4. ✅ João Silva aparece em "Instrutores Atuais"
5. ✅ Sumir da lista de candidatos

---

## 🎯 **Validações do Sistema**

### **Arquitetura Corrigida:**
- ✅ **Schedule nos eventos** (não nas classes)
- ✅ **Webhook-events** para eventos completos
- ✅ **Webhook-players** simplificado
- ✅ **Gestão manual** de participação
- ✅ **Promoção controlada** a instrutor

### **Status Automáticos:**
- ✅ **Trigger** atualiza status quando player joga
- ✅ **Training events** → candidatos a instrutor
- ✅ **Course events** → apenas participaram
- ✅ **Validação** de promoção (não duplicar instrutores)

### **Interface Completa:**
- ✅ **EventDetailsPage** com 4 abas
- ✅ **Gestão de Participantes** com modal
- ✅ **ClassDetailsPage** com aba Instrutores
- ✅ **Sistema de promoção** integrado

---

## 🚀 **URLs de Teste**

### **Webhooks:**
- `POST /functions/v1/webhook-events`
- `POST /functions/v1/webhook-players`
- `POST /functions/v1/webhook-match-results`

### **Interface:**
1. **EventDetailsPage:** `/event/[id]` → Aba "Participantes"
2. **ClassDetailsPage:** `/class/[id]` → Aba "Instrutores"

---

## ✨ **Benefícios do Sistema**

1. **Arquitetura Correta:** Schedule onde pertence (eventos)
2. **Controle Total:** Instrutor decide quem participa e quando promover
3. **Automação Inteligente:** Status atualizados por triggers
4. **Flexibilidade:** Suporta tanto Training quanto Course
5. **Compatibilidade:** Mantém webhooks existentes funcionando

---

Pronto para testar! 🎉