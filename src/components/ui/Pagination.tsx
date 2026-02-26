import { ChevronLeft, ChevronRight } from 'lucide-react'
import { colors } from '../../lib/colors'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
  /** Mostra seletor de itens por página (padrão: false) */
  showPerPageSelector?: boolean
  onPerPageChange?: (n: number) => void
  perPageOptions?: number[]
}

/** Gera o array de páginas a exibir, com null representando "..." */
function getPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | null)[] = [1]

  if (current > 3) pages.push(null)

  const start = Math.max(2, current - 1)
  const end   = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push(null)

  pages.push(total)
  return pages
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
  showPerPageSelector = false,
  onPerPageChange,
  perPageOptions = [10, 25, 50],
}: PaginationProps) {
  if (totalItems === 0) return null

  const pages = getPageRange(currentPage, totalPages)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
      {/* Contagem */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>
          Exibindo <span className="font-semibold text-gray-800">{startIndex + 1}–{endIndex}</span>{' '}
          de <span className="font-semibold text-gray-800">{totalItems}</span> itens
        </span>

        {showPerPageSelector && onPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="ml-2 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {perPageOptions.map((n) => (
              <option key={n} value={n}>{n} por página</option>
            ))}
          </select>
        )}
      </div>

      {/* Navegação */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1">
          {/* Anterior */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium text-gray-600
                       hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Páginas */}
          <div className="flex items-center gap-1">
            {pages.map((page, idx) =>
              page === null ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-gray-400 text-sm select-none">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[36px] px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${page === currentPage
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  style={page === currentPage ? { backgroundColor: colors.primary } : {}}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Próximo */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium text-gray-600
                       hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  )
}
