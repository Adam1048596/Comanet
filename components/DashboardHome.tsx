'use client'

import { useState } from 'react'
import OrdersStats from './OrdersStats'
import { ArrowRight } from 'lucide-react'

export default function DashboardHome() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedStore, setSelectedStore] = useState('all')

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button className="flex items-center gap-2 text-[#008060] hover:underline font-medium">
          View all orders <ArrowRight size={16} />
        </button>
      </div>
      <OrdersStats
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />
    </>
  )
}