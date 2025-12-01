import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, AlertTriangle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { readExcelFile, previewClassImport, importClassFromExcel } from '../../services/classImportService'
import { downloadClassImportTemplate } from '../../utils/excelTemplateUtils'
import type { ClassImportResult, ClassImportPreview } from '../../types'

type ImportClassModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportClassModal({ isOpen, onClose, onSuccess }: ImportClassModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<ClassImportResult | null>(null)
  const [preview, setPreview] = useState<ClassImportPreview | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

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
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo Excel')
      return
    }

    setIsLoading(true)
    try {
      // Ler e processar Excel
      const { classInfo, students, events } = await readExcelFile(file)

      if (!classInfo) {
        toast.error('Não foi possível extrair informações da turma. Verifique o formato do Excel.')
        setIsLoading(false)
        return
      }

      // Fazer preview e verificar se turma existe
      const previewData = await previewClassImport(classInfo, students, events)
      setPreview(previewData)

      // Se turma já existe, mostrar confirmação
      if (previewData.classExists) {
        setShowConfirmation(true)
        setIsLoading(false)
        return
      }

      // Se não existe, importar diretamente
      await performImport(classInfo, students, events)
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast.error(`Erro ao processar arquivo: ${error}`)
      setIsLoading(false)
    }
  }

  const performImport = async (classInfo: any, students: any[], events: any[]) => {
    setIsLoading(true)
    try {
      // Importar para o banco
      const result = await importClassFromExcel(classInfo, students, events)

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
    if (!file) return

    try {
      const { classInfo, students, events } = await readExcelFile(file)
      if (classInfo) {
        await performImport(classInfo, students, events)
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

  const handleClose = () => {
    setFile(null)
    setImportResult(null)
    setPreview(null)
    setShowConfirmation(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-green-600" size={24} />
            Importar Turma via Excel
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
                  <p className="text-xs text-yellow-600 mt-1">
                    Os alunos e eventos serão adicionados/atualizados. Dados existentes não serão removidos.
                  </p>
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
              disabled={!file || isLoading}
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
  )
}
