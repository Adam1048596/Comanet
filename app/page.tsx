'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Settings, LogOut,
  Bell, Search,
} from 'lucide-react'
import SidebarOrdersBadge from '@/components/SidebarOrdersBadge'
import DashboardHome from '@/components/DashboardHome'
import OrdersPage from '@/components/OrdersPage'
import ProductsPage from '@/components/ProductsPage'

type View = 'dashboard' | 'orders' | 'products'

export default function MainApp() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [activeView, setActiveView] = useState<View>('dashboard')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setEmail(user.email || '')
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' as View },
    { icon: ShoppingCart, label: 'Orders', view: 'orders' as View },
    { icon: Package, label: 'Products', view: 'products' as View },
    { icon: Users, label: 'Customers', view: null, href: '#' },
    { icon: BarChart3, label: 'Analytics', view: null, href: '#' },
  ]

  return (
    <div className="min-h-screen flex bg-[#F1F1F1] font-sans text-[13px] text-[#303030]">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="w-60 bg-[#1A1A1A] text-white flex flex-col fixed h-full z-30">
        <div className="px-4 py-5 border-b border-gray-700">
          <h1 className="text-lg font-bold tracking-tight">Comanet</h1>
        </div>

        <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
          <p className="px-4 text-xs uppercase tracking-widest text-gray-400 mb-2">General</p>
          {sidebarItems.map((item, idx) => {
            const isActive = item.view === activeView
            if (item.view) {
              return (
                <button
                  key={idx}
                  onClick={() => setActiveView(item.view!)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#008060] text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.label === 'Orders' && <SidebarOrdersBadge />}
                </button>
              )
            }
            return (
              <a
                key={idx}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </a>
            )
          })}

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
        {/* Top Header */}
        <header className="bg-[#1A1A1A] text-white sticky top-0 z-20 px-6 py-2.5 flex items-center gap-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full pl-9 pr-16 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#008060]"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">Ctrl K</kbd>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Bell size={18} className="text-gray-400 cursor-pointer hover:text-white" />
            <div className="w-8 h-8 rounded-full bg-[#008060] flex items-center justify-center text-white font-medium text-sm">
              {email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Content area – swaps between Dashboard, Orders, and Products */}
        <main className="p-6 space-y-6">
          {activeView === 'dashboard' && <DashboardHome />}
          {activeView === 'orders' && <OrdersPage />}
          {activeView === 'products' && <ProductsPage />}
        </main>
      </div>
    </div>
  )
}