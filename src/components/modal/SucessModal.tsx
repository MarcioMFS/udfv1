type ConfirmDialogProps = {
  isOpen: boolean
  title?: string
  message: string
  onConfirm: () => void
  confirmLabel?: string
}

export function SucessModal({
  isOpen,
  message,
  onConfirm,
  confirmLabel = '',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-red-700 transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}