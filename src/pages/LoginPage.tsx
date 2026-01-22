import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoginForm } from '../components/LoginForm'
import { colors } from '../lib/colors'
import Logo from "../assets/logo.png"

export function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  if (user) {
    return null 
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 opacity-90"></div>
        <div className="relative z-10 text-center text-white">
          <div className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-6xl mx-auto mb-8 shadow-2xl bg-white/10 backdrop-blur-sm">
            <img src={Logo} alt="logo" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Sistema Ignição</h2>
          <p className="text-xl opacity-90 max-w-md">
            Plataforma educacional para instrutores
          </p>
        </div>
        
        {/* Elementos decorativos */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full hidden lg:block"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/5 rounded-full hidden lg:block"></div>
        <div className="absolute top-1/2 left-20 w-16 h-16 bg-white/10 rounded-full hidden lg:block"></div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-20 h-20 rounded-full shadow-md flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4"
            >
              <img src={Logo} alt="logo" />
            </div>
          </div>
          <LoginForm />

          {/* Link para termos */}
          <div className="mt-6 text-center">
            <a
              href="/terms"
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Termos de Política e Privacidade
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
