/**
 * Utilitário de envio de emails via Resend (chamado direto das Edge Functions)
 *
 * Variáveis de ambiente necessárias (Supabase Secrets):
 *   RESEND_API_KEY  → Chave da API do Resend (https://resend.com/api-keys)
 *   EMAIL_FROM      → Remetente verificado  (ex: "UDF <noreply@seudominio.com>")
 *   APP_URL         → URL do frontend       (ex: https://seu-app.com)
 */

export type EmailType = 'first-access' | 'reset-password';
export type UserRole  = 'player' | 'instructor';

// ─── Templates HTML ────────────────────────────────────────────────────────────

const baseCard = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,.07);overflow:hidden;">
    <div style="background:#1d4ed8;padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">UDF</h1>
    </div>
    ${content}
    <div style="background:#f9fafb;padding:20px 40px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
      <p>Este link expira em 24 horas. Se você não solicitou este acesso, ignore este e-mail.</p>
      <p>© ${new Date().getFullYear()} UDF. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`.trim();

const btn = (link: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;">
    <a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">${label}</a>
  </div>
  <p style="color:#6b7280;font-size:13px;">Se o botão não funcionar, copie e cole o link abaixo:<br>
    <a href="${link}" style="color:#1d4ed8;word-break:break-all;">${link}</a>
  </p>`;

function firstAccessHtml(name: string, link: string, role: UserRole): string {
  const roleLabel = role === 'instructor' ? 'Instrutor' : 'Player';
  return baseCard(`
    <div style="padding:40px;">
      <h2 style="color:#1f2937;font-size:22px;margin-top:0;">Bem-vindo(a), ${name}! 👋</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Sua conta UDF foi criada com sucesso como <strong>${roleLabel}</strong>.
        Clique no botão abaixo para definir sua senha e começar a usar o sistema.
      </p>
      ${btn(link, 'Definir Minha Senha')}
    </div>`);
}

function resetPasswordHtml(name: string, link: string): string {
  return baseCard(`
    <div style="padding:40px;">
      <h2 style="color:#1f2937;font-size:22px;margin-top:0;">Redefinição de Senha</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Olá, <strong>${name || 'usuário'}</strong>!
        Recebemos uma solicitação para redefinir a senha da sua conta UDF.
      </p>
      ${btn(link, 'Redefinir Minha Senha')}
      <p style="color:#ef4444;font-size:13px;margin-top:24px;">
        ⚠️ Se você não solicitou a redefinição, ignore este e-mail. Sua senha não será alterada.
      </p>
    </div>`);
}

// ─── Resend API ────────────────────────────────────────────────────────────────

interface ResendPayload {
  to: string;
  subject: string;
  html: string;
}

async function callResend(payload: ResendPayload): Promise<void> {
  const apiKey  = Deno.env.get('RESEND_API_KEY') ?? '';
  const from    = Deno.env.get('EMAIL_FROM') ?? 'UDF <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY não configurada. Email não enviado.');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error (${res.status}): ${body}`);
  }

  const data = await res.json();
  console.log(`[EMAIL] Enviado para ${payload.to} — ID: ${data.id}`);
}

// ─── Funções públicas ──────────────────────────────────────────────────────────

/**
 * Envia um email via Resend.
 * Não lança exceção — apenas loga o erro para não bloquear o fluxo principal.
 */
export async function sendEmail(params: {
  type: EmailType;
  to: string;
  name: string;
  link: string;
  role?: UserRole;
}): Promise<void> {
  try {
    let subject: string;
    let html: string;

    if (params.type === 'first-access') {
      subject = 'Bem-vindo(a)! Defina sua senha para acessar a UDF';
      html    = firstAccessHtml(params.name, params.link, params.role ?? 'player');
    } else {
      subject = 'Redefinição de senha — UDF';
      html    = resetPasswordHtml(params.name, params.link);
    }

    await callResend({ to: params.to, subject, html });
  } catch (err) {
    console.error(`[EMAIL] Erro ao enviar "${params.type}" para ${params.to}:`, err);
  }
}

/**
 * Gera o link de acesso/recuperação via Supabase Admin API
 * e envia o email via Resend.
 */
export async function generateAndSendEmail(
  supabaseAdmin: any,
  type: EmailType,
  email: string,
  name: string,
  role: UserRole = 'player',
): Promise<void> {
  const appUrl    = Deno.env.get('APP_URL') ?? '';
  const redirectTo = `${appUrl}/auth/reset-password`;

  try {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error(`[EMAIL] Erro ao gerar link para ${email}:`, linkError?.message);
      return;
    }

    await sendEmail({ type, to: email, name, link: linkData.properties.action_link, role });
  } catch (err) {
    console.error(`[EMAIL] Exceção ao gerar/enviar email para ${email}:`, err);
  }
}
