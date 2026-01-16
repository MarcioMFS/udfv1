import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateWebhook } from '../_shared/auth-middleware.ts';

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

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const rawPayload = await req.json();
    const name = rawPayload.name;
    const email = rawPayload.email;
    const cpf = rawPayload.cpf;
    const udfId = rawPayload["udf-id"];
    const externalId = cpf;
    if (!name || !email || !cpf || !udfId) {
      throw new Error('Campos obrigatórios ausentes: name, email, cpf, udf-id');
    }
    const { data: instructorByUdfId } = await supabaseClient.from('instructors').select('*').eq('udf_id', udfId).maybeSingle();
    const { data: instructorByEmail } = await supabaseClient.from('instructors').select('*').eq('email', email).maybeSingle();
    const { data: instructorByCpf } = await supabaseClient.from('instructors').select('*').eq('external_id', externalId).maybeSingle();
    if (instructorByEmail && (!instructorByUdfId || instructorByEmail.id !== instructorByUdfId.id)) {
      throw new Error('Já existe um instrutor cadastrado com este e-mail!');
    }
    if (instructorByCpf && (!instructorByUdfId || instructorByCpf.id !== instructorByUdfId.id)) {
      throw new Error('Já existe um instrutor cadastrado com este CPF!');
    }
    let authUser = null;
    let instructorData = null;
    if (!instructorByUdfId) {
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        user_metadata: {
          name,
          role: 'instructor'
        },
        email_confirm: true
      });
      if (authError) throw authError;
      authUser = authData.user;
      const { data: newInstructor, error: instructorError } = await supabaseClient.from('instructors').insert({
        id: authUser.id,
        name,
        email,
        udf_id: udfId,
        external_id: externalId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).select().single();
      if (instructorError) {
        await supabaseClient.auth.admin.deleteUser(authUser.id).catch(console.error);
        throw instructorError;
      }
      instructorData = newInstructor;
    } else {
      const { data: updatedInstructor, error: updateError } = await supabaseClient.from('instructors').update({
        name,
        email,
        udf_id: udfId,
        external_id: externalId,
        updated_at: new Date().toISOString()
      }).eq('id', instructorByUdfId.id).select().single();
      if (updateError) throw updateError;
      instructorData = updatedInstructor;
      const { data: { user: existingAuthUser } } = await supabaseClient.auth.admin.getUserById(instructorByUdfId.id);
      authUser = existingAuthUser;
    }
    return new Response(JSON.stringify({
      success: true,
      instructor: {
        id: instructorData.id,
        name: instructorData.name,
        email: instructorData.email,
        udf_id: instructorData.udf_id,
        external_id: instructorData.external_id,
        created_at: instructorData.created_at,
        updated_at: instructorData.updated_at
      },
      auth_user: {
        id: authUser.id,
        email: authUser.email
      },
      message: !instructorByUdfId ? 'Instructor created successfully' : 'Instructor updated successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
