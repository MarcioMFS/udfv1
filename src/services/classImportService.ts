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

  // Procurar informações da turma
  let className = ''
  let instructorName = ''
  let instructorEmail = ''

  console.log('Dados da aba Instrutor:', data)

  for (let i = 0; i < data.length && i < 10; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    // Primeira linha não vazia geralmente contém o nome da turma
    if (!className && row[0] && typeof row[0] === 'string' && row[0].trim().length > 0) {
      const firstCell = row[0].trim()
      // Verificar se não é cabeçalho
      if (!firstCell.toLowerCase().includes('instrutor')) {
        className = firstCell
      }
    }

    // Procurar linha com cabeçalho "Instrutor" e "Email"
    const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ')

    if (rowStr.includes('instrutor') && rowStr.includes('email')) {
      // Próxima linha deve ter os valores
      if (data[i + 1] && data[i + 1].length >= 2) {
        const nextRow = data[i + 1]

        // Encontrar qual coluna tem o nome e qual tem o email
        // Nome geralmente não tem @, email tem @
        for (let col = 0; col < nextRow.length; col++) {
          const cellValue = String(nextRow[col] || '').trim()

          if (cellValue.includes('@')) {
            instructorEmail = cellValue
          } else if (cellValue.length > 0 && !instructorName) {
            instructorName = cellValue
          }
        }

        // Se não encontrou dessa forma, tentar ordem padrão
        if (!instructorEmail && nextRow[1]) {
          instructorName = String(nextRow[0] || '').trim()
          instructorEmail = String(nextRow[1] || '').trim()
        }
      }
      break
    }
  }

  console.log('Dados extraídos:', { className, instructorName, instructorEmail })

  // Gerar código da turma baseado no nome (pegar primeiras letras ou usar nome completo)
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

  // Encontrar linha de cabeçalho (procurar por "Nome" e "Email")
  for (let i = 0; i < data.length && i < 20; i++) {
    const row = data[i]
    if (!row) continue

    const rowStr = row.join(' ').toLowerCase()
    if (rowStr.includes('nome') && rowStr.includes('email')) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) return []

  // Processar linhas após cabeçalho
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue

    // Pular linha se primeiro campo for número (índice)
    let nameIndex = 0
    let emailIndex = 1

    // Se primeira coluna for número, ajustar índices
    if (typeof row[0] === 'number') {
      nameIndex = 1
      emailIndex = 2
    }

    const name = row[nameIndex]
    const email = row[emailIndex]

    if (name && email && typeof name === 'string' && typeof email === 'string') {
      students.push({
        name: name.trim(),
        email: email.trim()
      })
    }
  }

  return students
}

/**
 * Processa a aba "Encontros" para extrair eventos/aulas
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

  // Encontrar linha de cabeçalho
  for (let i = 0; i < data.length && i < 20; i++) {
    const row = data[i]
    if (!row) continue

    const rowStr = row.join(' ').toLowerCase()
    if (rowStr.includes('inicio') || rowStr.includes('fim') || rowStr.includes('horario')) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) return []

  // Processar linhas após cabeçalho
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 3) continue

    // Pode ter código do evento na primeira coluna (E1, E2, etc)
    let startIndex = 0
    let endIndex = 1
    let scheduleIndex = 2

    // Se primeira coluna parece ser código de evento (E1, E2, etc)
    if (row[0] && typeof row[0] === 'string' && /^E\d+$/i.test(row[0].trim())) {
      const code = row[0].trim()
      startIndex = 1
      endIndex = 2
      scheduleIndex = 3

      const startDate = parseExcelDate(row[startIndex])
      const endDate = parseExcelDate(row[endIndex])
      const schedule = row[scheduleIndex]

      if (startDate && schedule) {
        events.push({
          code,
          startDate,
          endDate: endDate || startDate,
          schedule: String(schedule).trim()
        })
      }
    } else {
      // Sem código de evento, gerar automaticamente
      const startDate = parseExcelDate(row[startIndex])
      const endDate = parseExcelDate(row[endIndex])
      const schedule = row[scheduleIndex]

      if (startDate && schedule) {
        events.push({
          code: `E${i - headerRowIndex}`,
          startDate,
          endDate: endDate || startDate,
          schedule: String(schedule).trim()
        })
      }
    }
  }

  return events
}

/**
 * Converte data do Excel para formato ISO
 */
function parseExcelDate(value: any): string | null {
  if (!value) return null

  // Se for número (data do Excel)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const year = new Date().getFullYear()
      return `${year}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  // Se for string (formato dd/mm)
  if (typeof value === 'string') {
    const match = value.match(/(\d+)\/(\d+)/)
    if (match) {
      const day = match[1].padStart(2, '0')
      const month = match[2].padStart(2, '0')
      const year = new Date().getFullYear()
      return `${year}-${month}-${day}`
    }
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
