'use client'

import { useState, useEffect } from 'react'
import { FilterBar } from '@/components/transactions/FilterBar'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { useTransactionsList } from '@/hooks/useTransactions'

const PAGE_SIZE = 20

function currentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const filters = {
    search: debouncedSearch || undefined,
    category: category !== 'All' ? category : undefined,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading } = useTransactionsList(filters)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    setPage(1)
  }

  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 0
  const transactions = data?.items ?? []

  return (
    <div>
      <div style={{ padding: '28px 32px 0', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', color: '#1c1c1e', marginBottom: 3 }}>
          Transactions
        </div>
        <div style={{ fontSize: 13, color: '#6b6560' }}>
          {isLoading ? '—' : total} transactions · {currentMonthLabel()}
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={handleSearchChange}
        category={category}
        onCategoryChange={handleCategoryChange}
      />

      <div style={{ padding: '0 32px 32px' }}>
        <div
          className="rounded-xl bg-white overflow-hidden"
          style={{
            border: '1px solid rgba(28,28,30,0.08)',
            boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
          }}
        >
          <TransactionTable
            transactions={transactions}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
