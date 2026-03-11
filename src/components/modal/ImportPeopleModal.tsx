import { useState, useEffect } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, AlertTriangle, Download, Users, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  readPeopleExcelFile,
  previewPeopleImport,
  importPeopleFromExcel,
  type ExcelPersonImport,
  type PeopleImportPreview,
  type PeopleImportResult
} from '../../services/peopleImportService'
import { supabase } from '../../lib/supabase'

type ImportPeopleModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ClassOption {
  id: string
  code: string
  description: string | null
}

export function ImportPeopleModal({ isOpen, onClose, onSuccess }: ImportPeopleModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<PeopleImportPreview | null>(null)
  const [importResult, setImportResult] = useState<PeopleImportResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingPeople, setPendingPeople] = useState<ExcelPersonImport[]>([])

  // Opções de importação
  const [createInstructors, setCreateInstructors] = useState(true)
  const [linkToClass, setLinkToClass] = useState<string>('')
  const [classes, setClasses] = useState<ClassOption[]>([])

  // Buscar turmas disponíveis
  useEffect(() => {
    async function fetchClasses() {
      const { data } = await supabase
        .from('classes')
        .select('id, code, description')
        .order('description')
      if (data) {
        setClasses(data)
      }
    }
    if (isOpen) {
      fetchClasses()
    }
  }, [isOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validar extensão
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        return
      }
      setFile(selectedFile)
      setImportResult(null)
      setPreview(null)
      setShowConfirmation(false)
    }
  }

  const handlePreview = async () => {
    if (!file) {
      toast.error('Selecione um arquivo Excel')
      return
    }

    setIsLoading(true)
    try {
      // Ler arquivo
      const people = await readPeopleExcelFile(file)

      if (people.length === 0) {
        toast.error('Nenhuma pessoa válida encontrada no arquivo')
        setIsLoading(false)
        return
      }

      // Fazer preview
      const previewData = await previewPeopleImport(people)
      setPreview(previewData)
      setPendingPeople(people)
      setShowConfirmation(true)
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      toast.error(`Erro ao processar arquivo: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (pendingPeople.length === 0) return

    setIsLoading(true)
    try {
      const result = await importPeopleFromExcel(pendingPeople, {
        createInstructors,
        linkToClass: linkToClass || undefined
      })

      setImportResult(result)
      setShowConfirmation(false)

      if (result.success) {
        const total = result.playersCreated + result.playersUpdated + result.instructorsCreated + result.instructorsUpdated
        toast.success(`Importação concluída! ${total} pessoas processadas.`)
        onSuccess()
      } else {
        toast.error('Algumas pessoas não puderam ser importadas. Verifique os erros.')
      }
    } catch (error) {
      console.error('Erro na importação:', error)
      toast.error(`Erro na importação: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
    setPreview(null)
    setPendingPeople([])
  }

  const handleClose = () => {
    setFile(null)
    setPreview(null)
    setImportResult(null)
    setShowConfirmation(false)
    setPendingPeople([])
    setLinkToClass('')
    onClose()
  }

  const downloadTemplate = async () => {
    // Criar template de exemplo
    const templateData = [
      ['Cód. Evento', 'Matricula', 'Código', 'Nome', 'Email', 'Hierarquia Evento'],
      ['123456', '100001', '1001', 'João Silva', 'joao@exemplo.com', 'Líder'],
      ['123456', '100002', '1002', 'Maria Santos', 'maria@exemplo.com', 'Participante'],
      ['123456', '100003', '1003', 'Pedro Souza', 'pedro@exemplo.com', 'Participante']
    ]

    // Importar xlsx dinamicamente
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pessoas')

    // Download
    XLSX.writeFile(wb, 'modelo_importar_pessoas.xlsx')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" size={24} />
            Importar Pessoas via Excel
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Selecione um arquivo Excel com as colunas:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li><strong>Nome:</strong> Nome completo da pessoa</li>
            <li><strong>Email:</strong> Email (obrigatório)</li>
            <li><strong>Hierarquia Evento:</strong> "Líder" para instrutores, "Participante" para players</li>
            <li><strong>Matrícula:</strong> Número de matrícula (opcional)</li>
            <li><strong>Código:</strong> Código identificador (opcional)</li>
          </ul>

          <button
            onClick={downloadTemplate}
            className="mb-4 w-full px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2 font-medium"
          >
            <Download size={18} />
            Baixar Modelo de Planilha
          </button>

          {/* Opções de importação */}
          <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800">Opções de Importação</h3>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={createInstructors}
                onChange={(e) => setCreateInstructors(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Criar instrutores para "Líderes"</span>
                <p className="text-xs text-gray-500">Pessoas marcadas como "Líder" serão cadastradas como instrutores</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vincular players a uma turma (opcional)
              </label>
              <select
                value={linkToClass}
                onChange={(e) => setLinkToClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Não vincular a turma</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.description || cls.code} ({cls.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
            onClick={() => {
              const input = document.getElementById('excel-file-people') as HTMLInputElement
              if (input && !isLoading) {
                input.click()
              }
            }}
          >
            <input
              type="file"
              id="excel-file-people"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="sr-only"
              disabled={isLoading}
            />
            <div className="flex flex-col items-center">
              <Upload size={48} className="text-gray-400 mb-2" />
              {file ? (
                <div className="text-green-600 font-medium">{file.name}</div>
              ) : (
                <div className="text-gray-600">
                  Clique para selecionar um arquivo Excel
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview / Confirmação */}
        {showConfirmation && preview && (
          <div className="mb-6">
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-blue-600 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Confirmar Importação
                  </h3>

                  <div className="bg-white rounded-md p-3 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Resumo:</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span>Participantes (Players): <strong>{preview.participants}</strong></span>
                      </div>
                      <div className="pl-6 text-xs space-y-1">
                        <p className="text-green-600">• Novos: <strong>{preview.newPlayers}</strong></p>
                        <p className="text-blue-600">• Atualizar: <strong>{preview.existingPlayers}</strong></p>
                      </div>

                      {createInstructors && (
                        <>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-blue-600" />
                            <span>Líderes (Instrutores): <strong>{preview.leaders}</strong></span>
                          </div>
                          <div className="pl-6 text-xs space-y-1">
                            <p className="text-green-600">• Novos: <strong>{preview.newInstructors}</strong></p>
                            <p className="text-blue-600">• Atualizar: <strong>{preview.existingInstructors}</strong></p>
                          </div>
                        </>
                      )}

                      <p className="pt-1 border-t border-gray-200">Total de pessoas: <strong>{preview.totalPeople}</strong></p>
                    </div>
                  </div>

                  {preview.duplicateEmails.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                      <p className="text-sm text-yellow-800 font-medium mb-1">
                        ⚠️ Emails duplicados na planilha:
                      </p>
                      <p className="text-xs text-yellow-700">
                        {preview.duplicateEmails.join(', ')}
                      </p>
                    </div>
                  )}

                  {preview.invalidEmails.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                      <p className="text-sm text-red-800 font-medium mb-1">
                        ❌ Emails inválidos (serão ignorados):
                      </p>
                      <p className="text-xs text-red-700">
                        {preview.invalidEmails.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-blue-600 mt-2 bg-blue-100 rounded p-2 space-y-1">
                    <p className="font-semibold">O que será feito:</p>
                    <p>• Pessoas existentes (mesmo email) serão atualizadas</p>
                    <p>• Novas pessoas serão criadas</p>
                    {createInstructors && <p>• Líderes serão cadastrados como instrutores</p>}
                    {linkToClass && <p>• Players serão vinculados à turma selecionada</p>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelConfirmation}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Importando...' : 'Confirmar Importação'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resultado */}
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
                    {importResult.success ? 'Importação concluída' : 'Importação com erros'}
                  </h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>Players criados: <strong>{importResult.playersCreated}</strong></p>
                    <p>Players atualizados: <strong>{importResult.playersUpdated}</strong></p>
                    <p>Instrutores criados: <strong>{importResult.instructorsCreated}</strong></p>
                    <p>Instrutores atualizados: <strong>{importResult.instructorsUpdated}</strong></p>
                  </div>
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
              onClick={handlePreview}
              disabled={!file || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Processar Arquivo
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
