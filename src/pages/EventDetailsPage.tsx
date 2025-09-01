// src/pages/EventDetailsPage.tsx
import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Target,
  Settings,
  Clock,
  BarChart3,
  FileText,
  UserCheck
} from 'lucide-react'
import { useEventData } from '../hooks/useEventData'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { EventDashboard } from '../components/EventDetails/EventDashboard'
import { EventMatchesList } from '../components/EventDetails/EventMatchesList'
import { EventRankingFiltered } from '../components/EventDetails/EventRankingFiltered'
import { EventDetailedReport } from '../components/EventDetails/EventDetailedReport'
import { EventParticipants } from '../components/EventDetails/EventParticipants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type TabType = 'overview' | 'participants' | 'ranking' | 'report'

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
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
        </div>

        {/* Event Info Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Participantes</p>
                <p className="font-semibold text-gray-800">{stats.unique_players}</p>
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

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo do Evento</p>
                <p className="font-semibold text-gray-800">
                  {eventData.event_type === 'training' ? 'Training (Individual)' : 'Group (Em Equipe)'}
                </p>
              </div>
            </div>

            {eventData.schedule && eventData.schedule.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cronograma</p>
                  <p className="font-semibold text-gray-800">
                    {eventData.schedule.length} horário{eventData.schedule.length > 1 ? 's' : ''} programado{eventData.schedule.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Dashboard */}
      <EventDashboard 
        eventId={eventData.id}
        classId={eventData.class_id!}
        stats={{
          total_matches: stats.total_matches,
          unique_players: stats.unique_players,
          total_profit: stats.total_profit,
          avg_satisfaction: stats.avg_satisfaction,
          avg_bonus: stats.avg_bonus,
          engagement_rate: stats.engagement_rate,
          avg_matches_per_player: stats.avg_matches_per_player
        }}
      />

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Visão Geral
              </div>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'participants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Participantes
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ranking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Ranking
              </div>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'report'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Relatório
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <EventMatchesList matches={matches} />
            </div>
            <div className="lg:col-span-1">
              <EventRankingFiltered players={players} />
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <EventParticipants 
            eventId={eventData.id}
            classId={eventData.class_id!}
            eventType={eventData.event_type as 'training' | 'group'}
          />
        )}

        {activeTab === 'ranking' && (
          <div className="grid grid-cols-1 max-w-2xl mx-auto">
            <EventRankingFiltered players={players} />
          </div>
        )}

        {activeTab === 'report' && (
          <EventDetailedReport 
            eventData={eventData} 
            matches={matches} 
            players={players} 
            stats={stats} 
          />
        )}
      </div>
    </div>
  )
}