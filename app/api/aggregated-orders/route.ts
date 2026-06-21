import { NextRequest } from 'next/server'
import { fetchAllOrders, extractStoreName } from '@/utils/fetch-orders'

const STORES = [
  { id: '1' }, { id: '2' }, { id: '3' },
  { id: '4' }, { id: '5' }, { id: '6' },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')

  // Fetch all orders from every store (up to safety limit)
  const storeResults = await Promise.all(
    STORES.map(async (store) => {
      const platform = process.env[`STORE${store.id}_PLATFORM`] || ''
      const baseUrl = process.env[`STORE${store.id}_BASE_URL`] || ''

      if (!platform || !baseUrl) return []

      const credentials = {
        key: process.env[`STORE${store.id}_CONSUMER_KEY`],
        secret: process.env[`STORE${store.id}_CONSUMER_SECRET`],
        token: process.env[`STORE${store.id}_ACCESS_TOKEN`],
      }

      const orders = await fetchAllOrders(store.id, platform, baseUrl, credentials)

      // Normalise and attach store info
      const storeName = extractStoreName(baseUrl)
      return orders.map((order: any) => ({
        ...order,
        _storeId: store.id,
        _storeName: storeName,
        orderNumber: order.number || order.order_number || order.name,
        total: order.total || order.current_total_price,
        createdAt: order.date_created || order.created_at,
        status: order.status || order.financial_status,
      }))
    })
  )

  // Combine all orders
  let allOrders = storeResults.flat()

  // Sort by creation date descending (newest first)
  allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Slice for pagination
  const paginated = allOrders.slice(offset, offset + limit)

  return Response.json(paginated)
}