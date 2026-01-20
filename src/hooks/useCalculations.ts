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

    const totalLucro = matchResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
    const totalSatisfacao = matchResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
    const totalBonus = matchResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
    
    const totalParticipations = matchResults.length
    const avgLucro = totalParticipations > 0 ? totalLucro / totalParticipations : 0
    const avgSatisfacao = totalParticipations > 0 ? totalSatisfacao / totalParticipations : 0
    const avgBonus = totalParticipations > 0 ? totalBonus / totalParticipations : 0
    const avgTotal = avgLucro + avgSatisfacao + avgBonus

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
      const totalLucro = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
      
      const satisfacaoResults = studentResults.filter(result => result.satisfacao !== null)
      const totalSatisfacao = satisfacaoResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
      const avgSatisfacao = satisfacaoResults.length > 0 ? totalSatisfacao / satisfacaoResults.length : 0
      
      const totalBonus = studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)
      
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
        avgSatisfacao: Math.round(avgSatisfacao),
        totalBonus,
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
      lucro: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.totalLucro, 0) / participatingStudents.length : 0,
      satisfacao: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.avgSatisfacao, 0) / participatingStudents.length : 0,
      bonus: participatingStudents.length > 0 ? participatingStudents.reduce((sum, s) => sum + s.totalBonus, 0) / participatingStudents.length : 0,
    }

    indicators.forEach(indicator => {
      indicator.statusColor = calculateStatusColor(
        indicator.purpose,
        indicator.groupPurpose,
        indicator.totalLucro,
        indicator.avgSatisfacao,
        indicator.totalBonus,
        indicator.individualEngagement,
        indicator.hasParticipated,
        avgForParticipants
      )
    })

    const lucroSorted = [...indicators].sort((a, b) => b.totalLucro - a.totalLucro)
    const satisfacaoSorted = [...indicators].sort((a, b) => b.avgSatisfacao - a.avgSatisfacao)
    const bonusSorted = [...indicators].sort((a, b) => b.totalBonus - a.totalBonus)

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

    const studentStats = students.map(student => {
      const studentResults = matchResults.filter(result => result.player_id === student.id)
      const totalLucro = studentResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
      
      const satisfacaoResults = studentResults.filter(result => result.satisfacao !== null)
      const totalSatisfacao = satisfacaoResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
      const avgSatisfacao = satisfacaoResults.length > 0 ? totalSatisfacao / satisfacaoResults.length : 0
      
      const totalBonus = studentResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)

      return {
        id: student.id,
        name: student.name || 'Sem nome',
        totalLucro,
        avgSatisfacao,
        totalBonus,
        matches: studentResults.length,
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

        const totalLucro = teamResults.reduce((sum, result) => sum + (result.lucro || 0), 0)
        
        const satisfacaoResults = matchResults.filter(result =>
          team.members.some(member => member.id === result.player_id) && result.satisfacao !== null
        )
        const totalSatisfacao = satisfacaoResults.reduce((sum, result) => sum + (result.satisfacao || 0), 0)
        const avgSatisfacao = satisfacaoResults.length > 0 ? totalSatisfacao / satisfacaoResults.length : 0
        
        const totalBonus = teamResults.reduce((sum, result) => sum + (result.bonus_money || 0), 0)

        return {
          id: team.id,
          name: team.name || 'Time sem nome',
          totalLucro,
          avgSatisfacao,
          totalBonus,
          matches: team.members.reduce((sum, member) => sum + matchResults.filter(r => r.player_id === member.id).length, 0),
          isTeam: true,
          purpose: team.group_purpose
        }
      })

    const activeStudents = studentStats.filter(student => student.matches > 0)
    const activeTeams = teamStats.filter(team => team.matches > 0)
    const allEntities = [...activeStudents, ...activeTeams]

    const lucroRanking = [...allEntities].sort((a, b) => b.totalLucro - a.totalLucro)
    const satisfacaoRanking = [...allEntities].sort((a, b) => b.avgSatisfacao - a.avgSatisfacao)
    const bonusRanking = [...allEntities].sort((a, b) => b.totalBonus - a.totalBonus)

    const finalRanking = allEntities.map(entity => {
      const lucroPos = lucroRanking.findIndex(e => e.id === entity.id) + 1
      const satisfacaoPos = satisfacaoRanking.findIndex(e => e.id === entity.id) + 1
      const bonusPos = bonusRanking.findIndex(e => e.id === entity.id) + 1
      const totalPosition = lucroPos + satisfacaoPos + bonusPos

      return { ...entity, totalPosition }
    })

    finalRanking.sort((a, b) => {
      if (a.totalPosition !== b.totalPosition) return a.totalPosition - b.totalPosition
      if (a.totalLucro !== b.totalLucro) return b.totalLucro - a.totalLucro
      if (a.avgSatisfacao !== b.avgSatisfacao) return b.avgSatisfacao - a.avgSatisfacao
      return b.totalBonus - a.totalBonus
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
        entity.totalLucro,
        entity.avgSatisfacao,
        entity.totalBonus,
        individualEngagement,
        entity.matches > 0,
        classAverages
      )
      
      return {
        name: entity.name,
        score: entity.totalPosition,
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
  totalLucro: number,
  avgSatisfacao: number,
  totalBonus: number,
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
        currentValue = totalLucro
        break
      case 'satisfacao':
        currentValue = avgSatisfacao
        break
      case 'bonus':
        currentValue = totalBonus
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