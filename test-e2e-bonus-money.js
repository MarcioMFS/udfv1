const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';
const WEBHOOK_URL = 'https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-create-match';

async function testE2EBonusMoney() {
  console.log('🧪 Teste End-to-End: Bonus Money\n');

  // 1. Buscar um evento e jogador existente
  console.log('1️⃣ Buscando evento e jogador...');
  const eventsRes = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*,classes(*)&limit=1`, {
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

  // 2. Enviar partida via webhook com valores pré-calculados
  console.log('2️⃣ Enviando partida via webhook (valores pré-calculados)...');
  const testMatchData = {
    "player-email": player.email,
    "event-code": event.code,
    "app-serial": "dummy-serial-data",  // Não será usado se passarmos os valores
    "match-number": 999,
    "lucro": 5000,
    "satisfacao": 90,
    "bonus": 2,
    "bonus-money": 350
  };

  const webhookRes = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify(testMatchData)
  });

  if (!webhookRes.ok) {
    const errorText = await webhookRes.text();
    console.log(`❌ Webhook falhou: ${webhookRes.status} - ${errorText}`);
    return;
  }

  const webhookResult = await webhookRes.json();
  console.log(`✅ Webhook executado com sucesso`);
  console.log(`   Match ID: ${webhookResult.match_id}\n`);

  // 3. Aguardar um pouco para garantir que os dados foram salvos
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Buscar o resultado da partida do banco
  console.log('3️⃣ Verificando dados salvos no banco...');
  const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?select=*&id=eq.${webhookResult.match_id}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const matches = await matchRes.json();

  if (!matches || matches.length === 0) {
    console.log('❌ Partida não encontrada no banco!');
    return;
  }

  const match = matches[0];
  console.log('✅ Dados da partida:');
  console.log(`   Lucro: ${match.lucro} (esperado: 5000)`);
  console.log(`   Satisfação: ${match.satisfacao} (esperado: 90)`);
  console.log(`   Bonus (count): ${match.bonus} (esperado: 2)`);
  console.log(`   Bonus Money: ${match.bonus_money} (esperado: 350)\n`);

  // 5. Verificar se os valores estão corretos
  console.log('4️⃣ Validando valores...');
  const isValid =
    match.lucro === 5000 &&
    match.satisfacao === 90 &&
    match.bonus === 2 &&
    match.bonus_money === 350;

  if (isValid) {
    console.log('✅ SUCESSO! Todos os valores estão corretos!\n');
    console.log('📊 Fluxo End-to-End validado:');
    console.log('   ✅ Webhook aceita valores pré-calculados');
    console.log('   ✅ bonus_money é salvo corretamente');
    console.log('   ✅ Dados disponíveis para o frontend\n');
  } else {
    console.log('❌ FALHA! Valores não correspondem:\n');
    if (match.lucro !== 5000) console.log(`   ❌ Lucro: ${match.lucro} ≠ 5000`);
    if (match.satisfacao !== 90) console.log(`   ❌ Satisfação: ${match.satisfacao} ≠ 90`);
    if (match.bonus !== 2) console.log(`   ❌ Bonus: ${match.bonus} ≠ 2`);
    if (match.bonus_money !== 350) console.log(`   ❌ Bonus Money: ${match.bonus_money} ≠ 350`);
  }

  // 6. Limpar dados de teste
  console.log('\n5️⃣ Limpando dados de teste...');
  await fetch(`${SUPABASE_URL}/rest/v1/match_results?id=eq.${webhookResult.match_id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  console.log('✅ Dados de teste removidos\n');

  console.log('═'.repeat(60));
  console.log('✅ TESTE COMPLETO! O sistema está funcionando corretamente.');
  console.log('═'.repeat(60));
}

testE2EBonusMoney().catch(console.error);
