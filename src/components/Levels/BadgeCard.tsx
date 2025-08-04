import { Lock, Award, Info } from 'lucide-react'

export type Badge = {
  id: string
  title: string
  current: number
  stages: number[]
  unit: string
  image?: string // Path to the badge image
  description?: string // Description of what this badge represents
}

const badgeStages = ['Júnior', 'Pleno', 'Sênior', 'Especialista', 'Expert']

export function BadgeCard({ badge }: { badge: Badge }) {
  const { current, stages, title, unit, image, description } = badge

  // Check if this is a "lower is better" badge (like Pioneer rank)
  const isInverseBadge = title === 'Pioneiro'
  
  // Find the highest stage achieved
  let currentStageIndex = 0
  let nextTarget = 0
  let progress = 0
  
  if (isInverseBadge) {
    // For inverse badges (lower is better)
    for (let i = 0; i < stages.length; i++) {
      if (current <= stages[i]) {
        currentStageIndex = i + 1
      }
    }
    
    // Cap at max level
    if (currentStageIndex > stages.length) {
      currentStageIndex = stages.length
    }
    
    if (currentStageIndex < stages.length) {
      nextTarget = stages[currentStageIndex]
      const previousTarget = currentStageIndex > 0 ? stages[currentStageIndex - 1] : stages[stages.length - 1]
      progress = Math.min(100, Math.round(((previousTarget - current) / (previousTarget - nextTarget)) * 100))
    } else {
      nextTarget = stages[stages.length - 1]
      progress = 100
    }
  } else {
    // For normal badges (higher is better)
    for (let i = 0; i < stages.length; i++) {
      if (current >= stages[i]) {
        currentStageIndex = i + 1
      } else {
        break
      }
    }
    
    // Cap at max level
    if (currentStageIndex > stages.length) {
      currentStageIndex = stages.length
    }
    
    if (currentStageIndex < stages.length) {
      // Working towards next stage
      nextTarget = stages[currentStageIndex]
      const previousTarget = currentStageIndex > 0 ? stages[currentStageIndex - 1] : 0
      progress = Math.min(100, Math.round(((current - previousTarget) / (nextTarget - previousTarget)) * 100))
    } else {
      // Already at max level
      nextTarget = stages[stages.length - 1]
      progress = 100
    }
  }

  const stageLabel = badgeStages[Math.max(0, currentStageIndex - 1)] || badgeStages[0]
  const maxValue = nextTarget
  
  // Check if badge has no progress at all
  const hasNoProgress = current === 0 || (isInverseBadge && current === 0)
  const isDisabled = hasNoProgress

  return (
    <div className={`border rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-all relative ${
      isDisabled 
        ? 'border-gray-300 bg-gray-50' 
        : 'border-gray-200 bg-white'
    }`}>
      {/* Badge Image */}
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 overflow-hidden ${
          isDisabled 
            ? 'bg-gray-200 border-gray-300' 
            : 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-500'
        }`}>
          {isDisabled ? (
            // Always show lock icon for disabled badges
            <Lock className="w-5 h-5 text-gray-400" />
          ) : image ? (
            // Show image for enabled badges that have one
            <img 
              src={image} 
              alt={`${title} badge`}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            // Fallback to award icon for enabled badges without image
            <Award className="w-5 h-5 text-white" />
          )}
        </div>
        
        {/* Stage indicator and info icon */}
        <div className="flex items-center gap-2">
          {/* Info icon with tooltip */}
          {description && (
            <div className="relative group">
              <Info className={`w-4 h-4 cursor-help ${
                isDisabled ? 'text-gray-400' : 'text-gray-500 hover:text-blue-600'
              }`} />
              
              {/* Tooltip */}
              <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                {description}
              </div>
            </div>
          )}
          
          {/* Stage indicator */}
          <div className={`text-xs px-2 py-1 rounded-full ${
            isDisabled 
              ? 'bg-gray-300 text-gray-500' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {stageLabel}
          </div>
        </div>
      </div>

      <h4 className={`font-semibold ${
        isDisabled ? 'text-gray-400' : 'text-gray-800'
      }`}>
        {title}
      </h4>
      <p className={`text-sm ${
        isDisabled ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {`${current} / ${maxValue} ${unit}`}
      </p>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isDisabled ? 'bg-gray-300' : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  )
}