import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import type { ExcelClassImport, ExcelStudentImport, ExcelEventImport, ClassImportResult, ClassImportPreview } from '../types'

interface ProcessedExcelData {
  classInfo: ExcelClassImport | null
  students: ExcelStudentImport[]
  events: ExcelEventImport[]
}

// Removed: generateEventCode() - now using deterministic codes based on class_id

/**
 * Lê o arquivo Excel e extrai os dados das 3 abas: Instrutor, Alunos e Encontros
 */
export async function readExcelFile(file: File): Promise<ProcessedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // Processar aba "Instrutor" (primeira aba ou aba com nome específico)
        const classInfo = processInstructorSheet(workbook)

        // Processar aba "Alunos"
        const students = processStudentsSheet(workbook)

        // Processar aba "Encontros"
        const events = processEventsSheet(workbook)

        resolve({ classInfo, students, events })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsBinaryString(file)
  })
}

/**
 * Processa a aba "Instrutor" para extrair informações da turma
 * Formato esperado:
 * Linha 1: [Nome da Turma]
 * Linha 2: ["Instrutor", "Email"]
 * Linha 3: ["Nome do Instrutor", "email@exemplo.com"]
 */
function processInstructorSheet(workbook: XLSX.WorkBook): ExcelClassImport | null {
  // Tentar encontrar aba por nome
  let sheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('instrutor') || name.toLowerCase().includes('turma')
  )

  // Se não encontrar, usar primeira aba
  if (!sheetName) {
    sheetName = workbook.SheetNames[0]
  }

  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

  let className = ''
  let instructorName = ''
  let instructorEmail = ''

  console.log('Dados da aba Instrutor:', data.slice(0, 5))

  // Linha 1: Nome da turma (coluna A ou primeira coluna com valor)
  if (data[0]) {
    for (const cell of data[0]) {
      if (cell && String(cell).trim()) {
        className = String(cell).trim()
        break
      }
    }
  }

  // Procurar linha com cabeçalho "Instrutor" e "Email"
  for (let i = 1; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row) continue

    // Verificar se é linha de cabeçalho
    const hasInstructor = row.some(cell =>
      cell && String(cell).toLowerCase().includes('instrutor')
    )
    const hasEmail = row.some(cell =>
      cell && String(cell).toLowerCase().includes('email')
    )

    if (hasInstructor && hasEmail) {
      // Próxima linha tem os dados
      const nextRow = data[i + 1]
      if (nextRow) {
        // Percorrer células procurando nome e email
        for (let col = 0; col < nextRow.length; col++) {
          const cellValue = String(nextRow[col] || '').trim()

          if (!cellValue) continue

          if (cellValue.includes('@')) {
            instructorEmail = cellValue
          } else if (!instructorName && cellValue.length > 2) {
            instructorName = cellValue
          }
        }
      }
      break
    }
  }

  console.log('Dados extraídos:', { className, instructorName, instructorEmail })

  const classCode = generateClassCode(className)

  // Validar que o código tem exatamente 8 caracteres
  if (classCode.length !== 8) {
    console.error('Código da turma deve ter exatamente 8 caracteres:', { classCode, length: classCode.length })
    return null
  }

  if (!className || !instructorEmail) {
    console.error('Dados incompletos:', { className, instructorEmail })
    return null
  }

  return {
    classCode,
    className,
    instructorName,
    instructorEmail
  }
}

/**
 * Processa a aba "Alunos" para extrair lista de alunos
 * Formato esperado:
 * Linha 1: [Título da tabela]
 * Linha 2: [vazio, "Nome", "Email"]
 * Linha 3+: [número, "Nome do Aluno", "email@exemplo.com"]
 */
function processStudentsSheet(workbook: XLSX.WorkBook): ExcelStudentImport[] {
  // Tentar encontrar aba por nome
  let sheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('aluno') || name.toLowerCase().includes('tabela')
  )

  // Se não encontrar, usar terceira aba (Instrutor, Encontros, Alunos)
  if (!sheetName && workbook.SheetNames.length >= 3) {
    sheetName = workbook.SheetNames[2]
  }

  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

  const students: ExcelStudentImport[] = []
  let headerRowIndex = -1

  console.log('Dados da aba Alunos:', data.slice(0, 7))

  // Encontrar linha de cabeçalho (procurar por "Nome" e "Email")
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i]
    if (!row) continue

    const hasNome = row.some(cell => cell && String(cell).toLowerCase().includes('nome'))
    const hasEmail = row.some(cell => cell && String(cell).toLowerCase().includes('email'))

    if (hasNome && hasEmail) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    console.error('Cabeçalho de alunos não encontrado')
    return []
  }

  // Processar linhas após cabeçalho
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    let name = ''
    let email = ''

    // Percorrer todas as células procurando nome e email
    for (let col = 0; col < row.length; col++) {
      const cellValue = String(row[col] || '').trim()

      if (!cellValue) continue

      // Se contém @, é email
      if (cellValue.includes('@')) {
        email = cellValue
      }
      // Se não é número e não é email, é nome
      else if (!email && cellValue.length > 2 && isNaN(Number(cellValue))) {
        name = cellValue
      }
    }

    if (name && email) {
      students.push({ name, email })
    }
  }

  console.log(`Alunos encontrados: ${students.length}`)
  return students
}

/**
 * Processa a aba "Encontros" para extrair eventos/aulas
 * Formato esperado:
 * Linha 1: [Título]
 * Linha 2: [vazio, "Inicio", "Fim", "Horario"]
 * Linha 3+: ["E1", "2025-11-21 00:00:00", "2025-11-21 00:00:00", "8 as 12"]
 */
function processEventsSheet(workbook: XLSX.WorkBook): ExcelEventImport[] {
  // Tentar encontrar aba por nome
  let sheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('encontro') || name.toLowerCase().includes('evento')
  )

  // Se não encontrar, usar segunda aba
  if (!sheetName && workbook.SheetNames.length >= 2) {
    sheetName = workbook.SheetNames[1]
  }

  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

  const events: ExcelEventImport[] = []
  let headerRowIndex = -1

  console.log('Dados da aba Encontros:', data.slice(0, 9))

  // Encontrar linha de cabeçalho
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i]
    if (!row) continue

    const hasInicio = row.some(cell => cell && String(cell).toLowerCase().includes('inicio'))
    const hasFim = row.some(cell => cell && String(cell).toLowerCase().includes('fim'))
    const hasHorario = row.some(cell => cell && String(cell).toLowerCase().includes('horario'))

    if (hasInicio || (hasFim && hasHorario)) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    console.error('Cabeçalho de encontros não encontrado')
    return []
  }

  // Processar linhas após cabeçalho
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue

    // Colunas: [inicio, fim, horario]
    const startDate = parseExcelDate(row[0])
    const endDate = parseExcelDate(row[1])
    const schedule = row[2] ? String(row[2]).trim() : ''

    if (startDate && schedule) {
      events.push({
        startDate,
        endDate: endDate || startDate,
        schedule
      })
    }
  }

  console.log(`Eventos encontrados: ${events.length}`)
  return events
}

/**
 * Converte data do Excel para formato ISO (YYYY-MM-DD)
 */
function parseExcelDate(value: any): string | null {
  if (!value) return null

  // Se for string que já está no formato "YYYY-MM-DD HH:MM:SS" ou "YYYY-MM-DD"
  if (typeof value === 'string') {
    // Extrair apenas a parte da data
    const dateMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
    }

    // Formato dd/mm ou dd/mm/yyyy
    const slashMatch = value.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
    if (slashMatch) {
      const day = slashMatch[1].padStart(2, '0')
      const month = slashMatch[2].padStart(2, '0')
      const year = slashMatch[3] ? (slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3]) : new Date().getFullYear()
      return `${year}-${month}-${day}`
    }
  }

  // Se for número (data serial do Excel)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  // Se for objeto Date do JavaScript
  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * Gera código único para a turma baseado no nome com EXATAMENTE 8 caracteres
 * IMPORTANTE: Não gera aleatório para evitar duplicações!
 * GARANTIA: Sempre retorna string com exatamente 8 caracteres alfanuméricos
 */
function generateClassCode(className: string): string {
  // 1. Tentar extrair código existente no formato T000XXXX (T + 3 dígitos + 4 caracteres)
  const t000Match = className.match(/T\d{3}[A-Z0-9]{4}/i)
  if (t000Match) {
    const code = t000Match[0].toUpperCase()
    console.log('Código extraído (T000):', code, '- Length:', code.length)
    return code // Já tem 8 caracteres garantidos pelo regex
  }

  // 2. Tentar extrair qualquer código de exatamente 8 caracteres alfanuméricos
  const codeMatch = className.match(/\b[A-Z0-9]{8}\b/i)
  if (codeMatch) {
    const code = codeMatch[0].toUpperCase()
    console.log('Código extraído (8 chars):', code, '- Length:', code.length)
    return code // Já tem 8 caracteres garantidos pelo regex
  }

  // 3. Criar código baseado no nome da turma (DETERMINÍSTICO)
  // Remove caracteres especiais e pega primeiras letras/palavras
  const words = className
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)

  let code = ''

  if (words.length === 0) {
    // Fallback: usar apenas hash do nome completo (garantir 8 chars)
    const hash = simpleHash(className)
    code = hash.padEnd(8, '0').substring(0, 8)
    console.log('Código gerado (hash):', code, '- Length:', code.length)
    return code.toUpperCase()
  }

  // Estratégia: Iniciais (até 3 chars) + Hash (5 chars) = 8 chars exatos
  // Pegar primeiras letras de cada palavra (máximo 3)
  for (let i = 0; i < Math.min(words.length, 3); i++) {
    code += words[i][0]
  }

  // Gerar hash determinístico e pegar caracteres necessários
  const hash = simpleHash(className)
  const remainingChars = 8 - code.length

  // Adicionar hash para completar 8 caracteres
  code += hash.padEnd(remainingChars, '0').substring(0, remainingChars)

  // Garantir que tem exatamente 8 caracteres
  const finalCode = code.toUpperCase().padEnd(8, '0').substring(0, 8)

  console.log('Código gerado (determinístico):', {
    input: className,
    words: words.join(','),
    initials: code.substring(0, Math.min(words.length, 3)),
    hash: hash.substring(0, 5),
    finalCode: finalCode,
    length: finalCode.length
  })

  // Validação final: DEVE ter exatamente 8 caracteres
  if (finalCode.length !== 8) {
    console.error('ERRO: Código não tem 8 caracteres!', { finalCode, length: finalCode.length })
    // Fallback de emergência: hash do nome todo
    return simpleHash(className).padEnd(8, '0').substring(0, 8).toUpperCase()
  }

  return finalCode
}

/**
 * Hash simples para gerar código determinístico
 * Retorna string base36 (0-9, A-Z) de tamanho variável
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Base36 sempre retorna string, mas tamanho varia
  // Garantir que tenha pelo menos 8 caracteres
  return Math.abs(hash).toString(36).toUpperCase().padEnd(8, '0')
}

/**
 * Converte horário "8 as 12" para formato de schedule com data ISO completa
 * IMPORTANTE: Cria timestamps no timezone local (Brasília GMT-3)
 */
function parseSchedule(scheduleStr: string, eventDate: string): { 'initial-time': string; 'end-time': string } | null {
  // Formatos aceitos: "8 as 12", "14 as 18", "08:00 às 12:00"
  const match = scheduleStr.match(/(\d+)(?::(\d+))?\s*(?:as|às|a)\s*(\d+)(?::(\d+))?/)

  if (match) {
    const startHour = match[1].padStart(2, '0')
    const startMin = (match[2] || '00').padStart(2, '0')
    const endHour = match[3].padStart(2, '0')
    const endMin = (match[4] || '00').padStart(2, '0')

    // Criar Date object no timezone local e converter para ISO
    // Isso garante que a data seja interpretada no timezone de Brasília
    const [year, month, day] = eventDate.split('-').map(Number)

    const startDate = new Date(year, month - 1, day, parseInt(startHour), parseInt(startMin), 0)
    const endDate = new Date(year, month - 1, day, parseInt(endHour), parseInt(endMin), 0)

    return {
      'initial-time': startDate.toISOString(),
      'end-time': endDate.toISOString()
    }
  }

  return null
}

/**
 * Verifica se a turma já existe e retorna preview dos dados a serem importados
 */
export async function previewClassImport(
  classInfo: ExcelClassImport,
  students: ExcelStudentImport[],
  events: ExcelEventImport[],
  loggedInUserId?: string
): Promise<ClassImportPreview> {
  try {
    // ✅ FIXED: Determinar qual instrutor será usado (mesmo lógica do import)
    let instructorId: string | null = null

    if (loggedInUserId) {
      // Se temos o ID do usuário logado, usar ele
      instructorId = loggedInUserId
      console.log('[PREVIEW] Usando usuário logado:', instructorId)
    } else {
      // Se não, buscar instrutor por email da planilha
      console.log('[PREVIEW] Buscando instrutor por email:', classInfo.instructorEmail)
      const { data: instructorData } = await supabase
        .from('instructors')
        .select('id')
        .eq('email', classInfo.instructorEmail)
        .maybeSingle()

      instructorId = instructorData?.id || null
      console.log('[PREVIEW] Instrutor encontrado:', instructorId)
    }

    // ✅ FIXED: Verificar se turma já existe ESCOPADA por (code, instructor_id)
    let existingClass = null
    let error = null

    if (instructorId) {
      const result = await supabase
        .from('classes')
        .select('id, code, description, instructor_id')
        .eq('code', classInfo.classCode)
        .eq('instructor_id', instructorId)  // ✅ ADDED: Scoping by instructor
        .maybeSingle()

      existingClass = result.data
      error = result.error

      console.log('[PREVIEW] Turma existente para este instrutor:', existingClass ? 'SIM' : 'NÃO')
    } else {
      console.log('[PREVIEW] Instrutor não encontrado, turma será criada como nova')
    }

    if (error) {
      console.error('Erro ao verificar turma existente:', error)
    }

    let existingClassInfo
    if (existingClass) {
      // Contar alunos existentes
      const { count: studentsCount } = await supabase
        .from('class_players')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', existingClass.id)

      // Contar eventos existentes
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', existingClass.id)

      existingClassInfo = {
        id: existingClass.id,
        description: existingClass.description || existingClass.code,
        studentsCount: studentsCount || 0,
        eventsCount: eventsCount || 0
      }
    }

    return {
      classExists: !!existingClass,
      classCode: classInfo.classCode,
      className: classInfo.className,
      instructorName: classInfo.instructorName,
      instructorEmail: classInfo.instructorEmail,
      studentsCount: students.length,
      eventsCount: events.length,
      existingClass: existingClassInfo
    }
  } catch (error) {
    console.error('Erro ao fazer preview:', error)
    throw error
  }
}

/**
 * Importa a turma completa para o Supabase
 */
export async function importClassFromExcel(
  classInfo: ExcelClassImport,
  students: ExcelStudentImport[],
  events: ExcelEventImport[],
  loggedInUserId?: string
): Promise<ClassImportResult> {
  console.log('🚀 INICIANDO IMPORTAÇÃO')
  console.log('📋 Turma:', classInfo.className, `(${classInfo.classCode})`)
  console.log('👥 Alunos para importar:', students.length)
  console.log('📅 Eventos para importar:', events.length)
  console.log('👨‍🏫 Email do instrutor da planilha:', classInfo.instructorEmail)
  console.log('👤 ID do usuário logado:', loggedInUserId)

  const errors: string[] = []
  let classId: string | undefined
  let studentsImported = 0
  let eventsImported = 0

  try {
    // 1. Determinar qual instrutor usar
    let instructorId: string

    if (loggedInUserId) {
      // Se temos o ID do usuário logado, usar ele
      console.log('✅ Usando usuário logado como instrutor da turma')
      instructorId = loggedInUserId
    } else {
      // Se não, buscar instrutor por email da planilha (comportamento antigo)
      console.log('🔍 Buscando instrutor por email:', classInfo.instructorEmail)
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructors')
        .select('id, name, email')
        .eq('email', classInfo.instructorEmail)
        .limit(1)

      if (instructorError || !instructorData || instructorData.length === 0) {
        const errorMsg = `Instrutor com email ${classInfo.instructorEmail} não encontrado. Erro: ${instructorError?.message || 'Nenhum instrutor encontrado'}`
        console.error('❌', errorMsg)
        errors.push(errorMsg)
        return { success: false, studentsImported: 0, eventsImported: 0, errors }
      }

      // Pegar o primeiro instrutor (caso haja duplicados)
      const instructor = Array.isArray(instructorData) ? instructorData[0] : instructorData
      instructorId = instructor.id

      console.log('✅ Instrutor encontrado!')
      console.log('   Nome:', instructor.name)
      console.log('   Email:', instructor.email)
      console.log('   ID:', instructorId)
    }

    // 2. Criar turma (SCOPED by instructor_id)
    console.log('🏫 Criando/atualizando turma...')
    console.log(`   📌 Escopo: código="${classInfo.classCode}" + instructor_id="${instructorId}"`)

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .upsert({
        code: classInfo.classCode,
        description: classInfo.className,
        instructor_id: instructorId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'code,instructor_id'  // ✅ FIXED: Composite key scoping
      })
      .select()
      .single()

    if (classError || !classData) {
      errors.push(`Erro ao criar turma: ${classError?.message}`)
      return { success: false, studentsImported: 0, eventsImported: 0, errors }
    }

    classId = classData.id
    console.log(`✅ Turma criada/atualizada com sucesso: ${classInfo.classCode} (ID: ${classId})`)
    console.log(`   🔒 Esta turma pertence ao instrutor: ${instructorId}`)
    console.log(`📋 Iniciando importação de ${students.length} alunos...`)

    // 3. Importar alunos
    for (const student of students) {
      try {
        let playerId: string | undefined

        // Primeiro, buscar se o aluno já existe por EMAIL
        const { data: existingPlayer, error: searchError } = await supabase
          .from('players')
          .select('id, name, email, udf_id')
          .eq('email', student.email)
          .maybeSingle()

        if (searchError) {
          console.error(`Erro ao buscar aluno ${student.email}:`, searchError)
          errors.push(`Erro ao buscar aluno ${student.name}: ${searchError.message}`)
          continue
        }

        if (existingPlayer) {
          // Aluno já existe - usar o ID dele
          playerId = existingPlayer.id
          console.log(`✅ Aluno já existe: ${student.name} (${student.email}) - ID: ${playerId}`)

          // Atualizar o nome se for diferente (pode ter sido corrigido na planilha)
          if (existingPlayer.name !== student.name) {
            const { error: updateError } = await supabase
              .from('players')
              .update({
                name: student.name,
                updated_at: new Date().toISOString()
              })
              .eq('id', playerId)

            if (updateError) {
              console.warn(`Aviso: Não foi possível atualizar nome de ${student.email}: ${updateError.message}`)
            } else {
              console.log(`   📝 Nome atualizado: "${existingPlayer.name}" → "${student.name}"`)
            }
          }
        } else {
          // Aluno não existe - criar novo
          const udfId = `${classInfo.classCode}-${student.email.split('@')[0]}`

          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert({
              name: student.name,
              email: student.email,
              udf_id: udfId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (createError || !newPlayer) {
            errors.push(`Erro ao criar aluno ${student.name}: ${createError?.message}`)
            console.error(`❌ Erro ao criar aluno ${student.name}:`, createError)
            continue
          }

          playerId = newPlayer.id
          console.log(`✨ Novo aluno criado: ${student.name} (${student.email}) - ID: ${playerId}`)
        }

        // Vincular o aluno à turma (usando upsert para evitar duplicatas)
        const { error: classPlayerError } = await supabase
          .from('class_players')
          .upsert({
            class_id: classId,
            player_id: playerId,
            joined_at: new Date().toISOString()
          }, {
            onConflict: 'class_id,player_id'
          })

        if (classPlayerError) {
          errors.push(`Erro ao vincular aluno ${student.name} à turma: ${classPlayerError.message}`)
          console.error(`❌ Erro ao vincular ${student.name} à turma:`, classPlayerError)
          continue
        }

        console.log(`   🔗 Aluno vinculado à turma ${classInfo.classCode}`)
        studentsImported++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push(`Erro ao processar aluno ${student.name}: ${errorMessage}`)
        console.error(`❌ Exceção ao processar ${student.name}:`, error)
      }
    }

    // 4. Criar UM ÚNICO evento com múltiplos encontros no schedule (IDEMPOTENT)
    if (events.length > 0 && classId) {
      try {
        console.log(`[IMPORT] Processando ${events.length} encontros para criar evento único`)

        // Construir array de schedules (todos os encontros)
        const schedules = events.map(event => {
          const schedule = parseSchedule(event.schedule, event.startDate)
          return schedule
        }).filter(s => s !== null)

        console.log(`[IMPORT] Schedules criados: ${schedules.length}`)

        // Pegar primeira e última data COM HORÁRIOS para start_date e end_date
        // Usar os timestamps dos schedules ao invés de datas simples
        const firstSchedule = schedules[0]
        const lastSchedule = schedules[schedules.length - 1]

        const startDate = firstSchedule ? firstSchedule['initial-time'] : events[0].startDate
        const endDate = lastSchedule ? lastSchedule['end-time'] : events[events.length - 1].endDate

        // Pegar o tipo de evento do primeiro evento (todos devem ter o mesmo tipo)
        const eventType = events[0]?.eventType || 'training'

        console.log('[IMPORT] Parâmetros do evento:', {
          eventType,
          startDate,
          endDate,
          schedulesCount: schedules.length,
          classId
        })

        // ✅ FIXED: Use deterministic event code based on class_id for idempotency
        // Instead of random code, use a predictable pattern so re-imports are idempotent
        // Limite de 8 caracteres para compatibilidade com o app
        const eventCode = classId.substring(0, 8).toUpperCase()
        console.log(`[IMPORT] Código determinístico para o evento: ${eventCode}`)
        console.log(`[IMPORT] 📌 Este código permite reimportação idempotente para esta turma`)

        console.log('[IMPORT] Usando UPSERT para evento (idempotente)...')
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .upsert({
            code: eventCode,  // Deterministic code
            class_id: classId,  // Scoping key
            name: classInfo.className,
            description: `${classInfo.className} - ${events.length} encontros`,
            instructor_id: instructorId,
            event_type: eventType,
            start_date: startDate,
            end_date: endDate,
            schedule: schedules,
            difficulty: 'medium',
            time_limit: 30,
            max_players: 50,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'code,class_id'  // ✅ FIXED: Composite key scoping
          })
          .select()

        if (eventError) {
          console.error('[IMPORT] Erro ao criar/atualizar evento:', eventError)
          errors.push(`Erro ao criar evento: ${eventError.message}`)
        } else {
          console.log('[IMPORT] Evento criado/atualizado com sucesso:', eventData)
          console.log('[IMPORT] ✅ Idempotência garantida: reimportar substituirá este evento')
          eventsImported = events.length // Contar quantos encontros foram adicionados
        }
      } catch (error) {
        console.error('[IMPORT] Erro ao processar eventos:', error)
        errors.push(`Erro ao processar eventos: ${error}`)
      }
    }

    console.log('\n✨ IMPORTAÇÃO CONCLUÍDA!')
    console.log('📊 RESUMO:')
    console.log(`   Turma: ${classInfo.className} (${classInfo.classCode})`)
    console.log(`   Alunos importados: ${studentsImported}/${students.length}`)
    console.log(`   Eventos importados: ${eventsImported}/${events.length}`)
    if (errors.length > 0) {
      console.log(`   ⚠️  Erros encontrados: ${errors.length}`)
      errors.forEach((err, i) => console.log(`      ${i + 1}. ${err}`))
    }

    return {
      success: true,
      classId,
      studentsImported,
      eventsImported,
      errors
    }
  } catch (error) {
    errors.push(`Erro geral na importação: ${error}`)
    return {
      success: false,
      studentsImported,
      eventsImported,
      errors
    }
  }
}
