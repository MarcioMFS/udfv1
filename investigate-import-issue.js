const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

async function investigateImportIssue() {
  console.log('🔍 Investigando problema de importação\n');

  // Buscar última turma criada (ordenar por created_at desc)
  const classesRes = await fetch(`${SUPABASE_URL}/rest/v1/classes?select=*&order=created_at.desc&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classes = await classesRes.json();

  if (!classes || classes.length === 0) {
    console.log('❌ Nenhuma turma encontrada');
    return;
  }

  const lastClass = classes[0];
  console.log('📚 Última turma criada:');
  console.log(`  ID: ${lastClass.id}`);
  console.log(`  Código: ${lastClass.code}`);
  console.log(`  Nome: ${lastClass.description}`);
  console.log(`  Criada em: ${lastClass.created_at}`);
  console.log('');

  // Buscar eventos dessa turma
  const eventsRes = await fetch(`${SUPABASE_URL}/rest/v1/events?class_id=eq.${lastClass.id}&select=*&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const events = await eventsRes.json();

  console.log(`📅 Eventos da turma: ${events.length}\n`);

  events.forEach((event, i) => {
    console.log(`Evento ${i + 1}:`);
    console.log(`  ID: ${event.id}`);
    console.log(`  Código: ${event.code}`);
    console.log(`  Nome: ${event.name}`);
    console.log(`  Start Date: ${event.start_date}`);
    console.log(`  End Date: ${event.end_date}`);
    console.log(`  Criado em: ${event.created_at}`);
    console.log(`  Schedule (${event.schedule?.length || 0} encontros):`);
    if (event.schedule) {
      event.schedule.forEach((s, j) => {
        console.log(`    ${j + 1}. ${s['initial-time']} até ${s['end-time']}`);
      });
    }
    console.log('');
  });

  // Verificar se há duplicação
  if (events.length > 1) {
    console.log('⚠️  PROBLEMA DETECTADO: Múltiplos eventos para a mesma turma!\n');

    // Verificar se são idênticos
    const codes = events.map(e => e.code);
    const uniqueCodes = new Set(codes);

    if (uniqueCodes.size < codes.length) {
      console.log('❌ Há códigos duplicados!');
    }

    // Verificar datas de criação
    console.log('Datas de criação:');
    events.forEach((e, i) => {
      const createdDate = new Date(e.created_at);
      console.log(`  Evento ${i + 1}: ${createdDate.toISOString()} (${createdDate.toLocaleString('pt-BR')})`);
    });
  }

  // Verificar problema de timezone nas datas
  console.log('\n═'.repeat(60));
  console.log('ANÁLISE DE TIMEZONE:');
  console.log('═'.repeat(60));

  const now = new Date();
  console.log(`Data/Hora Atual (UTC): ${now.toISOString()}`);
  console.log(`Data/Hora Atual (Local): ${now.toLocaleString('pt-BR')}`);
  console.log('');

  events.forEach((event, i) => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    console.log(`Evento ${i + 1}:`);
    console.log(`  Start Date String: ${event.start_date}`);
    console.log(`  Start Date Parsed (UTC): ${startDate.toISOString()}`);
    console.log(`  Start Date Parsed (Local): ${startDate.toLocaleString('pt-BR')}`);
    console.log(`  É no passado? ${startDate < now ? '⚠️  SIM (passado)' : '✅ NÃO (futuro)'}`);
    console.log('');
  });
}

investigateImportIssue().catch(console.error);
