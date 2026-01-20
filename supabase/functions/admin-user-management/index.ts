import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type Operation = 'update_user' | 'delete_user' | 'promote_to_instructor' | 'demote_to_player' | 'toggle_admin';

interface RequestPayload {
  operation: Operation;
  user_id: string;
  user_type?: 'player' | 'instructor';
  data?: {
    name?: string;
    email?: string;
    make_admin?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization header obrigatório'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Autenticação inválida'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: instructor } = await supabaseClient
      .from('instructors')
      .select('id, is_admin')
      .eq('id', user.id)
      .single();

    if (!instructor || !instructor.is_admin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Apenas administradores podem executar esta operação'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: RequestPayload = await req.json();
    const { operation, user_id, user_type, data } = payload;

    if (!operation || !user_id) {
      throw new Error('Campos obrigatórios ausentes: operation, user_id');
    }

    let result;
    let message;

    switch (operation) {
      case 'update_user': {
        if (!data?.name && !data?.email) {
          throw new Error('Informe ao menos um campo para atualizar: name ou email');
        }

        // Check for email duplicates if email is being updated
        if (data.email) {
          const { data: duplicatePlayer } = await supabaseAdmin
            .from('players')
            .select('id')
            .eq('email', data.email)
            .neq('id', user_id)
            .single();

          const { data: duplicateInstructor } = await supabaseAdmin
            .from('instructors')
            .select('id')
            .eq('email', data.email)
            .neq('id', user_id)
            .single();

          if (duplicatePlayer || duplicateInstructor) {
            throw new Error('Este email já está em uso por outro usuário');
          }
        }

        const updateData: any = { updated_at: new Date().toISOString() };
        if (data.name) updateData.name = data.name;
        if (data.email) updateData.email = data.email;

        const table = user_type === 'player' ? 'players' : 'instructors';
        const { data: updated, error: updateError } = await supabaseAdmin
          .from(table)
          .update(updateData)
          .eq('id', user_id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updated;
        message = 'Usuário atualizado com sucesso';
        break;
      }

      case 'delete_user': {
        const table = user_type === 'player' ? 'players' : 'instructors';

        // If deleting instructor, check if they have classes
        if (user_type === 'instructor') {
          const { data: classes } = await supabaseAdmin
            .from('classes')
            .select('id')
            .eq('instructor_id', user_id);

          if (classes && classes.length > 0) {
            throw new Error('Não é possível excluir instrutor que possui turmas. Reatribua as turmas primeiro.');
          }

          // Check if it's the last admin
          const { data: instructorData } = await supabaseAdmin
            .from('instructors')
            .select('is_admin')
            .eq('id', user_id)
            .single();

          if (instructorData?.is_admin) {
            const { count } = await supabaseAdmin
              .from('instructors')
              .select('id', { count: 'exact', head: true })
              .eq('is_admin', true);

            if (count && count <= 1) {
              throw new Error('Não é possível excluir o último administrador do sistema');
            }
          }
        }

        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('id', user_id);

        if (deleteError) throw deleteError;

        // Try to delete auth user (optional, may fail if user doesn't exist in auth)
        try {
          await supabaseAdmin.auth.admin.deleteUser(user_id);
        } catch (authDeleteError) {
          console.warn('Could not delete auth user:', authDeleteError);
        }

        result = { deleted_id: user_id };
        message = 'Usuário excluído com sucesso';
        break;
      }

      case 'promote_to_instructor': {
        // Check if already an instructor
        const { data: existingInstructor } = await supabaseAdmin
          .from('instructors')
          .select('id')
          .eq('id', user_id)
          .single();

        if (existingInstructor) {
          throw new Error('Este usuário já é um instrutor');
        }

        // Get player data
        const { data: player } = await supabaseAdmin
          .from('players')
          .select('name, email')
          .eq('id', user_id)
          .single();

        if (!player) {
          throw new Error('Player não encontrado');
        }

        // Check if auth user exists
        const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserById(user_id);

        let authUserId = user_id;

        // Create auth user if doesn't exist
        if (!existingAuthUser) {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: player.email,
            user_metadata: {
              name: player.name,
              role: 'instructor'
            },
            email_confirm: true
          });

          if (authError) throw authError;
          authUserId = authData.user.id;
        }

        // Create instructor record
        const { data: instructorData, error: instructorError } = await supabaseAdmin
          .from('instructors')
          .insert({
            id: authUserId,
            name: player.name,
            email: player.email,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (instructorError) throw instructorError;

        // Delete player record
        await supabaseAdmin.from('players').delete().eq('id', user_id);

        result = instructorData;
        message = `${player.name} foi promovido a instrutor com sucesso`;
        break;
      }

      case 'demote_to_player': {
        // Check if instructor has classes
        const { data: classes } = await supabaseAdmin
          .from('classes')
          .select('id')
          .eq('instructor_id', user_id);

        if (classes && classes.length > 0) {
          throw new Error('Não é possível rebaixar instrutor que possui turmas. Reatribua as turmas primeiro.');
        }

        // Get instructor data
        const { data: instructor } = await supabaseAdmin
          .from('instructors')
          .select('name, email, is_admin')
          .eq('id', user_id)
          .single();

        if (!instructor) {
          throw new Error('Instrutor não encontrado');
        }

        // Check if it's the last admin
        if (instructor.is_admin) {
          const { count } = await supabaseAdmin
            .from('instructors')
            .select('id', { count: 'exact', head: true })
            .eq('is_admin', true);

          if (count && count <= 1) {
            throw new Error('Não é possível rebaixar o último administrador do sistema');
          }
        }

        // Create player record
        const { data: playerData, error: playerError } = await supabaseAdmin
          .from('players')
          .insert({
            id: user_id,
            name: instructor.name,
            email: instructor.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (playerError) throw playerError;

        // Delete instructor record
        await supabaseAdmin.from('instructors').delete().eq('id', user_id);

        result = playerData;
        message = `${instructor.name} foi rebaixado a player com sucesso`;
        break;
      }

      case 'toggle_admin': {
        if (data?.make_admin === undefined) {
          throw new Error('Campo make_admin é obrigatório para esta operação');
        }

        // Get instructor data
        const { data: instructor } = await supabaseAdmin
          .from('instructors')
          .select('id, is_admin, name')
          .eq('id', user_id)
          .single();

        if (!instructor) {
          throw new Error('Instrutor não encontrado');
        }

        // If removing admin, check if it's the last one
        if (!data.make_admin && instructor.is_admin) {
          const { count } = await supabaseAdmin
            .from('instructors')
            .select('id', { count: 'exact', head: true })
            .eq('is_admin', true);

          if (count && count <= 1) {
            throw new Error('Não é possível remover o último administrador do sistema');
          }
        }

        // Update admin status
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('instructors')
          .update({
            is_admin: data.make_admin,
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id)
          .select()
          .single();

        if (updateError) throw updateError;

        result = updated;
        message = data.make_admin
          ? `${instructor.name} agora é administrador`
          : `${instructor.name} não é mais administrador`;
        break;
      }

      default:
        throw new Error(`Operação inválida: ${operation}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na operação admin:', error);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
