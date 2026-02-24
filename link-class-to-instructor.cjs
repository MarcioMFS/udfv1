const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function linkClassToInstructor() {
  console.log('🔗 Vinculando turma Test_Dash_7 à conta 00marciomendonca@gmail.com...\n');

  // IDs conhecidos
  const marcioId = '44dc8452-e0f9-424a-80ab-9f5c761f2a63';

  // Buscar a turma Test_Dash_7
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, code, description, instructor_id')
    .eq('code', 'T1240T30')
    .single();

  if (classError || !classData) {
    console.error('❌ Erro ao buscar turma:', classError);
    return;
  }

  console.log('📋 Turma encontrada:', classData);
  console.log(`   Instructor atual: ${classData.instructor_id}`);

  // Atualizar o instructor_id da turma
  const { error: updateError } = await supabase
    .from('classes')
    .update({ instructor_id: marcioId })
    .eq('id', classData.id);

  if (updateError) {
    console.error('❌ Erro ao atualizar turma:', updateError);
    return;
  }

  console.log('✅ Turma vinculada com sucesso!');

  // Buscar os eventos dessa turma e atualizar o instructor_id
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, code, name, instructor_id')
    .eq('class_id', classData.id);

  if (eventsError) {
    console.error('⚠️  Erro ao buscar eventos:', eventsError);
  } else if (events && events.length > 0) {
    console.log(`\n📅 Encontrados ${events.length} eventos para atualizar:`);

    for (const event of events) {
      console.log(`   - ${event.code}: ${event.name}`);

      const { error: eventUpdateError } = await supabase
        .from('events')
        .update({ instructor_id: marcioId })
        .eq('id', event.id);

      if (eventUpdateError) {
        console.error(`     ❌ Erro ao atualizar evento ${event.code}:`, eventUpdateError);
      } else {
        console.log(`     ✅ Atualizado!`);
      }
    }
  }

  // Verificar resultado
  console.log('\n📊 Verificando resultado...');

  const { data: newClasses } = await supabase
    .from('classes')
    .select('id, code, description')
    .eq('instructor_id', marcioId);

  console.log(`\nTurmas de 00marciomendonca@gmail.com: ${newClasses?.length || 0}`);
  if (newClasses && newClasses.length > 0) {
    for (const cls of newClasses) {
      console.log(`   ✅ ${cls.code}: ${cls.description}`);
    }
  }

  const { data: newEvents } = await supabase
    .from('events')
    .select('id, code, name, schedule')
    .eq('instructor_id', marcioId);

  console.log(`\nEventos de 00marciomendonca@gmail.com: ${newEvents?.length || 0}`);
  if (newEvents && newEvents.length > 0) {
    for (const evt of newEvents) {
      const scheduleCount = evt.schedule?.length || 0;
      console.log(`   ✅ ${evt.code}: ${evt.name} (${scheduleCount} encontros no schedule)`);
    }
  }

  console.log('\n✅ Processo concluído! Agora você pode testar o calendário.');
}

linkClassToInstructor().catch(console.error);
