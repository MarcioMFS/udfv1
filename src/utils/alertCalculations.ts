import { Student, MatchResult, Team } from '../types'

interface AlertStudent {
  name: string
  purpose: string
  value: number
  statusColor: 'green' | 'yellow' | 'red'
}

interface AlertCounts {
  criticalCount: number
  lowPerformanceCount: number
  inactiveCount: number
  criticalStudents: AlertStudent[]
  lowPerformanceStudents: AlertStudent[]
  inactiveStudents: { name: string }[]
}

export function calculateStudentAlerts(
  students: Student[], 
  matchResults: MatchResult[], 
  teams: Team[]
): AlertCounts {
  console.log('🔍 DEBUG ALERTS - Input data:', {
    studentsCount: students.length,
    matchResultsCount: matchResults.length,
    teamsCount: teams.length,
    studentsNames: students.map(s => s.name),
    matchResultsPlayerIds: matchResults.map(r => r.player_id)
  })

  const criticalStudents: AlertStudent[] = []
  const lowPerformanceStudents: AlertStudent[] = []
  const inactiveStudents: { name: string }[] = []
  
  // Calcular o número máximo de partidas que qualquer aluno jogou
  // Isso representa o "potencial máximo" de engajamento
  const maxMatchesPerStudent = Math.max(
    1, // Mínimo 1 para evitar divisão por zero
    ...students.map(student => 
      matchResults.filter(result => result.player_id === student.id).length
    )
  )
  
  console.log('🔍 DEBUG ALERTS - maxMatchesPerStudent:', maxMatchesPerStudent)
  
  const indicators = students.map(student => {
    const studentResults = matchResults.filter(result => result.player_id === student.id)
    
    console.log('🔍 DEBUG ALERTS - Student processing:', {
      name: student.name,
      id: student.id,
      studentResultsCount: studentResults.length,
      hasParticipated: studentResults.length > 0
    })

    const totalLucro = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)

    const satisfacaoResults = studentResults.filter(result => result.satisfacao !== null)
    const totalSatisfacao = satisfacaoResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
    const avgSatisfacao = satisfacaoResults.length > 0 ? totalSatisfacao / satisfacaoResults.length : 0

    const totalBonus = studentResults.reduce((sum, result) => sum + (result.bonus || 0), 0)

    const studentTeam = teams.find(team =>
      team.members.some(member => member.id === student.id)
    )

    // Engajamento baseado nas partidas que o aluno jogou vs o máximo da turma
    const individualEngagement = Math.min(100, Math.round((studentResults.length / maxMatchesPerStudent) * 100))

    const hasParticipated = studentResults.length > 0

    return {
      id: student.id,
      name: student.name,
      totalLucro,
      avgSatisfacao: Math.round(avgSatisfacao),
      totalBonus,
      purpose: student.purpose,
      groupPurpose: studentTeam?.group_purpose || null,
      hasParticipated,
      individualEngagement
    }
  })

  const participatingStudents = indicators.filter(s => s.hasParticipated)
  const classAverages = {
    lucro: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.totalLucro, 0) / participatingStudents.length : 0,
    satisfacao: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.avgSatisfacao, 0) / participatingStudents.length : 0,
    bonus: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.totalBonus, 0) / participatingStudents.length : 0,
  }

  console.log('🔍 DEBUG ALERTS - Class averages:', classAverages)
  console.log('🔍 DEBUG ALERTS - Participating students:', participatingStudents.length)

  indicators.forEach(indicator => {
    console.log('🔍 DEBUG ALERTS - Processing indicator:', {
      name: indicator.name,
      hasParticipated: indicator.hasParticipated,
      purpose: indicator.purpose,
      groupPurpose: indicator.groupPurpose,
      individualEngagement: indicator.individualEngagement,
      totalLucro: indicator.totalLucro,
      avgSatisfacao: indicator.avgSatisfacao,
      totalBonus: indicator.totalBonus
    })

    const purpose = indicator.purpose || indicator.groupPurpose

    if (!indicator.hasParticipated) {
      console.log('🔍 DEBUG ALERTS - Adding to inactive:', indicator.name)
      inactiveStudents.push({
        name: indicator.name || 'Sem nome'
      })
      return
    }

    let performancePercentage = 0
    
    // Se não tem propósito definido, usar a melhor métrica do aluno
    if (!purpose) {
      const lucroPercentage = classAverages.lucro > 0 ? (indicator.totalLucro / classAverages.lucro) * 100 : 0
      const satisfacaoPercentage = classAverages.satisfacao > 0 ? (indicator.avgSatisfacao / classAverages.satisfacao) * 100 : 0
      const bonusPercentage = classAverages.bonus > 0 ? (indicator.totalBonus / classAverages.bonus) * 100 : 0
      
      // Usar a melhor performance entre as três métricas
      performancePercentage = Math.max(lucroPercentage, satisfacaoPercentage, bonusPercentage)
      
      console.log('🔍 DEBUG ALERTS - No purpose defined, using best metric:', {
        lucroPercentage,
        satisfacaoPercentage, 
        bonusPercentage,
        bestPerformance: performancePercentage
      })
    } else if (classAverages[purpose] > 0) {
      let currentValue = 0
      switch (purpose) {
        case 'lucro':
          currentValue = indicator.totalLucro
          break
        case 'satisfacao':
          currentValue = indicator.avgSatisfacao
          break
        case 'bonus':
          currentValue = indicator.totalBonus
          break
      }
      performancePercentage = (currentValue / classAverages[purpose]) * 100
    }

    const engagementWeight = 0.3
    const performanceWeight = 0.7
    
    const combinedScore = (performancePercentage * performanceWeight) + (indicator.individualEngagement * engagementWeight)

    let statusColor: 'green' | 'yellow' | 'red' = 'red'
    if (combinedScore >= 80) {
      statusColor = 'green'
    } else if (combinedScore >= 50) {
      statusColor = 'yellow'
    } else {
      statusColor = 'red'
    }

    const alertStudent: AlertStudent = {
      name: indicator.name || 'Sem nome',
      purpose: purpose || 'não definido',
      value: Math.round(combinedScore),
      statusColor
    }

    console.log('🔍 DEBUG ALERTS - Alert student:', {
      name: alertStudent.name,
      purpose: alertStudent.purpose,
      value: alertStudent.value,
      statusColor: alertStudent.statusColor,
      performancePercentage,
      combinedScore
    })

    if (statusColor === 'red') {
      criticalStudents.push(alertStudent)
    } else if (statusColor === 'yellow') {
      lowPerformanceStudents.push(alertStudent)
    }
  })

  const result = {
    criticalCount: criticalStudents.length,
    lowPerformanceCount: lowPerformanceStudents.length,
    inactiveCount: inactiveStudents.length,
    criticalStudents,
    lowPerformanceStudents,
    inactiveStudents
  }

  console.log('🔍 DEBUG ALERTS - Final result:', {
    criticalCount: result.criticalCount,
    lowPerformanceCount: result.lowPerformanceCount,
    inactiveCount: result.inactiveCount,
    inactiveStudents: result.inactiveStudents.map(s => s.name)
  })

  return result
}

export function getTotalAlertsCount(alertCounts: AlertCounts): number {
  return alertCounts.criticalCount + alertCounts.lowPerformanceCount + alertCounts.inactiveCount
}