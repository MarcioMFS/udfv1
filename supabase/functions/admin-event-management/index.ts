import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type Operation = 'list_all_events' | 'reassign_event' | 'delete_event' | 'update_event';

interface RequestPayload {
  operation: Operation;
  event_id?: string;
  new_instructor_id?: string;
  data?: {
    title?: string;
    date?: string;
    location?: string;
    description?: string;
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
    const { data: instructor, error: instructorError } = await supabaseClient
      .from('instructors')
      .select('id, is_admin')
      .eq('id', user.id)
      .single();

    if (instructorError || !instructor || !instructor.is_admin) {
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
    const { operation, event_id, new_instructor_id, data } = payload;

    if (!operation) {
      throw new Error('Campo obrigatório ausente: operation');
    }

    let result;
    let message;

    switch (operation) {
      case 'list_all_events': {
        const { data: events, error: listError } = await supabaseAdmin
          .from('events')
          .select(`
            *,
            instructors!instructor_id(id, name, email),
            classes!class_id(id, code, description)
          `)
          .order('start_date', { ascending: false });

        if (listError) throw listError;

        // Transform the nested objects to match expected format
        const transformedEvents = events?.map(event => ({
          ...event,
          instructor: event.instructors,
          class: event.classes ? {
            id: event.classes.id,
            name: event.classes.code,
            description: event.classes.description
          } : null,
          date: event.start_date,
          title: event.name
        })) || [];

        result = transformedEvents;
        message = 'Eventos recuperados com sucesso';
        break;
      }

      case 'reassign_event': {
        if (!event_id || !new_instructor_id) {
          throw new Error('Campos obrigatórios ausentes: event_id, new_instructor_id');
        }

        // Verify new instructor exists
        const { data: newInstructor, error: instructorError } = await supabaseAdmin
          .from('instructors')
          .select('id, name')
          .eq('id', new_instructor_id)
          .single();

        if (instructorError || !newInstructor) {
          throw new Error('Instrutor destino não encontrado');
        }

        // Get event details before update
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select('name, instructor_id, instructors!instructor_id(name)')
          .eq('id', event_id)
          .single();

        // Reassign event
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('events')
          .update({
            instructor_id: new_instructor_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', event_id)
          .select(`
            *,
            instructors!instructor_id(id, name, email),
            classes!class_id(id, code, description)
          `)
          .single();

        if (updateError) throw updateError;

        // Transform response
        const transformedResult = {
          ...updated,
          instructor: updated.instructors,
          class: updated.classes ? {
            id: updated.classes.id,
            name: updated.classes.code,
            description: updated.classes.description
          } : null,
          date: updated.start_date,
          title: updated.name
        };

        result = transformedResult;
        message = `Evento "${eventData?.name}" reatribuído de ${(eventData?.instructors as any)?.name} para ${newInstructor.name}`;
        break;
      }

      case 'delete_event': {
        if (!event_id) {
          throw new Error('Campo obrigatório ausente: event_id');
        }

        // Get event name for message
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select('name')
          .eq('id', event_id)
          .single();

        // Delete match results first (due to foreign key constraint)
        await supabaseAdmin
          .from('match_results')
          .delete()
          .eq('event_id', event_id);

        // Delete matches
        await supabaseAdmin
          .from('matches')
          .delete()
          .eq('event_id', event_id);

        // Delete the event
        const { error: deleteError } = await supabaseAdmin
          .from('events')
          .delete()
          .eq('id', event_id);

        if (deleteError) throw deleteError;

        result = { deleted_id: event_id };
        message = `Evento "${eventData?.name || event_id}" excluído com sucesso`;
        break;
      }

      case 'update_event': {
        if (!event_id) {
          throw new Error('Campo obrigatório ausente: event_id');
        }

        if (!data || Object.keys(data).length === 0) {
          throw new Error('Informe ao menos um campo para atualizar');
        }

        const updateData: any = { updated_at: new Date().toISOString() };
        if (data.title) updateData.name = data.title;
        if (data.date) updateData.start_date = data.date;
        if (data.location) updateData.location = data.location;
        if (data.description !== undefined) updateData.description = data.description;

        const { data: updated, error: updateError } = await supabaseAdmin
          .from('events')
          .update(updateData)
          .eq('id', event_id)
          .select(`
            *,
            instructors!instructor_id(id, name, email),
            classes!class_id(id, code, description)
          `)
          .single();

        if (updateError) throw updateError;

        // Transform response
        const transformedResult = {
          ...updated,
          instructor: updated.instructors,
          class: updated.classes ? {
            id: updated.classes.id,
            name: updated.classes.code,
            description: updated.classes.description
          } : null,
          date: updated.start_date,
          title: updated.name
        };

        result = transformedResult;
        message = 'Evento atualizado com sucesso';
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

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
