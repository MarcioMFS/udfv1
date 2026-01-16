const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

const classId = '5d62c7cd-453a-4402-bc87-e889891fb558';

async function checkClassData() {
  console.log('🔍 Verificando dados da turma:', classId);
  console.log('');

  // 1. Buscar informações da turma
  const classRes = await fetch(`${SUPABASE_URL}/rest/v1/classes?id=eq.${classId}&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classData = await classRes.json();
  console.log('📊 DADOS DA TURMA:');
  console.log(JSON.stringify(classData, null, 2));
  console.log('');

  // 2. Primeiro, vamos ver a estrutura da tabela match_results
  console.log('📋 Verificando estrutura da tabela match_results...');
  const sampleRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?limit=1&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const sample = await sampleRes.json();
  console.log('Estrutura (primeiro registro):');
  console.log(JSON.stringify(sample, null, 2));
  console.log('');

  // Agora buscar os players da turma primeiro
  const classPlayersRes = await fetch(`${SUPABASE_URL}/rest/v1/class_players?class_id=eq.${classId}&select=player_id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classPlayers = await classPlayersRes.json();

  if (!Array.isArray(classPlayers) || classPlayers.length === 0) {
    console.log('❌ Nenhum jogador encontrado na turma');
    return;
  }

  const playerIds = classPlayers.map(cp => cp.player_id);
  console.log(`👥 Jogadores na turma: ${playerIds.length}`);
  console.log(playerIds);
  console.log('');

  // Buscar resultados filtrando por player_id
  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?player_id=in.(${playerIds.join(',')})&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const results = await resultsRes.json();

  console.log('📈 RESPOSTA BRUTA DOS RESULTADOS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('');

  if (!Array.isArray(results)) {
    console.log('❌ Erro: results não é um array!');
    return;
  }

  console.log(`📈 RESULTADOS DAS PARTIDAS (${results.length} registros):`);
  console.log('');

  // Calcular totais manualmente
  let totalBonus = 0;
  let totalSatisfacao = 0;
  let count = 0;

  results.forEach((r, i) => {
    console.log(`Partida ${i + 1}:`);
    console.log(`  Player ID: ${r.player_id}`);
    console.log(`  Match Number: ${r.match_number}`);
    console.log(`  Lucro: ${r.lucro || 0}`);
    console.log(`  Satisfação: ${r.satisfacao || 0}%`);
    console.log(`  Bônus: ${r.bonus || 0}`);
    console.log('');

    totalBonus += r.bonus || 0;
    totalSatisfacao += r.satisfacao || 0;
    count++;
  });

  console.log('═'.repeat(60));
  console.log('📊 CÁLCULOS CORRETOS:');
  console.log('═'.repeat(60));
  console.log(`Total de partidas: ${count}`);
  console.log(`Bônus Total (soma): ${totalBonus}`);
  console.log(`Satisfação Média (soma/count): ${count > 0 ? (totalSatisfacao / count).toFixed(2) : 0}%`);
  console.log('');

  // 3. Buscar os players da turma
  const playersRes = await fetch(`${SUPABASE_URL}/rest/v1/class_players?class_id=eq.${classId}&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const players = await playersRes.json();

  console.log(`👥 JOGADORES DA TURMA (${players.length} jogadores):`);
  players.forEach(p => {
    console.log(`  - Player ID: ${p.player_id}`);
    console.log(`    Total Matches: ${p.total_matches || 0}`);
    console.log(`    Avg Score: ${p.avg_score || 0}`);
    console.log('');
  });
}

checkClassData().catch(console.error);
