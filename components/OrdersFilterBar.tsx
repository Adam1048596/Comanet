'use client'

import { Search } from 'lucide-react'

const statusOptions = ['all', 'pending', 'processing', 'completed']

interface Props {
  statusFilter: string
  onStatusChange: (status: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}

export default function OrdersFilterBar({
  statusFilter,
  onStatusChange,
  searchTerm,
  onSearchChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Status filter tabs */}
      <div className="flex rounded-md border border-[#E3E3E3] overflow-hidden">
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`px-3 py-1.5 text-sm capitalize transition-colors ${
              statusFilter === status
                ? 'bg-[#008060] text-white'
                : 'bg-white text-[#303030] hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter orders..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-4 py-1.5 border border-[#E3E3E3] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#008060]"
        />
      </div>
    </div>
  )
}