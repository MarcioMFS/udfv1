// src/pages/CreateEventPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Calendar, BookOpen } from 'lucide-react'
import { CreateEventModal } from '../components/modal/CreateEventModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
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
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditing = !!editId

  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [eventCode, setEventCode] = useState('')
  const [classes, setClasses] = useState<Array<{id: string, code: string, description: string | null}>>([])
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

  useEffect(() => {
    loadClasses()
    if (isEditing && editId) {
      loadEventForEdit(editId)
    }
  }, [isEditing, editId])

  // Ensure schedule is always an array
  useEffect(() => {
    if (!Array.isArray(formData.schedule)) {
      setFormData(prev => ({
        ...prev,
        schedule: []
      }))
    }
  }, [formData.schedule])

  const loadClasses = async () => {
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
  }

  const loadEventForEdit = async (eventId: string) => {
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
    } catch (error) {
      console.error('Error loading event for edit:', error)
      toast.error('Erro ao carregar evento para edição')
      navigate('/my-events')
    }
  }

  const generateEventCode = () => {
    // Generate a UUID and take first 8 characters (similar to C# Guid.NewGuid().ToString().Substring(0, 8))
    const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase()
    return uuid.substring(0, 8)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validação obrigatória da turma
    if (!formData.class_id) {
      toast.error('Por favor, selecione uma turma para o evento')
      return
    }

    setIsLoading(true)

    try {
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
            updated_at: new Date().toISOString()
          })
          .eq('id', editId)
          .eq('instructor_id', user.id)

        if (error) throw error

        toast.success('Evento atualizado com sucesso!')
        navigate('/my-events')
      } else {
        const codigo = generateEventCode()

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
            schedule: formData.schedule
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
            {/* Informações Básicas */}
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
                      {cls.code} {cls.description ? `- ${cls.description}` : ''}
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

            {/* Configurações do Evento */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Configurações do Evento
              </h2>
              
              {/* Event Type */}
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
                  <option value="training">Training (Individual)</option>
                  <option value="group">Group (Em Equipe)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Training: Jogadores individuais | Group: Jogadores organizados em equipes
                </p>
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cronograma (Opcional)
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
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Data/hora inicial"
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
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Data/hora final"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newSchedule = (formData.schedule || []).filter((_, i) => i !== index)
                          handleInputChange('schedule', newSchedule)
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  )) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const newSchedule = [...(formData.schedule || []), { 'initial-time': '', 'end-time': '' }]
                      handleInputChange('schedule', newSchedule)
                    }}
                    className="px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                  >
                    + Adicionar Horário
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Defina os horários programados para este evento (opcional)
                </p>
              </div>
            </div>

            {/* Instruções */}
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
