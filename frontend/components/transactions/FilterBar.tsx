'use client'

import { CATEGORY_CONFIG } from '@/constants/categories'

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
}

const allCategories = ['All', ...Object.keys(CATEGORY_CONFIG)]

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(28,28,30,0.08)',
  color: '#1c1c1e',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  boxShadow: '0 1px 3px rgba(28,28,30,0.05)',
  transition: 'border-color 0.15s',
  outline: 'none',
}

const chevronSvg = `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236b6560' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`

export function FilterBar({ search, onSearchChange, category, onCategoryChange }: FilterBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 32px', marginBottom: 20, flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Search merchants…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ ...inputStyle, flex: 1, minWidth: 180, maxWidth: 240 }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#65a380'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(101,163,128,0.1)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'rgba(28,28,30,0.08)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(28,28,30,0.05)'
        }}
      />
      <select
        value={category}
        onChange={e => onCategoryChange(e.target.value)}
        style={{
          ...inputStyle,
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: chevronSvg,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: 28,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#65a380'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(101,163,128,0.1)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'rgba(28,28,30,0.08)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(28,28,30,0.05)'
        }}
      >
        {allCategories.map(c => (
          <option key={c} value={c} style={{ background: '#ffffff' }}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}
