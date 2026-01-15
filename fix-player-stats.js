const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

const playerId = '96cf3e66-4268-494b-8a40-d77ddb7b3964';
const classId = '5d62c7cd-453a-4402-bc87-e889891fb558';
const eventId = '0062c59d-30f7-4c40-b023-cfdb135c6279';

async function fixPlayerStats() {
  console.log('🔧 Corrigindo estatísticas do jogador...');
  console.log('');

  // 1. Buscar todos os resultados do jogador neste evento
  const resultsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/match_results?player_id=eq.${playerId}&event_id=eq.${eventId}&select=lucro,satisfacao,bonus`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const results = await resultsRes.json();

  console.log(`📊 Resultados encontrados: ${results.length}`);
  console.log('');

  if (!results || results.length === 0) {
    console.log('❌ Nenhum resultado encontrado');
    return;
  }

  // 2. Calcular estatísticas
  const totalMatches = results.length;
  const totalScore = results.reduce((sum, result) =>
    sum + (result.lucro || 0) + (result.satisfacao || 0) + (result.bonus || 0), 0
  );
  const avgScore = Math.round(totalScore / totalMatches);

  console.log('📈 Estatísticas calculadas:');
  console.log(`  Total de partidas: ${totalMatches}`);
  console.log(`  Score total: ${totalScore}`);
  console.log(`  Score médio: ${avgScore}`);
  console.log('');

  // 3. Atualizar class_players
  console.log('💾 Atualizando class_players...');
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/class_players?player_id=eq.${playerId}&class_id=eq.${classId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        total_matches: totalMatches,
        avg_score: avgScore
      })
    }
  );

  if (!updateRes.ok) {
    const error = await updateRes.text();
    console.log('❌ Erro ao atualizar:', error);
    return;
  }

  const updated = await updateRes.json();
  console.log('✅ Atualização concluída!');
  console.log('');
  console.log('Dados atualizados:');
  console.log(JSON.stringify(updated, null, 2));
}

fixPlayerStats().catch(console.error);
