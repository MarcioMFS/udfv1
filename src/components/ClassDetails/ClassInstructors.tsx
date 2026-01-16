import { useState, useEffect } from 'react'
import { Crown, Users, UserPlus, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import toast from 'react-hot-toast'

interface InstructorCandidate {
  player_id: string
  player_name: string
  player_email: string
  event_name: string
  event_id: string
  total_matches: number
  participated_at: string
}

interface CurrentInstructor {
  id: string
  name: string
  email: string
  created_at: string
}

interface ClassInstructorsProps {
  classId: string
}

export function ClassInstructors({ classId }: ClassInstructorsProps) {
  const { isAdmin } = useIsAdmin()
  const [candidates, setCandidates] = useState<InstructorCandidate[]>([])
  const [currentInstructors, setCurrentInstructors] = useState<CurrentInstructor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPromoting, setIsPromoting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [classId])

  const loadData = async () => {
    try {
      await Promise.all([
        loadInstructorCandidates(),
        loadCurrentInstructors()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const loadInstructorCandidates = async () => {
    // Get all training event participants from this class who are candidates for instructor
    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        player_id,
        participated_at,
        players!inner(
          name,
          email
        ),
        events!inner(
          id,
          name,
          event_type,
          class_id
        )
      `)
      .eq('status', 'candidate_instructor')
      .eq('events.class_id', classId)
      .eq('events.event_type', 'training')

    if (error) throw error

    // Get match counts for each candidate
    const candidatesWithMatches = await Promise.all(
      (data || []).map(async (candidate) => {
        const { data: matchData } = await supabase
          .from('match_results')
          .select('id')
          .eq('player_id', candidate.player_id)
          .eq('event_id', (candidate.events as any)?.id)

        return {
          player_id: candidate.player_id,
          player_name: (candidate.players as any)?.name || 'Nome não disponível',
          player_email: (candidate.players as any)?.email || 'Email não disponível',
          event_name: (candidate.events as any)?.name || 'Evento sem nome',
          event_id: (candidate.events as any)?.id || '',
          total_matches: matchData?.length || 0,
          participated_at: candidate.participated_at
        }
      })
    )

    const { data: existingInstructors } = await supabase
      .from('instructors')
      .select('email')

    const existingEmails = new Set(existingInstructors?.map(i => i.email) || [])
    const filteredCandidates = candidatesWithMatches.filter(
      candidate => !existingEmails.has(candidate.player_email)
    )

    setCandidates(filteredCandidates)
  }

  const loadCurrentInstructors = async () => {
    const { data, error } = await supabase
      .from('instructors')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error
    setCurrentInstructors(data || [])
  }

  const handlePromoteToInstructor = async (candidate: InstructorCandidate) => {
    if (!confirm(`Tem certeza que deseja promover ${candidate.player_name} a instrutor?`)) return

    setIsPromoting(candidate.player_id)
    try {
      const { data, error } = await supabase.functions.invoke('promote-to-instructor', {
        body: {
          player_name: candidate.player_name,
          player_email: candidate.player_email,
          player_id: candidate.player_id
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao promover a instrutor')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao promover a instrutor')
      }

      toast.success(`${candidate.player_name} foi promovido a instrutor com sucesso!`)
      await loadData() // Reload data to refresh both lists
    } catch (error) {
      console.error('Error promoting to instructor:', error)
      toast.error('Erro ao promover a instrutor')
    } finally {
      setIsPromoting(null)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />
  }

  return (
    <div className="space-y-6">
      {/* Current Instructors */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Instrutores Atuais</h3>
              <p className="text-sm text-gray-600">
                {currentInstructors.length} instrutor{currentInstructors.length !== 1 ? 'es' : ''} cadastrado{currentInstructors.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {currentInstructors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum instrutor cadastrado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentInstructors.map((instructor) => (
                <div key={instructor.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{instructor.name}</h4>
                    <p className="text-sm text-gray-600">{instructor.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Instrutor desde {new Date(instructor.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Crown className="w-3 h-3" />
                    Instrutor
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructor Candidates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Candidatos a Instrutor</h3>
              <p className="text-sm text-gray-600">
                Alunos que participaram de eventos de treinamento e podem ser promovidos
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum candidato a instrutor disponível</p>
              <p className="text-xs text-gray-400 mt-2">
                Candidatos aparecem automaticamente após participarem de eventos de treinamento
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">Como funciona a promoção</h4>
                    <p className="text-sm text-blue-700">
                      Alunos que participaram de eventos de treinamento e jogaram partidas 
                      aparecem aqui como candidatos. Você pode promovê-los a instrutores, 
                      dando-lhes acesso completo ao sistema.
                    </p>
                  </div>
                </div>
              </div>

              {candidates.map((candidate) => (
                <div key={`${candidate.player_id}-${candidate.event_id}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{candidate.player_name}</h4>
                      <p className="text-sm text-gray-600">{candidate.player_email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Evento: {candidate.event_name} • {candidate.total_matches} partida{candidate.total_matches !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handlePromoteToInstructor(candidate)}
                      disabled={isPromoting === candidate.player_id}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isPromoting === candidate.player_id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Promovendo...
                        </>
                      ) : (
                        <>
                          <Crown className="w-4 h-4" />
                          Promover a Instrutor
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}