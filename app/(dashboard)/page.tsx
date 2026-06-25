'use client'

import { useState } from 'react'
import OrdersStats from '@/components/OrdersStats'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedStore, setSelectedStore] = useState('all')

  return (
    <>
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#303030]">Dashboard</h1>
        <Link href="/orders" className="flex items-center gap-2 text-[#008060] hover:underline font-medium">
          View all orders <ArrowRight size={16} />
        </Link>
      </div>

      {/* Orders Statistics */}
      <OrdersStats
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Quick KPI cards can be added here later */}
    </>
  )
}