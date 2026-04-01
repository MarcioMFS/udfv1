import { useMemo } from 'react'
import { Student, MatchResult, Team, RankingData, StudentIndicator, ClassStats, ClassAverages, StatusColor, Purpose } from '../types'

interface UseCalculationsProps {
  students: Student[]
  matchResults: MatchResult[]
  teams: Team[]
}

interface UseCalculationsReturn {
  rankingData: RankingData[]
  studentIndicators: StudentIndicator[]
  classStats: ClassStats
  classAverages: ClassAverages
}

export function useCalculations({ students, matchResults, teams }: UseCalculationsProps): UseCalculationsReturn {
  
  const { classStats, classAverages } = useMemo(() => {
    if (students.length === 0) {
      return {
        classStats: {
          avgLucro: 0, avgSatisfacao: 0, avgBonus: 0, engajamento: 0,
          totalMatches: 0, avgMatches: 0, totalResults: 0, avgTotal: 0
        },
        classAverages: { lucro: 0, satisfacao: 0, bonus: 0 }
      }
    }

    // Calcular médias POR ALUNO primeiro, depois média geral
    const studentAverages = students.map(student => {
      const studentResults = matchResults.filter(r => r.player_id === student.id)
      const count = studentResults.length

      if (count === 0) return { lucro: 0, satisfacao: 0, bonus: 0 }

      const totalLucro = studentResults.reduce((sum, r) => sum + (r.lucro || 0), 0)
      const totalSatisfacao = studentResults.reduce((sum, r) => sum + (r.satisfacao || 0), 0)
      const totalBonus = studentResults.reduce((sum, r) => sum + (r.bonus_money || 0), 0)

      return {
        lucro: totalLucro / count,
        satisfacao: totalSatisfacao / count,
        bonus: totalBonus / count
      }
    })

    const participatingStudents = studentAverages.filter(avg => avg.lucro > 0 || avg.satisfacao > 0 || avg.bonus > 0)
    const numParticipating = participatingStudents.length

    const avgLucro = numParticipating > 0
      ? participatingStudents.reduce((sum, avg) => sum + avg.lucro, 0) / numParticipating
      : 0
    const avgSatisfacao = numParticipating > 0
      ? participatingStudents.reduce((sum, avg) => sum + avg.satisfacao, 0) / numParticipating
      : 0
    const avgBonus = numParticipating > 0
      ? participatingStudents.reduce((sum, avg) => sum + avg.bonus, 0) / numParticipating
      : 0
    const avgTotal = avgLucro + avgSatisfacao + avgBonus

    const totalParticipations = matchResults.length

    const uniqueMatchNumbers = [...new Set(matchResults.map(r => r.match_number))]
    const totalUniqueMatches = uniqueMatchNumbers.length
    const avgMatches = students.length > 0 ? totalParticipations / students.length : 0

    const engajamento = students.length > 0 && totalUniqueMatches > 0
      ? Math.min(100, Math.round((totalParticipations / (students.length * totalUniqueMatches)) * 100))
      : 0

    return {
      classStats: {
        avgLucro: Math.round(avgLucro),
        avgSatisfacao: Math.round(avgSatisfacao),
        avgBonus: Math.round(avgBonus),
        engajamento,
        totalMatches: totalUniqueMatches,
        avgMatches: parseFloat(avgMatches.toFixed(1)),
        totalResults: totalParticipations,
        avgTotal: Math.round(avgTotal)
      },
      classAverages: {
        lucro: avgLucro,
        satisfacao: avgSatisfacao,
        bonus: avgBonus
      }
    }
  }, [students, matchResults])

  const studentIndicators = useMemo(() => {
    if (students.length === 0) return []

    const indicators = students.map(student => {
      const studentResults = matchResults.filter(result => result.player_id === student.id)
      const numMatches = studentResults.length

      const totalLucro = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
      const avgLucro = numMatches > 0 ? totalLucro / numMatches : 0

      const satisfacaoResults = studentResults.filter(result => result.satisfacao !== null)
      const totalSatisfacao = satisfacaoResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
      const avgSatisfacao = satisfacaoResults.length > 0 ? totalSatisfacao / satisfacaoResults.length : 0

      const totalBonus = studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
      const avgBonus = numMatches > 0 ? totalBonus / numMatches : 0

      const studentTeam = teams.find(team => team.members.some(member => member.id === student.id))

      const totalUniqueMatches = [...new Set(matchResults.map(r => r.match_number))].length
      const individualEngagement = totalUniqueMatches > 0
        ? Math.min(100, Math.round((studentResults.length / totalUniqueMatches) * 100))
        : 0

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        totalLucro,
        avgLucro,
        avgSatisfacao: Math.round(avgSatisfacao),
        totalBonus,
        avgBonus,
        purpose: student.purpose,
        groupPurpose: studentTeam?.group_purpose || null,
        statusColor: 'red' as StatusColor,
        lucroPosition: 0,
        satisfacaoPosition: 0,
        bonusPosition: 0,
        totalPosition: 0,
        isTeam: !!student.team_id,
        hasParticipated: studentResults.length > 0,
        individualEngagement
      }
    })

    const participatingStudents = indicators.filter(s => s.hasParticipated)
    const avgForParticipants = {
      lucro: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.avgLucro, 0) / participatingStudents.length : 0,
      satisfacao: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.avgSatisfacao, 0) / participatingStudents.length : 0,
      bonus: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.avgBonus, 0) / participatingStudents.length : 0,
    }

    indicators.forEach(indicator => {
      indicator.statusColor = calculateStatusColor(
        indicator.purpose,
        indicator.groupPurpose,
        indicator.avgLucro,
        indicator.avgSatisfacao,
        indicator.avgBonus,
        indicator.individualEngagement,
        indicator.hasParticipated,
        avgForParticipants
      )
    })

    const lucroSorted = [...indicators].sort((a, b) => b.avgLucro - a.avgLucro)
    const satisfacaoSorted = [...indicators].sort((a, b) => b.avgSatisfacao - a.avgSatisfacao)
    const bonusSorted = [...indicators].sort((a, b) => b.avgBonus - a.avgBonus)

    indicators.forEach(indicator => {
      indicator.lucroPosition = lucroSorted.findIndex(s => s.id === indicator.id) + 1
      indicator.satisfacaoPosition = satisfacaoSorted.findIndex(s => s.id === indicator.id) + 1
      indicator.bonusPosition = bonusSorted.findIndex(s => s.id === indicator.id) + 1
      indicator.totalPosition = indicator.lucroPosition + indicator.satisfacaoPosition + indicator.bonusPosition
    })

    return indicators
  }, [students, matchResults, teams])

  const rankingData = useMemo(() => {
    if (students.length === 0) return []

    // Calculate ranking score by summing positions across all matches
    const studentStats = students.map(student => {
      const studentResults = matchResults.filter(result => result.player_id === student.id)
      const numMatches = studentResults.length

      const totalLucro = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
      const avgLucro = numMatches > 0 ? totalLucro / numMatches : 0

      const satisfacaoResults = studentResults.filter(result => result.satisfacao !== null)
      const totalSatisfacao = satisfacaoResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
      const avgSatisfacao = satisfacaoResults.length > 0 ? totalSatisfacao / satisfacaoResults.length : 0

      const totalBonus = studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
      const avgBonus = numMatches > 0 ? totalBonus / numMatches : 0

      return {
        id: student.id,
        name: student.name || 'Sem nome',
        totalLucro,
        avgLucro,
        avgSatisfacao,
        totalBonus,
        avgBonus,
        matches: numMatches,
        rankingScore: 0, // Will be calculated after all students
        isTeam: false,
        purpose: student.purpose
      }
    })

    const teamStats = teams
      .filter(team => team.members.length > 0)
      .map(team => {
        const teamResults = matchResults.filter(result =>
          team.members.some(member => member.id === result.player_id)
        )

        const numMatches = teamResults.length

        const totalLucro = teamResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
        const avgLucro = numMatches > 0 ? totalLucro / numMatches : 0

        const satisfacaoResults = matchResults.filter(result =>
          team.members.some(member => member.id === result.player_id) && result.satisfacao !== null
        )
        const totalSatisfacao = satisfacaoResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
        const avgSatisfacao = satisfacaoResults.length > 0 ? totalSatisfacao / satisfacaoResults.length : 0

        const totalBonus = teamResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
        const avgBonus = numMatches > 0 ? totalBonus / numMatches : 0

        return {
          id: team.id,
          name: team.name || 'Time sem nome',
          totalLucro,
          avgLucro,
          avgSatisfacao,
          totalBonus,
          avgBonus,
          matches: team.members.reduce((sum, member) => sum + matchResults.filter(r => r.player_id === member.id).length, 0),
          rankingScore: 0, // Will be calculated after all teams
          isTeam: true,
          purpose: team.group_purpose
        }
      })

    const activeStudents = studentStats.filter(student => student.matches > 0)
    const activeTeams = teamStats.filter(team => team.matches > 0)

    // Posições calculadas separadamente: alunos vs alunos, times vs times
    // (Iuri: ranking é entre todos os alunos da turma, não por propósito)
    const assignRankingScores = (entities: typeof activeStudents) => {
      const lucroRanked = [...entities].sort((a, b) => b.avgLucro - a.avgLucro)
      const satisfacaoRanked = [...entities].sort((a, b) => b.avgSatisfacao - a.avgSatisfacao)
      const bonusRanked = [...entities].sort((a, b) => b.avgBonus - a.avgBonus)
      entities.forEach(entity => {
        const lucroPos = lucroRanked.findIndex(e => e.id === entity.id) + 1
        const satisfacaoPos = satisfacaoRanked.findIndex(e => e.id === entity.id) + 1
        const bonusPos = bonusRanked.findIndex(e => e.id === entity.id) + 1
        entity.rankingScore = lucroPos + satisfacaoPos + bonusPos
      })
    }

    assignRankingScores(activeStudents)
    assignRankingScores(activeTeams)

    const allEntities = [...activeStudents, ...activeTeams]

    // Sort by ranking score (lower is better - like golf)
    const finalRanking = [...allEntities].sort((a, b) => {
      if (a.rankingScore !== b.rankingScore) return a.rankingScore - b.rankingScore
      // Tiebreaker: higher average lucro wins
      if (a.avgLucro !== b.avgLucro) return b.avgLucro - a.avgLucro
      // Tiebreaker: higher average satisfacao wins
      if (a.avgSatisfacao !== b.avgSatisfacao) return b.avgSatisfacao - a.avgSatisfacao
      // Tiebreaker: higher average bonus wins
      return b.avgBonus - a.avgBonus
    })

    return finalRanking.map((entity, index) => {
      const position = index + 1
      const totalUniqueMatches = [...new Set(matchResults.map(r => r.match_number))].length
      const individualEngagement = totalUniqueMatches > 0 
        ? Math.min(100, Math.round((entity.matches / totalUniqueMatches) * 100))
        : 0
      
      const statusColor = calculateStatusColor(
        entity.purpose,
        entity.isTeam ? entity.purpose : null,
        entity.avgLucro,
        entity.avgSatisfacao,
        entity.avgBonus,
        individualEngagement,
        entity.matches > 0,
        classAverages
      )
      
      return {
        name: entity.name,
        score: entity.rankingScore,
        position,
        matches: entity.matches,
        isTeam: entity.isTeam,
        purpose: entity.purpose,
        statusColor
      }
    })
  }, [students, matchResults, teams, classAverages])

  return {
    rankingData,
    studentIndicators,
    classStats,
    classAverages
  }
}

function calculateStatusColor(
  purpose: Purpose | null,
  groupPurpose: Purpose | null,
  avgLucro: number,
  avgSatisfacao: number,
  avgBonus: number,
  individualEngagement: number,
  hasParticipated: boolean,
  classAverages: ClassAverages
): StatusColor {
  const effectivePurpose = purpose || groupPurpose

  if (!hasParticipated) return 'gray'

  let performancePercentage = 0
  if (effectivePurpose && classAverages[effectivePurpose] > 0) {
    let currentValue = 0
    switch (effectivePurpose) {
      case 'lucro':
        currentValue = avgLucro
        break
      case 'satisfacao':
        currentValue = avgSatisfacao
        break
      case 'bonus':
        currentValue = avgBonus
        break
    }
    performancePercentage = (currentValue / classAverages[effectivePurpose]) * 100
  }

  const engagementWeight = 0.3
  const performanceWeight = 0.7
  const combinedScore = (performancePercentage * performanceWeight) + (individualEngagement * engagementWeight)

  if (combinedScore >= 80) return 'green'
  if (combinedScore >= 50) return 'yellow'
  return 'red'
}