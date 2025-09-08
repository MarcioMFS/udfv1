import { LogOut, User, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Logo from "../assets/logo.png"

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
            <img src={Logo} alt="logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base hidden sm:block">Painel do Instrutor</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]" title={user?.name || "Instrutor"}>
                {user?.name || "Instrutor"}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[150px]" title={user?.email || ''}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Mobile user avatar */}
          <div className="sm:hidden w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 min-h-[44px]"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
