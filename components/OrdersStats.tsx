'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import MetricSparkline from './MetricSparkline'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

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
    if (value > 0)
      return <span className="flex items-center gap-0.5 text-[#008060] text-xs"><ArrowUp size={12} />{value.toFixed(1)}%</span>
    if (value < 0)
      return <span className="flex items-center gap-0.5 text-red-600 text-xs"><ArrowDown size={12} />{Math.abs(value).toFixed(1)}%</span>
    return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={12} />0%</span>
  }

  // Prepare sparkline data (just the currentChartData with value field)
  const sparklineData = stats.currentChartData || []

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5 mb-6">
      {/* Top controls: Date presets + Store filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm text-[#303030]"
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
          <span className="text-sm text-[#616161]">Store:</span>
          <select
            value={selectedStore}
            onChange={(e) => onStoreChange(e.target.value)}
            className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm text-[#303030]"
          >
            {allBrands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Orders */}
        <div
          onClick={() => setSelectedMetric('orders')}
          className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
            selectedMetric === 'orders' ? 'border-[#008060] shadow-sm' : 'border-[#E3E3E3] hover:shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[#616161] uppercase tracking-wide">Orders</p>
              <p className="text-2xl font-semibold text-[#303030] mt-1">{stats.orders}</p>
              <div className="mt-1"><Trend value={stats.ordersGrowth} /></div>
            </div>
            <MetricSparkline data={sparklineData} />
          </div>
        </div>

        {/* Total Sales */}
        <div
          onClick={() => setSelectedMetric('sales')}
          className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
            selectedMetric === 'sales' ? 'border-[#008060] shadow-sm' : 'border-[#E3E3E3] hover:shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[#616161] uppercase tracking-wide">Total Sales</p>
              <p className="text-2xl font-semibold text-[#303030] mt-1">{formatCurrency(stats.totalSales)}</p>
              <div className="mt-1"><Trend value={stats.salesGrowth} /></div>
            </div>
            <MetricSparkline data={sparklineData} />
          </div>
        </div>

        {/* Sessions */}
        <div
          onClick={() => setSelectedMetric('sessions')}
          className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
            selectedMetric === 'sessions' ? 'border-[#008060] shadow-sm' : 'border-[#E3E3E3] hover:shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[#616161] uppercase tracking-wide">Sessions</p>
              <p className="text-2xl font-semibold text-[#303030] mt-1">{stats.sessions}</p>
              <div className="mt-1"><Trend value={stats.sessionsGrowth} /></div>
            </div>
            <MetricSparkline data={sparklineData} />
          </div>
        </div>
      </div>

      {/* Main chart */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-b-2 border-[#008060] rounded-full" />
        </div>
      )}
      {error && <p className="text-red-500 py-4">Failed to load stats</p>}
      {!isLoading && !error && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E3E3E3' }} />
              <Line
                data={stats.currentChartData}
                type="monotone"
                dataKey="value"
                stroke="#008060"
                strokeWidth={2}
                dot={false}
                name="Current period"
              />
              {stats.previousChartData.length > 0 && (
                <Line
                  data={stats.previousChartData}
                  type="monotone"
                  dataKey="value"
                  stroke="#9CA3AF"
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