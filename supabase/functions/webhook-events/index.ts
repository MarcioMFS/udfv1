import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateWebhook } from '../_shared/auth-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret'
};

interface EventWebhookPayload {
  "event-code": string;
  "event-type": "training" | "course";
  "event-name": string;
  "event-description"?: string;
  "event-subject"?: string;
  "schedule": Array<{
    "initial-time": string;
    "end-time": string;
  }>;
  "participants": Array<{
    "registration": string;
    "participant-code": string;
    "name": string;
    "email": string;
    "role": "leader" | "training-leader" | "participant";
  }>;
}

serve(async (req) => {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: EventWebhookPayload = await req.json();
    const { 
      "event-code": eventCode, 
      "event-type": eventType,
      "event-name": eventName,
      "event-description": eventDescription,
      "event-subject": eventSubject,
      schedule, 
      participants 
    } = payload;

    if (!eventCode || !eventType || !eventName || !participants?.length) {
      throw new Error('Campos obrigatórios ausentes: event-code, event-type, event-name, participants');
    }

    // Validar que o código do evento tem exatamente 8 caracteres
    if (eventCode.length !== 8) {
      throw new Error(`O código do evento deve ter exatamente 8 caracteres. Recebido: "${eventCode}" (${eventCode.length} caracteres)`);
    }

    // 1. Criar ou encontrar classe baseada no event-code
    // Usamos event-code como class-code para manter compatibilidade
    let classData;
    const { data: existingClass, error: classCheckError } = await supabaseClient
      .from('classes')
      .select('id')
      .eq('code', eventCode)
      .single();

    if (existingClass) {
      // Calcular datas de início e fim baseadas no schedule
      const startDate = schedule.length > 0 ? schedule[0]['initial-time'] : null;
      const endDate = schedule.length > 0 ? schedule[schedule.length - 1]['end-time'] : null;
      
      // Atualizar datas da classe existente se necessário
      const { data: updatedClass, error: updateError } = await supabaseClient
        .from('classes')
        .update({
          start_date: startDate,
          end_date: endDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClass.id)
        .select()
        .single();

      if (updateError) {
        console.warn('Erro ao atualizar datas da classe:', updateError);
        classData = existingClass;
      } else {
        classData = updatedClass;
      }
      console.log('Classe existente encontrada e atualizada:', classData.id);
    } else {
      // Calcular datas de início e fim baseadas no schedule
      const startDate = schedule.length > 0 ? schedule[0]['initial-time'] : null;
      const endDate = schedule.length > 0 ? schedule[schedule.length - 1]['end-time'] : null;
      
      // Criar nova classe
      const { data: newClass, error: classError } = await supabaseClient
        .from('classes')
        .insert({
          code: eventCode,
          description: `Classe para evento: ${eventName}`,
          event_type: eventType,
          start_date: startDate,
          end_date: endDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (classError) {
        throw new Error(`Erro ao criar classe: ${classError.message}`);
      }
      classData = newClass;
      console.log('Nova classe criada:', classData.id);
    }

    // 2. Criar evento com schedule
    const { data: eventData, error: eventError } = await supabaseClient
      .from('events')
      .upsert({
        code: eventCode,
        name: eventName,
        description: eventDescription,
        subject: eventSubject,
        class_id: classData.id,
        event_type: eventType,
        schedule: schedule,
        difficulty: 'medium',
        time_limit: 30,
        max_players: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'code'
      })
      .select()
      .single();

    if (eventError) {
      throw new Error(`Erro ao criar evento: ${eventError.message}`);
    }

    // 3. Processar participantes
    const processedParticipants = [];
    const leaders = participants.filter(p => p.role === 'leader' || p.role === 'training-leader');
    
    for (const participant of participants) {
      const { registration, "participant-code": participantCode, name, email, role } = participant;

      // Criar/atualizar player (sempre como player, independente do role)
      const { data: playerData, error: playerError } = await supabaseClient
        .from('players')
        .upsert({
          udf_id: participantCode,
          registration_number: registration,
          name: name,
          email: email
        }, {
          onConflict: 'udf_id'
        })
        .select()
        .single();

      if (playerError) {
        console.error('Erro ao criar player:', playerError);
        continue;
      }

      // Vincular player à classe
      const { error: classPlayerError } = await supabaseClient
        .from('class_players')
        .upsert({
          class_id: classData.id,
          player_id: playerData.id
        }, {
          onConflict: 'class_id,player_id'
        });

      if (classPlayerError) {
        console.error('Erro ao vincular player à classe:', classPlayerError);
      }

      // Se for leader e evento for course, criar instructor também
      if ((role === 'leader' || role === 'training-leader') && eventType === 'course') {
        try {
          // Verificar se usuário já existe no Auth
          const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(user => user.email === email);
          
          let authUserId;
          if (existingUser) {
            authUserId = existingUser.id;
          } else {
            // Criar novo usuário no Auth
            const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
              email,
              user_metadata: {
                name: name,
                role: 'instructor'
              },
              email_confirm: true
            });

            if (authError) {
              console.error('Erro ao criar usuário no Auth:', authError);
              continue;
            }
            authUserId = authData.user.id;
          }

          // Criar instructor
          const { error: instructorError } = await supabaseClient
            .from('instructors')
            .upsert({
              id: authUserId,
              name: name,
              email: email,
              udf_id: participantCode,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'udf_id'
            });

          if (instructorError) {
            console.error('Erro ao criar instructor:', instructorError);
          }

          // Atribuir classe ao instructor se for líder
          if (role === 'leader') {
            await supabaseClient
              .from('classes')
              .update({ instructor_id: authUserId })
              .eq('id', classData.id);
          }
        } catch (error) {
          console.error('Erro ao processar leader:', error);
        }
      }

      processedParticipants.push({
        player: playerData,
        role: role
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Evento ${eventType} criado com sucesso`,
      data: {
        class: classData,
        event: eventData,
        participants_count: processedParticipants.length,
        leaders_count: leaders.length
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro no webhook-events:', error);
    
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