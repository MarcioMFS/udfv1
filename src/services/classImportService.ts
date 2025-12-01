import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import type { ExcelClassImport, ExcelStudentImport, ExcelEventImport, ClassImportResult } from '../types'

interface ProcessedExcelData {
  classInfo: ExcelClassImport | null
  students: ExcelStudentImport[]
  events: ExcelEventImport[]
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
 * Linha 2: [vazio, "Instrutor", "Email Instrutor"]
 * Linha 3: [vazio, "Nome do Instrutor", "email@exemplo.com"]
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

    // Primeira coluna geralmente é o código (E1, E2, etc)
    const code = row[0] ? String(row[0]).trim() : `E${i - headerRowIndex}`

    // Se não parece ser código de evento, pular
    if (!/^E\d+$/i.test(code)) continue

    // Colunas: [código, inicio, fim, horario]
    const startDate = parseExcelDate(row[1])
    const endDate = parseExcelDate(row[2])
    const schedule = row[3] ? String(row[3]).trim() : ''

    if (startDate && schedule) {
      events.push({
        code,
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
 * Gera código único para a turma baseado no nome
 */
function generateClassCode(className: string): string {
  // Extrair código se já existir (ex: T000, T001, etc)
  const codeMatch = className.match(/T\d{3}/i)
  if (codeMatch) {
    return codeMatch[0].toUpperCase()
  }

  // Gerar código baseado nas iniciais
  const words = className.split(' ').filter(w => w.length > 0)
  const initials = words.map(w => w[0]).join('').toUpperCase()
  return initials.substring(0, 4) || 'TURM'
}

/**
 * Converte horário "8 as 12" para formato de schedule
 */
function parseSchedule(scheduleStr: string): { 'initial-time': string; 'end-time': string } | null {
  // Formatos aceitos: "8 as 12", "14 as 18", "08:00 às 12:00"
  const match = scheduleStr.match(/(\d+)(?::(\d+))?\s*(?:as|às|a)\s*(\d+)(?::(\d+))?/)

  if (match) {
    const startHour = match[1].padStart(2, '0')
    const startMin = (match[2] || '00').padStart(2, '0')
    const endHour = match[3].padStart(2, '0')
    const endMin = (match[4] || '00').padStart(2, '0')

    return {
      'initial-time': `${startHour}:${startMin}`,
      'end-time': `${endHour}:${endMin}`
    }
  }

  return null
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
    // 1. Buscar ou criar instrutor
    const { data: instructorData, error: instructorError } = await supabase
      .from('instructors')
      .select('id')
      .eq('email', classInfo.instructorEmail)
      .single()

    if (instructorError || !instructorData) {
      errors.push(`Instrutor com email ${classInfo.instructorEmail} não encontrado`)
      return { success: false, studentsImported: 0, eventsImported: 0, errors }
    }

    const instructorId = instructorData.id

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

    // 4. Criar eventos
    for (const event of events) {
      try {
        const schedule = parseSchedule(event.schedule)

        const { error: eventError } = await supabase
          .from('events')
          .insert({
            code: `${classInfo.classCode}-${event.code}`,
            name: `Encontro ${event.code}`,
            description: `Encontro ${event.code} - ${event.schedule}`,
            class_id: classId,
            instructor_id: instructorId,
            event_type: 'training',
            start_date: event.startDate,
            end_date: event.endDate,
            schedule: schedule ? [schedule] : [],
            difficulty: 'medium',
            time_limit: 30,
            max_players: 50
          })

        if (eventError) {
          errors.push(`Erro ao criar evento ${event.code}: ${eventError.message}`)
          continue
        }

        eventsImported++
      } catch (error) {
        errors.push(`Erro ao processar evento ${event.code}: ${error}`)
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
