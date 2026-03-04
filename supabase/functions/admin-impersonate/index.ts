import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: adminInstructor } = await supabaseClient
      .from('instructors')
      .select('id, is_admin, name')
      .eq('id', user.id)
      .single();

    if (!adminInstructor || !adminInstructor.is_admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas administradores podem usar esta função' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pegar o ID do instrutor alvo
    const { instructor_id } = await req.json();

    if (!instructor_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID do instrutor é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente admin com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se o instrutor existe
    const { data: targetInstructor, error: targetError } = await supabaseAdmin
      .from('instructors')
      .select('id, name, email')
      .eq('id', instructor_id)
      .single();

    if (targetError || !targetInstructor) {
      return new Response(
        JSON.stringify({ success: false, error: 'Instrutor não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar link de login mágico para o instrutor
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetInstructor.email,
      options: {
        redirectTo: Deno.env.get('SITE_URL') || 'http://localhost:5173',
      }
    });

    if (linkError) {
      console.error('[impersonate] Erro ao gerar link:', linkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar link de acesso' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log da ação de impersonation para auditoria
    console.log(`[impersonate] Admin ${adminInstructor.name} (${user.id}) entrou como ${targetInstructor.name} (${instructor_id})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Entrando como ${targetInstructor.name}`,
        access_token: linkData.properties?.hashed_token,
        redirect_url: linkData.properties?.action_link,
        instructor: {
          id: targetInstructor.id,
          name: targetInstructor.name,
          email: targetInstructor.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[admin-impersonate] Exceção:', error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
