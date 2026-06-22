'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import OrdersStats from '@/components/OrdersStats'
import StatusBadge from '@/components/StatusBadge'

// Fetch function now includes period and storeId
async function fetchOrdersPage({ pageParam = 0, period, storeId }: { pageParam: number; period: string; storeId: string }) {
  const limit = 50
  const offset = pageParam
  const params = new URLSearchParams({
    type: 'list',
    offset: String(offset),
    limit: String(limit),
    period,
    storeId,
  })
  const res = await fetch(`/api/orders?${params}`)
  if (!res.ok) throw new Error('Failed to load orders')
  const orders = await res.json()
  return { orders, nextOffset: offset + orders.length }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const queryClient = useQueryClient()

  // ----- Shared filter state -----
  const [selectedPeriod, setSelectedPeriod] = useState('30d')   // default 30 days
  const [selectedStore, setSelectedStore] = useState('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setEmail(user.email || '')
    })
  }, [])

  // ----- Orders fetching (infinite scroll) -----
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['all-orders', selectedPeriod, selectedStore],
    queryFn: ({ pageParam = 0 }) => fetchOrdersPage({ pageParam, period: selectedPeriod, storeId: selectedStore }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      // limit is 50, so if we got fewer than 50, there are no more pages
      return lastPage.orders.length < 50 ? undefined : lastPage.nextOffset
    },
    refetchInterval: 30000,
  })

  const allOrders = data?.pages.flatMap(page => page.orders) || []

  // ----- Status update mutation (using unified API) -----
  const updateStatus = useMutation({
    mutationFn: async ({ storeId, orderId, status }: { storeId: string; orderId: string; status: string }) => {
      const res = await fetch('/api/orders', {   // <-- unified API endpoint
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, orderId, status }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Failed to update status')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error: Error) => {
      alert('Status update failed: ' + error.message)
    },
  })

  // ----- Intersection Observer for infinite scroll -----
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })
      if (node) observerRef.current.observe(node)
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  // ----- Logout -----
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Store Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Orders Statistics – with filter controls */}
        <OrdersStats
          selectedStore={selectedStore}
          onStoreChange={setSelectedStore}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">All Orders</h2>
          </div>

          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">Failed to load orders</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allOrders.map((order: any) => (
                      <tr
                        key={`${order._storeId}-${order.id}`}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/orders/${order.id}?storeId=${order._storeId}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          #{order.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order._storeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge
                            storeId={order._storeId}
                            orderId={order.id}
                            currentStatus={order.status}
                            onStatusChange={(storeId, orderId, newStatus) => {
                              updateStatus.mutate({ storeId, orderId, status: newStatus })
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allOrders.length === 0 && !isFetchingNextPage && (
                  <div className="text-center py-12 text-gray-500">No orders found</div>
                )}
              </div>

              <div ref={loadMoreRef} className="h-10" />
              {isFetchingNextPage && (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}