import { NextRequest, NextResponse } from 'next/server'
import { fetchAllOrders, extractStoreName } from '@/utils/fetch-orders'

const STORES = [
  { id: '1' }, { id: '2' }, { id: '3' },
  { id: '4' }, { id: '5' }, { id: '6' },
]

// ---------- Date helpers ----------
function getDateRange(period: string, start?: string, end?: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const format = (d: Date) => d.toISOString()
  const isoFromDate = (dateStr: string, isEnd = false) => {
    const d = new Date(dateStr + (isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z'))
    return d.toISOString()
  }

  switch (period) {
    case 'today': return { after: format(todayStart), before: format(now) }
    case 'yesterday': {
      const ys = new Date(todayStart.getTime() - 86400000)
      return { after: format(ys), before: format(new Date(todayStart.getTime() - 1)) }
    }
    case 'this_week': {
      const day = now.getDay()
      const sow = new Date(todayStart)
      sow.setDate(sow.getDate() - (day === 0 ? 6 : day - 1))
      return { after: format(sow), before: format(now) }
    }
    case 'last_week': {
      const day = now.getDay()
      const sow = new Date(todayStart)
      sow.setDate(sow.getDate() - (day === 0 ? 6 : day - 1))
      const slw = new Date(sow.getTime() - 7 * 86400000)
      return { after: format(slw), before: format(new Date(sow.getTime() - 1)) }
    }
    case 'this_month': {
      const som = new Date(now.getFullYear(), now.getMonth(), 1)
      return { after: format(som), before: format(now) }
    }
    case 'last_month': {
      const slm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const elm = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { after: format(slm), before: format(elm) }
    }
    case 'this_year': {
      const soy = new Date(now.getFullYear(), 0, 1)
      return { after: format(soy), before: format(now) }
    }
    case 'last_year': {
      const sly = new Date(now.getFullYear() - 1, 0, 1)
      const ely = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      return { after: format(sly), before: format(ely) }
    }
    case 'all_time': return {}
    case 'custom':
      if (start && end) return { after: isoFromDate(start), before: isoFromDate(end, true) }
      return { after: format(todayStart), before: format(now) }
    default: return {}
  }
}

function getPreviousPeriod(cr: { after?: string; before?: string }) {
  if (!cr.after || !cr.before) return undefined
  const a = new Date(cr.after).getTime()
  const b = new Date(cr.before).getTime()
  const len = b - a
  return { after: new Date(a - len).toISOString(), before: cr.after }
}

// ---------- GET handler ----------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') || 'list'

  // ----- Detail -----
  if (type === 'detail') {
    const storeId = searchParams.get('storeId')
    const orderId = searchParams.get('orderId')
    if (!storeId || !orderId) return NextResponse.json({ error: 'Missing storeId or orderId' }, { status: 400 })

    const platform = process.env[`STORE${storeId}_PLATFORM`]
    const baseUrl = process.env[`STORE${storeId}_BASE_URL`]
    if (!platform || !baseUrl) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    let apiUrl = ''
    const headers: Record<string, string> = {}

    if (platform === 'woocommerce') {
      const key = process.env[`STORE${storeId}_CONSUMER_KEY`]
      const secret = process.env[`STORE${storeId}_CONSUMER_SECRET`]
      if (!key || !secret) return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
      headers['Authorization'] = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
      apiUrl = `${baseUrl}/wp-json/wc/v3/orders/${orderId}`
    } else if (platform === 'shopify') {
      const token = process.env[`STORE${storeId}_ACCESS_TOKEN`]
      if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 500 })
      headers['X-Shopify-Access-Token'] = token
      apiUrl = `https://${baseUrl}/admin/api/2024-07/orders/${orderId}.json`
    } else return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })

    try {
      const res = await fetch(apiUrl, { headers })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const order = platform === 'shopify' ? data.order : data

      const normalized = {
        id: order.id,
        orderNumber: order.number || order.order_number || order.name,
        status: order.status || order.financial_status,
        dateCreated: order.date_created || order.created_at,
        total: order.total || order.current_total_price,
        subtotal: order.subtotal || order.subtotal_price || null,
        shippingTotal: order.shipping_total || order.total_shipping_price_set?.shop_money?.amount || 0,
        currency: order.currency || 'MAD',
        paymentMethodTitle: order.payment_method_title || order.payment_gateway_names?.[0] || '',
        paymentStatus: order.payment_status || order.financial_status,
        customerNote: order.customer_note || order.note || null,
        customer: {
          firstName: order.billing?.first_name || order.customer?.first_name || '',
          lastName: order.billing?.last_name || order.customer?.last_name || '',
          email: order.billing?.email || order.customer?.email || '',
          phone: order.billing?.phone || order.customer?.phone || '',
        },
        shippingAddress: order.shipping ? {
          address1: order.shipping.address_1 || order.shipping.address1,
          address2: order.shipping.address_2 || order.shipping.address2,
          city: order.shipping.city, state: order.shipping.state,
          postcode: order.shipping.postcode, country: order.shipping.country,
        } : null,
        billingAddress: order.billing ? {
          address1: order.billing.address_1 || order.billing.address1,
          address2: order.billing.address_2 || order.billing.address2,
          city: order.billing.city, state: order.billing.state,
          postcode: order.billing.postcode, country: order.billing.country,
        } : null,
        lineItems: (order.line_items || []).map((item: any) => ({
          id: item.id, name: item.name || item.title,
          sku: item.sku, quantity: item.quantity,
          price: item.price || item.unit_price,
          total: item.total || item.line_total_price,
          image: item.image?.src || item.featured_src || null,
          variantTitle: item.variation_name || item.variant_title || null,
        })),
        shippingLines: order.shipping_lines || [],
        tags: order.tags || [],
      }
      return NextResponse.json(normalized)
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // ----- Stats -----
  if (type === 'stats') {
    const period = searchParams.get('period') || 'today'
    const storeId = searchParams.get('storeId') || 'all'
    const metric = searchParams.get('metric') || 'orders'
    const start = searchParams.get('start') || undefined
    const end = searchParams.get('end') || undefined

    const dateRange = getDateRange(period, start, end)
    const previousDateRange = getPreviousPeriod(dateRange)
    const storesToFetch = storeId === 'all' ? STORES : STORES.filter(s => s.id === storeId)

    async function fetchFor(dr?: { after?: string; before?: string }) {
      const results = await Promise.all(storesToFetch.map(async (store) => {
        const platform = process.env[`STORE${store.id}_PLATFORM`] || ''
        const baseUrl = process.env[`STORE${store.id}_BASE_URL`] || ''
        if (!platform || !baseUrl) return []
        const creds = {
          key: process.env[`STORE${store.id}_CONSUMER_KEY`],
          secret: process.env[`STORE${store.id}_CONSUMER_SECRET`],
          token: process.env[`STORE${store.id}_ACCESS_TOKEN`],
        }
        return fetchAllOrders(store.id, platform, baseUrl, creds, dr)
      }))
      return results.flat()
    }

    const [current, previous] = await Promise.all([
      fetchFor(dateRange),
      previousDateRange ? fetchFor(previousDateRange) : Promise.resolve([]),
    ])

    const norm = (o: any) => ({
      total: parseFloat(o.total || o.current_total_price || '0'),
      createdAt: o.date_created || o.created_at,
    })
    const cur = current.map(norm)
    const prv = previous.map(norm)

    const totalSales = cur.reduce((s, o) => s + o.total, 0)
    const totalOrders = cur.length
    const prevSales = prv.reduce((s, o) => s + o.total, 0)
    const prevOrders = prv.length

    const ordersGrowth = prevOrders ? ((totalOrders - prevOrders) / prevOrders) * 100 : totalOrders ? 100 : 0
    const salesGrowth = prevSales ? ((totalSales - prevSales) / prevSales) * 100 : totalSales ? 100 : 0

    // Explicitly typed aggregate function
    function aggregate(arr: any[], field: 'total' | 'count'): { date: string; value: number }[] {
      const map: Record<string, number> = {}
      arr.forEach(o => {
        if (o.createdAt) {
          const day = new Date(o.createdAt).toISOString().split('T')[0]
          map[day] = (map[day] || 0) + (field === 'count' ? 1 : o.total)
        }
      })
      return Object.entries(map).map(([date, val]) => ({ date, value: val }))
    }

    // Typed chart data arrays
    let curData: { date: string; value: number }[] = []
    let prvData: { date: string; value: number }[] = []

    if (metric === 'sales') {
      curData = aggregate(cur, 'total')
      prvData = aggregate(prv, 'total')
    } else if (metric === 'orders') {
      curData = aggregate(cur, 'count')
      prvData = aggregate(prv, 'count')
    } // sessions stays empty arrays

    if (previousDateRange && prvData.length) {
      const offset = new Date(dateRange!.after!).getTime() - new Date(previousDateRange.after!).getTime()
      prvData = prvData.map(d => ({
        date: new Date(new Date(d.date).getTime() + offset).toISOString().split('T')[0],
        value: d.value,
      }))
    }

    curData.sort((a, b) => a.date.localeCompare(b.date))
    prvData.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      sessions: 0, sessionsGrowth: 0,
      totalSales, orders: totalOrders,
      ordersGrowth, salesGrowth,
      currentChartData: curData,
      previousChartData: prvData,
    })
  }

  // ----- List (default) -----
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')
  const storeId = searchParams.get('storeId') || 'all'
  const period = searchParams.get('period') || 'today'
  const start = searchParams.get('start') || undefined
  const end = searchParams.get('end') || undefined

  const dateRange = getDateRange(period, start, end)
  const storesToFetch = storeId === 'all' ? STORES : STORES.filter(s => s.id === storeId)

  const results = await Promise.all(storesToFetch.map(async (store) => {
    const platform = process.env[`STORE${store.id}_PLATFORM`] || ''
    const baseUrl = process.env[`STORE${store.id}_BASE_URL`] || ''
    if (!platform || !baseUrl) return []
    const creds = {
      key: process.env[`STORE${store.id}_CONSUMER_KEY`],
      secret: process.env[`STORE${store.id}_CONSUMER_SECRET`],
      token: process.env[`STORE${store.id}_ACCESS_TOKEN`],
    }
    const orders = await fetchAllOrders(store.id, platform, baseUrl, creds, dateRange)
    return orders.map((order: any) => ({
      ...order,
      _storeId: store.id,
      _storeName: extractStoreName(baseUrl),
      orderNumber: order.number || order.order_number || order.name,
      total: order.total || order.current_total_price,
      createdAt: order.date_created || order.created_at,
      status: order.status || order.financial_status,
    }))
  }))

  let allOrders = results.flat()
  allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Added total for pagination
  const total = allOrders.length
  const paginated = allOrders.slice(offset, offset + limit)

  return NextResponse.json({ orders: paginated, total })
}

// ---------- PUT handler (update status) ----------
export async function PUT(request: NextRequest) {
  const { storeId, orderId, status } = await request.json()

  if (!storeId || !orderId || !status) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const platform = process.env[`STORE${storeId}_PLATFORM`]
  const baseUrl = process.env[`STORE${storeId}_BASE_URL`]

  if (!platform || !baseUrl) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  let apiUrl = ''
  const headers: Record<string, string> = {}
  const body: any = {}

  if (platform === 'woocommerce') {
    const key = process.env[`STORE${storeId}_CONSUMER_KEY`]
    const secret = process.env[`STORE${storeId}_CONSUMER_SECRET`]
    if (!key || !secret) return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
    headers['Authorization'] = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
    headers['Content-Type'] = 'application/json'
    apiUrl = `${baseUrl}/wp-json/wc/v3/orders/${orderId}`
    body.status = status
  } else if (platform === 'shopify') {
    const token = process.env[`STORE${storeId}_ACCESS_TOKEN`]
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 500 })
    headers['X-Shopify-Access-Token'] = token
    headers['Content-Type'] = 'application/json'
    apiUrl = `https://${baseUrl}/admin/api/2024-07/orders/${orderId}.json`
    body.order = { id: orderId, financial_status: status }
  } else {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  try {
    const res = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: 'Update failed', details: data }, { status: res.status })
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}