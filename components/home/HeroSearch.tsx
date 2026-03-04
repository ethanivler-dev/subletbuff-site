'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CalendarDays } from 'lucide-react'
import { motion } from 'framer-motion'
import { QUICK_FILTERS } from '@/lib/constants'

export function HeroSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateOpen, setDateOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (activeFilter) params.set('filter', activeFilter)
    router.push(`/listings?${params.toString()}`)
  }

  function handleFilterClick(param: string) {
    const next = activeFilter === param ? null : param
    setActiveFilter(next)
  }

  const dateLabel =
    dateFrom && dateTo
      ? `${dateFrom} → ${dateTo}`
      : dateFrom
      ? `From ${dateFrom}`
      : 'Move-in & Move-out Dates'

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl mx-auto">
      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white text-center leading-tight drop-shadow-sm"
      >
        Find the Perfect<br />Sublet in Boulder
      </motion.h1>

      {/* Search bar */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        onSubmit={handleSearch}
        className="w-full bg-white rounded-full shadow-lg flex items-center overflow-visible"
      >
        {/* Text input */}
        <div className="flex items-center gap-2 flex-1 px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search neighborhoods, addresses, or landmarks"
            className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

        {/* Date picker trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDateOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
          >
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            <span className={dateFrom ? 'text-gray-800' : ''}>{dateLabel}</span>
          </button>

          {/* Date dropdown */}
          {dateOpen && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-card shadow-card-hover border border-gray-100 p-4 flex gap-4 z-50 whitespace-nowrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Move-in</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm border border-gray-200 rounded-button px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Move-out</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm border border-gray-200 rounded-button px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setDateOpen(false)}
                className="self-end text-xs text-primary-600 font-medium hover:underline"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          type="submit"
          className="m-1 px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-gray-900 font-semibold text-sm rounded-full transition-colors flex-shrink-0"
        >
          Search
        </button>
      </motion.form>

      {/* Quick filter pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {QUICK_FILTERS.map(({ label, param }) => {
          const isActive = activeFilter === param
          return (
            <button
              key={param}
              type="button"
              onClick={() => handleFilterClick(param)}
              className={[
                'px-4 py-1.5 text-sm font-medium rounded-full border transition-colors',
                isActive
                  ? 'bg-accent-500 border-accent-500 text-gray-900'
                  : 'bg-white/10 border-white/60 text-white hover:bg-white/20',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}
