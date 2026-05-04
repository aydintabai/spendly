'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MonthlySummary, CategoryBreakdown, MonthlyTotal, PaginatedResponse, Transaction, AnalysisReport } from '@/types'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (month: string) => [...dashboardKeys.all, 'summary', month] as const,
  categories: (month: string) => [...dashboardKeys.all, 'categories', month] as const,
  monthly: (n: number) => [...dashboardKeys.all, 'monthly', n] as const,
  recent: () => [...dashboardKeys.all, 'recent'] as const,
}

export function useDashboardSummary(month: string) {
  return useQuery<MonthlySummary>({
    queryKey: dashboardKeys.summary(month),
    queryFn: () => api.transactions.summary(month),
  })
}

export function useCategoryBreakdown(month: string) {
  return useQuery<CategoryBreakdown[]>({
    queryKey: dashboardKeys.categories(month),
    queryFn: () => api.transactions.categories(month),
  })
}

export function useMonthlyHistory(months = 6) {
  return useQuery<MonthlyTotal[]>({
    queryKey: dashboardKeys.monthly(months),
    queryFn: () => api.transactions.monthly(months),
  })
}

export function useRecentTransactions() {
  return useQuery<PaginatedResponse<Transaction>>({
    queryKey: dashboardKeys.recent(),
    queryFn: () => api.transactions.list({ page: 1, page_size: 8 }),
  })
}

export function useAnalysis() {
  return useMutation<AnalysisReport, Error>({
    mutationFn: () => api.agent.analyze(),
  })
}
