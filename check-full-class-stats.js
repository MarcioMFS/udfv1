const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

const classId = '5d62c7cd-453a-4402-bc87-e889891fb558';

async function checkFullClassStats() {
  console.log('🔍 Verificando estatísticas completas da turma:', classId);
  console.log('');

  // 1. Buscar todos os jogadores da turma
  const classPlayersRes = await fetch(`${SUPABASE_URL}/rest/v1/class_players?class_id=eq.${classId}&select=player_id,total_matches,avg_score`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classPlayers = await classPlayersRes.json();

  console.log(`👥 Total de jogadores na turma: ${classPlayers.length}`);
  console.log('');

  const playerIds = classPlayers.map(cp => cp.player_id);

  // 2. Buscar TODOS os resultados de TODOS os jogadores
  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?player_id=in.(${playerIds.join(',')})&select=*&order=created_at`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const allResults = await resultsRes.json();

  console.log(`📊 Total de partidas registradas: ${allResults.length}`);
  console.log('');

  // 3. Calcular estatísticas TOTAIS da turma
  let totalBonus = 0;
  let totalSatisfacao = 0;
  let totalLucro = 0;
  let totalPartidas = 0;

  console.log('═'.repeat(80));
  console.log('DETALHAMENTO POR PARTIDA:');
  console.log('═'.repeat(80));

  allResults.forEach((result, i) => {
    console.log(`Partida ${i + 1}:`);
    console.log(`  Player ID: ${result.player_id.substring(0, 8)}...`);
    console.log(`  Event ID: ${result.event_id.substring(0, 8)}...`);
    console.log(`  Match Number: ${result.match_number}`);
    console.log(`  Lucro: ${result.lucro || 0}`);
    console.log(`  Satisfação: ${result.satisfacao || 0}%`);
    console.log(`  Bônus: ${result.bonus || 0}`);
    console.log(`  Criada em: ${result.created_at}`);
    console.log('');

    totalBonus += result.bonus || 0;
    totalSatisfacao += result.satisfacao || 0;
    totalLucro += result.lucro || 0;
    totalPartidas++;
  });

  console.log('═'.repeat(80));
  console.log('ESTATÍSTICAS DA TURMA (SOMA DE TODAS AS PARTIDAS):');
  console.log('═'.repeat(80));
  console.log(`Total de partidas: ${totalPartidas}`);
  console.log(`Bônus Total (soma): ${totalBonus}`);
  console.log(`Satisfação Média: ${totalPartidas > 0 ? (totalSatisfacao / totalPartidas).toFixed(2) : 0}%`);
  console.log(`Lucro Total (soma): ${totalLucro}`);
  console.log('');

  // 4. Verificar o que está armazenado em class_players
  console.log('═'.repeat(80));
  console.log('DADOS ARMAZENADOS EM CLASS_PLAYERS:');
  console.log('═'.repeat(80));
  classPlayers.forEach((cp, i) => {
    console.log(`Jogador ${i + 1}:`);
    console.log(`  Player ID: ${cp.player_id.substring(0, 8)}...`);
    console.log(`  Total Matches: ${cp.total_matches || 0}`);
    console.log(`  Avg Score: ${cp.avg_score || 0}`);
    console.log('');
  });

  // 5. Buscar eventos da turma
  const eventsRes = await fetch(`${SUPABASE_URL}/rest/v1/events?class_id=eq.${classId}&select=id,code,name`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const events = await eventsRes.json();

  console.log('═'.repeat(80));
  console.log(`EVENTOS DA TURMA (${events.length}):`);
  console.log('═'.repeat(80));
  events.forEach((evt, i) => {
    console.log(`Evento ${i + 1}:`);
    console.log(`  ID: ${evt.id}`);
    console.log(`  Code: ${evt.code}`);
    console.log(`  Nome: ${evt.name || 'N/A'}`);
    console.log('');
  });
}

checkFullClassStats().catch(console.error);
