// src/components/ClassDetails/ClassCodeCard.tsx
import { Copy } from 'lucide-react'
import { Class } from '../../types'

interface ClassCodeCardProps {
  classData: Class
  copyClassCode: () => void
}

export function ClassCodeCard({ classData, copyClassCode }: ClassCodeCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Código da Turma</h3>
      
      <div className="text-center">
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <p className="text-3xl font-bold text-gray-800 tracking-wider">{classData.code}</p>
        </div>
        
        <button
          onClick={copyClassCode}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copiar Código
        </button>
        
        <p className="text-xs text-gray-500 mt-2">
          Código único da turma sincronizada da UDF
        </p>
      </div>
    </div>
  )
}