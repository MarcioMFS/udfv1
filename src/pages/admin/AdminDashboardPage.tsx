import { Link } from 'react-router-dom'
import { Users, GraduationCap, Shield, Calendar, ChevronRight, Loader2, FileSpreadsheet, Receipt } from 'lucide-react'
import { useAdminUsers, useAdminEvents } from '../../hooks'

interface StatCardProps {
  icon: typeof Users
  value: number | string
  label: string
  accent: string
}

function StatCard({ icon: Icon, value, label, accent }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={`w-10 h-10 ${accent} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-3xl font-display font-800 text-gray-900 leading-none mb-1">
          {value}
        </p>
        <p className="text-gray-400 text-xs font-body font-medium uppercase tracking-wide">
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
      className={`${color} rounded-xl p-5 border border-gray-100 transition-all duration-200 hover:shadow-md active:scale-95 group flex items-center gap-4`}
    >
      <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-sm">{title}</h3>
        <p className="text-xs opacity-70 font-body mt-0.5 truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-70 transition-opacity flex-shrink-0" />
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
      color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-600",
      link: "/admin/classes"
    },
    {
      title: "Todos os Eventos",
      description: "Ver, editar e reatribuir eventos de todos os instrutores",
      icon: Calendar,
      color: "bg-purple-50 hover:bg-purple-100 text-purple-600",
      link: "/admin/events"
    },
    {
      title: "Faturamento",
      description: "Demonstrativo mensal e geração de PDF para clientes",
      icon: Receipt,
      color: "bg-amber-50 hover:bg-amber-100 text-amber-600",
      link: "/admin/faturamento"
    }
  ]

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" style={{ color: '#28377F' }} />
          <p className="text-gray-400 text-sm font-body">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 tracking-tight mb-1">
          Painel Administrativo
        </h1>
        <p className="text-gray-400 text-sm font-body">
          Gerencie usuários, eventos e todo o sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}        value={players.length}     label="Players"          accent="bg-blue-500" />
        <StatCard icon={GraduationCap} value={instructors.length} label="Instrutores"      accent="bg-emerald-500" />
        <StatCard icon={Shield}        value={admins.length}      label="Administradores"  accent="bg-purple-500" />
        <StatCard icon={Calendar}      value={events.length}      label="Eventos"          accent="bg-amber-500" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-display font-bold text-gray-800 mb-4 tracking-tight">Ações Rápidas</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickActionCard key={action.link} {...action} />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl px-5 py-4 flex items-center gap-3 border" style={{ backgroundColor: '#EFF4FF', borderColor: '#C7D7F5' }}>
        <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#28377F' }} />
        <p className="text-sm font-body" style={{ color: '#28377F' }}>
          Modo Administrador ativo — tenha cuidado ao realizar ações que afetam outros usuários.
        </p>
      </div>
    </div>
  )
}
