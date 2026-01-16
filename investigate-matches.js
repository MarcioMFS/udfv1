const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

const classId = '5d62c7cd-453a-4402-bc87-e889891fb558';

async function investigateMatches() {
  console.log('🔍 Investigando partidas da turma:', classId);
  console.log('');

  // 1. Buscar players da turma
  const playersRes = await fetch(`${SUPABASE_URL}/rest/v1/class_players?class_id=eq.${classId}&select=player_id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const players = await playersRes.json();
  const playerIds = players.map(p => p.player_id);

  console.log(`👥 Jogadores: ${playerIds.length}`);
  console.log(playerIds);
  console.log('');

  // 2. Buscar TODAS as partidas (matches) desses players
  const matchesRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?player_id=in.(${playerIds.join(',')})&select=*&order=created_at`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const matches = await matchesRes.json();

  console.log(`🎮 PARTIDAS CRIADAS (${Array.isArray(matches) ? matches.length : 0}):`);
  console.log('');

  if (!Array.isArray(matches)) {
    console.log('Erro:', matches);
    return;
  }

  // 3. Buscar os resultados processados
  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?player_id=in.(${playerIds.join(',')})&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const results = await resultsRes.json();

  const resultsMap = new Map();
  if (Array.isArray(results)) {
    results.forEach(r => {
      const key = `${r.player_id}-${r.event_id}-${r.match_number}`;
      resultsMap.set(key, r);
    });
  }

  console.log(`📊 Resultados processados: ${resultsMap.size}`);
  console.log('');

  // 4. Verificar quais partidas NÃO foram processadas
  const unprocessed = [];
  matches.forEach((match, i) => {
    const key = `${match.player_id}-${match.event_id}-${match.match_number}`;
    const isProcessed = resultsMap.has(key);

    console.log(`Match ${i + 1}:`);
    console.log(`  ID: ${match.id}`);
    console.log(`  Player: ${match.player_id}`);
    console.log(`  Event: ${match.event_id}`);
    console.log(`  Match Number: ${match.match_number}`);
    console.log(`  App Serial: ${match.app_serial?.substring(0, 50)}...`);
    console.log(`  Created: ${match.created_at}`);
    console.log(`  ✅ Processado: ${isProcessed ? 'SIM' : '❌ NÃO'}`);
    console.log('');

    if (!isProcessed) {
      unprocessed.push(match);
    }
  });

  console.log('═'.repeat(60));
  console.log(`⚠️  PARTIDAS NÃO PROCESSADAS: ${unprocessed.length}`);
  console.log('═'.repeat(60));

  if (unprocessed.length > 0) {
    console.log('');
    console.log('As seguintes partidas foram criadas mas NÃO tiveram resultados calculados:');
    unprocessed.forEach((match, i) => {
      console.log(`${i + 1}. Match ${match.match_number} - Player ${match.player_id.substring(0, 8)}...`);
    });
  }
}

investigateMatches().catch(console.error);
