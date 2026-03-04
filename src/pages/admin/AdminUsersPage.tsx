import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Users, GraduationCap, Shield, Search, Trash2, UserPlus, UserMinus, ShieldCheck, Edit, Plus, Upload, X, LogIn } from 'lucide-react'
import { useAdminUsers, useUserManagement, usePagination } from '../../hooks'
import { Player, Instructor } from '../../hooks/useAdminUsers'
import { ConfirmDialog } from '../../components/modal/DialogModal'
import { ImportPeopleModal } from '../../components/modal/ImportPeopleModal'
import { Pagination } from '../../components/ui/Pagination'
import { supabase } from '../../lib/supabase'

type TabType = 'players' | 'instructors' | 'admins'

type CreateUserType = 'player' | 'instructor'

interface ClassOption {
  id: string
  code: string
  name: string
}

export function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('players')
  const [searchTerm, setSearchTerm] = useState('')
  const { players, instructors, admins, isLoading, error, refresh } = useAdminUsers()
  const { updateUser, deleteUser, promoteToInstructor, demoteToPlayer, toggleAdmin, createPlayer, createInstructor } = useUserManagement()

  // Estado para modal de importação de pessoas
  const [showImportModal, setShowImportModal] = useState(false)

  // Estado para criação de usuário
  const [createUserDialog, setCreateUserDialog] = useState<{
    isOpen: boolean
    userType: CreateUserType
  }>({
    isOpen: false,
    userType: 'player'
  })

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    udf_id: '',
    class_code: '',
    cpf: '',
    registration_number: ''
  })

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Buscar turmas disponíveis
  useEffect(() => {
    async function fetchClasses() {
      const { data } = await supabase
        .from('classes')
        .select('id, code, name')
        .order('name')
      if (data) {
        setClasses(data)
      }
    }
    fetchClasses()
  }, [])

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Estado para confirmação de cascade delete
  const [cascadeDeleteDialog, setCascadeDeleteDialog] = useState<{
    isOpen: boolean
    user: (Player | Instructor) | null
    linkedClasses: { id: string; name: string }[]
  }>({
    isOpen: false,
    user: null,
    linkedClasses: []
  })

  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean
    user: (Player | Instructor) | null
  }>({
    isOpen: false,
    user: null
  })

  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  })

  // Estado para impersonate (entrar como outro usuário)
  const [impersonateDialog, setImpersonateDialog] = useState<{
    isOpen: boolean
    instructor: Instructor | null
    isLoading: boolean
  }>({
    isOpen: false,
    instructor: null,
    isLoading: false
  })

  const handleOpenCreateDialog = (userType: CreateUserType) => {
    setCreateForm({
      name: '',
      email: '',
      udf_id: '',
      class_code: '',
      cpf: '',
      registration_number: ''
    })
    setCreateUserDialog({
      isOpen: true,
      userType
    })
  }

  const handleCreateUser = async () => {
    setIsCreating(true)
    try {
      let success = false

      if (createUserDialog.userType === 'player') {
        if (!createForm.name || !createForm.email || !createForm.udf_id || !createForm.class_code) {
          throw new Error('Preencha todos os campos obrigatórios')
        }
        success = await createPlayer({
          name: createForm.name,
          email: createForm.email,
          udf_id: createForm.udf_id,
          class_code: createForm.class_code,
          registration_number: createForm.registration_number || undefined
        })
      } else {
        if (!createForm.name || !createForm.email || !createForm.udf_id || !createForm.cpf) {
          throw new Error('Preencha todos os campos obrigatórios')
        }
        success = await createInstructor({
          name: createForm.name,
          email: createForm.email,
          cpf: createForm.cpf,
          udf_id: createForm.udf_id
        })
      }

      if (success) {
        setCreateUserDialog({ isOpen: false, userType: 'player' })
        refresh()
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Filter users based on search term
  const filterUsers = <T extends Player | Instructor>(users: T[]): T[] => {
    if (!searchTerm) return users
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleEditUser = (user: Player | Instructor) => {
    setEditForm({
      name: user.name,
      email: user.email
    })
    setEditDialog({
      isOpen: true,
      user
    })
  }

  const handleSaveEdit = async () => {
    if (!editDialog.user) return

    const success = await updateUser({
      user_id: editDialog.user.id,
      user_type: editDialog.user.userType,
      data: {
        name: editForm.name,
        email: editForm.email
      }
    })

    if (success) {
      setEditDialog({ isOpen: false, user: null })
      refresh()
    }
  }

  const handleDeleteUser = (user: Player | Instructor) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir o usuário "${user.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        const result = await deleteUser({
          user_id: user.id,
          user_type: user.userType
        })

        // Se requer confirmação de cascade (tem turmas vinculadas)
        if (result.requires_confirmation && result.linked_classes) {
          setConfirmDialog({ ...confirmDialog, isOpen: false })
          setCascadeDeleteDialog({
            isOpen: true,
            user,
            linkedClasses: result.linked_classes
          })
          return
        }

        if (result.success) {
          refresh()
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      }
    })
  }

  const handleCascadeDelete = async () => {
    if (!cascadeDeleteDialog.user) return

    const result = await deleteUser({
      user_id: cascadeDeleteDialog.user.id,
      user_type: cascadeDeleteDialog.user.userType,
      force_cascade: true
    })

    if (result.success) {
      refresh()
    }
    setCascadeDeleteDialog({ isOpen: false, user: null, linkedClasses: [] })
  }

  const handlePromote = (player: Player) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Promover a Instrutor',
      message: `Deseja promover "${player.name}" a instrutor? Este usuário poderá criar e gerenciar turmas e eventos.`,
      onConfirm: async () => {
        const success = await promoteToInstructor({ user_id: player.id })
        if (success) {
          refresh()
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      }
    })
  }

  const handleDemote = (instructor: Instructor) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Rebaixar a Player',
      message: `Deseja rebaixar "${instructor.name}" a player? Este usuário perderá acesso a funcionalidades de instrutor.`,
      onConfirm: async () => {
        const success = await demoteToPlayer({ user_id: instructor.id })
        if (success) {
          refresh()
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      }
    })
  }

  const handleToggleAdmin = (instructor: Instructor) => {
    const willBeAdmin = !instructor.is_admin
    setConfirmDialog({
      isOpen: true,
      title: willBeAdmin ? 'Tornar Administrador' : 'Remover Administrador',
      message: willBeAdmin
        ? `Deseja tornar "${instructor.name}" um administrador? Este usuário terá acesso total ao sistema.`
        : `Deseja remover privilégios de administrador de "${instructor.name}"?`,
      onConfirm: async () => {
        const success = await toggleAdmin({
          user_id: instructor.id,
          make_admin: willBeAdmin
        })
        if (success) {
          refresh()
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      }
    })
  }

  const handleImpersonate = (instructor: Instructor) => {
    setImpersonateDialog({
      isOpen: true,
      instructor,
      isLoading: false
    })
  }

  const confirmImpersonate = async () => {
    if (!impersonateDialog.instructor) return

    setImpersonateDialog(prev => ({ ...prev, isLoading: true }))

    try {
      const { data, error } = await supabase.functions.invoke('admin-impersonate', {
        body: {
          instructor_id: impersonateDialog.instructor.id
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao entrar como instrutor')
      }

      if (data?.success && data?.redirect_url) {
        // Redirecionar para o link de login mágico
        window.location.href = data.redirect_url
      } else {
        throw new Error(data?.error || 'Erro ao gerar link de acesso')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar solicitação'
      console.error('Erro ao entrar como instrutor:', error)
      alert(errorMessage)
      setImpersonateDialog({ isOpen: false, instructor: null, isLoading: false })
    }
  }

  // Listas filtradas no nível do componente (hooks não podem ficar dentro de funções)
  const filteredPlayers     = filterUsers(players)
  const filteredInstructors = filterUsers(instructors)
  const filteredAdmins      = filterUsers(admins)

  const playersPagination     = usePagination(filteredPlayers,     15, searchTerm + activeTab)
  const instructorsPagination = usePagination(filteredInstructors, 15, searchTerm + activeTab)
  const adminsPagination      = usePagination(filteredAdmins,      15, searchTerm + activeTab)

  const tabs = [
    { key: 'players' as TabType, label: 'Players', icon: Users, count: players.length },
    { key: 'instructors' as TabType, label: 'Instrutores', icon: GraduationCap, count: instructors.length },
    { key: 'admins' as TabType, label: 'Administradores', icon: Shield, count: admins.length }
  ]

  const renderPlayersTable = () => {

    if (filteredPlayers.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'Nenhum player encontrado' : 'Nenhum player cadastrado'}
          </p>
        </div>
      )
    }

    return (
      <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadastrado em</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {playersPagination.currentItems.map((player) => (
              <tr key={player.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{player.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <Users className="w-3 h-3" />
                    Player
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(player.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditUser(player)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Player"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePromote(player)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Promover a Instrutor"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(player)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Player"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={playersPagination.currentPage}
        totalPages={playersPagination.totalPages}
        totalItems={playersPagination.totalItems}
        itemsPerPage={playersPagination.itemsPerPage}
        startIndex={playersPagination.startIndex}
        endIndex={playersPagination.endIndex}
        onPageChange={playersPagination.goToPage}
        showPerPageSelector
        onPerPageChange={playersPagination.setItemsPerPage}
        perPageOptions={[10, 15, 25, 50]}
      />
      </>
    )
  }

  const renderInstructorsTable = () => {

    if (filteredInstructors.length === 0) {
      return (
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'Nenhum instrutor encontrado' : 'Nenhum instrutor cadastrado'}
          </p>
        </div>
      )
    }

    return (
      <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadastrado em</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {instructorsPagination.currentItems.map((instructor) => (
              <tr key={instructor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{instructor.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{instructor.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    <GraduationCap className="w-3 h-3" />
                    Mentor
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {instructor.is_admin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(instructor.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleImpersonate(instructor)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Entrar como este instrutor"
                    >
                      <LogIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditUser(instructor)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Instrutor"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleAdmin(instructor)}
                      className={`p-2 rounded-lg transition-colors ${
                        instructor.is_admin
                          ? 'text-orange-600 hover:bg-orange-50'
                          : 'text-purple-600 hover:bg-purple-50'
                      }`}
                      title={instructor.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDemote(instructor)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Rebaixar a Player"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(instructor)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Instrutor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={instructorsPagination.currentPage}
        totalPages={instructorsPagination.totalPages}
        totalItems={instructorsPagination.totalItems}
        itemsPerPage={instructorsPagination.itemsPerPage}
        startIndex={instructorsPagination.startIndex}
        endIndex={instructorsPagination.endIndex}
        onPageChange={instructorsPagination.goToPage}
        showPerPageSelector
        onPerPageChange={instructorsPagination.setItemsPerPage}
        perPageOptions={[10, 15, 25, 50]}
      />
      </>
    )
  }

  const renderAdminsTable = () => {

    if (filteredAdmins.length === 0) {
      return (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'Nenhum administrador encontrado' : 'Nenhum administrador cadastrado'}
          </p>
        </div>
      )
    }

    return (
      <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadastrado em</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adminsPagination.currentItems.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{admin.name}</span>
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{admin.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    <GraduationCap className="w-3 h-3" />
                    Mentor
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleImpersonate(admin)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Entrar como este administrador"
                    >
                      <LogIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditUser(admin)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Administrador"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleAdmin(admin)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Remover Privilégios de Admin"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDemote(admin)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Rebaixar a Player"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(admin)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Administrador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={adminsPagination.currentPage}
        totalPages={adminsPagination.totalPages}
        totalItems={adminsPagination.totalItems}
        itemsPerPage={adminsPagination.itemsPerPage}
        startIndex={adminsPagination.startIndex}
        endIndex={adminsPagination.endIndex}
        onPageChange={adminsPagination.goToPage}
        showPerPageSelector
        onPerPageChange={adminsPagination.setItemsPerPage}
        perPageOptions={[10, 15, 25, 50]}
      />
      </>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Erro ao carregar usuários: {error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Gerenciar Usuários
          </h1>
          <p className="text-gray-600">
            Visualize e gerencie todos os usuários do sistema
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar Planilha
          </button>
          <button
            onClick={() => handleOpenCreateDialog('player')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Player
          </button>
          <button
            onClick={() => handleOpenCreateDialog('instructor')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Instrutor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando usuários...</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {activeTab === 'players' && renderPlayersTable()}
            {activeTab === 'instructors' && renderInstructorsTable()}
            {activeTab === 'admins' && renderAdminsTable()}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editDialog.isOpen && editDialog.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                Editar Usuário
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do usuário"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setEditDialog({ isOpen: false, user: null })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />

      {/* Cascade Delete Confirmation Dialog */}
      {cascadeDeleteDialog.isOpen && cascadeDeleteDialog.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-red-50">
              <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Atenção: Exclusão em Cascata
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                O instrutor <strong>{cascadeDeleteDialog.user.name}</strong> possui{' '}
                <strong>{cascadeDeleteDialog.linkedClasses.length}</strong> turma(s) vinculada(s):
              </p>
              <ul className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {cascadeDeleteDialog.linkedClasses.map((cls) => (
                  <li key={cls.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                    {cls.name}
                  </li>
                ))}
              </ul>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm font-medium">
                  Ao confirmar, o instrutor e todas as turmas listadas acima serão excluídos permanentemente.
                  Os players das turmas NÃO serão excluídos, apenas desvinculados.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setCascadeDeleteDialog({ isOpen: false, user: null, linkedClasses: [] })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCascadeDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import People Modal */}
      <ImportPeopleModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          refresh()
        }}
      />

      {/* Create User Dialog */}
      {createUserDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {createUserDialog.userType === 'player' ? 'Novo Player' : 'Novo Instrutor'}
              </h3>
              <button
                onClick={() => setCreateUserDialog({ isOpen: false, userType: 'player' })}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UDF ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.udf_id}
                  onChange={(e) => setCreateForm({ ...createForm, udf_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ID único do UDF"
                />
              </div>

              {createUserDialog.userType === 'player' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Turma <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={createForm.class_code}
                      onChange={(e) => setCreateForm({ ...createForm, class_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma turma</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.code}>
                          {cls.name} ({cls.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matrícula (opcional)
                    </label>
                    <input
                      type="text"
                      value={createForm.registration_number}
                      onChange={(e) => setCreateForm({ ...createForm, registration_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Número de matrícula"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.cpf}
                    onChange={(e) => setCreateForm({ ...createForm, cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000.000.000-00"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setCreateUserDialog({ isOpen: false, userType: 'player' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isCreating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isCreating}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Criando...
                  </>
                ) : (
                  'Criar Usuário'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação de Pessoas */}
      <ImportPeopleModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          refresh()
        }}
      />

      {/* Impersonate Dialog */}
      {impersonateDialog.isOpen && impersonateDialog.instructor && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Entrar como outro usuário
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm font-medium">
                  Atenção: Você será desconectado da sua conta atual para entrar como:
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{impersonateDialog.instructor.name}</p>
                <p className="text-sm text-gray-600">{impersonateDialog.instructor.email}</p>
                {impersonateDialog.instructor.is_admin && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    <Shield className="w-3 h-3" />
                    Administrador
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Para voltar à sua conta, você precisará fazer login novamente com suas credenciais.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setImpersonateDialog({ isOpen: false, instructor: null, isLoading: false })}
                disabled={impersonateDialog.isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImpersonate}
                disabled={impersonateDialog.isLoading}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {impersonateDialog.isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar como {impersonateDialog.instructor.name.split(' ')[0]}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
