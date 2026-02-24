const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada');
  console.log('Execute: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCalendarEvents() {
  console.log('🔍 Investigando problema do calendário de eventos...\n');

  // 1. Buscar o instrutor pelo email
  console.log('1️⃣ Buscando instrutor 00marciomendonca@gmail.com...');
  const { data: instructor, error: instructorError } = await supabase
    .from('instructors')
    .select('id, name, email')
    .eq('email', '00marciomendonca@gmail.com')
    .single();

  if (instructorError) {
    console.error('❌ Erro ao buscar instrutor:', instructorError);
    return;
  }

  console.log('✅ Instrutor encontrado:', instructor);
  console.log('');

  // 2. Buscar as turmas do instrutor
  console.log('2️⃣ Buscando turmas do instrutor...');
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, code, description')
    .eq('instructor_id', instructor.id);

  if (classesError) {
    console.error('❌ Erro ao buscar turmas:', classesError);
    return;
  }

  console.log(`✅ ${classes.length} turma(s) encontrada(s)`);
  classes.forEach(c => console.log(`   - ${c.code}: ${c.description || '(sem descrição)'}`));
  console.log('');

  // 3. Buscar TODOS os eventos para análise
  console.log('3️⃣ Buscando todos os eventos...');
  const { data: allEvents, error: allEventsError } = await supabase
    .from('events')
    .select('id, code, name, schedule, event_type, class_id, instructor_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (allEventsError) {
    console.error('❌ Erro ao buscar eventos:', allEventsError);
    return;
  }

  console.log(`✅ ${allEvents.length} eventos encontrados (últimos 20)\n`);

  // 4. Analisar o formato do schedule
  console.log('4️⃣ Analisando formato do schedule...\n');
  console.log('=' .repeat(80));

  let problemCount = 0;
  let correctCount = 0;

  for (const event of allEvents) {
    console.log(`\n📅 Evento: ${event.code} - ${event.name || '(sem nome)'}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Tipo: ${event.event_type}`);
    console.log(`   Schedule: ${JSON.stringify(event.schedule)}`);
    console.log(`   Schedule type: ${typeof event.schedule}`);

    if (!event.schedule) {
      console.log('   ⚠️  PROBLEMA: Schedule é null/undefined');
      problemCount++;
      continue;
    }

    if (!Array.isArray(event.schedule)) {
      console.log(`   ⚠️  PROBLEMA: Schedule não é array, é ${typeof event.schedule}`);
      problemCount++;
      continue;
    }

    if (event.schedule.length === 0) {
      console.log('   ⚠️  PROBLEMA: Schedule é array vazio');
      problemCount++;
      continue;
    }

    let eventHasProblems = false;

    for (let i = 0; i < event.schedule.length; i++) {
      const scheduleItem = event.schedule[i];
      console.log(`   📆 Schedule[${i}]:`, scheduleItem);

      // Verificar se tem os campos corretos
      const initialTime = scheduleItem['initial-time'] || scheduleItem['initialTime'] || scheduleItem.initialTime;
      const endTime = scheduleItem['end-time'] || scheduleItem['endTime'] || scheduleItem.endTime;

      if (!initialTime) {
        console.log(`      ❌ PROBLEMA: Campo 'initial-time' não encontrado`);
        console.log(`      Campos disponíveis: ${Object.keys(scheduleItem).join(', ')}`);
        eventHasProblems = true;
      } else {
        // Tentar parsear a data
        const date = new Date(initialTime);
        if (isNaN(date.getTime())) {
          console.log(`      ❌ PROBLEMA: Data inválida: "${initialTime}"`);
          eventHasProblems = true;
        } else {
          console.log(`      ✅ Data válida: ${date.toISOString()}`);
          console.log(`      📍 Formatada: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`);
        }
      }

      if (!endTime) {
        console.log(`      ⚠️  Campo 'end-time' não encontrado`);
      }
    }

    if (eventHasProblems) {
      problemCount++;
    } else {
      correctCount++;
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 RESUMO:');
  console.log(`   ✅ Eventos com schedule correto: ${correctCount}`);
  console.log(`   ❌ Eventos com problemas: ${problemCount}`);
  console.log(`   📅 Total analisado: ${allEvents.length}`);

  // 5. Verificar eventos das turmas do instrutor específico
  if (classes.length > 0) {
    console.log('\n\n5️⃣ Eventos das turmas do instrutor (00marciomendonca@gmail.com)...');

    for (const cls of classes) {
      console.log(`\n📚 Turma: ${cls.code}`);

      const { data: classEvents, error: classEventsError } = await supabase
        .from('events')
        .select('id, code, name, schedule, event_type')
        .eq('class_id', cls.id);

      if (classEventsError) {
        console.error(`   ❌ Erro:`, classEventsError);
        continue;
      }

      if (!classEvents || classEvents.length === 0) {
        console.log('   (nenhum evento vinculado)');
        continue;
      }

      console.log(`   ${classEvents.length} evento(s):`);

      for (const event of classEvents) {
        console.log(`   - ${event.code}: schedule = ${JSON.stringify(event.schedule)}`);

        if (event.schedule && Array.isArray(event.schedule) && event.schedule.length > 0) {
          const firstSchedule = event.schedule[0];
          const initialTime = firstSchedule['initial-time'];
          if (initialTime) {
            const date = new Date(initialTime);
            if (!isNaN(date.getTime())) {
              console.log(`     ✅ Primeira data: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`);
            } else {
              console.log(`     ❌ Data inválida: "${initialTime}"`);
            }
          } else {
            console.log(`     ❌ Campo 'initial-time' ausente. Campos: ${Object.keys(firstSchedule).join(', ')}`);
          }
        }
      }
    }
  }

  // 6. Verificar se existem eventos com datas placeholder
  console.log('\n\n6️⃣ Verificando padrões de datas problemáticas...');

  const { data: eventsRaw } = await supabase
    .from('events')
    .select('id, code, schedule')
    .not('schedule', 'is', null);

  const problematicPatterns = [];

  for (const event of (eventsRaw || [])) {
    const scheduleStr = JSON.stringify(event.schedule);

    // Verificar padrões problemáticos
    if (scheduleStr.includes('dd/mm/yyyy') ||
        scheduleStr.includes('dd-mm-yyyy') ||
        scheduleStr.includes('DD/MM/YYYY') ||
        scheduleStr.includes('1970-01-01') ||
        scheduleStr.includes('0000-00-00') ||
        scheduleStr.includes('null') ||
        scheduleStr.includes('undefined')) {
      problematicPatterns.push({
        code: event.code,
        schedule: event.schedule
      });
    }
  }

  if (problematicPatterns.length > 0) {
    console.log(`   ❌ ${problematicPatterns.length} evento(s) com padrões problemáticos:`);
    for (const p of problematicPatterns) {
      console.log(`   - ${p.code}: ${JSON.stringify(p.schedule)}`);
    }
  } else {
    console.log('   ✅ Nenhum padrão problemático encontrado nos dados brutos');
  }

  console.log('\n\n✅ Diagnóstico completo!');
}

testCalendarEvents().catch(console.error);
