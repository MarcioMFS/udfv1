# 📄 Contrato API — Validação do Jogador na Entrada

**Para o desenvolvedor Unity**

> **Objetivo:** parar de perder partidas por causa de e-mail digitado errado.
> Hoje o jogo envia a partida (`webhook-create-match`) e **só então** o backend
> descobre que o e-mail não bate com a turma — a partida é descartada e o aluno
> nem fica sabendo. Este endpoint permite **validar antes de jogar**: o aluno
> digita e-mail + código, o jogo confirma na hora, e só libera a partida se
> estiver tudo certo.

---

## 🌐 Endpoint

```
POST https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-validate-player
```

## 🔑 Headers Obrigatórios

```
Content-Type: application/json
X-Webhook-Secret: [O MESMO SECRET JÁ USADO NO webhook-create-match]
```

---

## 📦 Body da Requisição

```json
{
  "player-email": "jogador@exemplo.com",
  "event-code": "AAD8FA1B"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `player-email` | string | ✅ Sim | E-mail que o aluno digitou |
| `event-code` | string | ✅ Sim | Código do evento (o mesmo que já é usado no `webhook-create-match`) |

> Não precisa normalizar: o backend já ignora espaços e diferença de
> maiúsculas/minúsculas nos dois campos.

---

## 📤 Respostas

O status HTTP é sempre **200** para os casos de negócio (válido ou não). Use o
campo booleano **`valid`** para decidir. Erros de infraestrutura usam 4xx/5xx.

### ✅ Jogador válido — pode jogar

```json
{
  "valid": true,
  "player-name": "Larissa Raiane",
  "player-email": "larissaraianer@icloud.com"
}
```

**Ação no jogo:** liberar a partida. Recomendado mostrar
`"Bem-vindo(a), {player-name}!"` para o aluno confirmar visualmente que é ele
mesmo (pega o caso de digitar o e-mail de um colega).

### ❌ Jogador inválido — NÃO liberar a partida

```json
{
  "valid": false,
  "reason": "email_not_found",
  "message": "E-mail não encontrado. Verifique se digitou igual ao cadastro com seu instrutor."
}
```

**Ação no jogo:** mostrar `message` para o aluno e deixar ele corrigir e tentar
de novo. A `message` já vem pronta em português para exibir direto.

| `reason` | Significado | O que o aluno faz |
|----------|-------------|-------------------|
| `event_not_found` | Código do evento não existe | Confere o código com o instrutor |
| `email_not_found` | E-mail não existe no sistema | Confere se digitou como no cadastro |
| `not_enrolled` | E-mail existe, mas não está nessa turma | Fala com o instrutor |
| `missing_fields` | Faltou e-mail ou código | Preencher os dois campos |

---

## 🔄 Fluxo recomendado na tela de entrada

```
1. Aluno digita e-mail + código do evento e toca em "Entrar"
2. Jogo chama POST /webhook-validate-player
3. valid == true  → mostra "Bem-vindo(a), {player-name}!" e libera a partida
   valid == false → mostra a `message` e volta pro passo 1 (deixa corrigir)
```

Assim o e-mail já entra validado, e quando a partida terminar o
`webhook-create-match` vai encontrar o jogador sem falha.

---

## 💻 Exemplo em C# (Unity)

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Text;
using System.Collections;

[System.Serializable]
public class ValidateRequest {
    public string @event_code; // ver nota abaixo sobre o nome do campo
}

// Como os campos usam hífen ("player-email"), monte o JSON manualmente:
private const string VALIDATE_URL =
    "https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-validate-player";
private const string WEBHOOK_SECRET = "[O MESMO SECRET DO create-match]";

public IEnumerator ValidatePlayer(string email, string eventCode,
    System.Action<bool, string> onResult) // (valido, mensagemOuNome)
{
    string json = "{\"player-email\":\"" + email + "\",\"event-code\":\"" + eventCode + "\"}";

    using (var req = new UnityWebRequest(VALIDATE_URL, "POST"))
    {
        byte[] body = Encoding.UTF8.GetBytes(json);
        req.uploadHandler = new UploadHandlerRaw(body);
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.SetRequestHeader("X-Webhook-Secret", WEBHOOK_SECRET);

        yield return req.SendWebRequest();

        // Faz o parse do JSON de resposta (use sua lib de JSON preferida):
        // - valid (bool)
        // - player-name (string, quando valid=true)
        // - message (string, quando valid=false)
        var resp = JsonUtility.FromJson<ValidateResponse>(
            req.downloadHandler.text.Replace("player-name", "playerName")
                                    .Replace("player-email", "playerEmail"));

        if (resp != null && resp.valid)
            onResult(true, resp.playerName);
        else
            onResult(false, resp != null ? resp.message : "Erro de conexão. Tente de novo.");
    }
}

[System.Serializable]
public class ValidateResponse {
    public bool valid;
    public string playerName;
    public string message;
}
```

> Observação: os nomes de campo do JSON têm hífen (`player-email`,
> `player-name`), que o `JsonUtility` do Unity não aceita direto. Monte o corpo
> como string (como acima) e, na resposta, ou troque os hífens por camelCase
> antes do parse (como no exemplo) ou use uma lib como **Newtonsoft.Json** com
> `[JsonProperty("player-name")]`.

---

## ✅ Resumo do que muda no jogo

1. Nova tela/etapa de entrada: e-mail + código → botão "Entrar".
2. Uma chamada `POST /webhook-validate-player`.
3. Se `valid` → segue para a partida (com o e-mail já confirmado).
4. Se `!valid` → mostra `message` e deixa corrigir.

O envio da partida (`webhook-create-match`) **não muda** — continua igual.
