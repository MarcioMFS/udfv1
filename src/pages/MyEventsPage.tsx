import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Calendar, Users, Edit, Trash2, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIsAdmin } from '../hooks'
import { ConfirmDialog } from '../components/modal/DialogModal'
import toast from 'react-hot-toast'

interface Event {
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
  created_at: string
  updated_at: string
  classesCount: number
}

export function MyEventsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { isAdmin } = useIsAdmin()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)

  useEffect(() => {
    console.log('📅 MyEventsPage useEffect - user:', !!user, 'authLoading:', authLoading)
    
    if (user && !authLoading) {
      console.log('✅ User available, loading events')
      loadEvents()
    } else if (!authLoading) {
      console.log('❌ No user available, setting loading to false')
      setIsLoading(false)
    }
  }, [user, authLoading])

  useEffect(() => {
    let filtered = events

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }


    setFilteredEvents(filtered)
  }, [events, searchTerm])

  const loadEvents = async () => {
    if (!user) {
      console.log('❌ loadEvents: No user available')
      setIsLoading(false)
      return
    }
    
    console.log('🔄 loadEvents: Starting to load events for user:', user.id)
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ loadEvents: Error loading events:', error)
        setIsLoading(false)
        return
      }

      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          // Count classes associated with this event
          let classCount = 0
          if (event.class_id) {
            classCount = 1 // If event has a class_id, it's associated with 1 class
          }

          return {
            ...event,
            classesCount: classCount
          }
        })
      )

      console.log('✅ loadEvents: Events loaded successfully:', eventsWithCounts.length)
      setEvents(eventsWithCounts)
    } catch (error) {
      console.error('❌ loadEvents: Error loading events:', error)
      toast.error('Erro ao carregar eventos')
    } finally {
      console.log('✅ loadEvents: Setting isLoading to false')
      setIsLoading(false)
    }
  }

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event)
    setConfirmOpen(true)
  }

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventToDelete.id)

      if (error) throw error

      setEvents(events.filter(e => e.id !== eventToDelete.id))
      toast.success('Evento excluído com sucesso!')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Erro ao excluir evento')
    } finally {
      setConfirmOpen(false)
      setEventToDelete(null)
    }
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Meus Eventos</h1>
          <p className="text-gray-600 mt-1">
            Gerencie os eventos que você criou no sistema
          </p>
        </div>
        
        {isAdmin ? (
          <Link
            to="/events/create"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Criar Evento
          </Link>
        ) : (
          <button
            disabled
            className="px-6 py-3 bg-gray-400 text-gray-200 rounded-lg cursor-not-allowed flex items-center gap-2 font-medium"
            title="Apenas administradores podem criar eventos"
          >
            <Plus className="w-5 h-5" />
            Criar Evento
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4"> {/* Added flex-col md:flex-row */}
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome, matéria ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando eventos...</p>
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {searchTerm ? 'Nenhum evento encontrado' : 'Nenhum evento criado'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece criando seu primeiro evento educacional.'
            }
          </p>
          {!searchTerm && (
            isAdmin ? (
              <Link
                to="/events/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Criar Primeiro Evento
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-400 text-gray-200 rounded-lg cursor-not-allowed"
                title="Apenas administradores podem criar eventos"
              >
                <Plus className="w-5 h-5" />
                Criar Primeiro Evento
              </button>
            )
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2 break-words">
                    {event.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-1 break-words">{event.subject}</p>
                </div>
              </div>

              {/* Event Code */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 mb-1">Código do Evento</p>
                <p className="text-lg font-bold text-gray-800 tracking-wider break-all">{event.code}</p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 gap-2 sm:gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm sm:text-lg font-bold text-gray-800">{event.classesCount}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">Turmas Vinculadas</p>
                </div>
              </div>

              {/* Creation Date */}
              <p className="text-xs text-gray-500 mb-4">
                Criado em {format(new Date(event.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteEvent(event)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Excluir</span>
                  </button>
                )}
                <Link
                  to={`/events/${event.id}`}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 flex-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Ver Dados</span>
                </Link>
                <Link
                  to={`/events/create?edit=${event.id}`}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDeleteEvent}
        message={`Tem certeza que deseja excluir o evento "${eventToDelete?.name}"? Esta ação não pode ser desfeita.`}
        title="Confirmar Exclusão"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />
    </div>
  )
}
