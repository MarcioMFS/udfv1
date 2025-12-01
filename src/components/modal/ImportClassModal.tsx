import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { readExcelFile, importClassFromExcel } from '../../services/classImportService'
import type { ClassImportResult } from '../../types'

type ImportClassModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportClassModal({ isOpen, onClose, onSuccess }: ImportClassModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<ClassImportResult | null>(null)

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

      // Importar para o banco
      const result = await importClassFromExcel(classInfo, students, events)

      setImportResult(result)

      if (result.success) {
        toast.success(
          `Turma importada com sucesso! ${result.studentsImported} alunos e ${result.eventsImported} eventos cadastrados.`
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

  const handleClose = () => {
    setFile(null)
    setImportResult(null)
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
          {!importResult?.success && (
            <button
              onClick={handleImport}
              disabled={!file || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Importando...
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
