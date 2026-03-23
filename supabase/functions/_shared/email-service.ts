/**
 * Utilitário de envio de emails via Resend (chamado direto das Edge Functions)
 *
 * Variáveis de ambiente necessárias (Supabase Secrets):
 *   RESEND_API_KEY  → Chave da API do Resend (https://resend.com/api-keys)
 *   EMAIL_FROM      → Remetente verificado  (ex: "Ignição <noreply@seudominio.com>")
 *   APP_URL         → URL do frontend       (ex: https://seu-app.com)
 */

export type EmailType =
  | 'first-access'
  | 'reset-password'
  | 'announcement'
  | 'event-reminder'
  | 'event-date-change';

export type UserRole = 'player' | 'instructor';

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
    <div style="background:#1d4ed8;padding:28px 40px;text-align:center;">
      <img src="https://xfgsfmexaxmikkksndny.supabase.co/storage/v1/object/public/assets/logo.png" alt="Ignição" style="max-height:56px;max-width:200px;object-fit:contain;" />
    </div>
    ${content}
    <div style="background:#f9fafb;padding:20px 40px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
      <p>Se você não solicitou este email, pode ignorá-lo com segurança.</p>
      <p>© ${new Date().getFullYear()} Ignição. Todos os direitos reservados.</p>
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
        Sua conta Ignição foi criada com sucesso como <strong>${roleLabel}</strong>.
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
        Recebemos uma solicitação para redefinir a senha da sua conta Ignição.
      </p>
      ${btn(link, 'Redefinir Minha Senha')}
      <p style="color:#ef4444;font-size:13px;margin-top:24px;">
        ⚠️ Se você não solicitou a redefinição, ignore este e-mail. Sua senha não será alterada.
      </p>
    </div>`);
}

function announcementHtml(name: string, subject: string, body: string): string {
  return baseCard(`
    <div style="padding:40px;">
      <h2 style="color:#1f2937;font-size:22px;margin-top:0;">${subject}</h2>
      <p style="color:#4b5563;font-size:14px;margin-bottom:16px;">Olá, <strong>${name || 'usuário'}</strong>!</p>
      <div style="color:#374151;line-height:1.75;font-size:15px;white-space:pre-line;">${body}</div>
    </div>`);
}

function eventReminderHtml(name: string, eventTitle: string, eventDate: string, eventLocation: string): string {
  return baseCard(`
    <div style="padding:40px;">
      <div style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:20px;">📅 Lembrete de Evento</div>
      <h2 style="color:#1f2937;font-size:22px;margin-top:0;">${eventTitle}</h2>
      <p style="color:#4b5563;line-height:1.6;">Olá, <strong>${name}</strong>! Este é um lembrete sobre o próximo evento da sua turma.</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px 0;color:#374151;"><strong>📅 Data:</strong> ${eventDate}</p>
        <p style="margin:0;color:#374151;"><strong>📍 Local:</strong> ${eventLocation}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">Não se esqueça! Qualquer dúvida, entre em contato com seu instrutor.</p>
    </div>`);
}

function eventDateChangeHtml(name: string, eventTitle: string, oldDate: string, newDate: string, eventLocation: string): string {
  return baseCard(`
    <div style="padding:40px;">
      <div style="display:inline-block;background:#fef3c7;color:#d97706;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:20px;">⚠️ Data Alterada</div>
      <h2 style="color:#1f2937;font-size:22px;margin-top:0;">${eventTitle}</h2>
      <p style="color:#4b5563;line-height:1.6;">Olá, <strong>${name}</strong>! Informamos que a data do evento foi alterada.</p>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px 0;color:#92400e;"><strong>❌ Data anterior:</strong> <span style="text-decoration:line-through;">${oldDate}</span></p>
        <p style="margin:0;color:#065f46;"><strong>✅ Nova data:</strong> ${newDate}</p>
      </div>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#374151;"><strong>📍 Local:</strong> ${eventLocation}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">Anote a nova data na sua agenda. Qualquer dúvida, entre em contato com seu instrutor.</p>
    </div>`);
}

// ─── Resend API ────────────────────────────────────────────────────────────────

interface ResendPayload {
  to: string;
  subject: string;
  html: string;
}

async function callResend(payload: ResendPayload): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const from   = Deno.env.get('EMAIL_FROM') ?? 'Ignição <onboarding@resend.dev>';

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

export interface SendEmailParams {
  type: EmailType;
  to: string;
  name: string;
  link?: string;
  role?: UserRole;
  // Para announcement
  subject?: string;
  body?: string;
  // Para event-reminder / event-date-change
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  oldDate?: string;
  newDate?: string;
}

/**
 * Envia um email via Resend.
 * Não lança exceção — apenas loga o erro para não bloquear o fluxo principal.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    let subject: string;
    let html: string;

    switch (params.type) {
      case 'first-access':
        subject = 'Bem-vindo(a)! Defina sua senha para acessar a Ignição';
        html    = firstAccessHtml(params.name, params.link ?? '', params.role ?? 'player');
        break;

      case 'reset-password':
        subject = 'Redefinição de senha — Ignição';
        html    = resetPasswordHtml(params.name, params.link ?? '');
        break;

      case 'announcement':
        subject = params.subject ?? 'Comunicado — Ignição';
        html    = announcementHtml(params.name, params.subject ?? 'Comunicado', params.body ?? '');
        break;

      case 'event-reminder':
        subject = `Lembrete: ${params.eventTitle ?? 'Evento'} — Ignição`;
        html    = eventReminderHtml(
          params.name,
          params.eventTitle ?? 'Evento',
          params.eventDate ?? '',
          params.eventLocation ?? '',
        );
        break;

      case 'event-date-change':
        subject = `Data alterada: ${params.eventTitle ?? 'Evento'} — Ignição`;
        html    = eventDateChangeHtml(
          params.name,
          params.eventTitle ?? 'Evento',
          params.oldDate ?? '',
          params.newDate ?? '',
          params.eventLocation ?? '',
        );
        break;

      default:
        console.warn(`[EMAIL] Tipo desconhecido: ${params.type}`);
        return;
    }

    await callResend({ to: params.to, subject, html });
  } catch (err) {
    console.error(`[EMAIL] Erro ao enviar "${params.type}" para ${params.to}:`, err);
  }
}

// ─── Admin Alert ───────────────────────────────────────────────────────────────

/**
 * Envia alerta de inconsistência para o email de administração.
 * Usa ADMIN_ALERT_EMAIL (env var) como destinatário.
 * Não lança exceção — apenas loga o erro.
 */
export async function sendAdminAlert(subject: string, issues: string[]): Promise<void> {
  const to = Deno.env.get('ADMIN_ALERT_EMAIL') ?? '00marciomendonca@gmail.com';

  const rows = issues.map(i => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">
        ⚠️ ${i}
      </td>
    </tr>`).join('');

  const html = baseCard(`
    <div style="padding:40px;">
      <div style="display:inline-block;background:#fef3c7;color:#d97706;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:20px;">
        🚨 Alerta do Sistema
      </div>
      <h2 style="color:#1f2937;font-size:20px;margin-top:0;">${subject}</h2>
      <p style="color:#4b5563;font-size:14px;">As seguintes inconsistências foram detectadas:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
        Gerado automaticamente em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
      </p>
    </div>`);

  try {
    await callResend({ to, subject: `[Ignição] ${subject}`, html });
  } catch (err) {
    console.error('[ADMIN ALERT] Erro ao enviar alerta:', err);
  }
}

/**
 * Gera o link de acesso/recuperação via Supabase Admin API
 * e envia o email via Resend.
 */
export async function generateAndSendEmail(
  supabaseAdmin: any,
  type: 'first-access' | 'reset-password',
  email: string,
  name: string,
  role: UserRole = 'player',
): Promise<void> {
  const appUrl     = Deno.env.get('APP_URL') ?? '';
  const redirectTo = `${appUrl}/auth/reset-password`;

  try {
    // Para primeiro acesso, usa 'magiclink' que funciona para qualquer usuário confirmado
    // Para reset de senha, usa 'recovery' que requer usuário existente
    const linkType = type === 'first-access' ? 'magiclink' : 'recovery';

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error(`[EMAIL] Erro ao gerar link (${linkType}) para ${email}:`, linkError?.message);

      // Se falhou com magiclink, tenta com recovery
      if (linkType === 'magiclink') {
        console.log(`[EMAIL] Tentando fallback com recovery...`);
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo },
        });

        if (!fallbackError && fallbackData?.properties?.action_link) {
          await sendEmail({ type, to: email, name, link: fallbackData.properties.action_link, role });
          return;
        }
        console.error(`[EMAIL] Fallback também falhou:`, fallbackError?.message);
      }
      return;
    }

    await sendEmail({ type, to: email, name, link: linkData.properties.action_link, role });
  } catch (err) {
    console.error(`[EMAIL] Exceção ao gerar/enviar email para ${email}:`, err);
  }
}
