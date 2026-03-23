import { useState, useEffect } from 'react'
import { Calendar, Search, Trash2, RefreshCw, UserCheck } from 'lucide-react'
import { useAdminEvents, useAdminUsers, usePagination } from '../../hooks'
import { AdminEvent } from '../../hooks/useAdminEvents'
import { ConfirmDialog } from '../../components/modal/DialogModal'
import { Pagination } from '../../components/ui/Pagination'
import { SectionLoading } from '../../components/ui/LoadingSpinner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function AdminEventsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { events, isLoading, error, refresh, reassignEvent, deleteEvent } = useAdminEvents()
  const { instructors } = useAdminUsers()
  const [filteredEvents, setFilteredEvents] = useState<AdminEvent[]>([])
  const [reassignDialog, setReassignDialog] = useState<{
    isOpen: boolean
    event: AdminEvent | null
  }>({ isOpen: false, event: null })
  const [selectedInstructor, setSelectedInstructor] = useState('')

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

  // Filter events based on search
  useEffect(() => {
    let filtered = events

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(event =>
        event.code?.toLowerCase().includes(search) ||
        event.title.toLowerCase().includes(search) ||
        event.location?.toLowerCase().includes(search) ||
        event.instructor?.name.toLowerCase().includes(search) ||
        event.class?.name?.toLowerCase().includes(search) ||
        event.class?.code?.toLowerCase().includes(search)
      )
    }

    setFilteredEvents(filtered)
  }, [events, searchTerm])

  const pagination = usePagination(filteredEvents, 15, searchTerm)

  const handleDeleteEvent = (event: AdminEvent) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir o evento "${event.title}"? Todos os resultados de partidas associados também serão excluídos. Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        const success = await deleteEvent({ event_id: event.id })
        if (success) {
          refresh()
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      }
    })
  }

  const openReassignDialog = (event: AdminEvent) => {
    setReassignDialog({ isOpen: true, event })
    setSelectedInstructor(event.instructor_id)
  }

  const handleReassign = async () => {
    if (!reassignDialog.event || !selectedInstructor) return

    if (selectedInstructor === reassignDialog.event.instructor_id) {
      setReassignDialog({ isOpen: false, event: null })
      return
    }

    const success = await reassignEvent({
      event_id: reassignDialog.event.id,
      new_instructor_id: selectedInstructor
    })

    if (success) {
      setReassignDialog({ isOpen: false, event: null })
      setSelectedInstructor('')
      refresh()
    }
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Erro ao carregar eventos: {error}</p>
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
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Gerenciar Eventos
        </h1>
        <p className="text-gray-600">
          Visualize e gerencie todos os eventos do sistema
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por título, local, instrutor ou turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <SectionLoading message="Carregando eventos..." />
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'Nenhum evento encontrado' : 'Nenhum evento cadastrado no sistema'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instrutor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagination.currentItems.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-blue-700">{event.code || '—'}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{event.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(event.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{event.instructor?.name || '—'}</div>
                      <div className="text-sm text-gray-500">{event.instructor?.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{event.class?.name || '—'}</div>
                      {event.class?.code && (
                        <code className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">{event.class.code}</code>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openReassignDialog(event)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Reatribuir Instrutor"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir Evento"
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
        )}

        {/* Paginação */}
        {filteredEvents.length > 0 && !isLoading && (
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

      {/* Reassign Dialog */}
      {reassignDialog.isOpen && reassignDialog.event && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reatribuir Evento
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Reatribua o evento "{reassignDialog.event.title}" para outro instrutor
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novo Instrutor
              </label>
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um instrutor</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name} ({instructor.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setReassignDialog({ isOpen: false, event: null })
                  setSelectedInstructor('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReassign}
                disabled={!selectedInstructor || selectedInstructor === reassignDialog.event.instructor_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Reatribuir
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
    </div>
  )
}
