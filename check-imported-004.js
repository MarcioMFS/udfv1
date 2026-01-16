const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

async function checkImported004() {
  console.log('🔍 Verificando importação da planilha 004\n');

  // Buscar eventos mais recentes
  const eventsRes = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc&limit=5`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const events = await eventsRes.json();

  if (!events || events.length === 0) {
    console.log('❌ Nenhum evento encontrado. A importação falhou?');
    return;
  }

  console.log(`📅 Eventos encontrados: ${events.length}\n`);

  const now = new Date();
  console.log(`⏰ Data/Hora Atual:`);
  console.log(`   UTC: ${now.toISOString()}`);
  console.log(`   Brasília: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log('');

  events.forEach((event, i) => {
    console.log(`═`.repeat(80));
    console.log(`EVENTO ${i + 1}: ${event.name}`);
    console.log(`═`.repeat(80));
    console.log(`ID: ${event.id}`);
    console.log(`Código: ${event.code}`);
    console.log(`Start Date: ${event.start_date}`);
    console.log(`End Date: ${event.end_date}`);
    console.log(`Criado em: ${event.created_at}`);
    console.log('');

    if (event.schedule && event.schedule.length > 0) {
      console.log(`📆 Schedule (${event.schedule.length} encontros):`);
      event.schedule.forEach((s, j) => {
        const initialTime = new Date(s['initial-time']);
        const endTime = new Date(s['end-time']);

        console.log(`\n  Encontro ${j + 1}:`);
        console.log(`    Início (timestamp): ${s['initial-time']}`);
        console.log(`    Início (UTC):       ${initialTime.toISOString()}`);
        console.log(`    Início (Brasília):  ${initialTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`    Fim (timestamp):    ${s['end-time']}`);
        console.log(`    Fim (UTC):          ${endTime.toISOString()}`);
        console.log(`    Fim (Brasília):     ${endTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

        // Verificar se está no passado
        const isFuture = endTime > now;
        console.log(`    Status: ${isFuture ? '✅ FUTURO' : '❌ PASSADO (FINALIZADO)'}`);
      });
    }
    console.log('');
  });
}

checkImported004().catch(console.error);
