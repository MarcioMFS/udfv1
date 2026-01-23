import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xfgsfmexaxmikkksndny.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzY4NzQsImV4cCI6MjA1MTg1Mjg3NH0.VjKkcoqsXo9yhF-OLQM0eRoEfXr_KlIJ3nE_c9gLQ8c'
)

async function debugRanking() {
  console.log('🔍 Investigando ranking da turma Elis Costa...\n')

  // 1. Buscar a turma
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, code, name')
    .eq('code', 'ELIS COSTA')
    .single()

  if (classError) {
    console.error('❌ Erro ao buscar turma:', classError)
    return
  }

  console.log('✅ Turma encontrada:', classes)
  console.log('')

  // 2. Buscar alunos da turma
  const { data: students, error: studentsError } = await supabase
    .from('players')
    .select('id, name, email, team_id')
    .eq('class_id', classes.id)

  if (studentsError) {
    console.error('❌ Erro ao buscar alunos:', studentsError)
    return
  }

  console.log(`✅ Total de alunos: ${students.length}`)
  students.forEach(s => console.log(`  - ${s.name} (team_id: ${s.team_id || 'nenhum'})`))
  console.log('')

  // 3. Buscar times da turma
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, group_purpose, members:players(id, name)')
    .eq('class_id', classes.id)

  if (teamsError) {
    console.error('❌ Erro ao buscar times:', teamsError)
    return
  }

  console.log(`✅ Total de times: ${teams.length}`)
  teams.forEach(t => console.log(`  - ${t.name} (${t.members.length} membros)`))
  console.log('')

  // 4. Buscar eventos da turma
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, date')
    .eq('class_id', classes.id)

  if (eventsError) {
    console.error('❌ Erro ao buscar eventos:', eventsError)
    return
  }

  console.log(`✅ Total de eventos: ${events.length}`)
  console.log('')

  // 5. Buscar match_results de todos os eventos
  const eventIds = events.map(e => e.id)
  const { data: matchResults, error: matchError } = await supabase
    .from('match_results')
    .select('id, player_id, event_id, match_number, lucro, satisfacao, bonus_money')
    .in('event_id', eventIds)
    .order('match_number')
    .order('lucro', { ascending: false })

  if (matchError) {
    console.error('❌ Erro ao buscar match_results:', matchError)
    return
  }

  console.log(`✅ Total de match_results: ${matchResults.length}`)
  console.log('')

  // Agrupar por aluno
  const resultsByPlayer = {}
  matchResults.forEach(mr => {
    if (!resultsByPlayer[mr.player_id]) {
      resultsByPlayer[mr.player_id] = []
    }
    resultsByPlayer[mr.player_id].push(mr)
  })

  console.log('📊 Resultados por aluno:')
  Object.entries(resultsByPlayer).forEach(([playerId, results]) => {
    const student = students.find(s => s.id === playerId)
    const studentName = student ? student.name : 'Desconhecido'
    console.log(`\n  ${studentName}:`)
    console.log(`    Total de resultados: ${results.length}`)

    // Verificar duplicatas
    const matchNumbers = results.map(r => r.match_number)
    const uniqueMatches = [...new Set(matchNumbers)]
    console.log(`    Partidas únicas: ${uniqueMatches.length}`)

    if (uniqueMatches.length !== results.length) {
      console.log(`    ⚠️  DUPLICATAS ENCONTRADAS!`)
      uniqueMatches.forEach(mn => {
        const duplicates = results.filter(r => r.match_number === mn)
        if (duplicates.length > 1) {
          console.log(`      Match ${mn}: ${duplicates.length} registros`)
          duplicates.forEach(d => {
            console.log(`        - ID: ${d.id}, Lucro: ${d.lucro}, Satisfacao: ${d.satisfacao}, Bonus: ${d.bonus_money}`)
          })
        }
      })
    }

    // Calcular médias
    const avgLucro = results.reduce((sum, r) => sum + (r.lucro || 0), 0) / results.length
    const avgSatisfacao = results.reduce((sum, r) => sum + (r.satisfacao || 0), 0) / results.length
    const avgBonus = results.reduce((sum, r) => sum + (r.bonus_money || 0), 0) / results.length

    console.log(`    Média Lucro: ${Math.round(avgLucro)}`)
    console.log(`    Média Satisfação: ${Math.round(avgSatisfacao)}`)
    console.log(`    Média Bônus: ${Math.round(avgBonus)}`)
  })

  console.log('\n\n📊 Simulando cálculo de ranking...')

  // Simular o cálculo de ranking
  const activeStudents = students.map(student => {
    const studentResults = matchResults.filter(r => r.player_id === student.id)
    if (studentResults.length === 0) return null

    const avgLucro = studentResults.reduce((sum, r) => sum + (r.lucro || 0), 0) / studentResults.length
    const avgSatisfacao = studentResults.reduce((sum, r) => sum + (r.satisfacao || 0), 0) / studentResults.length
    const avgBonus = studentResults.reduce((sum, r) => sum + (r.bonus_money || 0), 0) / studentResults.length

    return {
      name: student.name,
      avgLucro,
      avgSatisfacao,
      avgBonus,
      matches: studentResults.length,
      isTeam: false
    }
  }).filter(s => s !== null)

  const activeTeams = teams.map(team => {
    const teamResults = matchResults.filter(r =>
      team.members.some(m => m.id === r.player_id)
    )
    if (teamResults.length === 0) return null

    const avgLucro = teamResults.reduce((sum, r) => sum + (r.lucro || 0), 0) / teamResults.length
    const avgSatisfacao = teamResults.reduce((sum, r) => sum + (r.satisfacao || 0), 0) / teamResults.length
    const avgBonus = teamResults.reduce((sum, r) => sum + (r.bonus_money || 0), 0) / teamResults.length

    return {
      name: team.name,
      avgLucro,
      avgSatisfacao,
      avgBonus,
      matches: teamResults.length,
      isTeam: true
    }
  }).filter(t => t !== null)

  const allEntities = [...activeStudents, ...activeTeams]

  console.log(`\nTotal de entidades no ranking: ${allEntities.length}`)
  console.log(`  - Alunos ativos: ${activeStudents.length}`)
  console.log(`  - Times ativos: ${activeTeams.length}`)

  console.log('\nEntidades:')
  allEntities.forEach(e => {
    console.log(`  - ${e.name} (${e.isTeam ? 'TIME' : 'ALUNO'}): Lucro=${Math.round(e.avgLucro)}, Sat=${Math.round(e.avgSatisfacao)}, Bonus=${Math.round(e.avgBonus)}, Matches=${e.matches}`)
  })

  // Calcular posições
  const lucroRanked = [...allEntities].sort((a, b) => b.avgLucro - a.avgLucro)
  const satisfacaoRanked = [...allEntities].sort((a, b) => b.avgSatisfacao - a.avgSatisfacao)
  const bonusRanked = [...allEntities].sort((a, b) => b.avgBonus - a.avgBonus)

  console.log('\n🏆 Rankings por métrica:')
  console.log('\nLucro:')
  lucroRanked.forEach((e, i) => console.log(`  ${i + 1}º - ${e.name}: ${Math.round(e.avgLucro)}`))

  console.log('\nSatisfação:')
  satisfacaoRanked.forEach((e, i) => console.log(`  ${i + 1}º - ${e.name}: ${Math.round(e.avgSatisfacao)}`))

  console.log('\nBônus:')
  bonusRanked.forEach((e, i) => console.log(`  ${i + 1}º - ${e.name}: ${Math.round(e.avgBonus)}`))

  console.log('\n🎯 Pontuação final (soma das posições):')
  allEntities.forEach(entity => {
    const lucroPos = lucroRanked.findIndex(e => e.name === entity.name) + 1
    const satisfacaoPos = satisfacaoRanked.findIndex(e => e.name === entity.name) + 1
    const bonusPos = bonusRanked.findIndex(e => e.name === entity.name) + 1
    const total = lucroPos + satisfacaoPos + bonusPos

    console.log(`  ${entity.name}: ${lucroPos} + ${satisfacaoPos} + ${bonusPos} = ${total}`)
  })
}

debugRanking().catch(console.error)
