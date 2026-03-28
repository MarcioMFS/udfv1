import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Users,
  User,
  LogOut,
  Home,
  Calendar,
  X,
  Shield,
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
  Mail,
  Receipt,
  Rocket,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useIsAdmin } from '../hooks/useIsAdmin'
import Logo from '../assets/logo.png'
import { ConfirmDialog } from './modal/DialogModal'
import { useState, useEffect } from 'react'

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const adminSubItems = [
  { href: '/admin',              icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users',        icon: Users,           label: 'Usuários' },
  { href: '/admin/classes',      icon: GraduationCap,   label: 'Turmas' },
  { href: '/admin/events',       icon: Calendar,        label: 'Eventos' },
  { href: '/admin/emails',       icon: Mail,            label: 'Emails' },
  { href: '/admin/faturamento',  icon: Receipt,         label: 'Faturamento' },
]

export function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuth()
  const { isAdmin } = useIsAdmin()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const [adminOpen, setAdminOpen] = useState(isAdminRoute)

  useEffect(() => {
    if (isAdminRoute) setAdminOpen(true)
  }, [isAdminRoute])

  const handleLogoutClick = () => setConfirmOpen(true)
  const handleConfirmLogout = () => {
    logout()
    setConfirmOpen(false)
  }

  const navItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/classes', icon: Users, label: 'Turmas' },
    { href: '/my-events', icon: Calendar, label: 'Eventos' },
    {
      href: '/reports',
      icon: BarChart3,
      label: 'Relatórios',
      disabled: true,
      title: 'Essa funcionalidade será desbloqueada em breve 🕹️'
    },
    { href: '/profile', icon: User, label: 'Perfil' },
    { href: '/changelog', icon: Rocket, label: 'Atualizações', badge: 'Novo' },
  ]

  const isActive = (href: string) => {
    if (location.pathname === href) return true
    switch (href) {
      case '/classes':   return location.pathname.startsWith('/classes/')
      case '/my-events': return location.pathname.startsWith('/events/')
      default:           return false
    }
  }

  const isSubActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  return (
    <aside
      className={`fixed top-0 left-0 w-64 h-screen flex flex-col
        transform transition-transform duration-200 ease-in-out z-50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      style={{ backgroundColor: '#0D1B3E' }}
    >
      {/* Logo area */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 p-1.5">
              <img src={Logo} alt="logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-display font-700 text-sm leading-tight tracking-wide">Sistema</p>
              <p className="text-white/40 text-xs font-body">Ignição</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/25 cursor-not-allowed group"
                title={item.title}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-body">{item.label}</span>
                <span className="ml-auto text-[10px] bg-white/10 text-white/30 px-1.5 py-0.5 rounded font-body">Em breve</span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={toggleSidebar}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              {active && (
                <span className="absolute left-0 w-0.5 h-5 rounded-r bg-blue-400 -ml-3" />
              )}
              <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? 'text-blue-300' : 'text-white/40 group-hover:text-white/60'}`} />
              <span className={`text-sm font-body font-medium flex-1 ${active ? 'text-white' : ''}`}>{item.label}</span>
              {'badge' in item && item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* Admin dropdown */}
        {isAdmin && (
          <div className="pt-3">
            <p className="px-3 text-[10px] font-display font-600 uppercase tracking-widest text-white/25 mb-1.5">Admin</p>

            <button
              onClick={() => setAdminOpen(o => !o)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                isAdminRoute
                  ? 'text-white/80'
                  : 'text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              <Shield className="w-4 h-4 text-white/40 flex-shrink-0" />
              <span className="text-sm font-body font-medium flex-1 text-left">Administração</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
            </button>

            {adminOpen && (
              <div className="ml-3 pl-3 mt-0.5 border-l border-white/10 space-y-0.5">
                {adminSubItems.map((sub) => {
                  const subActive = isSubActive(sub.href)
                  return (
                    <Link
                      key={sub.href}
                      to={sub.href}
                      onClick={toggleSidebar}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 text-sm ${
                        subActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/40 hover:bg-white/10 hover:text-white/70'
                      }`}
                    >
                      <sub.icon className={`w-3.5 h-3.5 flex-shrink-0 ${subActive ? 'text-blue-300' : 'text-white/30'}`} />
                      <span className="font-body">{sub.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-white/10 pt-3">
        <button
          onClick={handleLogoutClick}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-body font-medium">Sair</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        message="Tem certeza que deseja sair do sistema?"
        title="Confirmar Logout"
        confirmLabel="Sair"
        cancelLabel="Cancelar"
      />
    </aside>
  )
}
