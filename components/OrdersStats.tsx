'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const periods = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'Year', value: 'year' },
]

const allBrands = [
  { id: 'all', name: 'All' },
  { id: '1', name: 'Auracos' },
  { id: '2', name: 'Makari' },
  { id: '3', name: 'Gamarde' },
  { id: '4', name: 'Alphascience' },
  { id: '5', name: 'Ainhoa' },
  { id: '6', name: 'cygnelab' },
]

interface Props {
  selectedStore: string
  onStoreChange: (id: string) => void
  selectedPeriod: string
  onPeriodChange: (period: string) => void
}

export default function OrdersStats({
  selectedStore,
  onStoreChange,
  selectedPeriod,
  onPeriodChange,
}: Props) {
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const queryParams = new URLSearchParams({
    period: selectedPeriod,
    storeId: selectedStore,
  })
  if (showCustom && customStart && customEnd) {
    queryParams.set('start', customStart)
    queryParams.set('end', customEnd)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['stats', selectedPeriod, selectedStore, customStart, customEnd],
    queryFn: () => fetch(`/api/orders-stats?${queryParams}`).then(r => r.json()),
  })

  const stats = data || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, ordersGrowth: 0, chartData: [] }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
      {/* Header: Title + Brand dropdown (kept for accessibility) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
          Orders Statistics
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedStore}
            onChange={(e) => onStoreChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {allBrands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Time period filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => { onPeriodChange(p.value); setShowCustom(false) }}
            className={`px-3 py-1.5 text-sm rounded-md border ${
              selectedPeriod === p.value && !showCustom
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            showCustom ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Brand filter pills – directly in the chart area */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allBrands.map(brand => (
          <button
            key={brand.id}
            onClick={() => onStoreChange(brand.id)}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedStore === brand.id
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {brand.name}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500">Start</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">End</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>}
      {error && <p className="text-red-500 py-4">Failed to load stats</p>}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-xl font-semibold">{stats.totalOrders}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-xl font-semibold">${stats.totalRevenue.toFixed(0)}</p>
            </div>
          </div>
          {stats.totalOrders > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-xs text-gray-500">Avg. Order</p>
                  <p className="text-sm font-semibold">${stats.averageOrderValue.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-xs text-gray-500">Growth</p>
                  <p className={`text-sm font-semibold ${stats.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.ordersGrowth >= 0 ? '+' : ''}{stats.ordersGrowth.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={date => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}