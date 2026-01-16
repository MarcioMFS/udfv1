//ClassInfoCard
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Class } from '../../types'
import { calculateClassDynamicInfo, getEventTypeLabel, getStatusColor, ClassEvent, ClassDynamicInfo } from '../../utils/eventUtils'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'

interface ClassInfoCardProps {
  classData: Class | null
}

export function ClassInfoCard({ classData }: ClassInfoCardProps) {
  const [, setEvents] = useState<ClassEvent[]>([])
  const [dynamicInfo, setDynamicInfo] = useState<ClassDynamicInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!classData?.id) return

    const loadEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, code, subject, event_type, schedule, created_at')
          .eq('class_id', classData.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        const eventsData = data || []
        setEvents(eventsData)
        setDynamicInfo(calculateClassDynamicInfo(eventsData))
      } catch (error) {
        console.error('Error loading events:', error)
        setError('Erro ao carregar eventos')
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [classData?.id])
  
  if (!classData) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-600" />
          Informações da Turma
        </h3>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-600" />
          Informações da Turma
        </h3>
        <ErrorMessage message={error} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-blue-600" />
        Informações da Turma
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <p className="text-sm text-gray-600">
          <strong>Tipo Atual:</strong> {dynamicInfo ? getEventTypeLabel(dynamicInfo.eventType) : 'N/A'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Instrutor:</strong> {classData.instructor?.name || 'N/A'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Próximo Evento:</strong> {dynamicInfo?.nextEvent?.name || dynamicInfo?.activeEvent?.name || 'Nenhum'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Assunto:</strong> {dynamicInfo?.nextEvent?.subject || dynamicInfo?.activeEvent?.subject || 'N/A'}
        </p>
        {dynamicInfo?.nextEventDate && (
          <p className="text-sm text-gray-600">
            <strong>Próxima Data:</strong> {format(dynamicInfo.nextEventDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        )}
        <p className="text-sm text-gray-600">
          <strong>Total de Eventos:</strong> {dynamicInfo?.totalEvents || 0}
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-2 md:col-span-2">
          <strong>Status:</strong>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dynamicInfo?.status || 'no_events')}`}>
            {dynamicInfo?.statusLabel || 'Status indisponível'}
          </span>
        </p>
      </div>
    </div>
  )
}