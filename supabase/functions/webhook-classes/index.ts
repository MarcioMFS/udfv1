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
    const { "class-code": classCode, "class-name": className, "instructor-email": instructorEmail, "co-instructor-email": coInstructorEmail, influencer } = await req.json();
    console.log('Payload recebido:', {
      classCode,
      className,
      instructorEmail,
      coInstructorEmail,
      influencer
    });
    if (!classCode || !instructorEmail) {
      throw new Error('Campos obrigatórios ausentes: class-code, instructor-email');
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
    // 1. Criar apenas a TURMA (container de alunos - sem event_type nem schedule)
    const { data: classData, error: classError } = await supabaseClient.from('classes').upsert({
      code: classCode, // Código da turma (UX)
      description: className || classCode,
      instructor_id: instructorId,
      influencer_id: influencerId,
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
