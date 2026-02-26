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
  Mail,
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { colors } from '../lib/colors'
import Logo from '../assets/logo.png'
import { ConfirmDialog } from './modal/DialogModal'
import { useState, useEffect } from 'react'

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const adminSubItems = [
  { href: '/admin',         icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users',   icon: Users,           label: 'Usuários' },
  { href: '/admin/classes', icon: GraduationCap,   label: 'Turmas' },
  { href: '/admin/events',  icon: Calendar,        label: 'Eventos' },
  { href: '/admin/emails',  icon: Mail,            label: 'Emails' },
]

export function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuth()
  const { isAdmin } = useIsAdmin()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Abre o dropdown automaticamente quando estiver em rota /admin
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
    { href: '/',         icon: Home,     label: 'Dashboard' },
    { href: '/classes',  icon: Users,    label: 'Turmas' },
    { href: '/my-events',icon: Calendar, label: 'Eventos' },
    {
      href: '/reports',
      icon: BarChart3,
      label: 'Relatórios',
      disabled: true,
      title: 'Essa funcionalidade será desbloqueada em breve 🕹️'
    },
    { href: '/profile',  icon: User,     label: 'Perfil' },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin'
    if (href === '/classes') return location.pathname === '/classes' || location.pathname.startsWith('/classes/')
    if (href === '/my-events') return location.pathname === '/my-events' || location.pathname.startsWith('/events/')
    return location.pathname === href
  }

  return (
    <aside
      className={`fixed top-0 left-0 w-64 h-screen shadow-xl flex flex-col border-r border-gray-200 bg-white
        transform transition-transform duration-200 ease-in-out z-50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
    >
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-md">
              <img src={Logo} alt="logo" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Sistema</h1>
              <p className="text-sm text-gray-600">Ignição</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="relative flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 cursor-not-allowed opacity-60 group"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.title && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 text-sm text-white bg-slate-800 rounded-lg shadow-lg
                                   whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100
                                   transition-opacity duration-300 z-[60]
                                   after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2
                                   after:border-[6px] after:border-transparent after:border-r-slate-800">
                      {item.title}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'text-white font-medium shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                style={active ? { backgroundColor: colors.primary } : {}}
                onClick={toggleSidebar}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* ── Dropdown Administração ── */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setAdminOpen(o => !o)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isAdminRoute && !adminOpen
                    ? 'text-white font-medium shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                style={isAdminRoute && !adminOpen ? { backgroundColor: colors.primary } : {}}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">Administração</span>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Sub-itens */}
              {adminOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-gray-100 space-y-1">
                  {adminSubItems.map((sub) => {
                    const subActive = isActive(sub.href)
                    return (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                          subActive
                            ? 'text-white font-medium shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                        style={subActive ? { backgroundColor: colors.primary } : {}}
                        onClick={toggleSidebar}
                      >
                        <sub.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{sub.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-6 border-t border-gray-100">
        <button
          onClick={handleLogoutClick}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
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
