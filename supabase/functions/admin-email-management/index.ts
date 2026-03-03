import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, generateAndSendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Operation =
  | 'send_announcement'
  | 'send_event_reminder'
  | 'send_event_date_change'
  | 'resend_first_access'
  | 'resend_password_reset'
  | 'invite_instructor'
  | 'send_bulk_emails';

type RecipientType = 'all_players' | 'all_instructors' | 'by_class' | 'specific_user';

interface RequestPayload {
  operation: Operation;
  // Para send_announcement
  recipient_type?: RecipientType;
  class_id?: string;
  user_id?: string;
  subject?: string;
  body?: string;
  // Para send_event_reminder / send_event_date_change
  event_id?: string;
  new_date?: string; // usado em event_date_change
  // Para resend_first_access / resend_password_reset
  // usa user_id acima
  // Para invite_instructor
  instructor_name?: string;
  instructor_email?: string;
  // Para send_bulk_emails
  emails?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Autenticação admin ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: instructor } = await supabaseClient
      .from('instructors')
      .select('id, is_admin')
      .eq('id', user.id)
      .single();

    if (!instructor || !instructor.is_admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas administradores podem executar esta operação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Cliente admin (service role) ───────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: RequestPayload = await req.json();
    const { operation } = payload;

    if (!operation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo obrigatório: operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Operações ──────────────────────────────────────────────────────────────

    // COMUNICADO LIVRE
    if (operation === 'send_announcement') {
      const { recipient_type, class_id, user_id, subject, body } = payload;

      if (!subject || !body) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campos obrigatórios: subject, body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let recipients: { email: string; name: string }[] = [];

      if (recipient_type === 'all_players') {
        const { data } = await supabaseAdmin.from('players').select('name, email');
        recipients = (data ?? []).map((r: any) => ({ email: r.email, name: r.name }));

      } else if (recipient_type === 'all_instructors') {
        const { data } = await supabaseAdmin.from('instructors').select('name, email');
        recipients = (data ?? []).map((r: any) => ({ email: r.email, name: r.name }));

      } else if (recipient_type === 'by_class') {
        if (!class_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Campo obrigatório para turma: class_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data } = await supabaseAdmin
          .from('class_players')
          .select('players(name, email)')
          .eq('class_id', class_id);
        recipients = (data ?? [])
          .map((r: any) => r.players)
          .filter(Boolean)
          .map((p: any) => ({ email: p.email, name: p.name }));

      } else if (recipient_type === 'specific_user') {
        if (!user_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Campo obrigatório para usuário específico: user_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Tenta em players depois em instructors
        const { data: player } = await supabaseAdmin
          .from('players').select('name, email').eq('id', user_id).maybeSingle();
        const { data: inst } = await supabaseAdmin
          .from('instructors').select('name, email').eq('id', user_id).maybeSingle();
        const found = player ?? inst;
        if (found) recipients = [{ email: found.email, name: found.name }];
      }

      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nenhum destinatário encontrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let sent = 0;
      for (const r of recipients) {
        await sendEmail({ type: 'announcement', to: r.email, name: r.name, subject, body });
        sent++;
      }

      return new Response(
        JSON.stringify({ success: true, sent, message: `Comunicado enviado para ${sent} destinatário(s)` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LEMBRETE DE EVENTO
    if (operation === 'send_event_reminder' || operation === 'send_event_date_change') {
      const { event_id, new_date } = payload;

      if (!event_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campo obrigatório: event_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Busca evento com turma e players
      const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select('id, name, schedule, class_id, classes(code, description)')
        .eq('id', event_id)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ success: false, error: 'Evento não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Busca players da turma
      const { data: classPlayers } = await supabaseAdmin
        .from('class_players')
        .select('players(name, email)')
        .eq('class_id', event.class_id);

      const recipients = (classPlayers ?? [])
        .map((r: any) => r.players)
        .filter(Boolean)
        .map((p: any) => ({ email: p.email, name: p.name }));

      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nenhum player encontrado na turma deste evento' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // schedule é um array de objetos com initial-time
      const firstSchedule = Array.isArray(event.schedule) && event.schedule[0];
      const dateStr = firstSchedule?.['initial-time'] || firstSchedule?.initialTime;
      const eventDate = dateStr
        ? new Date(dateStr).toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
          })
        : 'Data não definida';

      let sent = 0;

      if (operation === 'send_event_reminder') {
        for (const r of recipients) {
          await sendEmail({
            type: 'event-reminder',
            to: r.email,
            name: r.name,
            eventTitle: event.name,
            eventDate,
          });
          sent++;
        }
        return new Response(
          JSON.stringify({ success: true, sent, message: `Lembrete enviado para ${sent} player(s)` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // send_event_date_change
      if (!new_date) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campo obrigatório para alteração: new_date' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newDateFormatted = new Date(new_date).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
      });

      for (const r of recipients) {
        await sendEmail({
          type: 'event-date-change',
          to: r.email,
          name: r.name,
          eventTitle: event.name,
          oldDate: eventDate,
          newDate: newDateFormatted,
        });
        sent++;
      }

      return new Response(
        JSON.stringify({ success: true, sent, message: `Aviso de alteração enviado para ${sent} player(s)` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REENVIAR PRIMEIRO ACESSO / RESET DE SENHA
    if (operation === 'resend_first_access' || operation === 'resend_password_reset') {
      const { user_id } = payload;

      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campo obrigatório: user_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Busca usuário em players ou instructors
      const { data: player } = await supabaseAdmin
        .from('players').select('id, name, email').eq('id', user_id).maybeSingle();
      const { data: inst } = await supabaseAdmin
        .from('instructors').select('id, name, email').eq('id', user_id).maybeSingle();
      const found = player ?? inst;
      const isInstructor = !!inst;

      if (!found) {
        return new Response(
          JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verifica se o usuário existe no auth pelo ID
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id);

      // Se não existe no auth pelo ID, tenta buscar pelo email
      if (!authUser?.user) {
        console.log(`[resend] Usuário ${found.email} não existe no auth pelo ID ${user_id}. Verificando por email...`);

        // Busca todos os usuários auth para encontrar por email
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthByEmail = allUsers?.users?.find(u => u.email?.toLowerCase() === found.email.toLowerCase());

        if (existingAuthByEmail) {
          // Usuário existe no auth com outro ID - atualiza o ID na tabela
          console.log(`[resend] Encontrado auth user pelo email. Auth ID: ${existingAuthByEmail.id}`);

          const table = isInstructor ? 'instructors' : 'players';
          const { error: updateError } = await supabaseAdmin
            .from(table)
            .update({ id: existingAuthByEmail.id, updated_at: new Date().toISOString() })
            .eq('id', user_id);

          if (updateError) {
            console.error('[resend] Erro ao atualizar ID do usuário:', updateError);
            return new Response(
              JSON.stringify({ success: false, error: `Erro ao vincular conta existente: ${updateError.message}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`[resend] ID atualizado na tabela. Enviando email...`);

          // Envia email de primeiro acesso
          await generateAndSendEmail(supabaseAdmin, 'first-access', found.email, found.name, isInstructor ? 'instructor' : 'player');

          return new Response(
            JSON.stringify({
              success: true,
              sent: 1,
              message: `Conta vinculada e convite enviado para ${found.email}`,
              note: 'Usuário tinha conta de autenticação com ID diferente. Foi vinculado.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Não existe no auth - cria nova conta
        console.log(`[resend] Criando nova conta auth para ${found.email}...`);

        const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: found.email,
          user_metadata: { name: found.name, role: isInstructor ? 'instructor' : 'player' },
          email_confirm: true,
        });

        if (createAuthError) {
          console.error('[resend] Erro ao criar usuário no auth:', createAuthError);
          return new Response(
            JSON.stringify({ success: false, error: `Erro ao criar conta: ${createAuthError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Atualiza o ID na tabela para corresponder ao novo auth user
        const table = isInstructor ? 'instructors' : 'players';
        const { error: updateError } = await supabaseAdmin
          .from(table)
          .update({ id: newAuthUser.user.id, updated_at: new Date().toISOString() })
          .eq('id', user_id);

        if (updateError) {
          console.error('[resend] Erro ao atualizar ID do usuário:', updateError);
          // Deleta o auth user criado para evitar inconsistência
          await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
          return new Response(
            JSON.stringify({ success: false, error: `Erro ao vincular conta: ${updateError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[resend] Conta auth criada e vinculada. Novo ID: ${newAuthUser.user.id}`);

        // Envia email com o novo user
        await generateAndSendEmail(supabaseAdmin, 'first-access', found.email, found.name, isInstructor ? 'instructor' : 'player');

        return new Response(
          JSON.stringify({
            success: true,
            sent: 1,
            message: `Conta criada e convite enviado para ${found.email}`,
            note: 'Usuário não tinha conta de autenticação. Foi criada uma nova conta.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Usuário já existe no auth - apenas reenvia o email
      const emailType = operation === 'resend_first_access' ? 'first-access' : 'reset-password';
      const role = isInstructor ? 'instructor' : 'player';

      await generateAndSendEmail(supabaseAdmin, emailType, found.email, found.name, role);

      const label = operation === 'resend_first_access' ? 'Primeiro acesso' : 'Reset de senha';
      return new Response(
        JSON.stringify({ success: true, sent: 1, message: `${label} enviado para ${found.email}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CONVIDAR INSTRUTOR
    if (operation === 'invite_instructor') {
      const { instructor_name, instructor_email } = payload;

      if (!instructor_name || !instructor_email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campos obrigatórios: instructor_name, instructor_email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const email = instructor_email.trim().toLowerCase();
      const name = instructor_name.trim();

      // Verifica se já existe instrutor com esse email
      const { data: existingInstructor } = await supabaseAdmin
        .from('instructors')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingInstructor) {
        return new Response(
          JSON.stringify({ success: false, error: 'Já existe um instrutor com este email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verifica se já existe player com esse email
      const { data: existingPlayer } = await supabaseAdmin
        .from('players')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingPlayer) {
        return new Response(
          JSON.stringify({ success: false, error: 'Já existe um player com este email. Promova-o a instrutor pela página de usuários.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cria usuário auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        user_metadata: { name, role: 'instructor' },
        email_confirm: true,
      });

      if (authError) {
        console.error('[invite_instructor] Erro ao criar auth user:', authError);
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao criar usuário: ${authError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cria registro do instrutor
      const { error: insertError } = await supabaseAdmin
        .from('instructors')
        .insert({
          id: authData.user.id,
          name,
          email,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[invite_instructor] Erro ao inserir instrutor:', insertError);
        // Tenta deletar o auth user criado
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao criar instrutor: ${insertError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Envia email de primeiro acesso
      await generateAndSendEmail(supabaseAdmin, 'first-access', email, name, 'instructor');

      return new Response(
        JSON.stringify({ success: true, sent: 1, message: `Instrutor ${name} criado e convite enviado para ${email}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ENVIO EM MASSA
    if (operation === 'send_bulk_emails') {
      const { emails, subject, body } = payload;

      if (!emails || emails.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nenhum email válido informado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!subject || !body) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campos obrigatórios: subject, body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let sent = 0;
      const errors: string[] = [];

      for (const email of emails) {
        try {
          await sendEmail({
            type: 'announcement',
            to: email,
            name: email.split('@')[0], // usa parte antes do @ como nome
            subject,
            body,
          });
          sent++;
        } catch (err) {
          console.error(`[send_bulk_emails] Erro ao enviar para ${email}:`, err);
          errors.push(email);
        }
      }

      const message = errors.length > 0
        ? `Enviado para ${sent} de ${emails.length} email(s). Falhas: ${errors.join(', ')}`
        : `Email enviado para ${sent} destinatário(s)`;

      return new Response(
        JSON.stringify({ success: true, sent, message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Operação desconhecida: ${operation}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[admin-email-management] Exceção:', error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
