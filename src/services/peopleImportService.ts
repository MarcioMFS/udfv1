import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

export interface ExcelPersonImport {
  eventCode: number | string
  registrationNumber: string
  code: string
  name: string
  email: string
  hierarchy: 'Líder' | 'Participante' | string
}

export interface PeopleImportPreview {
  totalPeople: number
  leaders: number
  participants: number
  eventCode: string
  people: ExcelPersonImport[]
  duplicateEmails: string[]
  invalidEmails: string[]
  // Novos campos para mostrar o que será criado vs atualizado
  existingPlayers: number
  existingInstructors: number
  newPlayers: number
  newInstructors: number
}

export interface PeopleImportResult {
  success: boolean
  playersCreated: number
  playersUpdated: number
  instructorsCreated: number
  instructorsUpdated: number
  errors: string[]
}

/**
 * Lê o arquivo Excel e extrai os dados de pessoas
 */
export async function readPeopleExcelFile(file: File): Promise<ExcelPersonImport[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // Usar primeira aba
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        console.log('Dados da planilha:', rows.slice(0, 5))

        // Encontrar linha de cabeçalho
        let headerRowIndex = -1
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i]
          if (!row) continue

          // Verificar se tem colunas esperadas
          const hasNome = row.some(cell =>
            cell && String(cell).toLowerCase().includes('nome')
          )
          const hasEmail = row.some(cell =>
            cell && String(cell).toLowerCase().includes('email')
          )

          if (hasNome && hasEmail) {
            headerRowIndex = i
            break
          }
        }

        if (headerRowIndex === -1) {
          // Se não encontrou cabeçalho, assumir primeira linha
          headerRowIndex = 0
        }

        const headerRow = rows[headerRowIndex]

        // Mapear índices das colunas
        const colIndex = {
          eventCode: findColumnIndex(headerRow, ['cód. evento', 'cod. evento', 'codigo evento', 'event code']),
          registrationNumber: findColumnIndex(headerRow, ['matricula', 'matrícula', 'registration']),
          code: findColumnIndex(headerRow, ['código', 'codigo', 'code']),
          name: findColumnIndex(headerRow, ['nome', 'name']),
          email: findColumnIndex(headerRow, ['email', 'e-mail']),
          hierarchy: findColumnIndex(headerRow, ['hierarquia', 'hierarquia evento', 'hierarchy', 'tipo', 'type'])
        }

        console.log('Índices das colunas:', colIndex)

        const people: ExcelPersonImport[] = []

        // Processar linhas de dados
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue

          const name = colIndex.name >= 0 ? String(row[colIndex.name] || '').trim() : ''
          const email = colIndex.email >= 0 ? String(row[colIndex.email] || '').trim().toLowerCase() : ''

          // Pular linhas sem nome ou email
          if (!name || !email || !email.includes('@')) continue

          const person: ExcelPersonImport = {
            eventCode: colIndex.eventCode >= 0 ? row[colIndex.eventCode] : '',
            registrationNumber: colIndex.registrationNumber >= 0 ? String(row[colIndex.registrationNumber] || '') : '',
            code: colIndex.code >= 0 ? String(row[colIndex.code] || '') : '',
            name,
            email,
            hierarchy: colIndex.hierarchy >= 0 ? String(row[colIndex.hierarchy] || 'Participante').trim() : 'Participante'
          }

          people.push(person)
        }

        console.log(`Pessoas encontradas: ${people.length}`)
        resolve(people)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsBinaryString(file)
  })
}

/**
 * Encontra o índice de uma coluna baseado em possíveis nomes
 */
function findColumnIndex(headerRow: any[], possibleNames: string[]): number {
  if (!headerRow) return -1

  for (let i = 0; i < headerRow.length; i++) {
    const cell = String(headerRow[i] || '').toLowerCase().trim()
    if (possibleNames.some(name => cell.includes(name))) {
      return i
    }
  }
  return -1
}

/**
 * Faz preview da importação mostrando estatísticas e verificando duplicados no banco
 */
export async function previewPeopleImport(people: ExcelPersonImport[]): Promise<PeopleImportPreview> {
  const leaders = people.filter(p =>
    p.hierarchy.toLowerCase() === 'líder' ||
    p.hierarchy.toLowerCase() === 'lider' ||
    p.hierarchy.toLowerCase() === 'leader'
  )
  const participants = people.filter(p =>
    p.hierarchy.toLowerCase() !== 'líder' &&
    p.hierarchy.toLowerCase() !== 'lider' &&
    p.hierarchy.toLowerCase() !== 'leader'
  )

  // Verificar emails duplicados na planilha
  const emailCounts = new Map<string, number>()
  people.forEach(p => {
    emailCounts.set(p.email, (emailCounts.get(p.email) || 0) + 1)
  })
  const duplicateEmails = Array.from(emailCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([email]) => email)

  // Verificar emails inválidos
  const invalidEmails = people
    .filter(p => !isValidEmail(p.email))
    .map(p => p.email)

  // Pegar código do evento (primeiro encontrado)
  const eventCode = String(people[0]?.eventCode || '')

  // Verificar quais pessoas já existem no banco
  const emails = people.map(p => p.email).filter(e => isValidEmail(e))

  // Buscar players existentes
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('email')
    .in('email', emails)

  // Buscar instrutores existentes
  const { data: existingInstructors } = await supabase
    .from('instructors')
    .select('email')
    .in('email', emails)

  const existingPlayerEmails = new Set((existingPlayers || []).map(p => p.email))
  const existingInstructorEmails = new Set((existingInstructors || []).map(i => i.email))

  // Contar novos vs atualizações
  const newPlayers = participants.filter(p => !existingPlayerEmails.has(p.email))
  const updatePlayers = participants.filter(p => existingPlayerEmails.has(p.email))
  const newInstructors = leaders.filter(l => !existingInstructorEmails.has(l.email))
  const updateInstructors = leaders.filter(l => existingInstructorEmails.has(l.email))

  return {
    totalPeople: people.length,
    leaders: leaders.length,
    participants: participants.length,
    eventCode,
    people,
    duplicateEmails,
    invalidEmails,
    existingPlayers: updatePlayers.length,
    existingInstructors: updateInstructors.length,
    newPlayers: newPlayers.length,
    newInstructors: newInstructors.length
  }
}

/**
 * Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Gera um udf_id único verificando no banco de dados
 */
async function generateUniqueUdfId(baseId: string, table: 'players' | 'instructors'): Promise<string> {
  let udfId = baseId
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('udf_id', udfId)
      .maybeSingle()

    if (!existing) {
      return udfId
    }

    // Adicionar sufixo único
    attempts++
    udfId = `${baseId}-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(-2)}`
  }

  // Fallback: usar timestamp completo
  return `${baseId}-${Date.now()}`
}

/**
 * Verifica se email já existe na tabela
 */
async function checkEmailExists(email: string, table: 'players' | 'instructors'): Promise<{ exists: boolean; id?: string }> {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('email', email)
    .maybeSingle()

  return { exists: !!data, id: data?.id }
}

/**
 * Importa as pessoas para o banco de dados
 */
export async function importPeopleFromExcel(
  people: ExcelPersonImport[],
  options: {
    createInstructors: boolean
    linkToClass?: string // class_id para vincular players
  } = { createInstructors: true }
): Promise<PeopleImportResult> {
  console.log('🚀 INICIANDO IMPORTAÇÃO DE PESSOAS')
  console.log(`📋 Total: ${people.length} pessoas`)

  const errors: string[] = []
  let playersCreated = 0
  let playersUpdated = 0
  let instructorsCreated = 0
  let instructorsUpdated = 0

  // Separar líderes (instrutores) e participantes (players)
  const leaders = people.filter(p =>
    p.hierarchy.toLowerCase() === 'líder' ||
    p.hierarchy.toLowerCase() === 'lider' ||
    p.hierarchy.toLowerCase() === 'leader'
  )
  const participants = people.filter(p =>
    p.hierarchy.toLowerCase() !== 'líder' &&
    p.hierarchy.toLowerCase() !== 'lider' &&
    p.hierarchy.toLowerCase() !== 'leader'
  )

  console.log(`👨‍🏫 Líderes (Instrutores): ${leaders.length}`)
  console.log(`👥 Participantes (Players): ${participants.length}`)

  // Importar instrutores (líderes)
  if (options.createInstructors && leaders.length > 0) {
    for (const leader of leaders) {
      try {
        // Verificar se já existe por email
        const { exists, id: existingId } = await checkEmailExists(leader.email, 'instructors')

        if (exists && existingId) {
          // Buscar dados atuais para comparar
          const { data: existing } = await supabase
            .from('instructors')
            .select('name')
            .eq('id', existingId)
            .single()

          // Atualizar nome se diferente
          if (existing && existing.name !== leader.name) {
            const { error: updateError } = await supabase
              .from('instructors')
              .update({
                name: leader.name,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingId)

            if (updateError) {
              errors.push(`Erro ao atualizar instrutor ${leader.email}: ${updateError.message}`)
            } else {
              instructorsUpdated++
              console.log(`✅ Instrutor atualizado: ${leader.name}`)
            }
          } else {
            instructorsUpdated++ // Conta como processado mesmo sem mudanças
            console.log(`⏭️ Instrutor já existe (sem alterações): ${leader.name}`)
          }
        } else {
          // Criar novo instrutor - gerar udf_id único
          const baseUdfId = leader.code || `INS-${leader.email.split('@')[0]}`
          const udfId = await generateUniqueUdfId(baseUdfId, 'instructors')

          const { error: createError } = await supabase
            .from('instructors')
            .insert({
              name: leader.name,
              email: leader.email,
              udf_id: udfId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (createError) {
            errors.push(`Erro ao criar instrutor ${leader.email}: ${createError.message}`)
          } else {
            instructorsCreated++
            console.log(`✨ Instrutor criado: ${leader.name} (udf_id: ${udfId})`)
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`Erro ao processar instrutor ${leader.email}: ${msg}`)
      }
    }
  }

  // Importar players (participantes)
  for (const participant of participants) {
    try {
      // Verificar se já existe por email
      const { exists, id: existingId } = await checkEmailExists(participant.email, 'players')

      let playerId: string | undefined

      if (exists && existingId) {
        playerId = existingId

        // Buscar dados atuais para comparar
        const { data: existing } = await supabase
          .from('players')
          .select('name, registration_number')
          .eq('id', existingId)
          .single()

        // Atualizar nome e matrícula se necessário
        const updates: any = { updated_at: new Date().toISOString() }
        let hasChanges = false

        if (existing && existing.name !== participant.name) {
          updates.name = participant.name
          hasChanges = true
        }

        if (participant.registrationNumber && existing?.registration_number !== participant.registrationNumber) {
          updates.registration_number = participant.registrationNumber
          hasChanges = true
        }

        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('players')
            .update(updates)
            .eq('id', existingId)

          if (updateError) {
            errors.push(`Erro ao atualizar player ${participant.email}: ${updateError.message}`)
          } else {
            playersUpdated++
            console.log(`✅ Player atualizado: ${participant.name}`)
          }
        } else {
          playersUpdated++ // Conta como processado mesmo sem mudanças
          console.log(`⏭️ Player já existe (sem alterações): ${participant.name}`)
        }
      } else {
        // Criar novo player - gerar udf_id único
        const baseUdfId = participant.code || `PLY-${participant.email.split('@')[0]}`
        const udfId = await generateUniqueUdfId(baseUdfId, 'players')

        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            name: participant.name,
            email: participant.email,
            udf_id: udfId,
            registration_number: participant.registrationNumber || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          errors.push(`Erro ao criar player ${participant.email}: ${createError.message}`)
          continue
        } else {
          playerId = newPlayer.id
          playersCreated++
          console.log(`✨ Player criado: ${participant.name} (udf_id: ${udfId})`)
        }
      }

      // Vincular à turma se especificado
      if (options.linkToClass && playerId) {
        const { error: linkError } = await supabase
          .from('class_players')
          .upsert({
            class_id: options.linkToClass,
            player_id: playerId,
            joined_at: new Date().toISOString()
          }, {
            onConflict: 'class_id,player_id'
          })

        if (linkError) {
          console.warn(`Aviso: Não foi possível vincular ${participant.email} à turma: ${linkError.message}`)
        } else {
          console.log(`🔗 Player vinculado à turma`)
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Erro ao processar player ${participant.email}: ${msg}`)
    }
  }

  console.log('\n✨ IMPORTAÇÃO CONCLUÍDA!')
  console.log('📊 RESUMO:')
  console.log(`   Instrutores criados: ${instructorsCreated}`)
  console.log(`   Instrutores atualizados: ${instructorsUpdated}`)
  console.log(`   Players criados: ${playersCreated}`)
  console.log(`   Players atualizados: ${playersUpdated}`)
  if (errors.length > 0) {
    console.log(`   ⚠️ Erros: ${errors.length}`)
  }

  return {
    success: errors.length === 0 || (playersCreated + playersUpdated + instructorsCreated + instructorsUpdated) > 0,
    playersCreated,
    playersUpdated,
    instructorsCreated,
    instructorsUpdated,
    errors
  }
}
