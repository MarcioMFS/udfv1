import { useState, useEffect } from 'react'
import { Calendar, Clock, X, AlertTriangle } from 'lucide-react'
import type { ExcelEventImport } from '../../types'

type EditEventDatesModalProps = {
  isOpen: boolean
  events: ExcelEventImport[]
  onClose: () => void
  onSave: (updatedEvents: ExcelEventImport[]) => void
}

export function EditEventDatesModal({ isOpen, events, onClose, onSave }: EditEventDatesModalProps) {
  const [editedEvents, setEditedEvents] = useState<ExcelEventImport[]>(events)

  // Atualizar editedEvents quando events mudar
  useEffect(() => {
    if (events.length > 0) {
      setEditedEvents(events)
    }
  }, [events])

  const handleDateChange = (index: number, field: 'startDate' | 'endDate', value: string) => {
    const updated = [...editedEvents]
    updated[index] = { ...updated[index], [field]: value }
    setEditedEvents(updated)
  }

  const handleScheduleChange = (index: number, value: string) => {
    const updated = [...editedEvents]
    updated[index] = { ...updated[index], schedule: value }
    setEditedEvents(updated)
  }

  const handleSave = () => {
    onSave(editedEvents)
    onClose()
  }

  if (!isOpen) return null

  console.log('EditEventDatesModal - eventos recebidos:', events)
  console.log('EditEventDatesModal - eventos editados:', editedEvents)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Editar Datas dos Eventos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-yellow-700">
            Alguns eventos têm datas no passado. Ajuste as datas abaixo para continuar com a importação.
          </p>
        </div>

        {editedEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum evento para editar.</p>
            <p className="text-sm mt-2">Debug: {events.length} eventos recebidos</p>
          </div>
        ) : null}

        <div className="space-y-4 mb-6">
          {editedEvents.map((event, index) => {
            const isPast = new Date(event.startDate) < new Date()

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  isPast ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-gray-700">Evento {index + 1}</span>
                  {isPast && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full">
                      Data no passado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={event.startDate}
                      onChange={(e) => handleDateChange(index, 'startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={event.endDate}
                      onChange={(e) => handleDateChange(index, 'endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Clock size={14} />
                      Horário
                    </label>
                    <input
                      type="text"
                      value={event.schedule}
                      onChange={(e) => handleScheduleChange(index, e.target.value)}
                      placeholder="Ex: 8 as 12"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancelar (Manter Datas Originais)
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  )
}
