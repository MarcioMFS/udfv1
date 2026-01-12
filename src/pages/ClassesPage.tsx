import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIsAdmin } from '../hooks'
import { ImportClassModal } from '../components/modal/ImportClassModal'

interface Class {
  id: string
  code: string
  description: string | null
  instructor_id: string | null
  influencer_id: string | null
  event_id: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  studentsCount: number
  event?: {
    name: string
    subject: string
    time_limit: number
    max_players: number
    start_date: string | null
    end_date: string | null
  }
  influencer?: {
    name: string
  }
}

interface Student {
  id: string
  name: string | null
  email: string | null
  joined_at: string | null
  total_matches: number
  avg_score: number
}

export function ClassesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { isAdmin } = useIsAdmin()
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedClassCodes, setExpandedClassCodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user && !authLoading) loadClasses()
    else if (!authLoading) setIsLoading(false)
  }, [user, authLoading])

  const loadClasses = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Primeiro buscar o instrutor baseado no email do usuário autenticado
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructors')
        .select('id')
        .eq('email', user.email)
        .single()

      if (instructorError || !instructorData) {
        console.error('Instrutor não encontrado:', instructorError)
        setIsLoading(false)
        return
      }

      // Agora buscar as turmas usando o ID do instrutor
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          influencers:influencer_id (name)
        `)
        .eq('instructor_id', instructorData.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar turmas:', error)
        setIsLoading(false)
        return
      }

      const classesWithCounts = await Promise.all(
        (data || []).map(async (classItem) => {
          const { count } = await supabase
            .from('class_players')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id)

          // Load events for this class
          const { data: eventsData } = await supabase
            .from('events')
            .select('name, subject, difficulty, time_limit, max_players, start_date, end_date')
            .eq('class_id', classItem.id)
            .limit(1)
            .maybeSingle()

          return {
            ...classItem,
            studentsCount: count || 0,
            event: eventsData,
            influencer: Array.isArray(classItem.influencers) ? classItem.influencers[0] : classItem.influencers
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

  const handleViewStudents = (classItem: Class) => {
    setSelectedClass(classItem)
    loadStudents(classItem.id)
    setShowStudentsModal(true)
  }

  const loadStudents = async (classId: string) => {
    const { data, error } = await supabase
      .from('class_players')
      .select(`
        *,
        players:player_id (id, name, email)
      `)
      .eq('class_id', classId)

    if (error) {
      console.error('Erro ao carregar alunos:', error)
      return
    }

    const studentsData = (data || []).map(item => ({
      id: item.players?.id || '',
      name: item.players?.name || null,
      email: item.players?.email || null,
      joined_at: item.joined_at,
      total_matches: item.total_matches || 0,
      avg_score: item.avg_score || 0
    }))

    setStudents(studentsData)
  }

  const getStatusColor = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return 'bg-gray-100 text-gray-800'
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (now < start) return 'bg-blue-100 text-blue-800'
    if (now > end) return 'bg-red-100 text-red-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusLabel = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return 'Indefinido'
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (now < start) return 'Agendada'
    if (now > end) return 'Finalizada'
    return 'Ativa'
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
    classItem.event?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.event?.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Search and Import */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar turmas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        {/* Botão de importar - apenas admin */}
        {isAdmin && (
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm"
          >
            <Upload size={18} />
            Importar Turma via Excel
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center text-gray-500 mb-6">Carregando turmas...</div>
      )}

{/* Class Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {filteredClasses.map((classItem) => (
    <div key={classItem.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 flex-1">
            {classItem.description || classItem.code}
          </h2>
          <button
            onClick={() => toggleClassCode(classItem.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title={expandedClassCodes.has(classItem.id) ? "Ocultar código" : "Ver código da turma"}
          >
            {expandedClassCodes.has(classItem.id) ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
        {expandedClassCodes.has(classItem.id) && (
          <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded mt-1 inline-block">
            Código: {classItem.code}
          </p>
        )}
      </div>

      {/* Status and Students Count */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(classItem.event?.start_date || null, classItem.event?.end_date || null)}`}>
          {getStatusLabel(classItem.event?.start_date || null, classItem.event?.end_date || null)}
        </span>
        <div className="text-xs text-gray-600 flex items-center gap-1">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
          </svg>
          <span>{classItem.studentsCount} alunos</span>
        </div>
      </div>

      {/* Event Info */}
      <div className="mb-3 flex-1">
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-medium">Evento:</span>{' '}
          {classItem.event ? (
            <span className="text-gray-700">{classItem.event.name} - {classItem.event.subject}</span>
          ) : (
            <span className="text-gray-400 italic">Nenhum evento associado</span>
          )}
        </p>
        {classItem.influencer?.name && (
          <p className="text-sm text-purple-600">
            <span className="font-medium">Influencer:</span> {classItem.influencer.name}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-2">
        <button 
          onClick={() => handleViewStudents(classItem)} 
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Ver Alunos
        </button>
        <Link 
          to={`/classes/${classItem.id}`} 
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 no-underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Detalhes
        </Link>
      </div>
    </div>
  ))}
</div>


      {/* Import Modal */}
      <ImportClassModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadClasses()
        }}
      />

      {/* Students Modal */}
      {showStudentsModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                Alunos - {selectedClass.code}
              </h2>
              <button 
                onClick={() => setShowStudentsModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {students.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-700">Nome</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700">Partidas</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700">Média</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-700">Entrou em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{student.name || 'N/A'}</td>
                            <td className="px-4 py-3 text-gray-600">{student.email || 'N/A'}</td>
                            <td className="px-4 py-3 text-gray-600">{student.total_matches}</td>
                            <td className="px-4 py-3 text-gray-600">{student.avg_score.toFixed(1)}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {student.joined_at ? format(new Date(student.joined_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {students.map((student) => (
                      <div key={student.id} className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-800 mb-2">{student.name || 'N/A'}</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><span className="font-medium">Email:</span> {student.email || 'N/A'}</p>
                          <p><span className="font-medium">Partidas:</span> {student.total_matches}</p>
                          <p><span className="font-medium">Média:</span> {student.avg_score.toFixed(1)}</p>
                          <p><span className="font-medium">Entrou em:</span> {student.joined_at ? format(new Date(student.joined_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum aluno encontrado</h3>
                  <p className="text-gray-600">Esta turma ainda não possui alunos cadastrados.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
