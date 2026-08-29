import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Reprocessa uma tentativa de partida rejeitada (match_attempts), atribuindo-a
// ao aluno correto. So admin executa.
//
// Como funciona: em vez de duplicar a logica do webhook-create-match, esta
// funcao REENVIA a partida guardada (app_serial) para o proprio
// webhook-create-match, agora com o email do aluno certo (que precisa estar
// inscrito na turma). Se o create-match aceitar, a partida entra normalmente e
// a tentativa e marcada como resolvida.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Use POST.' });
  }

  try {
    // 1. Autenticacao: precisa ser admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { success: false, error: 'Authorization header obrigatório' });
    }

    const asUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await asUser.auth.getUser();
    if (authError || !user) {
      return json(401, { success: false, error: 'Autenticação inválida' });
    }

    const { data: instructor } = await asUser
      .from('instructors')
      .select('id, is_admin')
      .eq('id', user.id)
      .single();

    if (!instructor || !instructor.is_admin) {
      return json(403, { success: false, error: 'Apenas administradores podem reprocessar.' });
    }

    // 2. Entrada
    const body = await req.json();
    const attemptId: string = body['attempt_id'];
    const targetEmail: string = (body['target_email'] || '').trim();

    if (!attemptId || !targetEmail) {
      return json(400, { success: false, error: 'Campos obrigatórios: attempt_id, target_email.' });
    }

    // 3. Client service_role para ler/gravar (ignora RLS)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: attempt, error: attErr } = await admin
      .from('match_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attErr || !attempt) {
      return json(404, { success: false, error: 'Tentativa não encontrada.' });
    }
    if (attempt.status === 'resolved') {
      return json(409, { success: false, error: 'Esta tentativa já foi resolvida.' });
    }
    if (!attempt.app_serial) {
      return json(422, {
        success: false,
        error: 'Esta tentativa não guardou os dados da partida (app-serial), então não pode ser reprocessada.'
      });
    }

    // 4. O aluno-alvo precisa existir e estar inscrito na turma da tentativa
    const { data: players } = await admin
      .from('players')
      .select('id, email')
      .ilike('email', targetEmail);

    const targetPlayer = players && players[0];
    if (!targetPlayer) {
      return json(404, { success: false, error: `Nenhum aluno com o e-mail ${targetEmail}.` });
    }

    if (attempt.class_id) {
      const { data: cp } = await admin
        .from('class_players')
        .select('id')
        .eq('class_id', attempt.class_id)
        .eq('player_id', targetPlayer.id)
        .maybeSingle();
      if (!cp) {
        return json(422, {
          success: false,
          error: 'O aluno escolhido não está inscrito na turma deste evento. Inscreva-o antes de reprocessar.'
        });
      }
    }

    // 5. Reenvia a partida ao webhook-create-match com o email correto
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET') ?? '';
    const createMatchUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-create-match`;

    const payload: Record<string, unknown> = {
      'player-email': targetPlayer.email,
      'event-code': attempt.event_code,
      'app-serial': attempt.app_serial,
      'match-number': attempt.match_number
    };
    if (attempt.lucro != null) payload['lucro'] = attempt.lucro;
    if (attempt.satisfacao != null) payload['satisfacao'] = attempt.satisfacao;
    if (attempt.bonus_money != null) payload['bonus-money'] = attempt.bonus_money;

    const resp = await fetch(createMatchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': webhookSecret },
      body: JSON.stringify(payload)
    });

    const resultText = await resp.text();
    if (!resp.ok) {
      return json(502, {
        success: false,
        error: `O reprocessamento da partida falhou (${resp.status}).`,
        detail: resultText.slice(0, 300)
      });
    }

    // 6. Marca a tentativa como resolvida
    await admin
      .from('match_attempts')
      .update({
        status: 'resolved',
        resolved_player_id: targetPlayer.id,
        resolved_by: user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', attemptId);

    return json(200, {
      success: true,
      message: `Partida reprocessada para ${targetPlayer.email}.`,
      player_id: targetPlayer.id
    });
  } catch (err) {
    return json(400, { success: false, error: `Requisição inválida: ${err instanceof Error ? err.message : String(err)}` });
  }
});
