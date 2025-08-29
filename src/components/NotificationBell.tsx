import { useState } from 'react'
import { Bell } from 'lucide-react'
import { AlertsModal } from './AlertsModal'

interface NotificationBellProps {
  alertsCount: number
  classId?: string // Opcional: se fornecido, modal mostra dados apenas desta turma
}

export function NotificationBell({ alertsCount, classId }: NotificationBellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {alertsCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          </span>
        )}
      </button>

      <AlertsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        classId={classId}
      />
    </>
  )
}