import { createClient } from '@supabase/supabase-js';
import { parseISO, isBefore, isAfter, isWithinInterval } from 'date-fns';

// Credenciais do Supabase (passar via argumentos ou env vars)
const SUPABASE_URL = process.env.SUPABASE_URL || process.argv[2];
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.argv[3];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Uso: node test-class-status.js <SUPABASE_URL> <SUPABASE_KEY>');
  console.error('   ou: SUPABASE_URL=... SUPABASE_KEY=... node test-class-status.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função para calcular status baseado em start_date e end_date
function getClassStatusFromDates(startDate, endDate) {
  if (!startDate || !endDate) {
    return { color: 'gray', label: 'Indefinido' };
  }

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return { color: 'blue', label: 'Agendada' };
  }

  if (now > end) {
    return { color: 'red', label: 'Finalizada' };
  }

  return { color: 'green', label: 'Ativa' };
}

// Função para calcular status baseado nos eventos
function getClassStatusFromEvents(events) {
  const now = new Date();

  const eventsWithDates = events.filter(event =>
    event.schedule && Array.isArray(event.schedule) && event.schedule.length > 0
  );

  if (eventsWithDates.length === 0) {
    return { color: 'orange', label: 'Sem eventos', status: 'no_events' };
  }

  // Flatten all schedules
  const allSchedules = eventsWithDates.flatMap(event =>
    event.schedule.map(schedule => ({
      event,
      schedule,
      startDate: parseISO(schedule['initial-time']),
      endDate: parseISO(schedule['end-time'])
    }))
  ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  // Find active event (happening now)
  const activeSchedule = allSchedules.find(({ startDate, endDate }) =>
    isWithinInterval(now, { start: startDate, end: endDate })
  );

  // Find next event (future)
  const nextSchedule = allSchedules.find(({ startDate }) =>
    isAfter(startDate, now)
  );

  // Find last completed event
  const completedSchedules = allSchedules.filter(({ endDate }) =>
    isBefore(endDate, now)
  );
  const lastSchedule = completedSchedules[completedSchedules.length - 1];

  if (activeSchedule) {
    return {
      color: 'green',
      label: 'Ativa (evento em andamento)',
      status: 'active',
      details: `Evento: ${activeSchedule.event.name}`
    };
  } else if (nextSchedule) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(nextSchedule.startDate.getFullYear(), nextSchedule.startDate.getMonth(), nextSchedule.startDate.getDate());
    const daysUntil = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      color: 'blue',
      label: 'Agendada (próximo evento)',
      status: 'upcoming',
      details: `Próximo em ${daysUntil} dias`
    };
  } else if (lastSchedule) {
    return {
      color: 'red',
      label: 'Finalizada (eventos concluídos)',
      status: 'completed',
      details: `Último: ${lastSchedule.event.name}`
    };
  }

  return { color: 'gray', label: 'Indefinido', status: 'unknown' };
}

async function analyzeClassStatuses() {
  console.log('🔍 Analisando status das turmas...\n');

  // Buscar todas as turmas
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('*')
    .order('code');

  if (classesError) {
    console.error('❌ Erro ao buscar turmas:', classesError);
    return;
  }

  console.log(`📊 Total de turmas encontradas: ${classes.length}\n`);

  let inconsistencies = [];

  for (const classData of classes) {
    // Buscar eventos da turma
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        code,
        subject,
        start_date,
        end_date
      `)
      .eq('code', classData.code);

    if (eventsError) {
      console.error(`❌ Erro ao buscar eventos da turma ${classData.code}:`, eventsError);
      continue;
    }

    // Calcular status baseado nas datas da turma
    const statusFromDates = getClassStatusFromDates(classData.start_date, classData.end_date);

    // Para calcular status dos eventos, precisamos dos schedules
    // Vamos buscar os eventos com schedules completos
    const eventsWithSchedules = [];
    if (events && events.length > 0) {
      for (const event of events) {
        const { data: eventDetail, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id)
          .single();

        if (!eventError && eventDetail) {
          eventsWithSchedules.push(eventDetail);
        }
      }
    }

    const statusFromEvents = getClassStatusFromEvents(eventsWithSchedules);

    // Verificar inconsistências
    const isInconsistent = statusFromDates.label !== statusFromEvents.label;

    console.log(`\n📌 Turma: ${classData.code} - ${classData.description || 'Sem descrição'}`);
    console.log(`   Start Date: ${classData.start_date || 'N/A'}`);
    console.log(`   End Date: ${classData.end_date || 'N/A'}`);
    console.log(`   Eventos: ${eventsWithSchedules.length}`);
    console.log(`
   Status baseado nas datas da turma: ${statusFromDates.label} (${statusFromDates.color})
   Status baseado nos eventos: ${statusFromEvents.label} (${statusFromEvents.color})`);

    if (statusFromEvents.details) {
      console.log(`   Detalhes: ${statusFromEvents.details}`);
    }

    if (isInconsistent) {
      console.log(`   ⚠️  INCONSISTÊNCIA DETECTADA!`);
      inconsistencies.push({
        code: classData.code,
        description: classData.description,
        startDate: classData.start_date,
        endDate: classData.end_date,
        statusFromDates: statusFromDates.label,
        statusFromEvents: statusFromEvents.label,
        eventsCount: eventsWithSchedules.length
      });
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMO DAS INCONSISTÊNCIAS');
  console.log('='.repeat(80));

  if (inconsistencies.length === 0) {
    console.log('✅ Nenhuma inconsistência encontrada! Todos os status estão corretos.');
  } else {
    console.log(`\n⚠️  Total de inconsistências: ${inconsistencies.length}\n`);

    inconsistencies.forEach((inc, index) => {
      console.log(`${index + 1}. Turma ${inc.code} (${inc.description || 'Sem descrição'})`);
      console.log(`   Datas: ${inc.startDate || 'N/A'} até ${inc.endDate || 'N/A'}`);
      console.log(`   Status pelas datas: ${inc.statusFromDates}`);
      console.log(`   Status pelos eventos (${inc.eventsCount}): ${inc.statusFromEvents}`);
      console.log('');
    });

    console.log('\n💡 RECOMENDAÇÃO:');
    console.log('   Os status das turmas devem ser calculados baseados nos EVENTOS,');
    console.log('   não apenas nas datas start_date e end_date da tabela classes.');
    console.log('   Considere atualizar a lógica de cálculo de status.');
  }

  console.log('\n' + '='.repeat(80));
}

// Executar análise
analyzeClassStatuses().catch(console.error);
