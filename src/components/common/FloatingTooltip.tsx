

interface FloatingTooltipProps {
  isVisible: boolean
  content: React.ReactNode
  position: { top: number; left: number } | null
}

export function FloatingTooltip({ isVisible, content, position }: FloatingTooltipProps) {
  if (!isVisible || !position || !content) {
    return null
  }

  return (
    <div
      className="fixed z-50 p-3 bg-gray-800 text-white text-xs rounded-md shadow-lg pointer-events-none transition-opacity duration-200"
      style={{
        top: position.top - 10,
        left: position.left,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {content}
    </div>
  )
}
