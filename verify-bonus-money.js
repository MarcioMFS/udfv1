const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

const classId = '5d62c7cd-453a-4402-bc87-e889891fb558';

async function verifyBonusMoney() {
  console.log('🔍 Verificando bonus_money na turma:', classId);
  console.log('');

  // Buscar jogadores da turma
  const classPlayersRes = await fetch(`${SUPABASE_URL}/rest/v1/class_players?class_id=eq.${classId}&select=player_id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classPlayers = await classPlayersRes.json();
  const playerIds = classPlayers.map(cp => cp.player_id);

  // Buscar todos os resultados com bonus_money
  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?player_id=in.(${playerIds.join(',')})&select=*&order=created_at`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const results = await resultsRes.json();

  console.log(`📊 Total de partidas: ${results.length}\n`);

  console.log('═'.repeat(80));
  console.log('DETALHAMENTO COM BONUS_MONEY:');
  console.log('═'.repeat(80));

  results.forEach((result, i) => {
    console.log(`Partida ${i + 1}:`);
    console.log(`  Player ID: ${result.player_id.substring(0, 8)}...`);
    console.log(`  Match Number: ${result.match_number}`);
    console.log(`  Lucro: ${result.lucro || 0}`);
    console.log(`  Satisfação: ${result.satisfacao || 0}%`);
    console.log(`  Bônus (contagem): ${result.bonus || 0}`);
    console.log(`  💰 Bônus Money: ${result.bonus_money || 0}`);
    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('✅ VERIFICAÇÃO COMPLETA!');
  console.log('═'.repeat(80));
}

verifyBonusMoney().catch(console.error);
