import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import type { ExcelClassImport, ExcelStudentImport, ExcelEventImport, ClassImportResult, ClassImportPreview } from '../types'

interface ProcessedExcelData {
  classInfo: ExcelClassImport | null
  students: ExcelStudentImport[]
  events: ExcelEventImport[]
}

/**
 * Gera um código aleatório de 8 caracteres para o evento
 */
function generateEventCode(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase()
  return uuid.substring(0, 8)
}

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
 */
function generateClassCode(className: string): string {
  // Extrair código se já existir (ex: T000ABCD com 8 dígitos)
  const codeMatch = className.match(/[A-Z0-9]{8}/i)
  if (codeMatch) {
    return codeMatch[0].toUpperCase()
  }

  // Gerar código de 8 caracteres usando UUID
  const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase()
  return uuid.substring(0, 8)
}

/**
 * Converte horário "8 as 12" para formato de schedule com data ISO completa
 */
function parseSchedule(scheduleStr: string, eventDate: string): { 'initial-time': string; 'end-time': string } | null {
  // Formatos aceitos: "8 as 12", "14 as 18", "08:00 às 12:00"
  const match = scheduleStr.match(/(\d+)(?::(\d+))?\s*(?:as|às|a)\s*(\d+)(?::(\d+))?/)

  if (match) {
    const startHour = match[1].padStart(2, '0')
    const startMin = (match[2] || '00').padStart(2, '0')
    const endHour = match[3].padStart(2, '0')
    const endMin = (match[4] || '00').padStart(2, '0')

    // Criar timestamps ISO completos com a data do evento
    return {
      'initial-time': `${eventDate}T${startHour}:${startMin}:00`,
      'end-time': `${eventDate}T${endHour}:${endMin}:00`
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
  events: ExcelEventImport[]
): Promise<ClassImportPreview> {
  try {
    // Verificar se turma já existe
    const { data: existingClass, error } = await supabase
      .from('classes')
      .select('id, code, description')
      .eq('code', classInfo.classCode)
      .maybeSingle()

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
  events: ExcelEventImport[]
): Promise<ClassImportResult> {
  const errors: string[] = []
  let classId: string | undefined
  let studentsImported = 0
  let eventsImported = 0

  try {
    // 1. Buscar instrutor por email
    const { data: instructorData, error: instructorError } = await supabase
      .from('instructors')
      .select('id')
      .eq('email', classInfo.instructorEmail)
      .limit(1)

    if (instructorError || !instructorData || instructorData.length === 0) {
      errors.push(`Instrutor com email ${classInfo.instructorEmail} não encontrado. Erro: ${instructorError?.message || 'Nenhum instrutor encontrado'}`)
      return { success: false, studentsImported: 0, eventsImported: 0, errors }
    }

    // Pegar o primeiro instrutor (caso haja duplicados)
    const instructor = Array.isArray(instructorData) ? instructorData[0] : instructorData
    const instructorId = instructor.id

    console.log('Instrutor encontrado:', { instructorId, email: classInfo.instructorEmail })

    // 2. Criar turma
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .upsert({
        code: classInfo.classCode,
        description: classInfo.className,
        instructor_id: instructorId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'code'
      })
      .select()
      .single()

    if (classError || !classData) {
      errors.push(`Erro ao criar turma: ${classError?.message}`)
      return { success: false, studentsImported: 0, eventsImported: 0, errors }
    }

    classId = classData.id

    // 3. Importar alunos
    for (const student of students) {
      try {
        const udfId = `${classInfo.classCode}-${student.email.split('@')[0]}`

        // Criar/atualizar player
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .upsert({
            name: student.name,
            email: student.email,
            udf_id: udfId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'udf_id'
          })
          .select()
          .single()

        if (playerError || !playerData) {
          errors.push(`Erro ao criar aluno ${student.name}: ${playerError?.message}`)
          continue
        }

        // Vincular à turma
        const { error: classPlayerError } = await supabase
          .from('class_players')
          .upsert({
            class_id: classId,
            player_id: playerData.id
          }, {
            onConflict: 'class_id,player_id'
          })

        if (classPlayerError) {
          errors.push(`Erro ao vincular aluno ${student.name} à turma: ${classPlayerError.message}`)
          continue
        }

        studentsImported++
      } catch (error) {
        errors.push(`Erro ao processar aluno ${student.name}: ${error}`)
      }
    }

    // 4. Criar UM ÚNICO evento com múltiplos encontros no schedule
    if (events.length > 0) {
      try {
        // Construir array de schedules (todos os encontros)
        const schedules = events.map(event => {
          const schedule = parseSchedule(event.schedule, event.startDate)
          return schedule
        }).filter(s => s !== null)

        // Pegar primeira e última data para start_date e end_date
        const sortedDates = events.map(e => e.startDate).sort()
        const firstDate = sortedDates[0]
        const lastDate = sortedDates[sortedDates.length - 1]

        // Deletar eventos existentes da turma antes de criar novo
        await supabase
          .from('events')
          .delete()
          .eq('class_id', classId)

        // Gerar código aleatório para o evento
        const eventCode = generateEventCode()

        const { error: eventError } = await supabase
          .from('events')
          .insert({
            code: eventCode,
            name: classInfo.className,
            description: `${classInfo.className} - ${events.length} encontros`,
            class_id: classId,
            instructor_id: instructorId,
            event_type: 'training',
            start_date: firstDate,
            end_date: lastDate,
            schedule: schedules,
            difficulty: 'medium',
            time_limit: 30,
            max_players: 50
          })

        if (eventError) {
          errors.push(`Erro ao criar evento: ${eventError.message}`)
        } else {
          eventsImported = events.length // Contar quantos encontros foram adicionados
        }
      } catch (error) {
        errors.push(`Erro ao processar eventos: ${error}`)
      }
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
