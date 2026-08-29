import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateWebhook } from '../_shared/auth-middleware.ts';

// Validacao de identidade do jogador ANTES da partida.
//
// Espelha exatamente a checagem que o webhook-create-match faz DEPOIS da
// partida (evento -> player por email -> inscricao na turma). A diferenca e
// que aqui o jogo pergunta na ENTRADA: se o par email+codigo nao confere, o
// aluno corrige na hora em vez de jogar e ver a partida ser descartada.
//
// Nao cria nada, nao altera nada: so responde se pode jogar e com que nome.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret'
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
    return json(405, { valid: false, reason: 'method_not_allowed', message: 'Use POST.' });
  }

  try {
    const auth = await validateWebhook(req);
    if (!auth.valid) {
      return json(401, { valid: false, reason: 'unauthorized', message: auth.error });
    }

    const body = await req.json();
    const playerEmailRaw = body['player-email'];
    const eventCodeRaw = body['event-code'];

    if (!playerEmailRaw || !eventCodeRaw) {
      return json(400, {
        valid: false,
        reason: 'missing_fields',
        message: 'Campos obrigatórios ausentes: player-email, event-code.'
      });
    }

    // Normaliza: email sem espaços e minúsculo; código sem espaços e maiúsculo.
    const playerEmail = String(playerEmailRaw).trim().toLowerCase();
    const eventCode = String(eventCodeRaw).trim().toUpperCase();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Evento pelo código
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, class_id')
      .eq('code', eventCode)
      .maybeSingle();

    if (eventError) {
      return json(500, { valid: false, reason: 'server_error', message: 'Erro ao buscar evento.' });
    }
    if (!eventData) {
      return json(200, {
        valid: false,
        reason: 'event_not_found',
        message: 'Código do evento não encontrado. Confira o código com seu instrutor.'
      });
    }

    // 2. Players com esse email (comparação case-insensitive)
    const { data: players, error: playerError } = await supabase
      .from('players')
      .select('id, name, email')
      .ilike('email', playerEmail);

    if (playerError) {
      return json(500, { valid: false, reason: 'server_error', message: 'Erro ao buscar jogador.' });
    }
    if (!players || players.length === 0) {
      return json(200, {
        valid: false,
        reason: 'email_not_found',
        message: 'E-mail não encontrado. Verifique se digitou igual ao cadastro com seu instrutor.'
      });
    }

    // 3. Algum desses players está inscrito na turma deste evento?
    let matched: { id: string; name: string; email: string } | null = null;
    for (const p of players) {
      const { data: cp } = await supabase
        .from('class_players')
        .select('id')
        .eq('class_id', eventData.class_id)
        .eq('player_id', p.id)
        .maybeSingle();
      if (cp) {
        matched = p;
        break;
      }
    }

    if (!matched) {
      return json(200, {
        valid: false,
        reason: 'not_enrolled',
        message: 'Este e-mail não está inscrito na turma deste evento. Fale com seu instrutor.'
      });
    }

    // Sucesso: devolve o nome para o jogo confirmar visualmente ("Bem-vindo, X").
    return json(200, {
      valid: true,
      'player-name': matched.name,
      'player-email': matched.email
    });
  } catch (err) {
    return json(400, {
      valid: false,
      reason: 'bad_request',
      message: 'Corpo da requisição inválido (JSON esperado).'
    });
  }
});
