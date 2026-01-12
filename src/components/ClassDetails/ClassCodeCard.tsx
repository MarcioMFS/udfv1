import { useState, useEffect } from 'react'
import { Copy } from 'lucide-react'
import { Class } from '../../types'
import { supabase } from '../../lib/supabase'
import { calculateClassDynamicInfo } from '../../utils/eventUtils'
import toast from 'react-hot-toast'

interface ClassCodeCardProps {
  classData: Class
}

export function ClassCodeCard({ classData }: ClassCodeCardProps) {
  const [eventCode, setEventCode] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string | null>(null)

  useEffect(() => {
    const loadEventCode = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, code, subject, event_type, schedule, created_at')
          .eq('class_id', classData.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        const eventsData = data || []
        const dynamicInfo = calculateClassDynamicInfo(eventsData)

        // Prioriza evento ativo, depois próximo evento
        const activeOrNextEvent = dynamicInfo.activeEvent || dynamicInfo.nextEvent
        if (activeOrNextEvent) {
          setEventCode(activeOrNextEvent.code)
          setEventName(activeOrNextEvent.name)
        }
      } catch (error) {
        console.error('Error loading event code:', error)
      }
    }

    if (classData?.id) {
      loadEventCode()
    }
  }, [classData?.id])

  const copyEventCode = () => {
    if (eventCode) {
      navigator.clipboard.writeText(eventCode)
      toast.success('Código do evento copiado para a área de transferência!')
    } else {
      toast.error('Nenhum evento ativo para copiar')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Código do Evento</h3>

      <div className="text-center">
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          {eventCode ? (
            <>
              <p className="text-3xl font-bold text-gray-800 tracking-wider">{eventCode}</p>
              {eventName && (
                <p className="text-sm text-gray-600 mt-2">{eventName}</p>
              )}
            </>
          ) : (
            <p className="text-gray-500 py-4">Nenhum evento ativo</p>
          )}
        </div>

        <button
          onClick={copyEventCode}
          disabled={!eventCode}
          className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            eventCode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Copy className="w-4 h-4" />
          Copiar Código
        </button>

        <p className="text-xs text-gray-500 mt-2">
          {eventCode ? 'Código do evento ativo/próximo' : 'Crie um evento para esta turma'}
        </p>
      </div>
    </div>
  )
}