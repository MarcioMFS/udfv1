import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Save, Calendar, BookOpen } from 'lucide-react'
import { CreateEventModal } from '../components/modal/CreateEventModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIsAdmin } from '../hooks'
import toast from 'react-hot-toast'

interface EventFormData {
  name: string
  description: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number
  max_players: number
  instructions: string
  class_id: string
  event_type: 'training' | 'group'
  schedule: Array<{
    'initial-time': string
    'end-time': string
  }>
}

export function CreateEventPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditing = !!editId

  // TODOS os hooks devem ser chamados antes de qualquer return condicional
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [eventCode, setEventCode] = useState('')
  const [classes, setClasses] = useState<Array<{id: string, code: string, description: string | null}>>([])
  const [eventHasPassed, setEventHasPassed] = useState(false)
  const [originalEndDate, setOriginalEndDate] = useState<string | null>(null)
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    subject: '',
    difficulty: 'medium',
    time_limit: 30,
    max_players: 50,
    instructions: '',
    class_id: '',
    event_type: 'training',
    schedule: []
  })

  // Declarar funções com useCallback antes de usá-las no useEffect
  const loadClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, code, description')
        .eq('instructor_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
      toast.error('Erro ao carregar turmas')
    }
  }, [user?.id])

  const loadEventForEdit = useCallback(async (eventId: string) => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('instructor_id', user?.id)
        .single()

      if (error) {
        console.error('Error loading event:', error)
        toast.error('Erro ao carregar evento para edição')
        navigate('/my-events')
        return
      }

      setFormData({
        name: eventData.name || '',
        description: eventData.description || '',
        subject: eventData.subject || '',
        difficulty: eventData.difficulty || 'medium',
        time_limit: eventData.time_limit || 30,
        max_players: eventData.max_players || 50,
        instructions: eventData.instructions || '',
        class_id: eventData.class_id || '',
        event_type: eventData.event_type || 'training',
        schedule: eventData.schedule || []
      })

      // Verificar se o evento já passou
      if (eventData.end_date) {
        const endDate = new Date(eventData.end_date)
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        if (endDate < now) {
          setEventHasPassed(true)
          setOriginalEndDate(eventData.end_date)
          console.warn('⚠️ Este evento já passou. Edição de datas bloqueada para não-admins.')
        }
      }
    } catch (error) {
      console.error('Error loading event for edit:', error)
      toast.error('Erro ao carregar evento para edição')
      navigate('/my-events')
    }
  }, [user?.id, navigate])

  useEffect(() => {
    if (user) {
      loadClasses()
    }
    if (isEditing && editId) {
      loadEventForEdit(editId)
    }
  }, [isEditing, editId, user, loadClasses, loadEventForEdit])

  // Ensure schedule is always an array
  useEffect(() => {
    if (!Array.isArray(formData.schedule)) {
      setFormData(prev => ({
        ...prev,
        schedule: []
      }))
    }
  }, [formData.schedule])

  // Aguardar o carregamento da verificação de admin
  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  // Se não é admin e não está editando, redirecionar
  if (!isAdmin && !isEditing) {
    toast.error('Apenas administradores podem criar novos eventos')
    return <Navigate to="/my-events" replace />
  }

  // Admin pode editar tudo, instrutor só pode editar schedules
  const canEditAll = isAdmin

  const generateEventCode = () => {
    const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase()
    return uuid.substring(0, 8)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // PROTEÇÃO: Bloquear não-admins de editar eventos que já passaram
    if (isEditing && eventHasPassed && !isAdmin) {
      toast.error('⚠️ Este evento já passou! Apenas administradores podem editar eventos finalizados.')
      return
    }

    if (!formData.class_id) {
      toast.error('Por favor, selecione uma turma para o evento')
      return
    }

    if (!formData.schedule || formData.schedule.length === 0) {
      toast.error('Por favor, adicione pelo menos um horário ao cronograma do evento')
      return
    }

    if (formData.schedule.length > 6) {
      toast.error('Máximo de 6 horários permitidos por evento')
      return
    }

    const hasInvalidSchedule = formData.schedule.some(s =>
      !s['initial-time'] || !s['end-time']
    )

    if (hasInvalidSchedule) {
      toast.error('Por favor, preencha todos os horários do cronograma')
      return
    }

    setIsLoading(true)

    try {
      // Extract start_date and end_date from schedule
      let start_date = null
      let end_date = null
      
      if (formData.schedule && formData.schedule.length > 0) {
        const validSchedules = formData.schedule.filter(s => 
          s['initial-time'] && s['end-time']
        )
        
        if (validSchedules.length > 0) {
          // Get earliest start time and latest end time
          const startTimes = validSchedules.map(s => new Date(s['initial-time']))
          const endTimes = validSchedules.map(s => new Date(s['end-time']))
          
          start_date = new Date(Math.min(...startTimes.map(d => d.getTime()))).toISOString()
          end_date = new Date(Math.max(...endTimes.map(d => d.getTime()))).toISOString()
        }
      }

      if (isEditing && editId) {
        const { error } = await supabase
          .from('events')
          .update({
            name: formData.name,
            description: formData.description,
            subject: formData.subject,
            difficulty: formData.difficulty,
            time_limit: formData.time_limit,
            max_players: formData.max_players,
            instructions: formData.instructions,
            class_id: formData.class_id,
            event_type: formData.event_type,
            schedule: formData.schedule,
            start_date,
            end_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', editId)
          .eq('instructor_id', user.id)

        if (error) throw error

        toast.success('Evento atualizado com sucesso!')
        navigate('/my-events')
      } else {
        const codigo = generateEventCode().toUpperCase()

        const { error } = await supabase
          .from('events')
          .insert({
            name: formData.name,
            code: codigo,
            description: formData.description,
            subject: formData.subject,
            difficulty: formData.difficulty,
            time_limit: formData.time_limit,
            max_players: formData.max_players,
            instructions: formData.instructions,
            instructor_id: user.id,
            class_id: formData.class_id,
            event_type: formData.event_type,
            schedule: formData.schedule,
            start_date,
            end_date
          })

        if (error) throw error

        setEventCode(codigo)
        setModalOpen(true)
      }
    } catch (error) {
      console.error('Error saving event:', error)
      toast.error(isEditing ? 'Erro ao atualizar evento' : 'Erro ao criar evento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof EventFormData, value: string | number | Array<any>) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/my-events')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isEditing ? 'Editar Evento' : 'Criar Novo Evento'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing
              ? 'Atualize as informações do seu evento educacional'
              : 'Configure um novo evento educacional para suas turmas'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas - Apenas admin pode editar */}
            {canEditAll && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Informações Básicas
                </h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Evento *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Evento do Jogo"
                      required
                    />
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Turma *
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => handleInputChange('class_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione uma turma</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.description || cls.code}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Este evento será aplicado à turma selecionada
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descreva o objetivo e conteúdo do evento..."
                  />
                </div>
              </div>
            )}

            {/* Tipo de Evento - Apenas admin */}
            {canEditAll && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Tipo do Evento
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo do Evento *
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => handleInputChange('event_type', e.target.value as 'training' | 'group')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="training">Training (Treinamento de Instrutores)</option>
                    <option value="group">Group (Treinamento Normal de Alunos)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Training: Para capacitação de instrutores | Group: Para treinamento regular de alunos
                  </p>
                </div>
              </div>
            )}

            {/* Cronograma - Todos podem editar */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Cronograma do Evento
              </h2>

              {/* Aviso de evento passado */}
              {eventHasPassed && !isAdmin && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-800 mb-1">
                        ⚠️ Evento Finalizado
                      </h3>
                      <p className="text-sm text-red-700">
                        Este evento já passou e não pode ser editado. Apenas administradores podem modificar eventos finalizados.
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        Para reutilizar este evento, entre em contato com um administrador.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cronograma *
                </label>
                <div className="space-y-2">
                  {Array.isArray(formData.schedule) ? formData.schedule.map((meeting, index) => (
                    <div key={index} className="flex gap-2 items-center p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <input
                          type="datetime-local"
                          value={meeting['initial-time']}
                          onChange={(e) => {
                            const newSchedule = [...(formData.schedule || [])]
                            newSchedule[index]['initial-time'] = e.target.value
                            handleInputChange('schedule', newSchedule)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Data/hora inicial"
                          required
                          disabled={eventHasPassed && !isAdmin}
                        />
                      </div>
                      <span className="text-gray-400">até</span>
                      <div className="flex-1">
                        <input
                          type="datetime-local"
                          value={meeting['end-time']}
                          onChange={(e) => {
                            const newSchedule = [...(formData.schedule || [])]
                            newSchedule[index]['end-time'] = e.target.value
                            handleInputChange('schedule', newSchedule)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Data/hora final"
                          required
                          disabled={eventHasPassed && !isAdmin}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newSchedule = (formData.schedule || []).filter((_, i) => i !== index)
                          handleInputChange('schedule', newSchedule)
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={eventHasPassed && !isAdmin}
                      >
                        Remover
                      </button>
                    </div>
                  )) : null}
                  {(formData.schedule || []).length < 6 && (
                    <button
                      type="button"
                      onClick={() => {
                        if ((formData.schedule || []).length >= 6) {
                          toast.error('Máximo de 6 horários permitidos por evento')
                          return
                        }
                        const newSchedule = [...(formData.schedule || []), { 'initial-time': '', 'end-time': '' }]
                        handleInputChange('schedule', newSchedule)
                      }}
                      className="px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                      disabled={eventHasPassed && !isAdmin}
                    >
                      + Adicionar Horário
                    </button>
                  )}
                  {(formData.schedule || []).length >= 6 && (
                    <p className="text-xs text-amber-600 font-medium">
                      Máximo de 6 horários atingido
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Defina pelo menos um horário para o evento (máximo 6)
                </p>
              </div>
            </div>

            {/* Instruções - Apenas admin */}
            {canEditAll && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Instruções para os Jogadores
                </h2>

                <div>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Instruções detalhadas sobre como participar do evento, regras do jogo, objetivos de aprendizado..."
                  />
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/my-events')}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEditing ? 'Atualizando...' : 'Criando...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Atualizar Evento' : 'Criar Evento'}
                  </>
                )}
              </button>
            </div>
          </form>

          {!isEditing && (
            <CreateEventModal
              isOpen={modalOpen}
              onClose={() => {
                setModalOpen(false)
                navigate('/my-events')
              }}
              eventCode={eventCode}
            />
          )}
        </div>
      </div>
    </div>
  )
}
