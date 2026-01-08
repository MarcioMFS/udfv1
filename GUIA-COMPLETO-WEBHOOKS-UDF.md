# 🎯 Guia Completo - Webhooks UDF para Ignição

**Data:** 08/01/2026
**Turma Exemplo:** TMXSQ520
**Evento Exemplo:** 423B78D0

---

## 📋 SEQUÊNCIA CORRETA DE CHAMADAS

### ✅ Ordem obrigatória:

```
1. webhook-classes     → Criar a turma
2. webhook-events      → Criar o evento da turma
3. webhook-players     → Cadastrar cada jogador na turma
4. webhook-create-match → Enviar resultado de partida
```

---

## 1️⃣ CRIAR TURMA

**Endpoint:** `POST /functions/v1/webhook-classes`

**Payload:**
```json
{
  "class-code": "TMXSQ520",
  "class-name": "Turma Piloto Axies",
  "instructor-email": "instrutor@axies.com.br"
}
```

**Código C# (Unity):**
```csharp
string payload = @"{
    ""class-code"": ""TMXSQ520"",
    ""class-name"": ""Turma Piloto Axies"",
    ""instructor-email"": ""instrutor@axies.com.br""
}";

UnityWebRequest www = UnityWebRequest.Post(
    "https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-classes",
    payload,
    "application/json"
);
www.SetRequestHeader("X-Webhook-Secret", "yX9kL2pQ8mN4vB7cR5tW3aD6fG1hJ0sZ");

yield return www.SendWebRequest();

if (www.result == UnityWebRequest.Result.Success) {
    Debug.Log("✅ Turma criada: " + www.downloadHandler.text);
} else {
    Debug.LogError("❌ Erro: " + www.downloadHandler.text);
}
```

**Campos:**
- `class-code` ⚠️ **OBRIGATÓRIO** - Exatamente 8 caracteres
- `class-name` - Nome descritivo da turma
- `instructor-email` ⚠️ **OBRIGATÓRIO** - Email do instrutor (deve existir)

---

## 2️⃣ CRIAR EVENTO

**Endpoint:** `POST /functions/v1/webhook-events`

**Payload:**
```json
{
  "event-code": "423B78D0",
  "event-type": "training",
  "event-name": "Treinamento Ignição - Piloto",
  "event-description": "Evento piloto para teste do sistema",
  "event-subject": "Logística e Entregas",
  "schedule": [
    {
      "initial-time": "2026-01-15T14:00:00-03:00",
      "end-time": "2026-01-15T16:00:00-03:00"
    },
    {
      "initial-time": "2026-01-22T14:00:00-03:00",
      "end-time": "2026-01-22T16:00:00-03:00"
    }
  ],
  "participants": [
    {
      "registration": "12345",
      "participant-code": "U001",
      "name": "Iuri Silva",
      "email": "iuri@axies.com.br",
      "role": "participant"
    }
  ]
}
```

**Código C# (Unity):**
```csharp
// Monte o schedule dinamicamente
System.Text.StringBuilder scheduleBuilder = new System.Text.StringBuilder();
scheduleBuilder.Append("[");
scheduleBuilder.Append(@"{""initial-time"":""2026-01-15T14:00:00-03:00"",""end-time"":""2026-01-15T16:00:00-03:00""}");
scheduleBuilder.Append(",");
scheduleBuilder.Append(@"{""initial-time"":""2026-01-22T14:00:00-03:00"",""end-time"":""2026-01-22T16:00:00-03:00""}");
scheduleBuilder.Append("]");

// Monte o participants
System.Text.StringBuilder participantsBuilder = new System.Text.StringBuilder();
participantsBuilder.Append("[");
participantsBuilder.Append(@"{");
participantsBuilder.Append(@"""registration"":""12345"",");
participantsBuilder.Append(@"""participant-code"":""U001"",");
participantsBuilder.Append(@"""name"":""Iuri Silva"",");
participantsBuilder.Append(@"""email"":""iuri@axies.com.br"",");
participantsBuilder.Append(@"""role"":""participant""");
participantsBuilder.Append(@"}");
participantsBuilder.Append("]");

// Payload completo
System.Text.StringBuilder payload = new System.Text.StringBuilder();
payload.Append("{");
payload.AppendFormat(@"""event-code"":""{0}"",", "423B78D0");
payload.AppendFormat(@"""event-type"":""{0}"",", "training");
payload.AppendFormat(@"""event-name"":""{0}"",", "Treinamento Ignição - Piloto");
payload.AppendFormat(@"""event-description"":""{0}"",", "Evento piloto para teste");
payload.AppendFormat(@"""event-subject"":""{0}"",", "Logística e Entregas");
payload.AppendFormat(@"""schedule"":{0},", scheduleBuilder.ToString());
payload.AppendFormat(@"""participants"":{0}", participantsBuilder.ToString());
payload.Append("}");

UnityWebRequest www = UnityWebRequest.Post(
    "https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-events",
    payload.ToString(),
    "application/json"
);
www.SetRequestHeader("X-Webhook-Secret", "yX9kL2pQ8mN4vB7cR5tW3aD6fG1hJ0sZ");

yield return www.SendWebRequest();

if (www.result == UnityWebRequest.Result.Success) {
    Debug.Log("✅ Evento criado: " + www.downloadHandler.text);
} else {
    Debug.LogError("❌ Erro: " + www.downloadHandler.text);
}
```

**Campos:**
- `event-code` ⚠️ **OBRIGATÓRIO** - Código único do evento
- `event-type` ⚠️ **OBRIGATÓRIO** - "training" ou "course"
- `event-name` ⚠️ **OBRIGATÓRIO** - Nome do evento
- `schedule` - Array de horários (formato ISO 8601)
- `participants` ⚠️ **OBRIGATÓRIO** - Array com pelo menos 1 participante

**⚠️ IMPORTANTE:** O `event-code` deve ser o mesmo que `class-code` OU você precisa ter criado a turma primeiro!

---

## 3️⃣ CADASTRAR JOGADOR NA TURMA

**Endpoint:** `POST /functions/v1/webhook-players`

**Payload:**
```json
{
  "nome": "Iuri Silva",
  "email": "iuri@axies.com.br",
  "udf-id": "U001",
  "class-code": "TMXSQ520"
}
```

**Código C# (Unity):**
```csharp
System.Text.StringBuilder payload = new System.Text.StringBuilder();
payload.Append("{");
payload.AppendFormat(@"""nome"":""{0}"",", "Iuri Silva");
payload.AppendFormat(@"""email"":""{0}"",", "iuri@axies.com.br");
payload.AppendFormat(@"""udf-id"":""{0}"",", "U001");
payload.AppendFormat(@"""class-code"":""{0}""", "TMXSQ520");  // ⚠️ CÓDIGO DA TURMA!
payload.Append("}");

UnityWebRequest www = UnityWebRequest.Post(
    "https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-players",
    payload.ToString(),
    "application/json"
);
www.SetRequestHeader("X-Webhook-Secret", "yX9kL2pQ8mN4vB7cR5tW3aD6fG1hJ0sZ");

yield return www.SendWebRequest();

if (www.result == UnityWebRequest.Result.Success) {
    Debug.Log("✅ Jogador cadastrado: " + www.downloadHandler.text);
} else {
    Debug.LogError("❌ Erro: " + www.downloadHandler.text);
}
```

**⚠️ CRÍTICO:** O `class-code` deve ser o código da TURMA, não do evento!

---

## 4️⃣ ENVIAR RESULTADO DE PARTIDA

**Endpoint:** `POST /functions/v1/webhook-create-match`

**Payload:**
```json
{
  "player-email": "iuri@axies.com.br",
  "event-code": "423B78D0",
  "match-number": 1,
  "app-serial": "IGNICAO#0,1,2#1;2;true;0;500;50;12.5|2;3;false;0;300;0;8.2#2#0#0#0"
}
```

**Código C# (Unity):**
```csharp
System.Text.StringBuilder payload = new System.Text.StringBuilder();
payload.Append("{");
payload.AppendFormat(@"""player-email"":""{0}"",", "iuri@axies.com.br");
payload.AppendFormat(@"""event-code"":""{0}"",", "423B78D0");
payload.AppendFormat(@"""match-number"":{0},", 1);
payload.AppendFormat(@"""app-serial"":""{0}""", gameData.serialize());
payload.Append("}");

UnityWebRequest www = UnityWebRequest.Post(
    "https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-create-match",
    payload.ToString(),
    "application/json"
);
www.SetRequestHeader("X-Webhook-Secret", "yX9kL2pQ8mN4vB7cR5tW3aD6fG1hJ0sZ");

yield return www.SendWebRequest();

if (www.result == UnityWebRequest.Result.Success) {
    Debug.Log("✅ Partida registrada: " + www.downloadHandler.text);
} else {
    Debug.LogError("❌ Erro: " + www.downloadHandler.text);
}
```

**⚠️ Pré-requisitos para não dar 403:**
1. ✅ Turma `TMXSQ520` deve existir
2. ✅ Evento `423B78D0` deve existir e pertencer à turma
3. ✅ Jogador `iuri@axies.com.br` deve estar cadastrado na turma

---

## 🔧 EXEMPLO COMPLETO - FLUXO INICIAL

### Quando usar cada webhook:

```csharp
// 🏫 AO INICIAR A APLICAÇÃO (UMA VEZ)
void SetupTurmaEEvento() {
    StartCoroutine(CriarTurma());
}

IEnumerator CriarTurma() {
    // 1. Criar turma
    yield return ChamarWebhookClasses();

    // 2. Criar evento
    yield return ChamarWebhookEvents();
}

// 👤 AO FAZER LOGIN DO JOGADOR
void OnPlayerLogin(string email, string nome, string udfId) {
    StartCoroutine(CadastrarJogador(email, nome, udfId));
}

IEnumerator CadastrarJogador(string email, string nome, string udfId) {
    // 3. Cadastrar jogador na turma
    yield return ChamarWebhookPlayers(email, nome, udfId);
}

// 🎮 AO TERMINAR PARTIDA
void OnMatchFinished(string playerEmail, int matchNumber, string appSerial) {
    StartCoroutine(EnviarResultado(playerEmail, matchNumber, appSerial));
}

IEnumerator EnviarResultado(string playerEmail, int matchNumber, string appSerial) {
    // 4. Enviar resultado
    yield return ChamarWebhookCreateMatch(playerEmail, matchNumber, appSerial);
}
```

---

## 📝 NOTAS IMPORTANTES

### ✅ Headers obrigatórios em TODAS as requisições:
```csharp
www.SetRequestHeader("X-Webhook-Secret", "yX9kL2pQ8mN4vB7cR5tW3aD6fG1hJ0sZ");
www.SetRequestHeader("Content-Type", "application/json");
```

### ⚠️ Códigos devem ter exatamente 8 caracteres:
```
✅ TMXSQ520  (8 caracteres)
✅ 423B78D0  (8 caracteres)
❌ TEST     (4 caracteres - ERRO!)
❌ TURMA123 (7 caracteres - ERRO!)
```

### 🔍 Tratamento de erros:

```csharp
if (www.result != UnityWebRequest.Result.Success) {
    string errorText = www.downloadHandler.text;
    Debug.LogError($"Erro HTTP {www.responseCode}: {errorText}");

    // Parsear JSON de erro
    // {"success": false, "error": "mensagem do erro"}
}
```

### 📊 Status codes:

| Code | Significado | Ação |
|------|-------------|------|
| 200 | ✅ Sucesso | Continuar |
| 400 | ❌ Dados inválidos | Verificar payload |
| 401 | 🔒 Não autorizado | Verificar webhook secret |
| 403 | 🚫 Sem permissão | Jogador não está na turma |
| 404 | 🔍 Não encontrado | Turma/evento não existe |
| 500 | 💥 Erro servidor | Reportar ao suporte |

---

## 🎯 CASO DE USO: Turma TMXSQ520 com Evento 423B78D0

### Passo a passo completo:

```csharp
IEnumerator ConfigurarSistemaCompleto() {
    // 1. Criar turma TMXSQ520
    string payloadTurma = @"{
        ""class-code"": ""TMXSQ520"",
        ""class-name"": ""Turma Piloto Axies"",
        ""instructor-email"": ""instrutor@axies.com.br""
    }";
    yield return PostWebhook("webhook-classes", payloadTurma);

    // 2. Criar evento 423B78D0
    string payloadEvento = @"{
        ""event-code"": ""423B78D0"",
        ""event-type"": ""training"",
        ""event-name"": ""Treinamento Piloto"",
        ""schedule"": [{""initial-time"":""2026-01-15T14:00:00-03:00"",""end-time"":""2026-01-15T16:00:00-03:00""}],
        ""participants"": [{""registration"":""12345"",""participant-code"":""U001"",""name"":""Iuri"",""email"":""iuri@axies.com.br"",""role"":""participant""}]
    }";
    yield return PostWebhook("webhook-events", payloadEvento);

    // 3. Cadastrar jogador
    string payloadJogador = @"{
        ""nome"": ""Iuri Silva"",
        ""email"": ""iuri@axies.com.br"",
        ""udf-id"": ""U001"",
        ""class-code"": ""TMXSQ520""
    }";
    yield return PostWebhook("webhook-players", payloadJogador);

    Debug.Log("✅ Sistema configurado! Pronto para receber partidas.");
}

IEnumerator PostWebhook(string endpoint, string payload) {
    UnityWebRequest www = UnityWebRequest.Post(
        $"https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/{endpoint}",
        payload,
        "application/json"
    );
    www.SetRequestHeader("X-Webhook-Secret", "yX9kL2pQ8mN4vB7cR5tW3aD6fG1hJ0sZ");

    yield return www.SendWebRequest();

    if (www.result == UnityWebRequest.Result.Success) {
        Debug.Log($"✅ {endpoint}: {www.downloadHandler.text}");
    } else {
        Debug.LogError($"❌ {endpoint} falhou: {www.downloadHandler.text}");
    }
}
```

---

**Última atualização:** 08/01/2026
**Versão:** 1.0
**Suporte:** Claude Code
