'use client'

import { useQuery } from '@tanstack/react-query'

export default function SidebarOrdersBadge() {
  const { data } = useQuery({
    queryKey: ['sidebar-total-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders?type=stats&period=all_time&storeId=all&metric=orders')
      if (!res.ok) throw new Error('Failed')
      const stats = await res.json()
      return stats.orders // total number of orders
    },
    refetchInterval: 60000, // refresh every 60 seconds
  })

  const total = data ?? 0

  return (
    <span className="ml-auto bg-gray-600 text-gray-200 text-xs rounded-full px-2 py-0.5 min-w-[32px] text-center">
      {total.toLocaleString()}
    </span>
  )
}