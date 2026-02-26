import { useState, useEffect } from 'react'
import { FileSpreadsheet, Search, ChevronDown, ChevronUp, Users, Calendar, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ImportClassForInstructorModal } from '../../components/modal/ImportClassForInstructorModal'
import { usePagination } from '../../hooks'
import { Pagination } from '../../components/ui/Pagination'

interface Class {
  id: string
  code: string
  description: string | null
  instructor_id: string | null
  created_at: string
  updated_at: string
  studentsCount: number
  eventsCount: number
  instructor?: {
    name: string
    email: string
  }
}

export function AdminClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedClassCodes, setExpandedClassCodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          instructors:instructor_id (id, name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar turmas:', error)
        setIsLoading(false)
        return
      }

      const classesWithCounts = await Promise.all(
        (data || []).map(async (classItem) => {
          const { count: studentsCount } = await supabase
            .from('class_players')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id)

          const { count: eventsCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id)

          return {
            ...classItem,
            studentsCount: studentsCount || 0,
            eventsCount: eventsCount || 0,
            instructor: Array.isArray(classItem.instructors) 
              ? classItem.instructors[0] 
              : classItem.instructors
          }
        })
      )

      setClasses(classesWithCounts)
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleClassCode = (classId: string) => {
    setExpandedClassCodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(classId)) {
        newSet.delete(classId)
      } else {
        newSet.add(classId)
      }
      return newSet
    })
  }

  const filteredClasses = classes.filter(classItem =>
    classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.instructor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.instructor?.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pagination = usePagination(filteredClasses, 15, searchTerm)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Gerenciar Turmas
          </h1>
          <p className="text-gray-600">
            Visualize e gerencie todas as turmas do sistema
          </p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Importar Turma
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por código, descrição ou instrutor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando turmas...</p>
        </div>
      )}

      {/* Classes Grid */}
      {!isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredClasses.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada no sistema'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instrutor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alunos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eventos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criada em</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pagination.currentItems.map((classItem) => (
                    <tr key={classItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleClassCode(classItem.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title={expandedClassCodes.has(classItem.id) ? "Ocultar código" : "Ver código da turma"}
                          >
                            {expandedClassCodes.has(classItem.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {classItem.description || classItem.code}
                            </div>
                            {expandedClassCodes.has(classItem.id) && (
                              <div className="text-xs text-gray-500 font-mono mt-1">
                                Código: {classItem.code}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {classItem.instructor ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{classItem.instructor.name}</div>
                            <div className="text-xs text-gray-500">{classItem.instructor.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{classItem.studentsCount}</span>
                          <span className="text-gray-500">alunos</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{classItem.eventsCount}</span>
                          <span className="text-gray-500">eventos</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(classItem.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {filteredClasses.length > 0 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.goToPage}
              showPerPageSelector
              onPerPageChange={pagination.setItemsPerPage}
              perPageOptions={[10, 15, 25, 50]}
            />
          )}
        </div>
      )}

      {/* Stats */}
      {!isLoading && classes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{classes.length}</div>
                <div className="text-sm text-gray-600">Total de Turmas</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {classes.reduce((sum, c) => sum + c.studentsCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total de Alunos</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {classes.reduce((sum, c) => sum + c.eventsCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total de Eventos</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportClassForInstructorModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadClasses()
        }}
      />
    </div>
  )
}
