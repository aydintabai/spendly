'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse, Transaction, TransactionFilter } from '@/types'

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters?: TransactionFilter) => [...transactionKeys.all, 'list', filters ?? {}] as const,
}

export function useTransactionsList(filters?: TransactionFilter) {
  return useQuery<PaginatedResponse<Transaction>>({
    queryKey: transactionKeys.list(filters),
    queryFn: () => api.transactions.list(filters),
  })
}
