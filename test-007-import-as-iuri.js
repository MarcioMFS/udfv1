import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg2MjIwOSwiZXhwIjoyMDM1NDM4MjA5fQ.KTSWp_yMBFqVaopkWa4MqoSkDpVz1SmNuYwbDxuWi2I'

const supabase = createClient(supabaseUrl, supabaseKey)

function generateEventCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function test007Import() {
  console.log('🧪 Testando importação da planilha 007 como Iuri...\n')

  // 1. Buscar o usuário Iuri
  const { data: iuriInstructor, error: iuriError } = await supabase
    .from('instructors')
    .select('id, name, email')
    .eq('email', 'iuri@axies.com.br')
    .single()

  if (iuriError || !iuriInstructor) {
    console.log('❌ Instrutor Iuri não encontrado')
    console.log('Erro:', iuriError?.message)
    return
  }

  console.log('✅ Instrutor encontrado:')
  console.log('  Nome:', iuriInstructor.name)
  console.log('  Email:', iuriInstructor.email)
  console.log('  ID:', iuriInstructor.id)
  console.log('')

  // 2. Ler a planilha 007
  console.log('📊 Lendo planilha 007_Turma_Piloto_Teste.xlsx...')
  const workbook = XLSX.readFile('007_Turma_Piloto_Teste.xlsx')

  // Processar aba Instrutor
  const instrutorSheet = workbook.Sheets['Instrutor']
  const instrutorData = XLSX.utils.sheet_to_json(instrutorSheet, { header: 1 })

  let className = String(instrutorData[0][0]).trim()
  const classCode = '007'

  console.log(`✅ Nome da turma: ${className}`)
  console.log(`✅ Código da turma: ${classCode}`)
  console.log('')

  // Processar aba Alunos
  const alunosSheet = workbook.Sheets['Alunos']
  const alunosData = XLSX.utils.sheet_to_json(alunosSheet, { header: 1 })

  console.log('👥 Processando alunos...')
  console.log('   Primeira linha (cabeçalho):', alunosData[0])

  const students = []
  // Começar da linha 1 (índice 1), pois linha 0 é cabeçalho
  for (let i = 1; i < alunosData.length; i++) {
    const row = alunosData[i]
    if (!row || row.length === 0) continue

    const name = String(row[0] || '').trim()
    const email = String(row[1] || '').trim()

    if (name && email && email.includes('@')) {
      students.push({ name, email })
      console.log(`   ✅ ${name} - ${email}`)
    }
  }

  console.log(`\n✅ Total de alunos encontrados: ${students.length}\n`)

  if (students.length === 0) {
    console.log('❌ Nenhum aluno foi processado!')
    return
  }

  // Processar aba Encontros
  const encontrosSheet = workbook.Sheets['Encontros']
  const encontrosData = XLSX.utils.sheet_to_json(encontrosSheet, { header: 1 })

  const events = []
  for (let i = 1; i < encontrosData.length; i++) {
    const row = encontrosData[i]
    if (!row || row.length === 0) continue

    const startDate = row[0]
    const endDate = row[1]
    const schedule = row[2]

    if (startDate) {
      events.push({ startDate, endDate, schedule })
    }
  }

  console.log(`✅ Total de eventos encontrados: ${events.length}\n`)

  // 3. Verificar se turma já existe
  console.log('🔍 Verificando se turma 007 já existe...')
  const { data: existingClass } = await supabase
    .from('classes')
    .select('id, code')
    .eq('code', classCode)
    .single()

  if (existingClass) {
    console.log(`⚠️  Turma ${classCode} já existe (ID: ${existingClass.id})`)
    console.log('   Vou verificar se tem alunos...\n')

    const { data: existingStudents } = await supabase
      .from('players')
      .select('id, name, email')
      .eq('class_id', existingClass.id)

    console.log(`   Alunos cadastrados: ${existingStudents?.length || 0}`)
    if (existingStudents && existingStudents.length > 0) {
      existingStudents.forEach(s => console.log(`     - ${s.name} (${s.email})`))
    }

    console.log('\n❓ Deseja continuar e tentar adicionar os alunos faltantes? (Simulação apenas)')
    console.log('   Como é um teste, vou apenas mostrar o que seria feito:\n')

    console.log('📋 AÇÕES QUE SERIAM EXECUTADAS:')
    console.log('   1. Verificar quais alunos já existem no banco')
    console.log('   2. Criar apenas os alunos que não existem')
    console.log('   3. Vincular todos os alunos à turma 007')

    return
  }

  // 4. Criar a turma
  console.log('🏫 Criando turma 007...')

  const { data: newClass, error: classError } = await supabase
    .from('classes')
    .insert({
      code: classCode,
      description: className,
      instructor_id: iuriInstructor.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (classError) {
    console.log('❌ Erro ao criar turma:', classError.message)
    return
  }

  console.log('✅ Turma criada com sucesso!')
  console.log('   ID:', newClass.id)
  console.log('')

  // 5. Criar ou buscar alunos
  console.log('👥 Criando alunos...')

  const createdStudents = []
  for (const student of students) {
    // Verificar se aluno já existe
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, name, email')
      .eq('email', student.email)
      .maybeSingle()

    if (existingPlayer) {
      console.log(`   ℹ️  Aluno já existe: ${student.name}`)

      // Atualizar class_id do aluno existente
      const { error: updateError } = await supabase
        .from('players')
        .update({ class_id: newClass.id })
        .eq('id', existingPlayer.id)

      if (!updateError) {
        createdStudents.push(existingPlayer)
        console.log(`      ✅ Vinculado à turma 007`)
      } else {
        console.log(`      ❌ Erro ao vincular: ${updateError.message}`)
      }
    } else {
      // Criar novo aluno
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          name: student.name,
          email: student.email,
          class_id: newClass.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (playerError) {
        console.log(`   ❌ Erro ao criar ${student.name}: ${playerError.message}`)
      } else {
        createdStudents.push(newPlayer)
        console.log(`   ✅ Criado: ${student.name}`)
      }
    }
  }

  console.log(`\n✅ Total de alunos processados: ${createdStudents.length}/${students.length}\n`)

  // 6. Criar eventos
  console.log('📅 Criando eventos...')

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const eventCode = generateEventCode()

    const { error: eventError } = await supabase
      .from('events')
      .insert({
        code: eventCode,
        name: `Encontro ${i + 1}`,
        class_id: newClass.id,
        instructor_id: iuriInstructor.id,
        start_date: new Date(event.startDate).toISOString(),
        end_date: new Date(event.endDate).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (eventError) {
      console.log(`   ❌ Erro ao criar evento ${i + 1}: ${eventError.message}`)
    } else {
      console.log(`   ✅ Evento ${i + 1} criado (${eventCode})`)
    }
  }

  console.log('\n✨ IMPORTAÇÃO CONCLUÍDA!\n')
  console.log('📊 RESUMO:')
  console.log(`   Turma: ${className} (${classCode})`)
  console.log(`   Instrutor: ${iuriInstructor.name}`)
  console.log(`   Alunos: ${createdStudents.length}`)
  console.log(`   Eventos: ${events.length}`)
}

test007Import().catch(console.error)
