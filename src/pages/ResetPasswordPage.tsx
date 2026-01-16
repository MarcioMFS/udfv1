import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Lock, Loader2 } from 'lucide-react'
import { colors } from '../lib/colors'
import Logo from "../assets/logo.png"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const errorDescription = params.get('error_description')
    const errorCode = params.get('error_code')

    if (errorDescription || errorCode) {
      const message = errorDescription || `Erro: ${errorCode}`
      setErrorMessage(message)
      toast.error(`Erro: ${message}. Por favor, tente novamente ou solicite um novo link.`)
    } else if (!accessToken) {
      setErrorMessage('Token de acesso não encontrado. Por favor, use o link completo do e-mail de redefinição de senha.')
      toast.error('Token de acesso não encontrado. Por favor, use o link completo do e-mail de redefinição de senha.')
      navigate('/login')
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    if (newPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.')
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error('Erro ao redefinir a senha:', error)
        setErrorMessage(`Erro ao redefinir a senha: ${error.message}.`)
        toast.error('Erro ao redefinir a senha. Tente novamente.')
      } else {
        toast.success('Senha redefinida com sucesso! Agora você pode fazer login.')
        navigate('/login')
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
      setErrorMessage('Erro inesperado ao redefinir a senha.')
      toast.error('Erro inesperado ao redefinir a senha.')
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
              Insira sua nova senha para acessar sua conta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Sua nova senha"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                A senha deve ter pelo menos 6 caracteres.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: colors.primary }}
              className="w-full py-3 px-4 hover:opacity-90 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                "Salvar Nova Senha"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
