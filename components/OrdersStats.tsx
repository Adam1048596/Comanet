'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

const timePresets = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'All Time', value: 'all_time' },
]

const allBrands = [
  { id: 'all', name: 'All Stores' },
  { id: '1', name: 'Auracos' },
  { id: '2', name: 'Makari' },
  { id: '3', name: 'Gamarde' },
  { id: '4', name: 'Alphascience' },
  { id: '5', name: 'Ainhoa' },
  { id: '6', name: 'Shopify Store' },
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
  const [selectedMetric, setSelectedMetric] = useState<'orders' | 'sales' | 'sessions'>('orders')

  const queryParams = new URLSearchParams({
    type: 'stats',
    period: selectedPeriod,
    storeId: selectedStore,
    metric: selectedMetric,
  })
  if (selectedPeriod === 'custom' && customStart && customEnd) {
    queryParams.set('start', customStart)
    queryParams.set('end', customEnd)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['stats', selectedPeriod, selectedStore, selectedMetric, customStart, customEnd],
    queryFn: () => fetch(`/api/orders?${queryParams}`).then(r => r.json()),
  })

  const stats = data || {
    sessions: 0,
    totalSales: 0,
    orders: 0,
    ordersGrowth: 0,
    salesGrowth: 0,
    sessionsGrowth: 0,
    currentChartData: [],
    previousChartData: [],
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(val)

  const Trend = ({ value }: { value: number }) => {
    if (value > 0) return <span className="flex items-center gap-0.5 text-green-600 text-xs"><ArrowUp size={12} />{value.toFixed(1)}%</span>
    if (value < 0) return <span className="flex items-center gap-0.5 text-red-600 text-xs"><ArrowDown size={12} />{Math.abs(value).toFixed(1)}%</span>
    return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={12} />0%</span>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
      {/* Top controls: Date presets + Store filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {timePresets.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
            <option value="custom">Custom</option>
          </select>

          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              <span className="text-gray-500">–</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Store:</span>
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

      {/* Metric cards – clickable selectors */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <button
          onClick={() => setSelectedMetric('orders')}
          className={`text-left bg-gray-50 rounded-lg p-4 border-2 transition-colors ${
            selectedMetric === 'orders' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
          }`}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">Orders</p>
          <p className="text-2xl font-semibold mt-1">{stats.orders}</p>
          <div className="mt-1"><Trend value={stats.ordersGrowth} /></div>
        </button>
        <button
          onClick={() => setSelectedMetric('sales')}
          className={`text-left bg-gray-50 rounded-lg p-4 border-2 transition-colors ${
            selectedMetric === 'sales' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
          }`}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Sales</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(stats.totalSales)}</p>
          <div className="mt-1"><Trend value={stats.salesGrowth} /></div>
        </button>
        <button
          onClick={() => setSelectedMetric('sessions')}
          className={`text-left bg-gray-50 rounded-lg p-4 border-2 transition-colors ${
            selectedMetric === 'sessions' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
          }`}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">Sessions</p>
          <p className="text-2xl font-semibold mt-1">{stats.sessions}</p>
          <div className="mt-1"><Trend value={stats.sessionsGrowth} /></div>
        </button>
      </div>

      {/* Chart */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" />
        </div>
      )}
      {error && <p className="text-red-500 py-4">Failed to load stats</p>}
      {!isLoading && !error && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Line
                data={stats.currentChartData}
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name="Current period"
              />
              {stats.previousChartData.length > 0 && (
                <Line
                  data={stats.previousChartData}
                  type="monotone"
                  dataKey="value"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Previous period"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}