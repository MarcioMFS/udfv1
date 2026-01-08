import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { validateWebhook } from '../_shared/auth-middleware.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authResult = await validateWebhook(req)
    if (!authResult.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: authResult.error
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const {
      'event-code': eventCode,
      participant
    } = body

    if (!eventCode) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Campo obrigatório: event-code'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!participant || !participant.email || !participant.name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Participante deve conter pelo menos: email, name'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Buscar o evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, code, class_id')
      .eq('code', eventCode)
      .single()

    if (eventError || !event) {
      return new Response(JSON.stringify({
        success: false,
        error: `Evento com código '${eventCode}' não encontrado`
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Buscar player existente por email (pega o mais recente se houver duplicados)
    const { data: players, error: findError } = await supabase
      .from('players')
      .select('id')
      .eq('email', participant.email)
      .order('created_at', { ascending: false })
      .limit(1)

    let player = players && players.length > 0 ? players[0] : null

    if (findError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Erro ao buscar player: ${findError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Se não existe, criar; se existe, atualizar
    if (!player) {
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert({
          email: participant.email,
          name: participant.name,
          udf_id: participant['participant-code'] || null,
          registration_number: participant.registration || null
        })
        .select('id')
        .single()

      if (insertError || !newPlayer) {
        return new Response(JSON.stringify({
          success: false,
          error: `Erro ao criar player: ${insertError?.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      player = newPlayer
    } else {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          name: participant.name,
          udf_id: participant['participant-code'] || null,
          registration_number: participant.registration || null
        })
        .eq('id', player.id)

      if (updateError) {
        return new Response(JSON.stringify({
          success: false,
          error: `Erro ao atualizar player: ${updateError.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 4. Vincular player à turma (class_players)
    const { error: classPlayerError } = await supabase
      .from('class_players')
      .upsert({
        class_id: event.class_id,
        player_id: player.id
      }, {
        onConflict: 'class_id,player_id',
        ignoreDuplicates: true
      })

    if (classPlayerError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Erro ao vincular player à turma: ${classPlayerError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Adicionar participante ao evento
    const { error: eventParticipantError } = await supabase
      .from('event_participants')
      .upsert({
        event_id: event.id,
        player_id: player.id,
        status: 'participated'
      }, {
        onConflict: 'event_id,player_id',
        ignoreDuplicates: false
      })

    if (eventParticipantError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Erro ao adicionar participante ao evento: ${eventParticipantError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Participante '${participant.name}' adicionado ao evento '${eventCode}'`,
      data: {
        event_code: eventCode,
        player_id: player.id,
        player_email: participant.email
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro no webhook-add-participant:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
