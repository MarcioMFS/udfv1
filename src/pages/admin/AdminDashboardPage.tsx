import { Link } from 'react-router-dom'
import { Users, GraduationCap, Shield, Calendar, ChevronRight, Loader2, FileSpreadsheet } from 'lucide-react'
import { useAdminUsers, useAdminEvents } from '../../hooks'

interface StatCardProps {
  icon: typeof Users
  value: number | string
  label: string
  color: string
}

function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-1">
          {value}
        </h3>
        <p className="text-gray-600 text-sm">
          {label}
        </p>
      </div>
    </div>
  )
}

interface QuickActionProps {
  title: string
  description: string
  icon: typeof Users
  color: string
  link: string
}

function QuickActionCard({ title, description, icon: Icon, color, link }: QuickActionProps) {
  return (
    <Link
      to={link}
      className={`${color} rounded-lg p-6 border border-gray-200 transition-all duration-200 hover:shadow-md group`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-5 h-5" />
            <h3 className="font-semibold">{title}</h3>
          </div>
          <p className="text-sm opacity-80">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

export function AdminDashboardPage() {
  const { players, instructors, admins, isLoading: usersLoading } = useAdminUsers()
  const { events, isLoading: eventsLoading } = useAdminEvents()

  const isLoading = usersLoading || eventsLoading

  const quickActions = [
    {
      title: "Gerenciar Usuários",
      description: "Visualizar, editar e gerenciar players, instrutores e admins",
      icon: Users,
      color: "bg-blue-50 hover:bg-blue-100 text-blue-600",
      link: "/admin/users"
    },
    {
      title: "Turmas e Importações",
      description: "Visualizar todas as turmas e importar novas turmas via Excel",
      icon: FileSpreadsheet,
      color: "bg-green-50 hover:bg-green-100 text-green-600",
      link: "/admin/classes"
    },
    {
      title: "Todos os Eventos",
      description: "Ver, editar e reatribuir eventos de todos os instrutores",
      icon: Calendar,
      color: "bg-purple-50 hover:bg-purple-100 text-purple-600",
      link: "/admin/events"
    }
  ]

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Painel Administrativo
        </h1>
        <p className="text-gray-600">
          Gerencie usuários, eventos e todo o sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard
          icon={Users}
          value={players.length}
          label="Total de Players"
          color="bg-blue-500"
        />
        <StatCard
          icon={GraduationCap}
          value={instructors.length}
          label="Instrutores"
          color="bg-green-500"
        />
        <StatCard
          icon={Shield}
          value={admins.length}
          label="Administradores"
          color="bg-purple-500"
        />
        <StatCard
          icon={Calendar}
          value={events.length}
          label="Total de Eventos"
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.link} {...action} />
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Modo Administrador Ativo
        </h3>
        <p className="text-yellow-700 text-sm">
          Você está acessando funcionalidades administrativas do sistema.
          Tenha cuidado ao realizar ações que afetam outros usuários.
        </p>
      </div>
    </div>
  )
}
