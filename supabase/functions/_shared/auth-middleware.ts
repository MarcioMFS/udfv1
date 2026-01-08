import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface WebhookAuthResult {
  valid: boolean
  error?: string
}

export async function validateWebhook(req: Request): Promise<WebhookAuthResult> {
  const webhookSecret = req.headers.get('X-Webhook-Secret')
  const expectedSecret = Deno.env.get('WEBHOOK_SECRET')

  if (webhookSecret && expectedSecret && webhookSecret === expectedSecret) {
    return { valid: true }
  }

  return {
    valid: false,
    error: 'X-Webhook-Secret header requerido e deve corresponder ao secret configurado'
  }
}
