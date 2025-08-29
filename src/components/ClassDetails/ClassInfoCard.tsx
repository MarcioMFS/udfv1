//ClassInfoCard
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Info } from 'lucide-react'
import { Class } from '../../types'

interface ClassInfoCardProps {
  classData: Class | null
  getEventTypeLabel: (eventType: string) => string
  getStatusColor: (startDate: string | null, endDate: string | null) => string
  getStatusLabel: (startDate: string | null, endDate: string | null) => string
}

export function ClassInfoCard({
  classData,
  getEventTypeLabel,
  getStatusColor,
  getStatusLabel
}: ClassInfoCardProps) {
  
  if (!classData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-blue-600" />
        Informações da Turma
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <p className="text-sm text-gray-600">
          <strong>Tipo:</strong> {getEventTypeLabel(classData.event_type)}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Instrutor:</strong> {classData.instructor?.name || 'N/A'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Evento:</strong> {classData.events?.[0]?.name || 'N/A'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Assunto:</strong> {classData.events?.[0]?.subject || 'N/A'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Início:</strong> {classData.start_date ? format(new Date(classData.start_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Fim:</strong> {classData.end_date ? format(new Date(classData.end_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <strong>Status:</strong>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(classData.start_date, classData.end_date)}`}>
            {getStatusLabel(classData.start_date, classData.end_date)}
          </span>
        </p>
      </div>
    </div>
  )
}