const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

async function checkAllEvents() {
  console.log('🔍 Verificando TODOS os dados do banco\n');

  // Buscar TODOS os eventos (incluindo órfãos)
  const eventsRes = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc&limit=20`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const events = await eventsRes.json();

  console.log(`📅 Total de eventos no banco: ${events.length}\n`);

  // Buscar TODAS as turmas
  const classesRes = await fetch(`${SUPABASE_URL}/rest/v1/classes?select=*&order=created_at.desc&limit=20`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classes = await classesRes.json();

  console.log(`📚 Total de turmas no banco: ${classes.length}\n`);

  if (events.length > 0 || classes.length > 0) {
    console.log('❌ O banco NÃO está vazio!\n');

    if (classes.length > 0) {
      console.log('═'.repeat(60));
      console.log('TURMAS MAIS RECENTES:');
      console.log('═'.repeat(60));
      classes.slice(0, 5).forEach((c, i) => {
        console.log(`${i + 1}. ${c.description || c.code} (${c.code})`);
        console.log(`   ID: ${c.id}`);
        console.log(`   Criada em: ${c.created_at}`);
        console.log('');
      });
    }

    if (events.length > 0) {
      console.log('═'.repeat(60));
      console.log('EVENTOS MAIS RECENTES:');
      console.log('═'.repeat(60));
      events.slice(0, 10).forEach((e, i) => {
        console.log(`${i + 1}. ${e.name} (${e.code})`);
        console.log(`   ID: ${e.id}`);
        console.log(`   Class ID: ${e.class_id}`);
        console.log(`   Start: ${e.start_date}`);
        console.log(`   End: ${e.end_date}`);
        console.log(`   Criado em: ${e.created_at}`);
        console.log(`   Encontros no schedule: ${e.schedule?.length || 0}`);
        console.log('');
      });
    }
  } else {
    console.log('✅ O banco está realmente vazio (sem turmas e eventos)');
  }
}

checkAllEvents().catch(console.error);
