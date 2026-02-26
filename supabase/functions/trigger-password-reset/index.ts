import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo obrigatório: email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const appUrl = Deno.env.get('APP_URL') ?? '';

    // Verificar se o usuário existe em auth.users
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = usersList?.users?.find((u: any) => u.email === email);

    // Segurança: retornar sucesso mesmo se email não existir (evita enumeração)
    if (!authUser) {
      console.warn(`[RESET] Email não encontrado em auth.users: ${email}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar nome do usuário (na tabela players ou instructors)
    let userName = authUser.user_metadata?.name || '';
    if (!userName) {
      const { data: instructor } = await supabaseAdmin
        .from('instructors')
        .select('name')
        .eq('id', authUser.id)
        .maybeSingle();
      const { data: player } = await supabaseAdmin
        .from('players')
        .select('name')
        .eq('id', authUser.id)
        .maybeSingle();
      userName = instructor?.name || player?.name || '';
    }

    // Gerar link de recuperação usando o Admin API (sem enviar pelo Supabase)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/reset-password` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error(`[RESET] Erro ao gerar link para ${email}:`, linkError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar link de redefinição' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetLink = linkData.properties.action_link;

    // Enviar via Render Email Service
    await sendEmail({
      type: 'reset-password',
      to: email,
      name: userName,
      link: resetLink,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[RESET] Exceção:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
