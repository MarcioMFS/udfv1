import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateWebhook } from '../_shared/auth-middleware.ts';
import { generateAndSendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret'
};

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // ✅ VALIDAR AUTENTICAÇÃO (Webhook Secret OU User Token)
    const auth = await validateWebhook(req);
    if (!auth.valid) {
      return new Response(
        JSON.stringify({ success: false, error: auth.error }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Autenticado via: ${auth.type}`);

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const body = await req.json();
    const { ["nome"]: nome, ["email"]: email, ["udf-id"]: idUdf, ["class-code"]: codigoTurma, ["registration"]: registration_number, ["external-id"]: externalId } = body;
    if (!nome || !email || !idUdf || !codigoTurma) {
      throw new Error('Campos obrigatórios ausentes: nome, email, udf-id, class-code');
    }
    // Buscar turma
    const { data: turmaData, error: turmaError } = await supabaseClient.from('classes').select('id').eq('code', codigoTurma).single();
    if (turmaError || !turmaData) {
      throw new Error(`Turma com código ${codigoTurma} não encontrada: ${turmaError?.message}`);
    }

    // Verificar se o player já existe (para saber se deve enviar email de primeiro acesso)
    const { data: existingPlayer } = await supabaseClient
      .from('players')
      .select('id')
      .eq('udf_id', idUdf)
      .maybeSingle();

    const isNewPlayer = !existingPlayer;

    // Para novos players: criar conta em auth.users (necessário para login e reset de senha)
    let playerAuthId: string | null = null;
    if (isNewPlayer) {
      // Verificar se já existe auth user com este email
      const { data: usersList } = await supabaseClient.auth.admin.listUsers();
      const existingAuthUser = usersList?.users?.find((u: any) => u.email === email);

      if (existingAuthUser) {
        playerAuthId = existingAuthUser.id;
      } else {
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email,
          user_metadata: { name: nome, role: 'player' },
          email_confirm: true,
        });
        if (authError) {
          // Não bloqueia o cadastro do player, mas loga o erro
          console.error(`[AUTH] Erro ao criar conta para ${email}:`, authError.message);
        } else {
          playerAuthId = authData.user.id;
        }
      }
    }

    // Montar upsert (novo player usa o UUID do auth para que login funcione)
    const upsertData: any = {
      udf_id: idUdf,
      registration_number,
      name: nome,
      email,
    };
    if (isNewPlayer && playerAuthId) {
      upsertData.id = playerAuthId;
    }

    const { data: playerData, error: playerError } = await supabaseClient.from('players').upsert(upsertData, {
      onConflict: 'udf_id'
    }).select();
    if (playerError) {
      console.error('Erro ao criar/atualizar player:', playerError);
      throw new Error(`Erro ao criar/atualizar player: ${playerError.message}`);
    }
    const playerRow = Array.isArray(playerData) ? playerData[0] : playerData;
    if (!playerRow) {
      console.error('Não retornou playerData:', playerData);
      throw new Error('Não retornou playerData');
    }
    const { data: classPlayerData, error: classPlayerError } = await supabaseClient.from('class_players').upsert({
      class_id: turmaData.id,
      player_id: playerRow.id
    }, {
      onConflict: 'class_id,player_id'
    }).select();
    if (classPlayerError) {
      console.error('Erro ao criar/atualizar class_player:', classPlayerError);
      throw new Error(`Erro ao criar/atualizar class_player: ${classPlayerError.message}`);
    }
    const classPlayerRow = Array.isArray(classPlayerData) ? classPlayerData[0] : classPlayerData;
    if (!classPlayerRow) {
      console.error('Não retornou classPlayerData:', classPlayerData);
      throw new Error('Não retornou classPlayerData');
    }
    // Enviar email de primeiro acesso via Render (não bloqueia a resposta)
    if (isNewPlayer && playerAuthId) {
      generateAndSendEmail(supabaseClient, 'first-access', email, nome, 'player')
        .catch(err => console.error('[EMAIL] Erro ao enviar first-access:', err));
    }

    return new Response(JSON.stringify({
      success: true,
      player: playerRow,
      classPlayer: classPlayerRow,
      message: 'Player vinculado à turma com sucesso'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro geral:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
