

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  message?: string
}

export function LoadingSpinner({ size = 'md', className = '', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-4 border-blue-600 border-t-transparent rounded-full animate-spin`}
      />
      {message && (
        <p className="text-gray-600 mt-3 text-sm">{message}</p>
      )}
    </div>
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = 'Carregando...' }: PageLoadingProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <LoadingSpinner size="lg" message={message} />
    </div>
  )
}

interface InlineLoadingProps {
  message?: string
  className?: string
}

export function InlineLoading({ message, className }: InlineLoadingProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <LoadingSpinner size="md" message={message} />
    </div>
  )
}