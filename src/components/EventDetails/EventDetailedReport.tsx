import { useState } from 'react'
import { FileText, Download, TrendingUp, Users, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Event } from '../../types'

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

interface EventPlayer {
  player_id: string
  player?: {
    name: string
    email: string
  }
  total_matches: number
  avg_lucro: number
  avg_satisfaction: number
  avg_bonus: number
  total_profit: number
  last_match: string
}

interface EventStats {
  total_matches: number
  unique_players: number
  total_profit: number
  avg_satisfaction: number
  avg_bonus: number
  classes_count: number
  completion_rate: number
  best_player_total: number
  avg_matches_per_player: number
  engagement_rate: number
  total_days_active: number
}

interface EventDetailedReportProps {
  eventData: Event
  matches: EventMatch[]
  players: EventPlayer[]
  stats: EventStats
}

export function EventDetailedReport({ 
  eventData, 
  matches, 
  players, 
  stats 
}: EventDetailedReportProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    
    try {
      // Create CSV report content
      const csvContent = generateCSVReport()
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-evento-${eventData.code}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const generateCSVReport = () => {
    const formatCsvValue = (value: any) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }

    // Header for summary
    const summaryHeaders = ['Métrica', 'Valor']
    const summaryRows = [
      ['Código do Evento', eventData.code],
      ['Nome do Evento', eventData.name],
      ['Data de Criação', format(new Date(eventData.created_at), 'dd/MM/yyyy', { locale: ptBR })],
      ['Total de Partidas', stats.total_matches],
      ['Jogadores Únicos', stats.unique_players],
      ['Lucro Total', formatCurrency(stats.total_profit)],
      ['Satisfação Média', `${stats.avg_satisfaction}%`],
      ['Bônus Médio', stats.avg_bonus],
      ['Taxa de Engajamento', `${stats.engagement_rate}%`],
      ['Melhor Jogador Total', stats.best_player_total],
      ['Média Partidas/Jogador', stats.avg_matches_per_player.toFixed(1)]
    ].map(row => row.map(formatCsvValue).join(','))

    // Header for players
    const playersHeaders = ['Posição', 'Nome', 'Email', 'Total Partidas', 'Lucro Total', 'Lucro Médio', 'Satisfação Média', 'Bônus Médio', 'Última Partida']
    const playersRows = players.map((player, index) => [
      index + 1,
      player.player?.name || 'N/A',
      player.player?.email || 'N/A',
      player.total_matches,
      formatCurrency(player.total_profit),
      formatCurrency(player.avg_lucro),
      `${player.avg_satisfaction}%`,
      player.avg_bonus,
      format(new Date(player.last_match), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    ].map(formatCsvValue).join(','))

    // Header for matches
    const matchesHeaders = ['Data', 'Hora', 'Jogador', 'Email', 'Número da Partida', 'App Serial (Primeiros 20 chars)']
    const matchesRows = matches.slice(0, 50).map(match => [ // Limit to first 50 matches
      format(new Date(match.match_date), 'dd/MM/yyyy', { locale: ptBR }),
      format(new Date(match.match_date), 'HH:mm', { locale: ptBR }),
      match.player_name,
      match.player_email,
      match.match_number,
      match.app_serial.substring(0, 20)
    ].map(formatCsvValue).join(','))

    // Combine all sections
    return [
      'RESUMO DO EVENTO',
      summaryHeaders.join(','),
      ...summaryRows,
      '',
      'RANKING DE JOGADORES',
      playersHeaders.join(','),
      ...playersRows,
      '',
      'ULTIMAS 50 PARTIDAS',
      matchesHeaders.join(','),
      ...matchesRows
    ].join('\n')
  }

  const topPerformers = players.slice(0, 3)
  const avgProfitPerPlayer = stats.unique_players > 0 ? stats.total_profit / stats.unique_players : 0
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Relatório Detalhado</h3>
              <p className="text-sm text-gray-600">Análise completa do desempenho do evento</p>
            </div>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {isGeneratingReport ? 'Gerando...' : 'Baixar Relatório'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Performance Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-semibold text-blue-800 truncate">Performance Geral</h4>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-blue-700">Bônus Médio:</span>
                <span className="font-medium text-blue-800">{stats.avg_bonus}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-blue-700">Melhor Total:</span>
                <span className="font-medium text-blue-800">{stats.best_player_total}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-blue-700">Satisfação:</span>
                <span className="font-medium text-blue-800">{stats.avg_satisfaction}%</span>
              </div>
            </div>
          </div>

          {/* Engagement Summary */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="font-semibold text-green-800 truncate">Engajamento</h4>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-green-700">Total de Partidas:</span>
                <span className="font-medium text-green-800">{stats.total_matches}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-green-700">Jogadores Únicos:</span>
                <span className="font-medium text-green-800">{stats.unique_players}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-green-700">Média/Jogador:</span>
                <span className="font-medium text-green-800">{stats.avg_matches_per_player.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-yellow-600" />
              </div>
              <h4 className="font-semibold text-yellow-800 truncate">Resultados</h4>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-yellow-700">Lucro Total:</span>
                <span className="font-medium text-yellow-800 break-words">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(stats.total_profit)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-yellow-700">Média/Jogador:</span>
                <span className="font-medium text-yellow-800 break-words">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(avgProfitPerPlayer)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-yellow-700">Turmas:</span>
                <span className="font-medium text-yellow-800">{stats.classes_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">🏆 Melhores Performers</h4>
            <div className="space-y-3">
              {topPerformers.map((player, index) => (
                <div key={player.player_id || index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{player.player?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{player.player?.email || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">Lucro: R$ {player.avg_lucro}</p>
                    <p className="text-sm text-gray-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(player.total_profit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}