'use client'

import { useState } from 'react'

const statuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  failed: 'bg-gray-100 text-gray-800',
}

interface StatusBadgeProps {
  order?: any            // optional – not required
  storeId?: string
  orderId?: string
  currentStatus: string
  onStatusChange?: (storeId: string, orderId: string, status: string) => void
  readonly?: boolean     // set to true for static display
}

export default function StatusBadge({
  storeId = '',
  orderId = '',
  currentStatus,
  onStatusChange,
  readonly = false,
}: StatusBadgeProps) {
  const [editing, setEditing] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setEditing(false)
    if (onStatusChange && storeId && orderId) {
      onStatusChange(storeId, orderId, newStatus)
    }
  }

  // Static badge (used in order detail page)
  if (readonly || !onStatusChange) {
    return (
      <span
        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusColors[currentStatus] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {currentStatus}
      </span>
    )
  }

  // Interactive badge (dashboard table)
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
          statusColors[currentStatus] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {currentStatus}
      </button>
    )
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      onBlur={() => setEditing(false)}
      autoFocus
      className="text-xs border border-gray-300 rounded px-2 py-1"
    >
      {statuses.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}