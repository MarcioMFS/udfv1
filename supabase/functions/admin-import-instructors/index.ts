import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateAndSendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstructorToImport {
  name: string;
  email: string;
  udf_id?: string;
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  details: { email: string; status: 'created' | 'updated' | 'error'; message?: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação admin
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
    const { data: instructor } = await supabaseClient
      .from('instructors')
      .select('id, is_admin')
      .eq('id', user.id)
      .single();

    if (!instructor || !instructor.is_admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas administradores podem importar instrutores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente admin com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { instructors } = await req.json() as { instructors: InstructorToImport[] };

    if (!instructors || !Array.isArray(instructors) || instructors.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lista de instrutores vazia ou inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ImportResult = {
      success: true,
      created: 0,
      updated: 0,
      errors: [],
      details: [],
    };

    for (const inst of instructors) {
      const email = inst.email?.trim().toLowerCase();
      const name = inst.name?.trim();

      if (!email || !name) {
        result.errors.push(`Dados incompletos: ${email || 'sem email'}`);
        result.details.push({ email: email || 'N/A', status: 'error', message: 'Nome ou email ausente' });
        continue;
      }

      try {
        // Verificar se já existe instrutor com esse email
        const { data: existingInstructor } = await supabaseAdmin
          .from('instructors')
          .select('id, name')
          .eq('email', email)
          .maybeSingle();

        if (existingInstructor) {
          // Atualizar nome se diferente
          if (existingInstructor.name !== name) {
            await supabaseAdmin
              .from('instructors')
              .update({ name, updated_at: new Date().toISOString() })
              .eq('id', existingInstructor.id);
          }
          result.updated++;
          result.details.push({ email, status: 'updated' });
          continue;
        }

        // Verificar se já existe player com esse email
        const { data: existingPlayer } = await supabaseAdmin
          .from('players')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingPlayer) {
          result.errors.push(`${email}: já existe como player`);
          result.details.push({ email, status: 'error', message: 'Já existe como player' });
          continue;
        }

        // Verificar se já existe no auth
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = authUsers?.users?.find(u => u.email === email);

        let authUserId: string;

        if (existingAuthUser) {
          // Usuário já existe no auth, usar o ID existente
          authUserId = existingAuthUser.id;
          console.log(`[import] Auth user já existe para ${email}, usando ID: ${authUserId}`);
        } else {
          // Criar novo auth user
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            user_metadata: { name, role: 'instructor' },
            email_confirm: true,
          });

          if (authError) {
            console.error(`[import] Erro ao criar auth user para ${email}:`, authError);
            result.errors.push(`${email}: ${authError.message}`);
            result.details.push({ email, status: 'error', message: authError.message });
            continue;
          }

          authUserId = authData.user.id;
        }

        // Criar registro do instrutor
        const udfId = inst.udf_id || `INS-${email.split('@')[0]}-${Date.now().toString(36).slice(-4)}`;

        const { error: insertError } = await supabaseAdmin
          .from('instructors')
          .insert({
            id: authUserId,
            name,
            email,
            udf_id: udfId,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`[import] Erro ao inserir instrutor ${email}:`, insertError);
          // Se o auth user foi criado agora, deletar
          if (!existingAuthUser) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
          }
          result.errors.push(`${email}: ${insertError.message}`);
          result.details.push({ email, status: 'error', message: insertError.message });
          continue;
        }

        // Enviar email de primeiro acesso (apenas se auth user foi criado agora)
        if (!existingAuthUser) {
          generateAndSendEmail(supabaseAdmin, 'first-access', email, name, 'instructor')
            .catch(err => console.error(`[import] Erro ao enviar email para ${email}:`, err));
        }

        result.created++;
        result.details.push({ email, status: 'created' });

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[import] Exceção ao processar ${email}:`, err);
        result.errors.push(`${email}: ${msg}`);
        result.details.push({ email, status: 'error', message: msg });
      }
    }

    result.success = result.errors.length === 0 || result.created > 0 || result.updated > 0;

    return new Response(
      JSON.stringify({
        success: result.success,
        message: `Importação concluída: ${result.created} criados, ${result.updated} atualizados, ${result.errors.length} erros`,
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[admin-import-instructors] Exceção:', error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
