export type EventType = 'training' | 'group'
export type Purpose = 'lucro' | 'satisfacao' | 'bonus'
export type StatusColor = 'green' | 'yellow' | 'red' | 'gray'

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Class {
  id: string
  code: string
  description: string | null
  instructor_id: string | null
  influencer_id: string | null
  created_at: string
  updated_at: string
  start_date?: string | null
  end_date?: string | null
  schedule?: Array<{
    'initial-time': string
    'end-time': string
  }>
  events?: {
    id: string
    name: string
    subject: string
    code: string
    schedule?: Array<{
      'initial-time': string
      'end-time': string
    }>
    start_date?: string | null
    end_date?: string | null
  }[]
  influencer?: {
    name: string
    email: string
  }
  instructor?: {
    name: string
    email: string
  }
}

export interface Event {
  id: string
  name: string | null
  code: string
  description: string | null
  subject: string | null
  difficulty: string
  time_limit: number
  max_players: number
  instructions: string | null
  start_date: string | null
  end_date: string | null
  instructor_id: string | null
  class_id: string | null
  event_type: 'training' | 'group'
  schedule: Array<{
    'initial-time': string
    'end-time': string
  }>
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  name: string | null
  email: string | null
  joined_at: string | null
  total_matches: number
  avg_score: number
  purpose: Purpose | null
  color: number
  team_id: string | null
}

export interface Team {
  id: string
  name: string | null
  group_purpose: Purpose | null
  class_id: string
  members: Student[]
}

export interface MatchResult {
  player_id: string
  class_id?: string
  event_id?: string
  match_number: number
  lucro: number | null
  satisfacao: number | null
  bonus: number | null
  bonus_money: number | null
  created_at: string
  player?: {
    name: string | null
    email: string | null
    purpose?: Purpose | null
  }
}

export interface RankingData {
  name: string
  score: number
  position: number
  matches: number
  isTeam?: boolean
  purpose?: Purpose | null
  statusColor?: StatusColor
}

export interface StudentIndicator {
  id: string
  name: string | null
  email: string | null
  totalLucro: number
  avgSatisfacao: number
  totalBonus: number
  purpose: Purpose | null
  groupPurpose: Purpose | null
  statusColor: StatusColor
  lucroPosition: number
  satisfacaoPosition: number
  bonusPosition: number
  totalPosition: number
  isTeam?: boolean
  hasParticipated: boolean
  individualEngagement: number
}

export interface ClassStats {
  avgLucro: number
  avgSatisfacao: number
  avgBonus: number
  engajamento: number
  totalMatches: number
  avgMatches: number
  totalResults: number
  avgTotal: number
}

export interface DashboardStats {
  classes: number
  events: number
  students: number
  matches: number
}

export interface ScheduledDateInfo {
  date: Date
  initialTime: string
  endTime: string
  description: string
  index: number
  eventId?: string
  eventName?: string
  eventSubject?: string
}

export interface ClassAverages {
  lucro: number
  satisfacao: number
  bonus: number
}

export interface StudentAlert {
  id: string
  name: string
  type: 'low_engagement' | 'poor_performance' | 'no_participation'
  severity: 'high' | 'medium' | 'low'
  message: string
}

export interface LoadingState {
  isLoading: boolean
}

export interface ErrorState {
  error: string | null
}

export interface BaseComponentProps extends LoadingState, ErrorState {
  className?: string
}

export type TabType = 'overview' | 'ranking' | 'indicators' | 'growth' | 'detailed-report'

export interface ExcelClassImport {
  classCode: string
  className: string
  instructorName: string
  instructorEmail: string
}

export interface ExcelStudentImport {
  name: string
  email: string
}

export interface ExcelEventImport {
  startDate: string
  endDate: string
  schedule: string
  eventType?: 'training' | 'group'
}

export interface ClassImportResult {
  success: boolean
  classId?: string
  studentsImported: number
  eventsImported: number
  errors: string[]
}

export interface ClassImportPreview {
  classExists: boolean
  classCode: string
  className: string
  instructorName: string
  instructorEmail: string
  studentsCount: number
  eventsCount: number
  existingClass?: {
    id: string
    description: string
    studentsCount: number
    eventsCount: number
  }
}