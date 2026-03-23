
import { Link } from 'react-router-dom'
import { Users, Calendar, BookOpen, Activity, ChevronRight } from 'lucide-react'

import { useInstructorStats } from '../hooks/useInstructorStats'
import { useAuth } from '../contexts/AuthContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PageLoading, ErrorMessage } from '../components/ui'
import { formatCompactNumber } from '../utils/formatters'
import { BadgeCard } from '@/components/Levels/BadgeCard'
import { createBadgeCardData } from '../utils/badgeUtils'

interface StatCardProps {
  icon: typeof Users
  value: number
  label: string
  color: string
}

function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-3xl font-display font-800 text-gray-900 leading-none mb-1">
          {formatCompactNumber(value)}
        </p>
        <p className="text-gray-400 text-xs font-body font-medium uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { 
    stats: instructorStats, 
    isLoading, 
    error,
    refetch
  } = useInstructorStats()

  const quickActions = [
    {
      title: "Ver Turmas",
      description: "Turmas sincronizadas",
      icon: Users,
      color: "bg-blue-50 hover:bg-blue-100 text-blue-600",
      link: "/classes"
    }
  ]

  if (isLoading) {
    return <PageLoading message="Carregando dashboard..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        title="Erro ao carregar dashboard"
        message={error}
        onRetry={refetch}
      />
    )
  }

  const allBadges = createBadgeCardData(instructorStats)
  
  // Calculate progress percentage for each badge
  const badgesWithProgress = allBadges.map(badge => {
    const { current, stages, title } = badge
    const isInverseBadge = title === 'Pioneiro'
    
    let progress = 0
    let currentStageIndex = 0
    
    if (isInverseBadge) {
      // For inverse badges (lower is better)
      for (let i = 0; i < stages.length; i++) {
        if (current <= stages[i]) {
          currentStageIndex = i + 1
        }
      }
      if (currentStageIndex > stages.length) {
        currentStageIndex = stages.length
      }
      
      if (currentStageIndex < stages.length) {
        const nextTarget = stages[currentStageIndex]
        const previousTarget = currentStageIndex > 0 ? stages[currentStageIndex - 1] : stages[stages.length - 1]
        progress = Math.min(100, Math.round(((previousTarget - current) / (previousTarget - nextTarget)) * 100))
      } else {
        progress = 100
      }
    } else {
      // For normal badges (higher is better)
      for (let i = 0; i < stages.length; i++) {
        if (current >= stages[i]) {
          currentStageIndex = i + 1
        } else {
          break
        }
      }
      if (currentStageIndex > stages.length) {
        currentStageIndex = stages.length
      }
      
      if (currentStageIndex < stages.length) {
        const nextTarget = stages[currentStageIndex]
        const previousTarget = currentStageIndex > 0 ? stages[currentStageIndex - 1] : 0
        progress = Math.min(100, Math.round(((current - previousTarget) / (nextTarget - previousTarget)) * 100))
      } else {
        progress = 100
      }
    }
    
    // Calculate overall progress (stage completion + current stage progress)
    const stageProgress = currentStageIndex * 20 // Each stage is worth 20%
    const withinStageProgress = progress * 0.2 // Current stage progress contributes 20%
    const totalProgress = Math.min(100, stageProgress + withinStageProgress)
    
    return {
      ...badge,
      calculatedProgress: totalProgress,
      hasAnyProgress: current > 0 || (isInverseBadge && current > 0)
    }
  })
  
  // Show the 2 badges with highest progress that have some activity
  const dashboardBadges = badgesWithProgress
    .filter(badge => badge.hasAnyProgress) // Only show badges with some progress
    .sort((a, b) => b.calculatedProgress - a.calculatedProgress) // Sort by progress descending
    .slice(0, 2) // Take top 2

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-1 tracking-tight">
                Olá, {user?.name?.split(' ')[0]}
              </h2>
              <p className="text-gray-400 text-sm font-body">
                Resumo das suas atividades no Sistema Ignição
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <StatCard 
                icon={Users} 
                value={instructorStats.classes} 
                label="Turmas Criadas" 
                color="bg-blue-500" 
              />
              <StatCard 
                icon={BookOpen} 
                value={instructorStats.students} 
                label="Alunos Total" 
                color="bg-purple-500" 
              />
              <StatCard 
                icon={Activity} 
                value={instructorStats.matches} 
                label="Partidas Realizadas" 
                color="bg-orange-500" 
              />
              <StatCard 
                icon={Calendar} 
                value={instructorStats.events} 
                label="Eventos Organizados" 
                color="bg-green-500" 
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-display font-bold text-gray-800 mb-4 tracking-tight">
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.link}
                    className={`p-5 rounded-xl transition-all duration-200 text-left active:scale-95 ${action.color} flex items-center gap-4 group`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center flex-shrink-0">
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm">{action.title}</h4>
                      <p className="text-xs opacity-70 font-body mt-0.5">{action.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:opacity-70 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-display font-bold text-gray-800 tracking-tight">
                  Minhas conquistas
                </h3>
                <Link
                  to="/profile"
                  className="flex items-center gap-1 text-sm font-body font-medium transition-colors"
                  style={{ color: '#28377F' }}
                >
                  Ver mais
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-xs text-gray-400 font-body mb-4">Conquistas mais avançadas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dashboardBadges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}