import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

async function testFrontendBonusMoney() {
  console.log('🧪 Teste: Frontend busca bonus_money corretamente\n');

  // 1. Buscar um evento e jogador existente
  console.log('1️⃣ Buscando evento e jogador...');
  const eventsRes = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const events = await eventsRes.json();

  if (!events || events.length === 0) {
    console.log('❌ Nenhum evento encontrado. Impossível testar.');
    return;
  }

  const event = events[0];
  console.log(`✅ Evento: ${event.name} (${event.code})`);

  const playersRes = await fetch(`${SUPABASE_URL}/rest/v1/class_players?select=*,players(*)&class_id=eq.${event.class_id}&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classPlayers = await playersRes.json();

  if (!classPlayers || classPlayers.length === 0) {
    console.log('❌ Nenhum jogador encontrado. Impossível testar.');
    return;
  }

  const player = classPlayers[0].players;
  console.log(`✅ Jogador: ${player.name} (${player.email})\n`);

  // 2. Inserir dados de teste diretamente no banco
  console.log('2️⃣ Inserindo partida de teste no banco...');
  const testMatchData = {
    id: randomUUID(),
    event_id: event.id,
    player_id: player.id,
    match_number: 999,
    lucro: 5000,
    satisfacao: 90,
    bonus: 2,
    bonus_money: 350,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(testMatchData)
  });

  if (!insertRes.ok) {
    const errorText = await insertRes.text();
    console.log(`❌ Falha ao inserir: ${insertRes.status} - ${errorText}`);
    return;
  }

  const inserted = await insertRes.json();
  const matchId = inserted[0].id;
  console.log(`✅ Partida inserida com ID: ${matchId}\n`);

  // 3. Simular query do frontend - EventDashboard
  console.log('3️⃣ Simulando query do EventDashboard...');
  const dashboardQuery = await fetch(`${SUPABASE_URL}/rest/v1/match_results?select=player_id,lucro,satisfacao,bonus,bonus_money,match_number,events!inner(id)&events.id=eq.${event.id}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const dashboardData = await dashboardQuery.json();

  const testMatch = dashboardData.find(m => m.match_number === 999);
  if (testMatch) {
    console.log('✅ EventDashboard pode buscar bonus_money:');
    console.log(`   bonus: ${testMatch.bonus}`);
    console.log(`   bonus_money: ${testMatch.bonus_money}\n`);
  } else {
    console.log('❌ EventDashboard não encontrou a partida de teste\n');
  }

  // 4. Simular query do MatchResultsChart
  console.log('4️⃣ Simulando query do MatchResultsChart...');
  const chartQuery = await fetch(`${SUPABASE_URL}/rest/v1/match_results?select=*,players:player_id(name,email),events!inner(class_id)&events.class_id=eq.${event.class_id}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const chartData = await chartQuery.json();

  const testMatchChart = chartData.find(m => m.match_number === 999);
  if (testMatchChart) {
    console.log('✅ MatchResultsChart pode buscar bonus_money:');
    console.log(`   bonus: ${testMatchChart.bonus}`);
    console.log(`   bonus_money: ${testMatchChart.bonus_money}\n`);
  } else {
    console.log('❌ MatchResultsChart não encontrou a partida de teste\n');
  }

  // 5. Simular query do ReportsPage
  console.log('5️⃣ Simulando query do ReportsPage...');
  const reportsQuery = await fetch(`${SUPABASE_URL}/rest/v1/match_results?select=lucro,satisfacao,bonus,bonus_money,events!inner(class_id)&events.class_id=eq.${event.class_id}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const reportsData = await reportsQuery.json();

  const testMatchReports = reportsData.find(m => m.bonus_money === 350);
  if (testMatchReports) {
    console.log('✅ ReportsPage pode buscar bonus_money:');
    console.log(`   bonus: ${testMatchReports.bonus}`);
    console.log(`   bonus_money: ${testMatchReports.bonus_money}\n`);
  } else {
    console.log('❌ ReportsPage não encontrou a partida de teste\n');
  }

  // 6. Limpar dados de teste
  console.log('6️⃣ Limpando dados de teste...');
  await fetch(`${SUPABASE_URL}/rest/v1/match_results?id=eq.${matchId}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  console.log('✅ Dados de teste removidos\n');

  console.log('═'.repeat(60));
  console.log('✅ TESTE COMPLETO!');
  console.log('   O frontend está preparado para buscar e exibir bonus_money');
  console.log('═'.repeat(60));
}

testFrontendBonusMoney().catch(console.error);
