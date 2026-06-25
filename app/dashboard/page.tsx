'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import OrdersStats from '@/components/OrdersStats'
import StatusBadge from '@/components/StatusBadge'
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Settings, LogOut,
  Search, Filter, ChevronDown, ChevronLeft, ChevronRight, MoreVertical,
  Bell, Plus
} from 'lucide-react'

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

// ---------- Sidebar navigation ----------
const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', href: '/dashboard', active: true, badge: 3181 },
  { icon: Package, label: 'Products', href: '#' },
  { icon: Users, label: 'Customers', href: '#' },
  { icon: BarChart3, label: 'Analytics', href: '#' },
]

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const queryClient = useQueryClient()

  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedStore, setSelectedStore] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setEmail(user.email || '')
    })
  }, [])

  // Fetch orders with pagination
  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['all-orders', selectedPeriod, selectedStore, currentPage, searchTerm],
    queryFn: () => fetchOrdersPage(currentPage, selectedPeriod, selectedStore, limit),
    refetchInterval: 30000,
  })

  const orders = ordersData?.orders || []
  const totalOrders = ordersData?.total || 0
  const totalPages = Math.ceil(totalOrders / limit)

  // Client-side filtering by status (only if statusFilter !== 'all')
  let filteredOrders = orders
  if (statusFilter !== 'all') {
    filteredOrders = orders.filter((o: any) => o.status === statusFilter)
  }

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: async ({ storeId, orderId, status }: { storeId: string; orderId: string; status: string }) => {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, orderId, status }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: 'Failed' }))).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => alert('Status update failed: ' + err.message),
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  return (
    <div className="min-h-screen flex bg-[#F1F1F1] font-sans text-[13px] text-[#303030]">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="w-60 bg-[#1A1A1A] text-white flex flex-col fixed h-full z-30">
        <div className="px-4 py-5 border-b border-gray-700">
          <h1 className="text-lg font-bold tracking-tight">Comanet</h1>
        </div>

        <nav className="flex-1 py-3 space-y-1">
          <p className="px-4 text-xs uppercase tracking-widest text-gray-400 mb-2">General</p>
          {sidebarItems.map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-[#008060] text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-gray-600 text-gray-200 text-xs rounded-full px-2 py-0.5">
                  {item.badge.toLocaleString()}
                </span>
              )}
            </a>
          ))}
          <div className="px-4 mt-4">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Sales Channels</p>
            <a href="#" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm py-1">Online Store</a>
            <a href="#" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm py-1">Shopify POS</a>
          </div>
          <div className="px-4 mt-4">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Apps</p>
            <a href="#" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm py-1">Analytics</a>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <Settings size={18} />
            <span>Settings</span>
          </a>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mt-3 w-full">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ---------- MAIN AREA ---------- */}
      <div className="ml-60 flex-1 flex flex-col">
        {/* Top Global Bar */}
        <header className="bg-[#1A1A1A] text-white sticky top-0 z-20 px-6 py-2.5 flex items-center gap-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="w-full pl-9 pr-16 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#008060]"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
              Ctrl K
            </kbd>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Bell size={18} className="text-gray-400 cursor-pointer hover:text-white" />
            <div className="w-8 h-8 rounded-full bg-[#008060] flex items-center justify-center text-white font-medium text-sm">
              {email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
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

          {/* Orders Statistics – with sparklines */}
          <OrdersStats
            selectedStore={selectedStore}
            onStoreChange={setSelectedStore}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />

          {/* Data Table Card */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] overflow-hidden">
            {/* Table Filter Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#E3E3E3]">
              <div className="flex items-center gap-4">
                <div className="flex rounded-md border border-[#E3E3E3] overflow-hidden">
                  {['all', 'pending', 'processing', 'completed'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 text-sm capitalize ${
                        statusFilter === s
                          ? 'bg-[#008060] text-white'
                          : 'bg-white text-[#303030] hover:bg-gray-50'
                      }`}
                    >
                      {s === 'all' ? 'All' : s}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter orders..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    className="pl-9 pr-4 py-1.5 border border-[#E3E3E3] rounded-md text-sm focus:ring-1 focus:ring-[#008060]"
                  />
                </div>
              </div>
              <button className="text-gray-500 hover:text-gray-700">
                <Filter size={18} />
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
                        <th className="px-4 py-3">Order <ChevronDown size={12} className="inline" /></th>
                        <th className="px-4 py-3">Date <ChevronDown size={12} className="inline" /></th>
                        <th className="px-4 py-3">Customer <ChevronDown size={12} className="inline" /></th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Brand</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E3]">
                      {filteredOrders.map((order: any) => (
                        <tr
                          key={`${order._storeId}-${order.id}`}
                          className="hover:bg-gray-50 cursor-pointer transition-colors h-[52px]"
                          onClick={() => router.push(`/dashboard/orders/${order.id}?storeId=${order._storeId}`)}
                        >
                          <td className="px-4 py-3"><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>
                          <td className="px-4 py-3 text-sm font-medium text-[#008060]">
                            #{order.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#616161]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#303030]">
                            {order.billing?.first_name || order.customer?.first_name || ''} {order.billing?.last_name || order.customer?.last_name || ''}
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
                          <td className="px-4 py-3 text-sm text-[#616161]">
                            {order._storeName}
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
        </main>
      </div>
    </div>
  )
}