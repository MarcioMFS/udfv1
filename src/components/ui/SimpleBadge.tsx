import { CheckCircle, Circle } from 'lucide-react'
import type { SimpleBadge } from '../../hooks/useInstructorStats'

interface SimpleBadgeProps {
  badge: SimpleBadge
}

export function SimpleBadge({ badge }: SimpleBadgeProps) {
  const { title, achieved, requirement, current } = badge

  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      achieved 
        ? 'border-green-500 bg-green-50 text-green-800' 
        : 'border-gray-300 bg-gray-50 text-gray-600'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        {achieved ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <Circle className="w-6 h-6 text-gray-400" />
        )}
        <h4 className="font-semibold">{title}</h4>
      </div>
      
      <div className="text-sm">
        <p className="mb-1">
          <span className="font-medium">{current}</span> / {requirement}
        </p>
        
        {achieved ? (
          <p className="text-green-600 font-medium">✨ Conquistado!</p>
        ) : (
          <p className="text-gray-500">
            Faltam {requirement - current} para conquistar
          </p>
        )}
      </div>
    </div>
  )
}