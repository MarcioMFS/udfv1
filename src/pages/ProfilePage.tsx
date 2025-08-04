// src/pages/ProfilePage.tsx
import { BadgeCard } from '@/components/Levels/BadgeCard'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Shield } from 'lucide-react'
import { createBadgeCardData } from '@/utils/badgeUtils'
import { useInstructorStats } from '@/hooks'

export function ProfilePage() {
  const { user } = useAuth()
  const { 
      stats: instructorStats, 
      isLoading, 
      error,
      refetch
    } = useInstructorStats()
  

  const badges = createBadgeCardData(instructorStats)

  // Estado de formulário (comentado por não estar em uso agora)
  /*
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })
  const [isEditing, setIsEditing] = useState(false)
  */

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Perfil</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
            <p className="text-gray-600 capitalize">
              {user?.role === 'instructor' ? 'Instrutor' : 'Instrutor'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Nome</p>
                {/* 
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : ( 
                */}
                  <p className="font-medium text-gray-800">{user?.name}</p>
                {/* )} */}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">E-mail</p>
                {/* 
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : ( 
                */}
                  <p className="font-medium text-gray-800">{user?.email}</p>
                {/* )} */}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Shield className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Função</p>
                <p className="font-medium text-gray-800 capitalize">
                  {user?.role === 'instructor' ? 'Instrutor' : 'Instrutor'}
                </p>
              </div>
            </div>
          </div>

          {/* 
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar Perfil
              </button>
            )}
          </div>
          */}
        </div>
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            Todas as conquistas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
