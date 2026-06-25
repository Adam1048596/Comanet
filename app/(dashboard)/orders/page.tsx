'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import OrdersStats from '@/components/OrdersStats'
import OrdersFilterBar from '@/components/OrdersFilterBar'
import OrdersTable from '@/components/OrdersTable'
import { ChevronDown, Plus } from 'lucide-react'

// ---------- API: fetch paginated orders ----------
async function fetchOrdersPage(page: number, period: string, storeId: string, limit = 20) {
  const offset = (page - 1) * limit
  const params = new URLSearchParams({
    type: 'list',
    offset: String(offset),
    limit: String(limit),
    period,
    storeId,
  })
  const res = await fetch(`/api/orders?${params}`)
  if (!res.ok) throw new Error('Failed to load orders')
  const data = await res.json()   // { orders: [...], total: number }
  return data
}

export default function OrdersPage() {
  // ----- Shared filter state -----
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedStore, setSelectedStore] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  // ----- Fetch orders with pagination -----
  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['all-orders', selectedPeriod, selectedStore, currentPage, searchTerm],
    queryFn: () => fetchOrdersPage(currentPage, selectedPeriod, selectedStore, limit),
    refetchInterval: 30000,
  })

  const orders = ordersData?.orders || []
  const totalOrders = ordersData?.total || 0
  const totalPages = Math.ceil(totalOrders / limit)

  // Client‑side status filter
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o: any) => o.status === statusFilter)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  return (
    <>
      {/* Page Title & Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#303030]">Orders</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 border border-[#E3E3E3] rounded-md px-4 py-2 text-sm text-[#303030] hover:bg-gray-50">
            Export
          </button>
          <button className="flex items-center gap-1.5 border border-[#E3E3E3] rounded-md px-4 py-2 text-sm text-[#303030] hover:bg-gray-50">
            More actions <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-1.5 bg-[#008060] text-white rounded-md px-4 py-2 text-sm font-medium">
            <Plus size={16} /> Create order
          </button>
        </div>
      </div>

      {/* Orders Statistics (with its own time/store filters) */}
      <OrdersStats
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Data Table Card */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] overflow-hidden">
        {/* Filter bar – completely separate from table */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#E3E3E3]">
          <OrdersFilterBar
            statusFilter={statusFilter}
            onStatusChange={(status) => setStatusFilter(status)}
            searchTerm={searchTerm}
            onSearchChange={(term) => { setSearchTerm(term); setCurrentPage(1) }}
          />
          <button className="text-gray-500 hover:text-gray-700">
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-[#008060] rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">Failed to load orders</div>
        ) : (
          <OrdersTable
            orders={filteredOrders}
            totalOrders={totalOrders}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        )}
      </div>
    </>
  )
}