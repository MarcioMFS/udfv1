import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Loader2 } from 'lucide-react'
import { colors } from '../lib/colors'
import Logo from "../assets/logo.png"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!email) {
      toast.error('Por favor, insira seu e-mail.')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        console.error('Erro ao enviar e-mail de redefinição:', error)
        toast.error('Erro ao enviar e-mail de redefinição. Verifique seu e-mail e tente novamente.')
      } else {
        toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada (e spam).')
        navigate('/login')
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Erro inesperado ao solicitar redefinição de senha.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 shadow-md rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
            >
              <img src={Logo} alt="logo" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Redefinir Senha</h1>
            <p className="text-gray-600">
              Insira seu e-mail para receber um link de redefinição de senha.
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
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: colors.primary }}
              className="w-full py-3 px-4 hover:opacity-90 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Link de Redefinição"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
