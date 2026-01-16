import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { colors } from '../lib/colors'
import Logo from "../assets/logo.png"

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (isSignUp) {
        const success = await signUp(email, password)
        
        if (success) {
          setError('')
          setIsSignUp(false)
          setError('Conta criada com sucesso! Agora você pode fazer login.')
        } else {
          setError('Erro ao criar conta. Verifique se o e-mail é válido e a senha tem pelo menos 6 caracteres.')
        }
      } else {
        const success = await login(email, password)
        
        if (success) {
          navigate('/')
        } else {
          setError('Credenciais inválidas. Verifique seu e-mail e senha, ou crie uma nova conta.')
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 shadow-md rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
          >
            <img src={Logo} alt="logo" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta!'}
          </h1>
          <p className="text-gray-600">
            {isSignUp 
              ? 'Crie sua conta para acessar o painel do instrutor'
              : 'Faça login para acessar o painel do instrutor'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                placeholder="seu@email.com"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                placeholder="Sua senha"
                required
                minLength={6}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {isSignUp && (
              <p className="text-xs text-gray-500 mt-1">
                A senha deve ter pelo menos 6 caracteres
              </p>
            )}
            {!isSignUp && (
              <div className="text-right text-sm mt-2">
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800 font-medium">
                  Esqueceu a senha/Primeiro Acesso
                </Link>
              </div>
            )}
          </div>

          {error && (
            <div className={`border px-4 py-3 rounded-lg text-sm ${
              error.includes('sucesso') 
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: colors.primary }}
            className="w-full py-3 px-4 hover:opacity-90 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isSignUp ? 'Criando conta...' : 'Entrando...'}
              </>
            ) : (
              <>
                {isSignUp ? (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Criar Conta
                  </>
                ) : (
                  "Entrar"
                )}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
