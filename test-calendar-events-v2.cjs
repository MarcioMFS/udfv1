const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateRelationships() {
  console.log('🔍 Investigando relacionamentos entre turmas, eventos e instrutores...\n');

  // 1. Listar todas as turmas
  console.log('1️⃣ Todas as turmas no sistema:');
  const { data: allClasses, error: classesError } = await supabase
    .from('classes')
    .select('id, code, description, instructor_id')
    .order('created_at', { ascending: false })
    .limit(20);

  if (classesError) {
    console.error('❌ Erro:', classesError);
    return;
  }

  console.log(`   Total: ${allClasses.length} turmas`);
  for (const cls of allClasses) {
    console.log(`   - ${cls.code} (${cls.description || 'sem desc'}) → instructor_id: ${cls.instructor_id || 'NULL'}`);
  }
  console.log('');

  // 2. Listar todos os instrutores
  console.log('2️⃣ Todos os instrutores:');
  const { data: allInstructors, error: instructorsError } = await supabase
    .from('instructors')
    .select('id, name, email, is_admin')
    .order('created_at', { ascending: false });

  if (instructorsError) {
    console.error('❌ Erro:', instructorsError);
    return;
  }

  console.log(`   Total: ${allInstructors.length} instrutores`);
  for (const inst of allInstructors) {
    console.log(`   - ${inst.name} (${inst.email}) → ID: ${inst.id} ${inst.is_admin ? '[ADMIN]' : ''}`);
  }
  console.log('');

  // 3. Verificar eventos e suas turmas
  console.log('3️⃣ Eventos e suas turmas vinculadas:');
  const { data: allEvents, error: eventsError } = await supabase
    .from('events')
    .select('id, code, name, class_id, instructor_id')
    .order('created_at', { ascending: false })
    .limit(20);

  if (eventsError) {
    console.error('❌ Erro:', eventsError);
    return;
  }

  console.log(`   Total: ${allEvents.length} eventos`);
  for (const evt of allEvents) {
    console.log(`   - ${evt.code} (${evt.name}) → class_id: ${evt.class_id || 'NULL'}, instructor_id: ${evt.instructor_id || 'NULL'}`);
  }
  console.log('');

  // 4. Verificar turmas do instrutor específico (00marciomendonca@gmail.com)
  console.log('4️⃣ Turmas do instrutor 00marciomendonca@gmail.com:');
  const { data: instructor } = await supabase
    .from('instructors')
    .select('id')
    .eq('email', '00marciomendonca@gmail.com')
    .single();

  if (instructor) {
    const { data: instructorClasses } = await supabase
      .from('classes')
      .select('id, code, description')
      .eq('instructor_id', instructor.id);

    console.log(`   Turmas encontradas: ${instructorClasses?.length || 0}`);
    if (instructorClasses && instructorClasses.length > 0) {
      for (const cls of instructorClasses) {
        console.log(`   - ${cls.code}: ${cls.description}`);
      }
    } else {
      console.log('   ⚠️  NENHUMA TURMA VINCULADA A ESTE INSTRUTOR!');
    }

    // Verificar eventos deste instrutor
    console.log('\n5️⃣ Eventos deste instrutor:');
    const { data: instructorEvents } = await supabase
      .from('events')
      .select('id, code, name, class_id')
      .eq('instructor_id', instructor.id);

    console.log(`   Eventos encontrados: ${instructorEvents?.length || 0}`);
    if (instructorEvents && instructorEvents.length > 0) {
      for (const evt of instructorEvents) {
        console.log(`   - ${evt.code}: ${evt.name} → class_id: ${evt.class_id || 'NULL'}`);
      }
    } else {
      console.log('   ⚠️  NENHUM EVENTO VINCULADO A ESTE INSTRUTOR!');
    }
  }

  // 5. Verificar se há turmas SEM instructor_id
  console.log('\n6️⃣ Turmas sem instructor_id (órfãs):');
  const { data: orphanClasses } = await supabase
    .from('classes')
    .select('id, code, description')
    .is('instructor_id', null);

  console.log(`   Total: ${orphanClasses?.length || 0}`);
  if (orphanClasses && orphanClasses.length > 0) {
    for (const cls of orphanClasses) {
      console.log(`   - ${cls.code}: ${cls.description}`);
    }
  }

  // 6. Verificar eventos SEM class_id
  console.log('\n7️⃣ Eventos sem class_id:');
  const { data: eventsNoClass } = await supabase
    .from('events')
    .select('id, code, name, instructor_id')
    .is('class_id', null);

  console.log(`   Total: ${eventsNoClass?.length || 0}`);
  if (eventsNoClass && eventsNoClass.length > 0) {
    for (const evt of eventsNoClass) {
      console.log(`   - ${evt.code}: ${evt.name}`);
    }
  }

  console.log('\n✅ Investigação completa!');
}

investigateRelationships().catch(console.error);
