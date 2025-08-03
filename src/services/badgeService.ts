import { supabase } from '../lib/supabase'
import { InstructorStats, BadgeResult } from '../types/badges'
import { BADGE_CONFIGS, calculateBadgeProgress } from '../utils/badgeUtils'

export class BadgeService {
  
  async getInstructorStats(instructorId: string): Promise<InstructorStats> {
    // Get instructor stats from instructor_stats table if it exists
    const { data: statsData, error: statsError } = await supabase
      .from('instructor_stats')
      .select('*')
      .eq('instructor_id', instructorId)
      .single()

    if (!statsError && statsData) {
      return {
        instructor_id: instructorId,
        classes: statsData.classes || 0,
        students: statsData.students || 0,
        matches: statsData.matches || 0,
        events: statsData.events || 0,
        leaders: statsData.leaders || 0,
        totalProfit: statsData.totalprofit || 0,
        packagesSold: statsData.packagessold || 0,
        engagement: statsData.engagement || 0,
        pioneerRank: statsData.pioneerrank || 0,
        top10Classes: statsData.top10classes || 0,
        top5Classes: statsData.top5classes || 0,
        top3Classes: statsData.top3classes || 0
      }
    }

    // If no stats table exists, calculate from base tables
    return await this.calculateStatsFromTables(instructorId)
  }

  private async calculateStatsFromTables(instructorId: string): Promise<InstructorStats> {
    const [
      classesCount, 
      studentsCount, 
      matchesCount, 
      eventsCount,
      leadersCount,
      totalProfit,
      packagesSold,
      engagement,
      pioneerRank,
      top10Classes,
      top5Classes,
      top3Classes
    ] = await Promise.all([
      this.getClassesCount(instructorId),
      this.getStudentsCount(instructorId),
      this.getMatchesCount(instructorId),
      this.getEventsCount(instructorId),
      this.getLeadersCount(instructorId),
      this.getTotalProfit(instructorId),
      this.getPackagesSold(instructorId),
      this.getEngagement(instructorId),
      this.getPioneerRank(instructorId),
      this.getTop10Classes(instructorId),
      this.getTop5Classes(instructorId),
      this.getTop3Classes(instructorId)
    ])

    return {
      instructor_id: instructorId,
      classes: classesCount,
      students: studentsCount,
      matches: matchesCount,
      events: eventsCount,
      leaders: leadersCount,
      totalProfit,
      packagesSold,
      engagement,
      pioneerRank,
      top10Classes,
      top5Classes,
      top3Classes
    }
  }

  private async getClassesCount(instructorId: string): Promise<number> {
    const { count, error } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', instructorId)

    if (error) {
      console.error('Error counting classes:', error)
      return 0
    }

    return count || 0
  }

  private async getStudentsCount(instructorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        class_players (
          player_id
        )
      `)
      .eq('instructor_id', instructorId)

    if (error) {
      console.error('Error counting students:', error)
      return 0
    }

    const uniqueStudents = new Set()
    data?.forEach(classItem => {
      classItem.class_players?.forEach((cp: any) => {
        if (cp.player_id) {
          uniqueStudents.add(cp.player_id)
        }
      })
    })

    return uniqueStudents.size
  }

  private async getMatchesCount(instructorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        matches (
          id
        )
      `)
      .eq('instructor_id', instructorId)

    if (error) {
      console.error('Error counting matches:', error)
      return 0
    }

    let totalMatches = 0
    data?.forEach(classItem => {
      totalMatches += classItem.matches?.length || 0
    })

    return totalMatches
  }

  private async getEventsCount(instructorId: string): Promise<number> {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', instructorId)

    if (error) {
      console.error('Error counting events:', error)
      return 0
    }

    return count || 0
  }

  private async getLeadersCount(instructorId: string): Promise<number> {
    // Buscar alunos das turmas do instrutor
    const { data: classIds } = await supabase
      .from('classes')
      .select('id')
      .eq('instructor_id', instructorId)

    if (!classIds?.length) return 0

    const ids = classIds.map(c => c.id)
    
    // Buscar players dessas turmas
    const { data: classPlayers, error: playersError } = await supabase
      .from('class_players')
      .select('player_id')
      .in('class_id', ids)

    if (playersError || !classPlayers?.length) {
      console.error('Error fetching class players:', playersError)
      return 0
    }

    // Extrair IDs únicos dos players
    const uniquePlayerIds = [...new Set(classPlayers.map(cp => cp.player_id).filter(Boolean))]

    if (!uniquePlayerIds.length) return 0

    // Verificar quantos desses players se tornaram instrutores
    const { data: instructors, error: instructorsError } = await supabase
      .from('instructors')
      .select('id')
      .in('id', uniquePlayerIds)

    if (instructorsError) {
      console.error('Error counting leaders (players who became instructors):', instructorsError)
      return 0
    }

    return instructors?.length || 0
  }

  private async getTotalProfit(instructorId: string): Promise<number> {
    const { data: classIds } = await supabase
      .from('classes')
      .select('id')
      .eq('instructor_id', instructorId)

    if (!classIds?.length) return 0

    const ids = classIds.map(c => c.id)
    const { data, error } = await supabase
      .from('match_results')
      .select('lucro')
      .in('class_id', ids)

    if (error) {
      console.error('Error calculating total profit:', error)
      return 0
    }

    return data?.reduce((acc, curr) => acc + (curr.lucro || 0), 0) || 0
  }

  private async getPackagesSold(instructorId: string): Promise<number> {
    const { count, error } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', instructorId)

    if (error) {
      console.error('Error counting packages sold:', error)
      return 0
    }
    return count || 0
  }

  private async getEngagement(instructorId: string): Promise<number> {
    const { data: classIds } = await supabase
      .from('classes')
      .select('id')
      .eq('instructor_id', instructorId)

    if (!classIds?.length) return 0

    const ids = classIds.map(c => c.id)
    const { data, error } = await supabase
      .from('match_results')
      .select('satisfacao')
      .in('class_id', ids)
      .not('satisfacao', 'is', null)

    if (error) {
      console.error('Error calculating engagement (satisfaction):', error)
      return 0
    }

    if (!data?.length) return 0

    const total = data.reduce((sum, row) => sum + (row.satisfacao || 0), 0)
    return Math.round(total / data.length)
  }

  private async getPioneerRank(instructorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('instructors')
      .select('id, created_at')
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Error calculating pioneer rank:', error)
      return 0
    }

    const rank = data?.findIndex(instructor => instructor.id === instructorId) + 1
    return rank > 0 && rank <= 100 ? rank : 0
  }

  private async getClassRankingData() {
    // Calcular ranking das turmas por média de lucro
    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        instructor_id,
        match_results (
          lucro
        )
      `)

    if (error) {
      console.error('Error calculating class ranking:', error)
      return []
    }

    // Calcular média de lucro por turma
    const classAvgs = data?.map(classItem => {
      const results = classItem.match_results || []
      const totalProfit = results.reduce((sum: number, result: any) => sum + (result.lucro || 0), 0)
      const avgProfit = results.length > 0 ? totalProfit / results.length : 0
      
      return {
        class_id: classItem.id,
        instructor_id: classItem.instructor_id,
        avgProfit
      }
    }) || []

    // Ordenar por média de lucro (decrescente)
    classAvgs.sort((a, b) => b.avgProfit - a.avgProfit)
    return classAvgs
  }

  private async getTop10Classes(instructorId: string): Promise<number> {
    const classAvgs = await this.getClassRankingData()
    let count = 0
    
    classAvgs.forEach((classAvg, index) => {
      if (classAvg.instructor_id === instructorId && index < 10) {
        count++
      }
    })
    
    return count
  }

  private async getTop5Classes(instructorId: string): Promise<number> {
    const classAvgs = await this.getClassRankingData()
    let count = 0
    
    classAvgs.forEach((classAvg, index) => {
      if (classAvg.instructor_id === instructorId && index < 5) {
        count++
      }
    })
    
    return count
  }

  private async getTop3Classes(instructorId: string): Promise<number> {
    const classAvgs = await this.getClassRankingData()
    let count = 0
    
    classAvgs.forEach((classAvg, index) => {
      if (classAvg.instructor_id === instructorId && index < 3) {
        count++
      }
    })
    
    return count
  }

  async getInstructorBadges(instructorId: string): Promise<BadgeResult> {
    const stats = await this.getInstructorStats(instructorId)
    
    const badges = BADGE_CONFIGS.map(config => 
      calculateBadgeProgress(stats, config)
    )

    return {
      instructor_id: instructorId,
      badges
    }
  }

  async updateInstructorStats(instructorId: string): Promise<InstructorStats> {
    const stats = await this.calculateStatsFromTables(instructorId)
    
    // Try to upsert into instructor_stats table if it exists
    const { error } = await supabase
      .from('instructor_stats')
      .upsert({
        instructor_id: instructorId,
        classes: stats.classes,
        students: stats.students,
        matches: stats.matches,
        events: stats.events,
        leaders: stats.leaders,
        totalprofit: stats.totalProfit,
        packagessold: stats.packagesSold,
        engagement: stats.engagement,
        pioneerrank: stats.pioneerRank,
        top10classes: stats.top10Classes,
        top5classes: stats.top5Classes,
        top3classes: stats.top3Classes,
        updated_at: new Date().toISOString()
      })

    if (error && !error.message.includes('relation "instructor_stats" does not exist')) {
      console.error('Error updating instructor stats:', error)
    }

    return stats
  }
}