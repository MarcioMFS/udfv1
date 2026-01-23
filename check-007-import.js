import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg2MjIwOSwiZXhwIjoyMDM1NDM4MjA5fQ.KTSWp_yMBFqVaopkWa4MqoSkDpVz1SmNuYwbDxuWi2I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check007Import() {
  console.log('🔍 Verificando importação da turma 007...\n')

  // Verificar se a turma existe
  const { data: turma, error: turmaError } = await supabase
    .from('classes')
    .select('*')
    .eq('code', '007')
    .single()

  if (turmaError) {
    console.log('❌ Turma 007 não encontrada no banco de dados')
    console.log('Erro:', turmaError.message)
    return
  }

  console.log('✅ Turma encontrada:')
  console.log('  ID:', turma.id)
  console.log('  Código:', turma.code)
  console.log('  Descrição:', turma.description)
  console.log('  Instrutor ID:', turma.instructor_id)
  console.log('  Criado em:', turma.created_at)
  console.log('')

  // Buscar instrutor
  if (turma.instructor_id) {
    const { data: instructor } = await supabase
      .from('instructors')
      .select('name, email')
      .eq('id', turma.instructor_id)
      .single()

    if (instructor) {
      console.log('👨‍🏫 Instrutor:', instructor.name, `(${instructor.email})`)
      console.log('')
    }
  }

  // Verificar alunos
  const { data: students, error: studentsError } = await supabase
    .from('players')
    .select('*')
    .eq('class_id', turma.id)

  if (studentsError) {
    console.log('❌ Erro ao buscar alunos:', studentsError.message)
    return
  }

  console.log(`👥 Total de alunos cadastrados: ${students.length}`)

  if (students.length === 0) {
    console.log('⚠️  PROBLEMA: Nenhum aluno foi cadastrado!')
    console.log('')
    console.log('Possíveis causas:')
    console.log('  1. A planilha não tinha a aba "Alunos"')
    console.log('  2. A aba estava vazia')
    console.log('  3. Houve erro durante a importação dos alunos')
    console.log('  4. Os alunos foram importados em outra turma')
  } else {
    console.log('\nAlunos cadastrados:')
    students.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (${s.email})`)
    })
  }

  console.log('')

  // Verificar eventos
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('class_id', turma.id)

  console.log(`📅 Total de eventos cadastrados: ${events?.length || 0}`)

  if (events && events.length > 0) {
    console.log('\nEventos cadastrados:')
    events.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.name || e.code} (${e.start_date})`)
    })
  }

  // Verificar se existem alunos com código 007 em outras turmas
  console.log('\n\n🔍 Verificando se há alunos em outras turmas...')
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, name, email, class_id, classes(code)')
    .limit(100)

  const playersInOtherClasses = allPlayers?.filter(p =>
    p.classes?.code && p.classes.code !== '007'
  )

  if (playersInOtherClasses && playersInOtherClasses.length > 0) {
    console.log(`\nEncontrados ${playersInOtherClasses.length} alunos em outras turmas:`)
    playersInOtherClasses.slice(0, 10).forEach(p => {
      console.log(`  - ${p.name} em turma ${p.classes.code}`)
    })
  }
}

check007Import().catch(console.error)
