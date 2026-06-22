import { NextRequest } from 'next/server'
import { fetchAllOrders } from '@/utils/fetch-orders'

const STORES = [
  { id: '1' }, { id: '2' }, { id: '3' },
  { id: '4' }, { id: '5' }, { id: '6' },
]

function getDateRange(period: string, start?: string, end?: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const format = (d: Date) => d.toISOString()

  // Helper: convert a date string (YYYY-MM-DD) to ISO string at start/end of day
  const isoFromDate = (dateStr: string, isEnd = false) => {
    const d = new Date(dateStr + (isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z'))
    return d.toISOString()
  }

  switch (period) {
    case 'today':
      return { after: format(todayStart), before: format(now) }
    case '7d': {
      const d = new Date(todayStart.getTime() - 7 * 86400000)
      return { after: format(d), before: format(now) }
    }
    case '30d': {
      const d = new Date(todayStart.getTime() - 30 * 86400000)
      return { after: format(d), before: format(now) }
    }
    case '90d': {
      const d = new Date(todayStart.getTime() - 90 * 86400000)
      return { after: format(d), before: format(now) }
    }
    case 'year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1) // Jan 1
      return { after: format(startOfYear), before: format(now) }
    }
    case 'custom':
      if (start && end) {
        return {
          after: isoFromDate(start),
          before: isoFromDate(end, true),
        }
      }
      return { after: format(todayStart), before: format(now) }
    default:
      return {}
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today'
  const storeId = searchParams.get('storeId') || 'all'
  const start = searchParams.get('start') || undefined
  const end = searchParams.get('end') || undefined

  const dateRange = getDateRange(period, start, end)

  // Previous period for growth
  let previousDateRange: { after?: string; before?: string } | undefined
  if (dateRange.after && dateRange.before) {
    const afterTime = new Date(dateRange.after).getTime()
    const beforeTime = new Date(dateRange.before).getTime()
    const length = beforeTime - afterTime
    previousDateRange = {
      after: new Date(afterTime - length).toISOString(),
      before: dateRange.after,
    }
  }

  const storesToFetch = storeId === 'all'
    ? STORES
    : STORES.filter(s => s.id === storeId)

  async function fetchForPeriod(dr?: { after?: string; before?: string }) {
    const results = await Promise.all(
      storesToFetch.map(async (store) => {
        const platform = process.env[`STORE${store.id}_PLATFORM`] || ''
        const baseUrl = process.env[`STORE${store.id}_BASE_URL`] || ''
        if (!platform || !baseUrl) return []

        const credentials = {
          key: process.env[`STORE${store.id}_CONSUMER_KEY`],
          secret: process.env[`STORE${store.id}_CONSUMER_SECRET`],
          token: process.env[`STORE${store.id}_ACCESS_TOKEN`],
        }
        return fetchAllOrders(store.id, platform, baseUrl, credentials, dr)
      })
    )
    return results.flat()
  }

  const [currentOrders, previousOrders] = await Promise.all([
    fetchForPeriod(dateRange),
    previousDateRange ? fetchForPeriod(previousDateRange) : Promise.resolve([]),
  ])

  // Normalise
  const normalize = (o: any) => ({
    total: parseFloat(o.total || o.current_total_price || '0'),
    createdAt: o.date_created || o.created_at,
    status: o.status || o.financial_status,
  })

  const current = currentOrders.map(normalize)
  const prev = previousOrders.map(normalize)

  const totalOrders = current.length
  const totalRevenue = current.reduce((sum, o) => sum + o.total, 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  let ordersGrowth = 0
  if (prev.length > 0) {
    ordersGrowth = ((totalOrders - prev.length) / prev.length) * 100
  } else if (totalOrders > 0) {
    ordersGrowth = 100
  }

  // Daily chart
  const dailyMap: Record<string, number> = {}
  current.forEach((o) => {
    if (o.createdAt) {
      const day = new Date(o.createdAt).toISOString().split('T')[0]
      dailyMap[day] = (dailyMap[day] || 0) + 1
    }
  })
  const chartData = Object.entries(dailyMap)
    .map(([date, orders]) => ({ date, orders }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return Response.json({
    totalOrders,
    totalRevenue,
    averageOrderValue,
    ordersGrowth,
    chartData,
  })
}