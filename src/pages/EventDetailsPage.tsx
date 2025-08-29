// src/pages/EventDetailsPage.tsx
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Clock,
  Target
} from 'lucide-react'
import { useEventData } from '../hooks/useEventData'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { EventStatsCards } from '../components/EventDetails/EventStatsCards'
import { EventMatchesList } from '../components/EventDetails/EventMatchesList'
import { EventPlayerRanking } from '../components/EventDetails/EventPlayerRanking'
import { EventDetailedReport } from '../components/EventDetails/EventDetailedReport'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { eventData, matches, players, stats, isLoading, error, refetch } = useEventData(id)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          message={error} 
          onRetry={refetch}
        />
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Evento não encontrado</h2>
          <p className="text-gray-600 mb-4">O evento solicitado não foi encontrado ou você não tem permissão para visualizá-lo.</p>
          <Link 
            to="/my-events" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Eventos
          </Link>
        </div>
      </div>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'  
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil'
      case 'medium': return 'Médio'
      case 'hard': return 'Difícil'
      default: return difficulty
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            to="/my-events" 
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{eventData.name}</h1>
            <p className="text-gray-600">{eventData.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(eventData.difficulty)}`}>
              {getDifficultyLabel(eventData.difficulty)}
            </span>
          </div>
        </div>

        {/* Event Info Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Código do Evento</p>
                <p className="font-mono font-bold text-gray-800 text-lg">{eventData.code}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tempo Limite</p>
                <p className="font-semibold text-gray-800">{eventData.time_limit} min</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Dificuldade</p>
                <p className="font-semibold text-gray-800">{getDifficultyLabel(eventData.difficulty)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Criado em</p>
                <p className="font-semibold text-gray-800">
                  {format(new Date(eventData.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <EventStatsCards stats={stats} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Matches List */}
          <EventMatchesList matches={matches} />
          
          {/* Detailed Report */}
          <EventDetailedReport 
            eventData={eventData} 
            matches={matches} 
            players={players} 
            stats={stats} 
          />
        </div>
        
        <div className="lg:col-span-1">
          {/* Player Ranking */}
          <EventPlayerRanking players={players} />
        </div>
      </div>
    </div>
  )
}