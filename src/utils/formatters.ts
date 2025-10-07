import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventType, Purpose } from '../types'

export function formatDate(date: string | Date, pattern: string = 'dd/MM/yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, pattern, { locale: ptBR })
  } catch {
    return 'Data inválida'
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

export function formatTime(date: string | Date): string {
  return formatDate(date, 'HH:mm')
}

export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000) {
    return new Intl.NumberFormat('pt-BR', { 
      notation: 'compact', 
      compactDisplay: 'short', 
      maximumFractionDigits: 1 
    }).format(value)
  }
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1000) {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL', 
      notation: 'compact', 
      compactDisplay: 'short', 
      maximumFractionDigits: 1 
    }).format(value)
  }
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export function getEventTypeLabel(eventType: EventType): string {
  switch (eventType) {
    case 'training': return 'Training (Treinamento de Instrutores)'
    case 'group': return 'Group (Treinamento Normal de Alunos)'
    default: return eventType
  }
}

export function getPurposeLabel(purpose: Purpose | null): string {
  switch (purpose) {
    case 'lucro': return 'Lucro'
    case 'satisfacao': return 'Satisfação'
    case 'bonus': return 'Bônus'
    default: return 'Não definido'
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export function capitalizeFirst(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function formatCsvValue(value: any): string {
  if (value === null || value === undefined) return ''
  
  let stringValue = value.toString()
  
  // Escapa aspas duplas duplicando-as
  stringValue = stringValue.replace(/"/g, '""')
  
  // Coloca entre aspas se contém caracteres especiais
  if (stringValue.includes(',') || stringValue.includes(';') || 
      stringValue.includes('"') || stringValue.includes('\n') || 
      stringValue.includes('\r')) {
    return `"${stringValue}"`
  }
  
  return stringValue
}

export function formatCsvNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0'
  
  // Formata números usando vírgula decimal (padrão brasileiro)
  // mas mantém formato que Excel entende
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\-_.]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
}