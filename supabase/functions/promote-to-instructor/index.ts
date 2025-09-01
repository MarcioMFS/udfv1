import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface PromoteToInstructorPayload {
  player_name: string;
  player_email: string;
  player_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const payload: PromoteToInstructorPayload = await req.json();
    const { player_name, player_email, player_id } = payload;

    if (!player_name || !player_email) {
      throw new Error('Campos obrigatórios ausentes: player_name, player_email');
    }

    // Check if instructor already exists
    const { data: existingInstructor, error: checkError } = await supabaseClient
      .from('instructors')
      .select('id')
      .eq('email', player_email)
      .single();

    if (existingInstructor) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Este usuário já é um instrutor'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // First create auth user if doesn't exist
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(user => user.email === player_email);
    
    let authUserId;
    if (existingUser) {
      authUserId = existingUser.id;
    } else {
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: player_email,
        user_metadata: {
          name: player_name,
          role: 'instructor'
        },
        email_confirm: true
      });

      if (authError) throw authError;
      authUserId = authData.user.id;
    }

    // Create instructor record
    const { data: instructorData, error: instructorError } = await supabaseClient
      .from('instructors')
      .insert({
        id: authUserId,
        name: player_name,
        email: player_email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (instructorError) throw instructorError;

    // Update event_participants status - remove candidate_instructor status
    // since they are now a full instructor
    const { error: updateParticipantsError } = await supabaseClient
      .from('event_participants')
      .update({ 
        status: 'participated', // Change back to participated
        updated_at: new Date().toISOString()
      })
      .eq('player_id', player_id)
      .eq('status', 'candidate_instructor');

    // Don't throw error if this fails, as instructor creation is the main goal
    if (updateParticipantsError) {
      console.warn('Warning: Could not update event_participants status:', updateParticipantsError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${player_name} foi promovido a instrutor com sucesso`,
      instructor: instructorData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao promover a instrutor:', error);
    
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