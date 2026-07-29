'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import StatusBadge from './StatusBadge'
import OrderDetailView from './OrderDetailView'
import {
  ChevronLeft, ChevronRight, Plus, Search, Download
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ---------- API helpers ----------
async function fetchOrdersPage(
  page: number,
  period: string,
  storeId: string,
  limit = 20,
  start?: string,
  end?: string
) {
  const offset = (page - 1) * limit
  const params = new URLSearchParams({
    type: 'list',
    offset: String(offset),
    limit: String(limit),
    period,
    storeId,
  })
  if (period === 'custom' && start && end) {
    params.set('start', start)
    params.set('end', end)
  }
  const res = await fetch(`/api/orders?${params}`)
  if (!res.ok) throw new Error('Failed to load orders')
  return res.json()
}

export default function OrdersPage() {
  const queryClient = useQueryClient()

  // ----- view state -----
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedOrderStore, setSelectedOrderStore] = useState<string>('')

  // ----- filter state -----
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedStore, setSelectedStore] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const limit = 20

  // ----- data fetching -----
  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['all-orders', selectedPeriod, selectedStore, currentPage, searchTerm, customStart, customEnd],
    queryFn: () =>
      fetchOrdersPage(
        currentPage,
        selectedPeriod,
        selectedStore,
        limit,
        selectedPeriod === 'custom' ? customStart : undefined,
        selectedPeriod === 'custom' ? customEnd : undefined
      ),
    refetchInterval: 30000,
  })

  const orders = ordersData?.orders || []
  const totalOrders = ordersData?.total || 0
  const totalPages = Math.ceil(totalOrders / limit)

  const filteredOrders =
    statusFilter === 'all' ? orders : orders.filter((o: any) => o.status === statusFilter)

  // ----- Status update mutation -----
  const updateStatus = useMutation({
    mutationFn: async ({ storeId, orderId, status }: { storeId: string; orderId: string; status: string }) => {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, orderId, status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed to update status')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => alert('Status update failed: ' + err.message),
  })

  // ----- Export to Excel -----
  const exportToExcel = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        type: 'export-orders',
        period: selectedPeriod,
        storeId: selectedStore,
      })
      if (selectedPeriod === 'custom' && customStart && customEnd) {
        params.set('start', customStart)
        params.set('end', customEnd)
      }
      const res = await fetch(`/api/orders?${params}`)
      if (!res.ok) throw new Error('Failed to export')
      const data = await res.json()

      // Create worksheet
      const headerMapping: Record<string, string> = {
        orderNumber: 'Order number',
        date: 'Date',
        skuName: 'SKU / Name',
        quantity: 'Quantity',
        unitPrice: 'Unit price',
        lineTotal: 'Total line',
        orderTotal: 'Total Order',
        status: 'Status',
        customerName: 'Customer Name',
        city: 'City',
        bl: 'N° BL',
        facture: 'N° facture',
      }

      const newWorksheet = XLSX.utils.json_to_sheet(data, {
        header: Object.keys(headerMapping),
      })
      XLSX.utils.sheet_add_aoa(newWorksheet, [Object.values(headerMapping)], { origin: 'A1' })

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, newWorksheet, 'Orders')
      XLSX.writeFile(workbook, `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      alert('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  // ----- handlers -----
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  const handleRowClick = (order: any) => {
    setSelectedOrder(order)
    setSelectedOrderStore(order._storeId)
    setView('detail')
  }

  const handleBack = () => {
    setView('list')
    setSelectedOrder(null)
  }

  // ----- Render -----
  return (
    <>
      {/* --- Table or Detail view --- */}
      {view === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] overflow-hidden">
          {/* Table filter bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#E3E3E3] flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Status filter */}
              <div className="flex rounded-md border border-[#E3E3E3] overflow-hidden">
                {['all', 'pending', 'processing', 'completed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-sm capitalize ${
                      statusFilter === s ? 'bg-[#008060] text-white' : 'bg-white text-[#303030] hover:bg-gray-50'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>

              {/* Period filter */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="year">This Year</option>
                <option value="all_time">All Time</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Custom date inputs */}
              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm"
                    placeholder="Start"
                  />
                  <span className="text-gray-500">–</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm"
                    placeholder="End"
                  />
                </div>
              )}

              {/* Brand filter (store) */}
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">All Stores</option>
                <option value="1">Auracos</option>
                <option value="2">Makari</option>
                <option value="3">Gamarde</option>
                <option value="4">Alphascience</option>
                <option value="5">Ainhoa</option>
                <option value="6">Cygne</option>
              </select>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 pr-4 py-1.5 border border-[#E3E3E3] rounded-md text-sm focus:ring-1 focus:ring-[#008060]"
                />
              </div>
            </div>

            {/* Export button */}
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 border border-[#E3E3E3] rounded-md px-4 py-2 text-sm text-[#303030] hover:bg-gray-50 disabled:opacity-50"
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export Excel'}
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
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 text-left text-xs font-medium text-[#616161] uppercase tracking-wider border-b border-[#E3E3E3]">
                    <tr>
                      <th className="px-4 py-3"><input type="checkbox" /></th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Flags</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Payment Status</th>
                      <th className="px-4 py-3">Fulfillment Status</th>
                      <th className="px-4 py-3">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E3E3]">
                    {filteredOrders.map((order: any) => (
                      <tr
                        key={`${order._storeId}-${order.id}`}
                        className="hover:bg-gray-50 cursor-pointer transition-colors h-[52px]"
                        onClick={() => handleRowClick(order)}
                      >
                        <td className="px-4 py-3">
                          <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#008060]">
                          #{order.orderNumber}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge
                            storeId={order._storeId}
                            orderId={order.id}
                            currentStatus={order.status}
                            onStatusChange={(storeId, orderId, newStatus) => {
                              updateStatus.mutate({ storeId, orderId, status: newStatus })
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#616161]">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#303030]">
                          {order.billing?.first_name || order.customer?.first_name || ''}{' '}
                          {order.billing?.last_name || order.customer?.last_name || ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#616161]">{order._storeName}</td>
                        <td className="px-4 py-3 text-sm">{order.total}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : order.payment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {order.payment_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {order.status === 'completed' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Fulfilled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Unfulfilled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {order.line_items?.length || order.items_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-[#E3E3E3] text-sm">
                <span className="text-[#616161]">
                  {totalOrders > 0
                    ? `${(currentPage - 1) * limit + 1}-${Math.min(currentPage * limit, totalOrders)} of ${totalOrders}`
                    : '0 orders'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-2">{currentPage}</span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Detail view */
        <OrderDetailView order={selectedOrder} storeId={selectedOrderStore} onBack={handleBack} />
      )}
    </>
  )
}