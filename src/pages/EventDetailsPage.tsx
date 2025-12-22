import { useParams, Link, useNavigate } from 'react-router-dom'
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
  UserCheck,
  Edit,
  Trash2
} from 'lucide-react'
import { useEventData } from '../hooks/useEventData'
import { useIsAdmin } from '../hooks'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
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
  const navigate = useNavigate()
  const { isAdmin } = useIsAdmin()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isDeleting, setIsDeleting] = useState(false)
  const { eventData, matches, players, stats, isLoading, error, refetch } = useEventData(id)

  const handleDeleteEvent = async () => {
    if (!id) return

    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o evento "${eventData?.name}"?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Evento deletado com sucesso!')
      navigate('/my-events')
    } catch (error) {
      console.error('Erro ao deletar evento:', error)
      toast.error('Erro ao deletar evento. Verifique suas permissões.')
      setIsDeleting(false)
    }
  }

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
    <div className="min-h-screen bg-gray-50 prevent-overflow">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full prevent-overflow">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 sm:gap-4 mb-4">
          <Link
            to="/my-events"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{eventData.name}</h1>
            <p className="text-sm sm:text-base text-gray-600 truncate">{eventData.subject}</p>
          </div>
          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Link
              to={`/events/create?edit=${id}`}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar Horários</span>
            </Link>
            {isAdmin && (
              <button
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{isDeleting ? 'Deletando...' : 'Deletar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Event Info Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 w-full overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Código do Evento</p>
                <p className="font-mono font-bold text-gray-800 text-sm sm:text-lg truncate">{eventData.code}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Participantes</p>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">{stats.unique_players}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Criado em</p>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">
                  {format(new Date(eventData.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Tipo do Evento</p>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">
                  {eventData.event_type === 'training' ? 'Training (Individual)' : 'Group (Em Equipe)'}
                </p>
              </div>
            </div>

            {eventData.schedule && eventData.schedule.length > 0 && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Cronograma</p>
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">
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
      <div className="mb-4 sm:mb-6">
        <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max px-2 sm:px-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1.5 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Visão Geral</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`py-2 px-1.5 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'participants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Participantes</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`py-2 px-1.5 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'ranking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Ranking</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`py-2 px-1.5 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'report'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Relatório</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-4 sm:mb-6 w-full prevent-overflow">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
            <div className="lg:col-span-2 w-full min-w-0">
              <EventMatchesList matches={matches} />
            </div>
            <div className="lg:col-span-1 w-full min-w-0">
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
    </div>
  )
}