
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 min-h-[100px] sm:min-h-[120px] flex flex-col">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-end">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 truncate">
          {formatCompactNumber(value)}
        </h3>
        <p className="text-gray-600 text-xs sm:text-sm truncate" title={label}>
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
      <div className="min-h-screen bg-gray-50">
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Olá, {user?.name}! 👋
              </h2>
              <p className="text-gray-600">
                Aqui está um resumo das suas atividades no Sistema Ignição
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.link}
                    className={`p-4 sm:p-6 rounded-lg transition-all duration-200 text-left hover:scale-105 active:scale-95 ${action.color} min-h-[120px] flex flex-col justify-center`}
                  >
                    <action.icon className="w-6 h-6 sm:w-8 sm:h-8 mb-3 flex-shrink-0" />
                    <h4 className="font-medium mb-1 text-sm sm:text-base">{action.title}</h4>
                    <p className="text-xs sm:text-sm opacity-80">{action.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">
                  Minhas conquistas
                </h3>
                <Link 
                  to="/profile"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  Ver mais
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <p className='text-x text-gray-500 mb-3' >Conquistas mais avançadas</p>
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