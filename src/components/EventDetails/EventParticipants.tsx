import { useState, useEffect } from 'react'
import { Users, UserPlus, Crown, CheckCircle, Clock, Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import toast from 'react-hot-toast'

interface EventParticipant {
  id: string
  event_id: string
  player_id: string
  player_name: string
  player_email: string
  status: 'invited' | 'participated' | 'candidate_instructor'
  invited_at: string
  participated_at?: string
  total_matches: number
  can_promote_to_instructor: boolean
}

interface ClassPlayer {
  id: string
  name: string
  email: string
}

interface EventParticipantsProps {
  eventId: string
  classId: string
  eventType: 'training' | 'group'
}

export function EventParticipants({ eventId, classId, eventType }: EventParticipantsProps) {
  const { isAdmin } = useIsAdmin()
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [availableStudents, setAvailableStudents] = useState<ClassPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isAddingParticipants, setIsAddingParticipants] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadParticipants()
    loadAvailableStudents()
  }, [eventId, classId])

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_event_participants_with_status', { event_id_param: eventId })

      if (error) throw error
      setParticipants(data || [])
    } catch (error) {
      console.error('Error loading participants:', error)
      setError('Erro ao carregar participantes')
    }
  }

  const loadAvailableStudents = async () => {
    try {
      // Get all students from class who are not yet participants of this event
      const { data, error } = await supabase
        .from('class_players')
        .select(`
          player_id,
          players!inner(
            id,
            name,
            email
          )
        `)
        .eq('class_id', classId)

      if (error) throw error

      // Filter out students who are already participants
      const { data: existingParticipants } = await supabase
        .from('event_participants')
        .select('player_id')
        .eq('event_id', eventId)

      const existingPlayerIds = new Set(existingParticipants?.map(p => p.player_id) || [])
      
      const available = (data || [])
        .filter(cp => !existingPlayerIds.has(cp.player_id))
        .map(cp => ({
          id: (cp.players as any)?.id || '',
          name: (cp.players as any)?.name || 'Nome não disponível',
          email: (cp.players as any)?.email || 'Email não disponível'
        }))

      setAvailableStudents(available)
    } catch (error) {
      console.error('Error loading available students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddParticipants = async () => {
    if (selectedStudents.length === 0) return

    setIsAddingParticipants(true)
    try {
      const participantsToAdd = selectedStudents.map(playerId => ({
        event_id: eventId,
        player_id: playerId,
        status: 'invited'
      }))

      const { error } = await supabase
        .from('event_participants')
        .insert(participantsToAdd)

      if (error) throw error

      toast.success(`${selectedStudents.length} participante(s) adicionado(s) com sucesso`)
      
      // Reload data
      await loadParticipants()
      await loadAvailableStudents()
      
      // Reset modal
      setSelectedStudents([])
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Error adding participants:', error)
      toast.error('Erro ao adicionar participantes')
    } finally {
      setIsAddingParticipants(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('Tem certeza que deseja remover este participante do evento?')) return

    try {
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('id', participantId)

      if (error) throw error

      toast.success('Participante removido com sucesso')
      await loadParticipants()
      await loadAvailableStudents()
    } catch (error) {
      console.error('Error removing participant:', error)
      toast.error('Erro ao remover participante')
    }
  }

  const handlePromoteToInstructor = async (participant: EventParticipant) => {
    if (!confirm(`Tem certeza que deseja promover ${participant.player_name} a instrutor?`)) return

    try {
      // Call the edge function to promote to instructor
      const { error } = await supabase.functions.invoke('promote-to-instructor', {
        body: {
          player_name: participant.player_name,
          player_email: participant.player_email,
          player_id: participant.player_id
        }
      })

      if (error) throw error

      toast.success(`${participant.player_name} foi promovido a instrutor com sucesso!`)
      await loadParticipants()
    } catch (error) {
      console.error('Error promoting to instructor:', error)
      toast.error('Erro ao promover a instrutor')
    }
  }

  const getStatusBadge = (participant: EventParticipant) => {
    // Se é candidato a instrutor mas já foi promovido, mostrar status de instrutor
    if (participant.status === 'candidate_instructor' && !participant.can_promote_to_instructor) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Crown className="w-3 h-3" />
          Instrutor
        </span>
      )
    }

    switch (participant.status) {
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3" />
            Convidado
          </span>
        )
      case 'participated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Participou
          </span>
        )
      case 'candidate_instructor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Crown className="w-3 h-3" />
            Candidato a Instrutor
          </span>
        )
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Participantes do Evento</h3>
              <p className="text-sm text-gray-600">
                {participants.length} participante{participants.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Participantes
          </button>
        </div>
      </div>

      <div className="p-6">
        {participants.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum participante adicionado ainda</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Adicionar Participantes
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="font-medium text-gray-800">{participant.player_name}</h4>
                    <p className="text-sm text-gray-600">{participant.player_email}</p>
                    {participant.total_matches > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {participant.total_matches} partida{participant.total_matches !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(participant)}

                  {/* Promote to Instructor button for training events */}
                  {isAdmin && eventType === 'training' && participant.can_promote_to_instructor && (
                    <button
                      onClick={() => handlePromoteToInstructor(participant)}
                      className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                    >
                      <Crown className="w-3 h-3" />
                      Promover a Instrutor
                    </button>
                  )}

                  {/* Remove participant button */}
                  <button
                    onClick={() => handleRemoveParticipant(participant.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Participants Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Adicionar Participantes</h3>
              <p className="text-sm text-gray-600 mt-1">Selecione os alunos da turma para participar deste evento</p>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {availableStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  Todos os alunos da turma já são participantes do evento
                </p>
              ) : (
                <div className="space-y-2">
                  {availableStudents.map((student) => (
                    <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id])
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setSelectedStudents([])
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddParticipants}
                disabled={selectedStudents.length === 0 || isAddingParticipants}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingParticipants ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Adicionar {selectedStudents.length > 0 && `(${selectedStudents.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}