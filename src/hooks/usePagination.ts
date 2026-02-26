import { useState, useEffect, useMemo } from 'react'

interface UsePaginationReturn<T> {
  currentItems: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  itemsPerPage: number
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  setItemsPerPage: (n: number) => void
}

/**
 * Hook de paginação reutilizável.
 *
 * @param items        Array completo de itens já filtrados
 * @param defaultPerPage  Itens por página (padrão: 10)
 * @param resetKey     Qualquer valor — quando muda, reseta para a página 1
 */
export function usePagination<T>(
  items: T[],
  defaultPerPage = 10,
  resetKey?: string | number,
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage]   = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultPerPage)

  // Reseta para a página 1 sempre que a lista muda de tamanho ou o resetKey muda
  useEffect(() => {
    setCurrentPage(1)
  }, [items.length, resetKey])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length, itemsPerPage],
  )

  // Garante que a página atual nunca ultrapasse o total
  const safePage   = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex   = Math.min(startIndex + itemsPerPage, items.length)

  const currentItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  )

  const goToPage = (page: number) =>
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))

  return {
    currentItems,
    currentPage: safePage,
    totalPages,
    totalItems: items.length,
    startIndex,
    endIndex,
    itemsPerPage,
    goToPage,
    goToNextPage:     () => goToPage(safePage + 1),
    goToPreviousPage: () => goToPage(safePage - 1),
    setItemsPerPage:  (n: number) => { setItemsPerPage(n); setCurrentPage(1) },
  }
}
