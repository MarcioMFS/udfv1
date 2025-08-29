// src/components/EventDetails/EventPerformanceChart.tsx
import { useMemo } from 'react'
import { BarChart3, Calendar, TrendingUp } from 'lucide-react'
import { format, parseISO, startOfDay, eachDayOfInterval, min, max } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EventMatch {
  id: string
  match_date: string
  match_number: number
  player_id: string
  player_name: string
  player_email: string
  class_code: string
  app_serial: string
}

interface EventPerformanceChartProps {
  matches: EventMatch[]
}

export function EventPerformanceChart({ matches }: EventPerformanceChartProps) {
  const chartData = useMemo(() => {
    if (matches.length === 0) return []

    // Group matches by day
    const matchesByDay = new Map<string, number>()
    
    matches.forEach(match => {
      const day = format(startOfDay(parseISO(match.match_date)), 'yyyy-MM-dd')
      matchesByDay.set(day, (matchesByDay.get(day) || 0) + 1)
    })

    // Get date range
    const dates = matches.map(m => parseISO(m.match_date))
    const minDate = min(dates)
    const maxDate = max(dates)

    if (!minDate || !maxDate) return []

    // Create array with all days in range
    const allDays = eachDayOfInterval({ start: startOfDay(minDate), end: startOfDay(maxDate) })
    
    return allDays.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      const matchesCount = matchesByDay.get(dayKey) || 0
      
      return {
        date: day,
        matches: matchesCount,
        label: format(day, 'dd/MM', { locale: ptBR })
      }
    })
  }, [matches])

  const maxMatches = Math.max(...chartData.map(d => d.matches), 1)
  const totalMatches = matches.length
  const avgMatchesPerDay = chartData.length > 0 ? Math.round(totalMatches / chartData.length) : 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5" />
          Atividade por Dia
        </h2>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total de Partidas</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalMatches}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Média por Dia</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{avgMatchesPerDay}</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {chartData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum dado disponível</h3>
            <p className="text-gray-600">O gráfico aparecerá quando houver partidas registradas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="h-48 flex items-end justify-between gap-1 px-2">
              {chartData.map((day, index) => {
                const height = maxMatches > 0 ? (day.matches / maxMatches) * 100 : 0
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1 max-w-[40px]">
                    <div className="relative group w-full">
                      <div 
                        className="bg-blue-500 rounded-t-md transition-all duration-300 hover:bg-blue-600 min-h-[4px] w-full"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      
                      {/* Tooltip */}
                      {day.matches > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                            {day.matches} partidas
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex items-center justify-between text-xs text-gray-600 px-2">
              {chartData.map((day, index) => {
                // Show every 3rd label to avoid overcrowding
                const shouldShow = index % 3 === 0 || index === chartData.length - 1
                
                return (
                  <div key={index} className="flex-1 max-w-[40px] text-center">
                    {shouldShow ? day.label : ''}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Partidas por dia</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}