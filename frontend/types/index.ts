export interface Transaction {
  id: string
  user_id: string
  account_id: string | null
  merchant_name: string
  amount: string
  category: string
  date: string
  pending: boolean
  currency_code: string
  note: string | null
}

export interface Account {
  id: string
  user_id: string
  plaid_account_id: string | null
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  institution_name: string | null
  current_balance: string | null
  available_balance: string | null
  currency_code: string
  mask: string | null
  is_active: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface MonthlySummary {
  month: string
  total_spent: string
  total_income: string
  transaction_count: number
  top_category: string | null
  mom_change_pct: number | null
}

export interface CategoryBreakdown {
  category: string
  total: string
  transaction_count: number
  percentage: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface TransactionFilter {
  category?: string
  start_date?: string
  end_date?: string
  search?: string
  account_id?: string
  pending?: boolean
  page?: number
  page_size?: number
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}
