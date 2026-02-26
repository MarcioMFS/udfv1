import { useState, useEffect, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, AlertTriangle, Download, Users, GraduationCap, Search, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { readExcelFile, previewClassImport, importClassFromExcel } from '../../services/classImportService'
import { downloadClassImportTemplate } from '../../utils/excelTemplateUtils'
import { EditEventDatesModal } from './EditEventDatesModal'
import { supabase } from '../../lib/supabase'
import type { ClassImportResult, ClassImportPreview, ExcelEventImport, EventType } from '../../types'

interface Instructor {
  id: string
  name: string
  email: string
}

type ImportClassForInstructorModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportClassForInstructorModal({ isOpen, onClose, onSuccess }: ImportClassForInstructorModalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [filteredInstructors, setFilteredInstructors] = useState<Instructor[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<ClassImportResult | null>(null)
  const [preview, setPreview] = useState<ClassImportPreview | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [classType, setClassType] = useState<EventType>('training')
  const [pendingEvents, setPendingEvents] = useState<ExcelEventImport[]>([])
  const [showEditDatesModal, setShowEditDatesModal] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<{ classInfo: any; students: any[] } | null>(null)

  // Buscar instrutores ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      fetchInstructors()
    }
  }, [isOpen])
  
  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Filtrar instrutores baseado no termo de pesquisa
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInstructors(instructors)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = instructors.filter(inst =>
        inst.name.toLowerCase().includes(term) ||
        inst.email.toLowerCase().includes(term)
      )
      setFilteredInstructors(filtered)
    }
  }, [searchTerm, instructors])

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name, email')
        .order('name')

      if (error) {
        console.error('Erro ao buscar instrutores:', error)
        toast.error('Erro ao carregar instrutores')
        return
      }

      setInstructors(data || [])
    } catch (error) {
      console.error('Erro ao buscar instrutores:', error)
      toast.error('Erro ao carregar instrutores')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        return
      }
      setFile(selectedFile)
      setImportResult(null)
    }
  }

  const checkPastDates = (events: ExcelEventImport[]): boolean => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return events.some(event => {
      const [year, month, day] = event.startDate.split('-').map(Number)
      const eventDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      return eventDate < now
    })
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo Excel')
      return
    }

    if (!selectedInstructorId) {
      toast.error('Selecione um instrutor para a turma')
      return
    }

    setIsLoading(true)
    try {
      const { classInfo, students, events } = await readExcelFile(file)

      if (!classInfo) {
        toast.error('Não foi possível extrair informações da turma. Verifique o formato do Excel.')
        setIsLoading(false)
        return
      }

      const eventsWithType = events.map(event => ({ ...event, eventType: classType }))

      if (checkPastDates(eventsWithType)) {
        setPendingEvents(eventsWithType)
        setPendingImportData({ classInfo, students })
        setShowEditDatesModal(true)
        setIsLoading(false)
        return
      }

      // Passar o ID do instrutor selecionado
      const previewData = await previewClassImport(classInfo, students, eventsWithType, selectedInstructorId)
      setPreview(previewData)

      if (previewData.classExists) {
        setShowConfirmation(true)
        setIsLoading(false)
        return
      }

      await performImport(classInfo, students, eventsWithType)
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast.error(`Erro ao processar arquivo: ${error}`)
      setIsLoading(false)
    }
  }

  const performImport = async (classInfo: any, students: any[], events: any[]) => {
    if (!selectedInstructorId) {
      toast.error('Instrutor não selecionado')
      return
    }

    setIsLoading(true)
    try {
      const result = await importClassFromExcel(classInfo, students, events, selectedInstructorId)

      setImportResult(result)
      setShowConfirmation(false)

      if (result.success) {
        toast.success(
          `Turma ${preview?.classExists ? 'atualizada' : 'importada'} com sucesso! ${result.studentsImported} alunos e ${result.eventsImported} eventos cadastrados.`
        )
        onSuccess()
      } else {
        toast.error('Erro na importação. Verifique os detalhes.')
      }
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast.error(`Erro ao processar arquivo: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmUpdate = async () => {
    if (!file || !selectedInstructorId) return

    try {
      const { classInfo, students, events } = await readExcelFile(file)
      const eventsWithType = events.map(event => ({ ...event, eventType: classType }))

      if (classInfo) {
        await performImport(classInfo, students, eventsWithType)
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error(`Erro ao atualizar turma: ${error}`)
    }
  }

  const handleCancelUpdate = () => {
    setShowConfirmation(false)
    setPreview(null)
  }

  const handleSaveEditedDates = async (updatedEvents: ExcelEventImport[]) => {
    if (!pendingImportData || !selectedInstructorId) return

    setShowEditDatesModal(false)
    setIsLoading(true)

    try {
      const { classInfo, students } = pendingImportData

      const previewData = await previewClassImport(classInfo, students, updatedEvents, selectedInstructorId)
      setPreview(previewData)

      if (previewData.classExists) {
        setShowConfirmation(true)
        setIsLoading(false)
        return
      }

      await performImport(classInfo, students, updatedEvents)
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast.error(`Erro ao processar arquivo: ${error}`)
    } finally {
      setIsLoading(false)
      setPendingImportData(null)
      setPendingEvents([])
    }
  }

  const handleCancelEditDates = async () => {
    setShowEditDatesModal(false)

    if (!pendingImportData || !selectedInstructorId) return

    setIsLoading(true)

    try {
      const { classInfo, students } = pendingImportData

      const previewData = await previewClassImport(classInfo, students, pendingEvents, selectedInstructorId)
      setPreview(previewData)

      if (previewData.classExists) {
        setShowConfirmation(true)
        setIsLoading(false)
        return
      }

      await performImport(classInfo, students, pendingEvents)
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast.error(`Erro ao processar arquivo: ${error}`)
    } finally {
      setIsLoading(false)
      setPendingImportData(null)
      setPendingEvents([])
    }
  }

  const handleClose = () => {
    setFile(null)
    setImportResult(null)
    setPreview(null)
    setShowConfirmation(false)
    setSelectedInstructorId('')
    setSearchTerm('')
    setFilteredInstructors(instructors)
    setIsDropdownOpen(false)
    onClose()
  }

  const handleSelectInstructor = (instructorId: string) => {
    setSelectedInstructorId(instructorId)
    const instructor = instructors.find(i => i.id === instructorId)
    if (instructor) {
      setSearchTerm(instructor.name)
    }
    setIsDropdownOpen(false)
  }

  const handleOpenDropdown = () => {
    setIsDropdownOpen(true)
    // Se já tem instrutor selecionado, mantém o nome no campo
    // Se não, limpa para pesquisar
    if (!selectedInstructorId) {
      setSearchTerm('')
      setFilteredInstructors(instructors)
    }
  }

  if (!isOpen) return null

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-green-600" size={24} />
            Importar Turma para Instrutor
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Seletor de Instrutor */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o Instrutor *
          </label>

          <div className="relative" ref={dropdownRef}>
            {/* Campo de Pesquisa com Dropdown */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Pesquisar instrutor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setIsDropdownOpen(true)
                  // Se estiver editando, limpa a seleção anterior
                  if (selectedInstructorId && e.target.value !== instructors.find(i => i.id === selectedInstructorId)?.name) {
                    setSelectedInstructorId('')
                  }
                }}
                onFocus={handleOpenDropdown}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  if (selectedInstructorId) {
                    setSelectedInstructorId('')
                    setSearchTerm('')
                    setFilteredInstructors(instructors)
                  }
                  setIsDropdownOpen(!isDropdownOpen)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Dropdown List */}
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredInstructors.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    {searchTerm.trim() !== ''
                      ? `Nenhum instrutor encontrado para "${searchTerm}"`
                      : 'Nenhum instrutor disponível'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredInstructors.map((instructor) => (
                      <li
                        key={instructor.id}
                        onClick={() => handleSelectInstructor(instructor.id)}
                        className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                          selectedInstructorId === instructor.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{instructor.name}</div>
                        <div className="text-sm text-gray-500">{instructor.email}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {selectedInstructorId && (
            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
              <CheckCircle size={14} />
              Instrutor selecionado: {instructors.find(i => i.id === selectedInstructorId)?.name}
            </p>
          )}
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Selecione um arquivo Excel com as seguintes abas:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li><strong>Instrutor:</strong> Nome da turma, nome e email do instrutor</li>
            <li><strong>Encontros:</strong> Código, data de início, data de fim e horário dos eventos</li>
            <li><strong>Alunos:</strong> Nome e email dos alunos</li>
          </ul>

          <button
            onClick={downloadClassImportTemplate}
            className="mb-4 w-full px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2 font-medium"
          >
            <Download size={18} />
            Baixar Modelo de Planilha
          </button>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Evento
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClassType('training')}
                className={`px-4 py-3 rounded-lg border-2 transition flex flex-col items-start gap-1 ${
                  classType === 'training'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap size={20} />
                  <span className="font-semibold">Training</span>
                </div>
                <span className="text-xs">Formação de Instrutores</span>
              </button>
              <button
                type="button"
                onClick={() => setClassType('group')}
                className={`px-4 py-3 rounded-lg border-2 transition flex flex-col items-start gap-1 ${
                  classType === 'group'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={20} />
                  <span className="font-semibold">Group</span>
                </div>
                <span className="text-xs">Treinamento de Alunos</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {classType === 'training'
                ? '🎓 Training: Para capacitação de instrutores/líderes'
                : '👥 Group: Para treinamento regular de alunos'}
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              id="excel-file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <label
              htmlFor="excel-file"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload size={48} className="text-gray-400 mb-2" />
              {file ? (
                <div className="text-green-600 font-medium">{file.name}</div>
              ) : (
                <div className="text-gray-600">
                  Clique para selecionar um arquivo Excel
                </div>
              )}
            </label>
          </div>
        </div>

        {showConfirmation && preview && preview.classExists && (
          <div className="mb-6">
            <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    Turma já existe!
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    A turma <strong>{preview.className}</strong> (código: <strong>{preview.classCode}</strong>) já está cadastrada no sistema.
                  </p>

                  <div className="bg-white rounded-md p-3 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Turma Existente:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• Alunos cadastrados: <strong>{preview.existingClass?.studentsCount || 0}</strong></p>
                      <p>• Eventos cadastrados: <strong>{preview.existingClass?.eventsCount || 0}</strong></p>
                    </div>
                  </div>

                  <div className="bg-white rounded-md p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Novos Dados (Excel):</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• Alunos no arquivo: <strong>{preview.studentsCount}</strong></p>
                      <p>• Eventos no arquivo: <strong>{preview.eventsCount}</strong></p>
                    </div>
                  </div>

                  <p className="text-sm text-yellow-700 mt-3 font-medium">
                    Deseja atualizar a turma com os dados do Excel?
                  </p>
                  <div className="text-xs text-yellow-600 mt-2 bg-yellow-100 rounded p-2 space-y-1">
                    <p className="font-semibold">⚠️ O que será feito:</p>
                    <p>• <strong>Alunos:</strong> Novos alunos serão adicionados. Alunos existentes serão atualizados (sem duplicar).</p>
                    <p>• <strong>Eventos:</strong> Eventos antigos serão SUBSTITUÍDOS pelos novos do Excel.</p>
                    <p>• <strong>Turma:</strong> Descrição e instrutor serão atualizados.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelUpdate}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmUpdate}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Atualizando...' : 'Sim, Atualizar Turma'}
                </button>
              </div>
            </div>
          </div>
        )}

        {importResult && (
          <div className="mb-6">
            <div
              className={`border rounded-lg p-4 ${
                importResult.success
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                {importResult.success ? (
                  <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                ) : (
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-2 ${
                      importResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {importResult.success ? 'Importação concluída' : 'Erro na importação'}
                  </h3>
                  {importResult.success && (
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Alunos importados: {importResult.studentsImported}</p>
                      <p>Eventos criados: {importResult.eventsImported}</p>
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-red-700 mb-1">Erros:</p>
                      <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            disabled={isLoading}
          >
            {importResult?.success ? 'Fechar' : 'Cancelar'}
          </button>
          {!importResult?.success && !showConfirmation && (
            <button
              onClick={handleImport}
              disabled={!file || !selectedInstructorId || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Importar Turma
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>

    <EditEventDatesModal
      isOpen={showEditDatesModal}
      events={pendingEvents}
      onClose={handleCancelEditDates}
      onSave={handleSaveEditedDates}
    />
    </>
  )
}
