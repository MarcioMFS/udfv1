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
    const auth = await validateWebhook(req);
    if (!auth.valid) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { name, email } = await req.json();
    if (!email || !name) {
      throw new Error('Missing required fields: name and email');
    }
    const { data, error } = await supabaseClient.from('influencers').upsert({
      name,
      email,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'email'
    }).select('name, email').single();
    if (error) {
      console.error('Error upserting influencer:', error);
      throw error;
    }
    return new Response(JSON.stringify({
      success: true,
      influencer: data,
      message: 'Influencer created or updated successfully'
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
      success: false,
      error: error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
