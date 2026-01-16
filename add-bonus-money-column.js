const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

async function addBonusMoneyColumn() {
  console.log('🔧 Adicionando coluna bonus_money...\n');

  const query = `
    ALTER TABLE public.match_results
    ADD COLUMN IF NOT EXISTS bonus_money numeric DEFAULT 0;
  `;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    console.log('❌ Erro ao adicionar coluna via RPC');
    console.log('Vou tentar via psql direto...\n');

    // Tentar executar via SQL direto
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase.rpc('exec_sql', { query });

    if (error) {
      console.log('❌ Erro:', error);
      return;
    }

    console.log('✅ Coluna adicionada com sucesso!');
    return;
  }

  console.log('✅ Coluna bonus_money adicionada com sucesso!');
}

addBonusMoneyColumn().catch(console.error);
