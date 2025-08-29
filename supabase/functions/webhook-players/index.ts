import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const body = await req.json();
    const { ["nome"]: nome, ["email"]: email, ["udf-id"]: idUdf, ["class-code"]: codigoTurma, ["registration"]: registration_number, ["external-id"]: externalId } = body;
    if (!nome || !email || !idUdf || !codigoTurma) {
      throw new Error('Campos obrigatórios ausentes: nome, email, udf-id, class-code');
    }
    // Buscar turma e verificar tipo
    const { data: turmaData, error: turmaError } = await supabaseClient.from('classes').select('id, event_type').eq('code', codigoTurma).single();
    if (turmaError || !turmaData) {
      throw new Error(`Turma com código ${codigoTurma} não encontrada: ${turmaError?.message}`);
    }
    const isTraining = turmaData.event_type === 'training';
    let authUserId = null;
    if (isTraining) {
      // Verificar se usuário já existe no Auth
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(user => user.email === email);
      
      if (existingUser) {
        // Usuário já existe, usar o ID existente
        authUserId = existingUser.id;
        console.log('Usuário já existe no Auth, reutilizando ID:', authUserId);
      } else {
        // Criar novo usuário
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email,
          user_metadata: {
            name: nome,
            role: 'instructor'
          },
          email_confirm: true
        });
        if (authError) {
          console.error('Erro ao criar usuário no Auth:', authError);
          throw new Error(`Erro ao criar usuário no Auth: ${authError.message}`);
        }
        authUserId = authData.user.id;
        console.log('Novo usuário criado no Auth:', authUserId);
      }
      const { data: instructorData, error: instructorError } = await supabaseClient.from('instructors').upsert({
        id: authUserId,
        name: nome,
        email,
        udf_id: idUdf,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'udf_id'
      }).select();
      if (instructorError) {
        console.error('Erro ao criar/atualizar instructor:', instructorError);
        throw new Error(`Erro ao criar/atualizar instructor: ${instructorError.message}`);
      }
    }
    const { data: playerData, error: playerError } = await supabaseClient.from('players').upsert({
      udf_id: idUdf,
      registration_number,
      name: nome,
      email
    }, {
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
    return new Response(JSON.stringify({
      success: true,
      player: playerRow,
      classPlayer: classPlayerRow,
      ...isTraining ? {
        instructor: {
          id: authUserId,
          email
        }
      } : {},
      message: isTraining ? 'Instrutor e player criados e vinculados à turma com sucesso' : 'Player vinculado à turma com sucesso'
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
