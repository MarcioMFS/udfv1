# 📄 Contrato API - Webhook Create Match

**Para o desenvolvedor Unity**

---

## 🌐 Endpoint

```
POST https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-create-match
```

## 🔑 Headers Obrigatórios

```
Content-Type: application/json
X-Webhook-Secret: [SOLICITAR AO BACKEND]
```

---

## 📦 Body da Requisição

### ✅ Formato Simplificado (Recomendado)

```json
{
  "player-email": "jogador@exemplo.com",
  "event-code": "AAD8FA1B",
  "app-serial": "0|0;0|0;0|1;1|5;...",
  "match-number": 1,
  "lucro": 75412,
  "satisfacao": 100,
  "bonus-money": 3544
}
```

### 📋 Descrição dos Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `player-email` | string | ✅ Sim | Email do jogador cadastrado no sistema |
| `event-code` | string | ✅ Sim | Código do evento (8 caracteres alfanuméricos) |
| `app-serial` | string | ✅ Sim | String serializada dos dados da partida (formato atual) |
| `match-number` | number | ✅ Sim | Número sequencial da partida (1, 2, 3...) |
| `lucro` | number | ⚪ Opcional | Lucro total da partida (valor em R$) |
| `satisfacao` | number | ⚪ Opcional | Satisfação do cliente (0-100) |
| `bonus-money` | number | ⚪ Opcional | Valor monetário total de bônus (R$) |

---

## 🔢 Como Calcular os Valores

### 1️⃣ **lucro** (Lucro Total)

Soma de todos os `value` das entregas realizadas:

```csharp
int lucro = deliveries.Sum(d => d.value);
```

**Exemplo:**
```csharp
// Entregas: value = 2250, 1000, 2250, 1500
lucro = 2250 + 1000 + 2250 + 1500 = 7000
```

---

### 2️⃣ **satisfacao** (Satisfação do Cliente)

Porcentagem de entregas com `satisfaction = true`:

```csharp
float satisfacao = (deliveries.Count(d => d.satisfaction) / (float)deliveries.Count) * 100;
```

**Exemplo:**
```csharp
// Total de entregas: 37
// Entregas satisfeitas: 37
satisfacao = (37 / 37) * 100 = 100
```

---

### 3️⃣ **bonus-money** (Valor Monetário de Bônus)

Soma de todos os `bonusValue` das entregas:

```csharp
int bonusMoney = deliveries.Sum(d => d.bonusValue);
```

**Exemplo:**
```csharp
// Entregas com bonusValue: 0, 100, 158, 225, 105
bonusMoney = 0 + 100 + 158 + 225 + 105 = 588
```

---

## 💡 Comportamento do Webhook

### ✅ Se enviar os 3 valores calculados:
- Webhook usa os valores recebidos **diretamente**
- ⚡ Processamento mais rápido
- ✅ Evita recalcular do `app-serial`

### 🔄 Se NÃO enviar os valores:
- Webhook calcula automaticamente do `app-serial`
- 🔧 Comportamento retrocompatível (modo antigo)

---

## 📤 Resposta de Sucesso

**Status:** `200 OK`

```json
{
  "success": true,
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "match_result_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

---

## ❌ Resposta de Erro

**Status:** `400/401/500`

```json
{
  "error": "Mensagem de erro descritiva"
}
```

### Possíveis Erros:

| Status | Erro | Solução |
|--------|------|---------|
| 401 | X-Webhook-Secret inválido | Verificar secret com backend |
| 400 | Player não encontrado | Verificar email do jogador |
| 400 | Event não encontrado | Verificar código do evento |
| 500 | Erro ao salvar dados | Contatar suporte backend |

---

## 🧪 Exemplo Completo (C#)

```csharp
using UnityEngine.Networking;
using System.Collections;
using Newtonsoft.Json;

public class WebhookService
{
    private const string WEBHOOK_URL = "https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-create-match";
    private const string WEBHOOK_SECRET = "SEU_SECRET_AQUI";

    public IEnumerator SendMatchResult(
        string playerEmail,
        string eventCode,
        string appSerial,
        int matchNumber,
        int lucro,
        int satisfacao,
        int bonusMoney)
    {
        var payload = new {
            playerEmail = playerEmail,  // será convertido para "player-email"
            eventCode = eventCode,      // será convertido para "event-code"
            appSerial = appSerial,      // será convertido para "app-serial"
            matchNumber = matchNumber,  // será convertido para "match-number"
            lucro = lucro,
            satisfacao = satisfacao,
            bonusMoney = bonusMoney     // será convertido para "bonus-money"
        };

        string json = JsonConvert.SerializeObject(payload);

        using (UnityWebRequest www = UnityWebRequest.Post(WEBHOOK_URL, ""))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");
            www.SetRequestHeader("X-Webhook-Secret", WEBHOOK_SECRET);

            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Match enviada com sucesso: " + www.downloadHandler.text);
            }
            else
            {
                Debug.LogError("Erro ao enviar match: " + www.error);
                Debug.LogError("Response: " + www.downloadHandler.text);
            }
        }
    }
}

// Uso:
// StartCoroutine(webhookService.SendMatchResult(
//     "jogador@exemplo.com",
//     "AAD8FA1B",
//     appSerial,
//     1,
//     75412,
//     100,
//     3544
// ));
```

---

## ⚠️ Observações Importantes

1. **Não enviar o campo `bonus`** (contagem de locais) - não é usado no painel
2. **app-serial continua obrigatório** - mesmo enviando valores calculados
3. **Valores devem ser números inteiros** - não enviar strings
4. **Satisfação entre 0-100** - não enviar decimal (0.85), enviar inteiro (85)

---

## 📞 Suporte

Dúvidas? Entre em contato com o backend.

✅ **Webhook atualizado e funcionando!**
