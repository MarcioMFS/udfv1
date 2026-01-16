// SuccessModal.tsx
import { useState } from 'react'
import { ClipboardCheck, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

type SuccessModalProps = {
  isOpen: boolean
  onClose: () => void
  eventCode: string
}

export function CreateEventModal({ isOpen, onClose, eventCode }: SuccessModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(eventCode)
    setCopied(true)
    toast.success('Código copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-green-600">Evento criado com sucesso!</h2>
        <p className="text-gray-700 mb-2">Código do evento:</p>
        <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md mb-4">
          <span className="font-mono text-sm">{eventCode}</span>
          <button
            onClick={handleCopy}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Copiar código"
          >
            {copied ? <ClipboardCheck size={20} /> : <Copy size={20} />}
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}