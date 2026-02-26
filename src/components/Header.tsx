import { Menu, User } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from "../assets/logo.png"

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
    '/':              { title: 'Dashboard',         subtitle: 'Painel do Instrutor' },
    '/classes':       { title: 'Minhas Turmas',     subtitle: 'Gerencie suas turmas' },
    '/my-events':     { title: 'Meus Eventos',      subtitle: 'Gerencie seus eventos' },
    '/reports':       { title: 'Relatórios',        subtitle: 'Análises e métricas' },
    '/profile':       { title: 'Perfil',            subtitle: 'Suas informações' },
    '/events/create': { title: 'Criar Evento',      subtitle: 'Novo evento educacional' },
    '/admin':         { title: 'Administração',     subtitle: 'Painel administrativo' },
    '/admin/users':   { title: 'Usuários',          subtitle: 'Gerenciar usuários do sistema' },
    '/admin/classes': { title: 'Turmas',            subtitle: 'Gerenciar turmas do sistema' },
    '/admin/events':  { title: 'Eventos',           subtitle: 'Gerenciar eventos do sistema' },
    '/admin/emails':  { title: 'Central de Emails', subtitle: 'Dispare emails para players e instrutores' },
  }

  if (exact[pathname]) return exact[pathname]

  if (pathname.startsWith('/classes/'))       return { title: 'Detalhes da Turma',  subtitle: 'Informações e alunos' }
  if (pathname.startsWith('/events/create'))  return { title: 'Editar Evento',      subtitle: 'Atualizar informações' }
  if (pathname.startsWith('/events/'))        return { title: 'Detalhes do Evento', subtitle: 'Resultados e estatísticas' }

  return { title: 'Sistema UDF', subtitle: 'Ignição' }
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user } = useAuth()
  const { title, subtitle } = usePageTitle()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Esquerda: menu mobile + logo + título da página */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 hidden sm:flex">
            <img src={Logo} alt="logo" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight truncate">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Direita: info do usuário */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold text-gray-800 truncate max-w-[140px] leading-tight"
                title={user?.name || 'Instrutor'}
              >
                {user?.name || 'Instrutor'}
              </p>
              <p
                className="text-xs text-gray-500 truncate max-w-[140px] leading-tight"
                title={user?.email || ''}
              >
                {user?.email}
              </p>
            </div>
          </div>

          {/* Mobile avatar */}
          <div className="sm:hidden w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </div>
    </header>
  )
}
