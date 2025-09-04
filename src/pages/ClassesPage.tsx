// src/pages/ClassesPage.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
          const { data: eventsData, error: eventError } = await supabase
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

  const filteredClasses = classes.filter(classItem =>
    classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.event?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.event?.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar turmas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg shadow-sm"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center text-gray-500 mb-6">Carregando turmas...</div>
      )}

{/* Class Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredClasses.map((classItem) => (
    <div key={classItem.id} className="border rounded-lg p-3 shadow-sm bg-white">
      <div className="mb-1">
        <h2 className="text-lg font-semibold text-gray-800">{classItem.code}</h2>
        <p className="text-xs text-gray-600">{classItem.description}</p>
      </div>

      <div className="flex flex-wrap gap-1 text-xs mb-1">
        <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(classItem.event?.start_date || null, classItem.event?.end_date || null)}`}>
          {getStatusLabel(classItem.event?.start_date || null, classItem.event?.end_date || null)}
        </span>
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
        </svg>
        {classItem.studentsCount}
      </p>
      </div>

      <p className="text-xs text-gray-500">
        Evento: {classItem.event ? `${classItem.event.name} - ${classItem.event.subject}` : 'Nenhum evento associado'}
      </p>
      {classItem.influencer?.name && (
        <p className="text-xs text-purple-600 mt-1">Influencer: {classItem.influencer.name}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={() => handleViewStudents(classItem)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700">
          Ver Alunos
        </button>
        <Link to={`/classes/${classItem.id}`} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">
          Detalhes
        </Link>
      </div>
    </div>
  ))}
</div>


      {/* Students Modal */}
      {showStudentsModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Alunos - {selectedClass.code}</h2>
              <button onClick={() => setShowStudentsModal(false)} className="text-xl">×</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Nome</th>
                    <th className="text-left">Email</th>
                    <th className="text-left">Partidas</th>
                    <th className="text-left">Média</th>
                    <th className="text-left">Entrou</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.total_matches}</td>
                      <td>{s.avg_score}</td>
                      <td>{s.joined_at && format(new Date(s.joined_at), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
