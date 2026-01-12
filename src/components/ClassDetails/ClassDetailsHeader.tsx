
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users as UsersIcon } from 'lucide-react'
import { Class } from '../../types'
import { NotificationBell } from '../NotificationBell'

interface ClassDetailsHeaderProps {
  classData: Class
  alertsCount: number
  classId: string | undefined
  onManageTeams: () => void
}

export function ClassDetailsHeader({ 
  classData, 
  alertsCount, 
  classId, 
  onManageTeams 
}: ClassDetailsHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          onClick={() => navigate('/classes')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 truncate" title={classData.description || classData.code}>
            {classData.description || classData.code}
          </h1>
          <p className="text-sm text-gray-500 mt-1 truncate" title={`Código da turma: ${classData.code}`}>
            Código da turma: {classData.code}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <NotificationBell alertsCount={alertsCount} classId={classId} />
        <button
          onClick={onManageTeams}
          className="px-4 sm:px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium min-h-[44px] whitespace-nowrap"
        >
          <UsersIcon className="w-5 h-5 flex-shrink-0" />
          <span className="hidden sm:inline">Gerenciar Turma</span>
          <span className="sm:hidden">Gerenciar</span>
        </button>
      </div>
    </div>
  )
}