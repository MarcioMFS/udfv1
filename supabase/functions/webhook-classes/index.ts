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
    const { "event-type": eventType, "class-code": classCode, "class-name": className, schedule, "instructor-email": instructorEmail, "co-instructor-email": coInstructorEmail, influencer } = await req.json();
    console.log('Payload recebido:', {
      eventType,
      classCode,
      className,
      schedule,
      instructorEmail,
      coInstructorEmail,
      influencer
    });
    if (!eventType || !classCode || !schedule || !instructorEmail) {
      throw new Error('Campos obrigatórios ausentes: event-type, class-code, schedule, instructor-email');
    }
    const validEventTypes = [
      'training',
      'group'
    ];
    if (!validEventTypes.includes(eventType)) {
      throw new Error(`Tipo de evento inválido: ${eventType}. Deve ser 'training' ou 'group'.`);
    }
    const { data: instructorData, error: instructorError } = await supabaseClient.from('instructors').select('id').eq('email', instructorEmail).single();
    if (instructorError || !instructorData) {
      throw new Error(`Instrutor com e-mail ${instructorEmail} não encontrado`);
    }
    const instructorId = instructorData.id;
    if (coInstructorEmail) {
      console.log(`Co-instructor informado (não vinculado ainda): ${coInstructorEmail}`);
    }
    let influencerId = null;
    if (influencer) {
      const { data: influencerData } = await supabaseClient.from('influencers').select('id').eq('email', influencer).single();
      if (influencerData) {
        influencerId = influencerData.id;
      } else {
        console.warn(`Influencer com e-mail ${influencer} não encontrado. Ignorando.`);
      }
    }
    let startDate = null;
    let endDate = null;
    if (Array.isArray(schedule) && schedule.length > 0) {
      const sorted = [
        ...schedule
      ].sort((a, b)=>new Date(a['initial-time']).getTime() - new Date(b['initial-time']).getTime());
      startDate = sorted[0]['initial-time'];
      endDate = sorted[sorted.length - 1]['end-time'];
    }
    // 1. Criar apenas a TURMA (sem evento)
    const { data: classData, error: classError } = await supabaseClient.from('classes').upsert({
      code: classCode, // Código da turma (UX)
      event_type: eventType,
      description: className || classCode,
      schedule,
      instructor_id: instructorId,
      influencer_id: influencerId,
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'code'
    }).select().single();
    
    if (classError || !classData) {
      console.error('Erro detalhado ao criar/atualizar turma:', {
        error: classError,
        code: classError?.code,
        message: classError?.message,
        details: classError?.details,
        hint: classError?.hint
      });
      throw new Error(`Erro ao criar ou atualizar turma: ${classError?.message || 'Erro desconhecido'}`);
    }
    console.log('Turma criada/atualizada com sucesso:', classData);
    return new Response(JSON.stringify({
      success: true,
      message: 'Turma criada com sucesso. Eventos devem ser criados pelo instrutor no painel.',
      class: classData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
