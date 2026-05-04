export type CategoryName =
  | 'Food & Dining'
  | 'Transportation'
  | 'Shopping'
  | 'Subscriptions'
  | 'Entertainment'
  | 'Health'
  | 'Gas'
  | 'Income'
  | 'Other'

export interface CategoryConfig {
  label: string
  color: string
  badgeClass: string
}

export const CATEGORY_CONFIG: Record<CategoryName, CategoryConfig> = {
  'Food & Dining': {
    label: 'Food & Dining',
    color: '#f97316',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  Transportation: {
    label: 'Transportation',
    color: '#3b82f6',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  Shopping: {
    label: 'Shopping',
    color: '#a855f7',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  Subscriptions: {
    label: 'Subscriptions',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  Entertainment: {
    label: 'Entertainment',
    color: '#ec4899',
    badgeClass: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  },
  Health: {
    label: 'Health',
    color: '#22c55e',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  Gas: {
    label: 'Gas',
    color: '#f59e0b',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  Income: {
    label: 'Income',
    color: '#10b981',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  Other: {
    label: 'Other',
    color: '#6b7280',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
  },
} as const

export const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as CategoryName[]
