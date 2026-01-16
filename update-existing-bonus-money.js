const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

const matchResultId = '9df32a25-bef7-4e04-af4c-93dd0c32e04b'; // ID do match_result existente

async function updateExistingBonusMoney() {
  console.log('🔧 Atualizando bonus_money no registro existente...\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/match_results?id=eq.${matchResultId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      bonus_money: 286
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('❌ Erro ao atualizar:', error);
    return;
  }

  const updated = await response.json();
  console.log('✅ Registro atualizado com sucesso!');
  console.log('');
  console.log('Dados atualizados:');
  console.log(JSON.stringify(updated, null, 2));
}

updateExistingBonusMoney().catch(console.error);
