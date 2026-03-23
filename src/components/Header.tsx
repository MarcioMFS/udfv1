import { Menu, User } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
  toggleSidebar: () => void
}

interface RouteInfo {
  title: string
  subtitle: string
}

function usePageTitle(): RouteInfo {
  const { pathname } = useLocation()

  const exact: Record<string, RouteInfo> = {
    '/':                    { title: 'Dashboard',         subtitle: 'Painel do Instrutor' },
    '/classes':             { title: 'Minhas Turmas',     subtitle: 'Gerencie suas turmas' },
    '/my-events':           { title: 'Meus Eventos',      subtitle: 'Gerencie seus eventos' },
    '/reports':             { title: 'Relatórios',        subtitle: 'Análises e métricas' },
    '/profile':             { title: 'Perfil',            subtitle: 'Suas informações' },
    '/events/create':       { title: 'Criar Evento',      subtitle: 'Novo evento educacional' },
    '/admin':               { title: 'Administração',     subtitle: 'Painel administrativo' },
    '/admin/users':         { title: 'Usuários',          subtitle: 'Gerenciar usuários do sistema' },
    '/admin/classes':       { title: 'Turmas',            subtitle: 'Gerenciar turmas do sistema' },
    '/admin/events':        { title: 'Eventos',           subtitle: 'Gerenciar eventos do sistema' },
    '/admin/emails':        { title: 'Central de Emails', subtitle: 'Dispare emails para players e instrutores' },
    '/admin/faturamento':   { title: 'Faturamento',       subtitle: 'Demonstrativo mensal de uso' },
  }

  if (exact[pathname]) return exact[pathname]

  if (pathname.startsWith('/classes/'))      return { title: 'Detalhes da Turma',  subtitle: 'Informações e alunos' }
  if (pathname.startsWith('/events/create')) return { title: 'Editar Evento',      subtitle: 'Atualizar informações' }
  if (pathname.startsWith('/events/'))       return { title: 'Detalhes do Evento', subtitle: 'Resultados e estatísticas' }

  return { title: 'Sistema UDF', subtitle: 'Ignição' }
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user } = useAuth()
  const { title, subtitle } = usePageTitle()

  return (
    <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">

        {/* Left: hamburger + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg font-display font-bold text-gray-900 leading-tight truncate tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block font-body truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: user */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E8EDFB' }}>
              <User className="w-3.5 h-3.5" style={{ color: '#28377F' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[140px] leading-tight font-body" title={user?.name || 'Instrutor'}>
                {user?.name || 'Instrutor'}
              </p>
              <p className="text-xs text-gray-400 truncate max-w-[140px] leading-tight font-body" title={user?.email || ''}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Mobile avatar */}
          <div className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8EDFB' }}>
            <User className="w-3.5 h-3.5" style={{ color: '#28377F' }} />
          </div>
        </div>

      </div>
    </header>
  )
}
