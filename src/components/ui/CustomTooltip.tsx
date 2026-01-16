import React from 'react'

interface CustomTooltipProps {
  content: string
  children: React.ReactNode
  className?: string
}

export function CustomTooltip({ content, children, className = '' }: CustomTooltipProps) {
  return (
    <div className={`relative group ${className}`}>
      {children}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-[200px] sm:max-w-xs px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
        {content}
      </span>
    </div>
  )
}