import { useState, useEffect } from 'react'
import { X, Users, Plus, Trash2, Search, Target, UserCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

interface Student {
  id: string
  name: string | null
  email: string | null
  team_id: string | null
  purpose: 'lucro' | 'satisfacao' | 'bonus' | null
}

interface Team {
  id: string
  name: string | null
  group_purpose: 'lucro' | 'satisfacao' | 'bonus' | null
  created_by: string | null
  created_at: string
  updated_at: string
  members: Student[]
}

interface TeamFormationModalProps {
  isOpen: boolean
  onClose: () => void
  classId: string
  onTeamsUpdated: () => void
}

type TabType = 'formar-times' | 'propositos' | 'visualizar-times'

export function TeamFormationModal({ 
  isOpen, 
  onClose, 
  classId, 
  onTeamsUpdated
}: TeamFormationModalProps) {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamPurpose, setNewTeamPurpose] = useState<'lucro' | 'satisfacao' | 'bonus'>('lucro')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  
  const [activeTab, setActiveTab] = useState<TabType>('formar-times')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [teamSearchTerm, setTeamSearchTerm] = useState('')

  const getTabFromUrl = (): TabType => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab') as TabType
    
    if (['formar-times', 'propositos', 'visualizar-times'].includes(tab)) {
      return tab
    }
    return 'formar-times'
  }

  const updateUrlTab = (tab: TabType) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    updateUrlTab(tab)
  }

  useEffect(() => {
    if (isOpen) {
      const tabFromUrl = getTabFromUrl()
      setActiveTab(tabFromUrl)
      loadTeams()
    }
  }, [isOpen, classId])

  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        const tabFromUrl = getTabFromUrl()
        setActiveTab(tabFromUrl)
      }
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isOpen])

  const handleClose = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('tab')
    window.history.replaceState({}, '', url.toString())
    onClose()
  }

  const loadTeams = async () => {
    setIsLoading(true)
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: true })

      if (teamsError) throw teamsError

      const { data: studentsData, error: studentsError } = await supabase
        .from('class_players')
        .select(`
          *,
          players:player_id (id, name, email, color, team_id, purpose)
        `)
        .eq('class_id', classId)

      if (studentsError) throw studentsError

      const formattedStudents = (studentsData || []).map(item => ({
        id: item.players?.id || '',
        name: item.players?.name || null,
        email: item.players?.email || null,
        team_id: item.players?.team_id || null,
        purpose: item.players?.purpose || null
      }))

      const teamsWithMembers = (teamsData || []).map(team => ({
        ...team,
        members: formattedStudents.filter(student => student.team_id === team.id)
      }))

      const unassigned = formattedStudents.filter(student => !student.team_id)

      setTeams(teamsWithMembers)
      setUnassignedStudents(unassigned)
      setAllStudents(formattedStudents)
    } catch (error) {
      console.error('Error loading teams:', error)
      toast.error('Erro ao carregar times')
    } finally {
      setIsLoading(false)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim() || selectedStudents.length === 0) {
      toast.error('Preencha o nome do time e selecione pelo menos um aluno')
      return
    }

    setIsLoading(true)
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: newTeamName.trim(),
          class_id: classId,
          group_purpose: newTeamPurpose,
          created_by: user?.id
        })
        .select()
        .single()

      if (teamError) throw teamError

      const { error: updateError } = await supabase
        .from('players')
        .update({ team_id: teamData.id })
        .in('id', selectedStudents)

      if (updateError) throw updateError

      toast.success('Time criado com sucesso!')
      setNewTeamName('')
      setSelectedStudents([])
      loadTeams()
      onTeamsUpdated()
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error('Erro ao criar time')
    } finally {
      setIsLoading(false)
    }
  }

  const removeStudentFromTeam = async (studentId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('players')
        .update({ team_id: null })
        .eq('id', studentId)

      if (error) throw error

      toast.success('Aluno removido do time')
      loadTeams()
      onTeamsUpdated()
    } catch (error) {
      console.error('Error removing student from team:', error)
      toast.error('Erro ao remover aluno do time')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTeam = async (teamId: string) => {
    if (!confirm('Tem certeza que deseja excluir este time? Os alunos ficarão sem time.')) {
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase
        .from('players')
        .update({ team_id: null })
        .eq('team_id', teamId)

      if (updateError) throw updateError

      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (deleteError) throw deleteError

      toast.success('Time excluído com sucesso')
      loadTeams()
      onTeamsUpdated()
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Erro ao excluir time')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStudentPurpose = async (studentId: string, purpose: 'lucro' | 'satisfacao' | 'bonus' | null ) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ purpose })
        .eq('id', studentId)

      if (error) throw error

      toast.success('Propósito do aluno atualizado')
      loadTeams()
      onTeamsUpdated()
    } catch (error) {
      console.error('Error updating student purpose:', error)
      toast.error('Erro ao atualizar propósito do aluno')
    }
  }

  const getPurposeLabel = (purpose: 'lucro' | 'satisfacao' | 'bonus' | null) => {
    switch (purpose) {
      case 'lucro': return 'Lucro'
      case 'satisfacao': return 'Satisfação'
      case 'bonus': return 'Bônus'
      default: return 'Não definido'
    }
  }

  const getPurposeColor = (purpose: 'lucro' | 'satisfacao' | 'bonus' | null) => {
    switch (purpose) {
      case 'lucro': return 'bg-blue-100 text-blue-800'
      case 'satisfacao': return 'bg-green-100 text-green-800'
      case 'bonus': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredUnassignedStudents = unassignedStudents.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAllStudents = allStudents.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTeams = teams.filter(team =>
    team.name?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
    team.members.some(member => 
      member.name?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(teamSearchTerm.toLowerCase())
    )
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestão de Times e Propósitos
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => handleTabChange('formar-times')}
              className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'formar-times'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              Formar Times
            </button>
            <button
              onClick={() => handleTabChange('propositos')}
              className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'propositos'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Target className="w-4 h-4" />
              Gerenciar Propósitos
            </button>
            <button
              onClick={() => handleTabChange('visualizar-times')}
              className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'visualizar-times'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Visualizar Times
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Aba: Formar Times */}
          {activeTab === 'formar-times' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Criar Novo Time */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Criar Novo Time
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Time
                    </label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Equipe Alpha"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Propósito do Time
                    </label>
                    <select
                      value={newTeamPurpose}
                      onChange={(e) => setNewTeamPurpose(e.target.value as 'lucro' | 'satisfacao' | 'bonus')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="lucro">Lucro</option>
                      <option value="satisfacao">Satisfação</option>
                      <option value="bonus">Bônus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Alunos Disponíveis
                    </label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Buscar por nome ou email..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecionar Alunos ({selectedStudents.length} selecionados)
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {filteredUnassignedStudents.map((student) => (
                        <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents([...selectedStudents, student.id])
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">{student.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPurposeColor(student.purpose)}`}>
                                {getPurposeLabel(student.purpose)}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                      {filteredUnassignedStudents.length === 0 && unassignedStudents.length > 0 && searchTerm && (
                        <p className="text-sm text-gray-500 p-2">Nenhum aluno encontrado</p>
                      )}
                      {unassignedStudents.length === 0 && (
                        <p className="text-sm text-gray-500 p-2">Todos os alunos já estão em times</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={createTeam}
                    disabled={isLoading || !newTeamName.trim() || selectedStudents.length === 0}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Criando...' : 'Criar Time'}
                  </button>
                </div>
              </div>

              {/* Alunos Não Atribuídos */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Alunos Sem Time ({unassignedStudents.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredUnassignedStudents.map((student) => (
                    <div key={student.id} className="flex items-center gap-3 p-3 bg-white rounded border">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPurposeColor(student.purpose)}`}>
                          {getPurposeLabel(student.purpose)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredUnassignedStudents.length === 0 && unassignedStudents.length > 0 && searchTerm && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum aluno encontrado
                    </p>
                  )}
                  {unassignedStudents.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Todos os alunos estão em times
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aba: Gerenciar Propósitos */}
          {activeTab === 'propositos' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Gerenciar Propósitos dos Alunos
                  </h3>
                  
                  {/* Barra de busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Buscar aluno por nome ou email..."
                    />
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAllStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{student.name}</p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                student.team_id ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {student.team_id ? 'Com Time' : 'Sem Time'}
                              </span>
                              {student.team_id && (
                                <span className="text-xs text-gray-500">
                                  Time: {teams.find(t => t.id === student.team_id)?.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPurposeColor(student.purpose)}`}>
                            {getPurposeLabel(student.purpose)}
                          </span>
                          <select
                            value={student.purpose ?? ''}
                            onChange={(e) =>
                              updateStudentPurpose(
                                student.id,
                                e.target.value === '' ? null : (e.target.value as 'lucro' | 'satisfacao' | 'bonus')
                              )
                            }
                          >
                            <option value="">Sem propósito</option>
                            <option value="lucro">Lucro</option>
                            <option value="satisfacao">Satisfação</option>
                            <option value="bonus">Bônus</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    {filteredAllStudents.length === 0 && allStudents.length > 0 && searchTerm && (
                      <p className="text-center text-gray-500 py-8">Nenhum aluno encontrado</p>
                    )}
                    {allStudents.length === 0 && (
                      <p className="text-center text-gray-500 py-8">Nenhum aluno cadastrado</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Visualizar Times */}
          {activeTab === 'visualizar-times' && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Times Existentes ({teams.length})
                </h3>
                
                {/* Barra de busca para times */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={teamSearchTerm}
                    onChange={(e) => setTeamSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Buscar time ou membro..."
                  />
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredTeams.map((team) => (
                  <div key={team.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{team.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPurposeColor(team.group_purpose)}`}>
                            {getPurposeLabel(team.group_purpose)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTeam(team.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir time"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Membros ({team.members.length}):
                      </p>
                      {team.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPurposeColor(member.purpose)}`}>
                              {getPurposeLabel(member.purpose)}
                            </span>
                          </div>
                          <button
                            onClick={() => removeStudentFromTeam(member.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors ml-2"
                            title="Remover do time"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {team.members.length === 0 && (
                        <p className="text-sm text-gray-500 italic">Nenhum membro</p>
                      )}
                    </div>
                  </div>
                ))}

                {filteredTeams.length === 0 && teams.length > 0 && teamSearchTerm && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                  <p className="text-gray-600">Nenhum time encontrado</p>
                  </div>
                )}

                {teams.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum time criado ainda</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Vá para a aba "Formar Times" para criar o primeiro time
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
