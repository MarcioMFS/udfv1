export type BadgeLevel = 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista' | 'Expert'

export type BadgeCategory = 'classes' | 'students' | 'matches' | 'events' | 'leaders' | 'totalProfit' | 'packagesSold' | 'engagement' | 'pioneerRank' | 'top10Classes' | 'top5Classes' | 'top3Classes'

export interface BadgeConfig {
  name: string
  category: BadgeCategory
  goals: [number, number, number, number, number] // [Júnior, Pleno, Sênior, Especialista, Expert]
}

export interface InstructorStats {
  instructor_id: string
  classes: number
  students: number
  matches: number
  events: number
  leaders: number
  totalProfit: number
  packagesSold: number
  engagement: number
  pioneerRank: number
  top10Classes: number
  top5Classes: number
  top3Classes: number
}

export interface BadgeProgress {
  badge: string
  progress: number
  level: BadgeLevel | null
  nextGoal: number | null
  percentage: number
}

export interface BadgeResult {
  instructor_id: string
  badges: BadgeProgress[]
}

export interface InstructorStatsRow {
  instructor_id: string
  classes?: number
  students?: number
  matches?: number
  events?: number
  created_at?: string
  updated_at?: string
}