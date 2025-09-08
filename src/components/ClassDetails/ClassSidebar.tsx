import { Download, ExternalLink, Send } from 'lucide-react'
import toast from 'react-hot-toast'

interface ClassSidebarProps {
  exportStudentsToCsv: () => void
   onViewDetailedReport: () => void
}

export function ClassSidebar({
  exportStudentsToCsv,
  onViewDetailedReport
}: ClassSidebarProps) {
  const handleViewDetailedReport = () => {
    onViewDetailedReport()
  }

  const handleSendMessage = () => {
    toast('Funcionalidade em desenvolvimento: Enviar Comunicado')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Ações Rápidas</h3>

      <div className="space-y-3">
        <button
          onClick={exportStudentsToCsv}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar Lista de Alunos
        </button>

        <button
          onClick={handleViewDetailedReport}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Ver Relatório Detalhado
        </button>

        <button
          onClick={handleSendMessage}
          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Enviar Comunicado
        </button>
      </div>
    </div>
  )
}
