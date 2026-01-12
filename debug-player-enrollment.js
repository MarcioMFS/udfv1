// Debug: Verificar se jogador está inscrito na turma do evento
// node debug-player-enrollment.js

const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTgyNTYzNiwiZXhwIjoyMDQxNDAxNjM2fQ.t3_1C-v3kSsom1F1nqEbH2lOwiFN-4khYi83FqG-FPM';

const playerEmail = 'iuri@axies.com.br';
const eventCode = '423B78D0';

async function debug() {
  console.log('🔍 Verificando inscrição do jogador...\n');

  // 1. Buscar o evento
  console.log(`📅 Buscando evento: ${eventCode}`);
  const eventRes = await fetch(`${SUPABASE_URL}/rest/v1/events?code=eq.${eventCode}&select=id,code,class_id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const events = await eventRes.json();
  console.log('   Resposta:', events);

  if (!events || events.length === 0) {
    console.log('❌ Evento não encontrado!');
    return;
  }

  const event = events[0];
  console.log(`✅ Evento encontrado: ${event.id}`);
  console.log(`   Turma (class_id): ${event.class_id}\n`);

  // 2. Buscar o jogador
  console.log(`👤 Buscando jogador: ${playerEmail}`);
  const playerRes = await fetch(`${SUPABASE_URL}/rest/v1/players?email=eq.${encodeURIComponent(playerEmail)}&select=id,name,email`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const players = await playerRes.json();

  if (!players || players.length === 0) {
    console.log('❌ Jogador não encontrado!');
    return;
  }

  console.log(`✅ Jogador(es) encontrado(s): ${players.length}`);
  players.forEach((p, i) => {
    console.log(`   ${i+1}. ID: ${p.id}, Nome: ${p.name}`);
  });
  console.log();

  // 3. Verificar se está inscrito na turma
  for (const player of players) {
    console.log(`🔗 Verificando inscrição do player ${player.id} na turma ${event.class_id}`);
    const classPlayerRes = await fetch(
      `${SUPABASE_URL}/rest/v1/class_players?class_id=eq.${event.class_id}&player_id=eq.${player.id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    const classPlayers = await classPlayerRes.json();

    if (classPlayers && classPlayers.length > 0) {
      console.log(`✅ INSCRITO! Registro: ${classPlayers[0].id}\n`);
    } else {
      console.log(`❌ NÃO INSCRITO na turma!\n`);
    }
  }

  // 4. Mostrar todas as turmas onde o jogador está inscrito
  console.log('📚 Turmas onde o jogador está inscrito:');
  for (const player of players) {
    const allClassesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/class_players?player_id=eq.${player.id}&select=class_id,classes(code,name)`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    const allClasses = await allClassesRes.json();

    if (allClasses && allClasses.length > 0) {
      allClasses.forEach(cp => {
        console.log(`   - Turma: ${cp.classes?.code} (${cp.classes?.name})`);
      });
    } else {
      console.log('   Nenhuma turma encontrada');
    }
  }
}

debug().catch(console.error);
