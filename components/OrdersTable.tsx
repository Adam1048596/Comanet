'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import StatusBadge from './StatusBadge'

interface Order {
  _storeId: string
  _storeName: string
  id: string
  orderNumber: string
  status: string
  total: string
  createdAt: string
  billing?: {
    first_name?: string
    last_name?: string
  }
  customer?: {
    first_name?: string
    last_name?: string
  }
}

interface Props {
  orders: Order[]
  totalOrders: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function OrdersTable({
  orders,
  totalOrders,
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: async ({ storeId, orderId, status }: { storeId: string; orderId: string; status: string }) => {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, orderId, status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => alert('Status update failed: ' + err.message),
  })

  const limit = 20
  const from = totalOrders === 0 ? 0 : (currentPage - 1) * limit + 1
  const to = Math.min(currentPage * limit, totalOrders)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 text-left text-xs font-medium text-[#616161] uppercase tracking-wider border-b border-[#E3E3E3]">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" /></th>
              <th className="px-4 py-3">
                Order <ChevronDown size={12} className="inline" />
              </th>
              <th className="px-4 py-3">
                Date <ChevronDown size={12} className="inline" />
              </th>
              <th className="px-4 py-3">
                Customer <ChevronDown size={12} className="inline" />
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E3E3]">
            {orders.map((order) => (
              <tr
                key={`${order._storeId}-${order.id}`}
                className="hover:bg-gray-50 cursor-pointer transition-colors h-[52px]"
                onClick={() => router.push(`/orders/${order.id}?storeId=${order._storeId}`)}
              >
                <td className="px-4 py-3">
                  <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-[#008060]">
                  #{order.orderNumber}
                </td>
                <td className="px-4 py-3 text-sm text-[#616161]">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-[#303030]">
                  {order.billing?.first_name || order.customer?.first_name || ''}{' '}
                  {order.billing?.last_name || order.customer?.last_name || ''}
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
                <td className="px-4 py-3 text-sm">{order.total}</td>
                <td className="px-4 py-3 text-sm text-[#616161]">{order._storeName}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() =>
                      window.open(`/invoice/${order.id}?storeId=${order._storeId}`, '_blank')
                    }
                    className="text-[#008060] hover:text-green-700 p-1 rounded hover:bg-green-50"
                    title="Generate invoice"
                  >
                    <FileText size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[#E3E3E3] text-sm">
        <span className="text-[#616161]">
          {totalOrders > 0 ? `${from}-${to} of ${totalOrders}` : '0 orders'}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-2">{currentPage}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </>
  )
}