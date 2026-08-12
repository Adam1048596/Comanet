import { NextRequest, NextResponse } from 'next/server'
import { fetchAllOrders, extractStoreName } from '@/utils/fetch-orders'

const STORES = [
  { id: '1', name: 'Auracos' },
  { id: '2', name: 'Makari' },
  { id: '3', name: 'Gamarde' },
  { id: '4', name: 'Alphascience' },
  { id: '5', name: 'Ainhoa' },
  { id: '6', name: 'cygne' },
]

// ---------- Brand prefix map ----------
const BRAND_PREFIX: Record<string, string> = {}
STORES.forEach(s => {
  BRAND_PREFIX[s.id] = s.name.substring(0, 2).toUpperCase()
})

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

// ---------- Product helpers ----------
async function fetchWooProducts(storeId: string, page = 1): Promise<any[]> {
  const platform = process.env[`STORE${storeId}_PLATFORM`]
  const baseUrl = process.env[`STORE${storeId}_BASE_URL`]
  const key = process.env[`STORE${storeId}_CONSUMER_KEY`]
  const secret = process.env[`STORE${storeId}_CONSUMER_SECRET`]

  if (!platform || !baseUrl || !key || !secret) return []

  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const url = `${baseUrl}/wp-json/wc/v3/products?per_page=100&page=${page}`

  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
    if (!res.ok) return []
    const products = await res.json()
    return products.map((p: any) => ({
      id: p.id.toString(),
      name: p.name,
      sku: p.sku || 'N/A',
      price: parseFloat(p.price || '0'),
      stock: p.stock_quantity ?? 0,
      status: p.status,
      category: p.categories?.[0]?.name || 'Uncategorized',
      image: p.images?.[0]?.src || null,
      lastUpdated: p.date_modified || p.date_created,
      _storeId: storeId,
      _storeName: STORES.find(s => s.id === storeId)?.name || '',
      stores: [STORES.find(s => s.id === storeId)?.name || ''],
    }))
  } catch (err) {
    console.error(`Error fetching products from store ${storeId}:`, err)
    return []
  }
}

async function getAllProducts() {
  const allProductsLists = await Promise.all(
    STORES.map(async (store) => {
      let page = 1
      let allProducts: any[] = []
      let hasMore = true
      while (hasMore && page <= 10) {
        const products = await fetchWooProducts(store.id, page)
        if (products.length === 0 || products.length < 100) hasMore = false
        allProducts.push(...products)
        page++
      }
      return allProducts
    })
  )
  let allProducts = allProductsLists.flat()

  // Merge products with same name (dedup)
  const mergedMap = new Map<string, any>()
  allProducts.forEach(p => {
    const key = p.name.toLowerCase().trim()
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)
      existing.stores = [...new Set([...existing.stores, ...p.stores])]
    } else {
      mergedMap.set(key, { ...p })
    }
  })
  return Array.from(mergedMap.values())
}

// ---------- GET handler ----------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') || 'list'

  // ----- Products Stats -----
  if (type === 'products-stats') {
    const products = await getAllProducts()
    return NextResponse.json({
      total: products.length,
      active: products.filter(p => p.status === 'publish').length,
      outOfStock: products.filter(p => p.stock === 0).length,
      draft: products.filter(p => p.status === 'draft').length,
      lowStock: products.filter(p => p.stock > 0 && p.stock < 5).length,
    })
  }

  // ----- Products List -----
  if (type === 'products-list') {
    const products = await getAllProducts()
    const search = searchParams.get('search') || ''
    const brand = searchParams.get('brand') || 'all'
    const category = searchParams.get('category') || 'all'
    const stockStatus = searchParams.get('stockStatus') || 'all'
    const storeIdFilter = searchParams.get('storeId') || 'all'
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')

    let filtered = products
    if (brand !== 'all') filtered = filtered.filter(p => p._storeName?.toLowerCase() === brand.toLowerCase())
    if (category !== 'all') filtered = filtered.filter(p => p.category?.toLowerCase() === category.toLowerCase())
    if (stockStatus === 'in-stock') filtered = filtered.filter(p => p.stock > 0)
    if (stockStatus === 'out-of-stock') filtered = filtered.filter(p => p.stock === 0)
    if (stockStatus === 'low-stock') filtered = filtered.filter(p => p.stock > 0 && p.stock < 5)
    if (storeIdFilter !== 'all') filtered = filtered.filter(p => p.stores?.includes(storeIdFilter))
    if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search))

    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)
    return NextResponse.json({ products: paginated, total })
  }

  // ----- Products Detail -----
  if (type === 'products-detail') {
    const productId = searchParams.get('productId')
    const storeId = searchParams.get('storeId')
    if (!productId || !storeId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    const raw = await fetchWooProducts(storeId)
    const product = raw.find(p => p.id === productId)
    return product ? NextResponse.json(product) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // ----- Export Orders (flattened line items) -----
  if (type === 'export-orders') {
    const storeId = searchParams.get('storeId') || 'all'
    const period = searchParams.get('period') || '30d'
    const start = searchParams.get('start') || undefined
    const end = searchParams.get('end') || undefined

    const dateRange = getDateRange(period, start, end)
    const storesToFetch = storeId === 'all' ? STORES.map(s => s.id) : [storeId]

    const results = await Promise.all(storesToFetch.map(async (id) => {
      const platform = process.env[`STORE${id}_PLATFORM`] || ''
      const baseUrl = process.env[`STORE${id}_BASE_URL`] || ''
      if (!platform || !baseUrl) return []
      const creds = {
        key: process.env[`STORE${id}_CONSUMER_KEY`],
        secret: process.env[`STORE${id}_CONSUMER_SECRET`],
        token: process.env[`STORE${id}_ACCESS_TOKEN`],
      }
      const orders = await fetchAllOrders(id, platform, baseUrl, creds, dateRange, 10000)
      return orders.map((order: any) => ({
        ...order,
        _storeId: id,
        _storeName: extractStoreName(baseUrl),
        orderNumber: order.number || order.order_number || order.name,
        total: order.total || order.current_total_price,
        createdAt: order.date_created || order.created_at,
        status: order.status || order.financial_status,
      }))
    }))

    let allOrders = results.flat()
    // Sort ascending by date (oldest first)
    allOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const exportRows: any[] = []
    allOrders.forEach(order => {
      const prefix = BRAND_PREFIX[order._storeId] || ''
      const items = order.line_items || []
      const dateFormatted = order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR') : ''

      if (items.length === 0) {
        exportRows.push({
          orderNumber: `${prefix}${order.orderNumber}`,
          date: dateFormatted,
          marque: order._storeName || '', 
          skuName: '',
          quantity: 0,
          unitPrice: 0,
          lineTotal: 0,
          orderTotal: order.total,
          status: order.status,
          customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
          city: order.billing?.city || '',
          bl: '',
          facture: '',
        })
      } else {
        items.forEach((item: any) => {
          exportRows.push({
            orderNumber: `${prefix}${order.orderNumber}`,
            date: dateFormatted,
            skuName: item.name || item.sku || '',
            quantity: item.quantity,
            unitPrice: item.price,
            lineTotal: item.total,
            orderTotal: order.total,
            status: order.status,
            customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
            city: order.billing?.city || '',
            bl: '',
            facture: '',
          })
        })
      }
    })

    return NextResponse.json(exportRows)
  }

  // ----- Orders Detail -----
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

  // ----- Orders Stats -----
  if (type === 'stats') {
    const period = searchParams.get('period') || 'today'
    const storeId = searchParams.get('storeId') || 'all'
    const metric = searchParams.get('metric') || 'orders'
    const start = searchParams.get('start') || undefined
    const end = searchParams.get('end') || undefined

    const dateRange = getDateRange(period, start, end)
    const previousDateRange = getPreviousPeriod(dateRange)
    const storesToFetch = storeId === 'all' ? STORES.map(s => s.id) : [storeId]

    async function fetchFor(dr?: { after?: string; before?: string }) {
      const results = await Promise.all(storesToFetch.map(async (id) => {
        const platform = process.env[`STORE${id}_PLATFORM`] || ''
        const baseUrl = process.env[`STORE${id}_BASE_URL`] || ''
        if (!platform || !baseUrl) return []
        const creds = {
          key: process.env[`STORE${id}_CONSUMER_KEY`],
          secret: process.env[`STORE${id}_CONSUMER_SECRET`],
          token: process.env[`STORE${id}_ACCESS_TOKEN`],
        }
        return fetchAllOrders(id, platform, baseUrl, creds, dr)
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

    let curData: { date: string; value: number }[] = []
    let prvData: { date: string; value: number }[] = []

    if (metric === 'sales') {
      curData = aggregate(cur, 'total')
      prvData = aggregate(prv, 'total')
    } else if (metric === 'orders') {
      curData = aggregate(cur, 'count')
      prvData = aggregate(prv, 'count')
    }

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

  // ----- Orders List (default) -----
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')
  const storeId = searchParams.get('storeId') || 'all'
  const period = searchParams.get('period') || 'today'
  const start = searchParams.get('start') || undefined
  const end = searchParams.get('end') || undefined

  const dateRange = getDateRange(period, start, end)
  const storesToFetch = storeId === 'all' ? STORES.map(s => s.id) : [storeId]

  const results = await Promise.all(storesToFetch.map(async (id) => {
    const platform = process.env[`STORE${id}_PLATFORM`] || ''
    const baseUrl = process.env[`STORE${id}_BASE_URL`] || ''
    if (!platform || !baseUrl) return []
    const creds = {
      key: process.env[`STORE${id}_CONSUMER_KEY`],
      secret: process.env[`STORE${id}_CONSUMER_SECRET`],
      token: process.env[`STORE${id}_ACCESS_TOKEN`],
    }
    const orders = await fetchAllOrders(id, platform, baseUrl, creds, dateRange)
    return orders.map((order: any) => ({
      ...order,
      _storeId: id,
      _storeName: extractStoreName(baseUrl),
      orderNumber: order.number || order.order_number || order.name,
      total: order.total || order.current_total_price,
      createdAt: order.date_created || order.created_at,
      status: order.status || order.financial_status,
    }))
  }))

  let allOrders = results.flat()
  allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const total = allOrders.length
  const paginated = allOrders.slice(offset, offset + limit)

  return NextResponse.json({ orders: paginated, total })
}

// ---------- PUT handler (update status + product update) ----------
export async function PUT(request: NextRequest) {
  const body = await request.json()

  // ----- Product Update -----
  if (body.type === 'product-update') {
    const { storeId, productId, regular_price, sale_price, stock_quantity, stock_status } = body
    if (!storeId || !productId) {
      return NextResponse.json({ error: 'Missing storeId or productId' }, { status: 400 })
    }

    const platform = process.env[`STORE${storeId}_PLATFORM`]
    const baseUrl = process.env[`STORE${storeId}_BASE_URL`]
    const key = process.env[`STORE${storeId}_CONSUMER_KEY`]
    const secret = process.env[`STORE${storeId}_CONSUMER_SECRET`]

    if (!platform || !baseUrl || !key || !secret) {
      return NextResponse.json({ error: 'Store not configured' }, { status: 404 })
    }

    try {
      const auth = Buffer.from(`${key}:${secret}`).toString('base64')
      const url = `${baseUrl}/wp-json/wc/v3/products/${productId}`
      const updateData: any = {}

      if (regular_price !== undefined) updateData.regular_price = String(regular_price)
      if (sale_price !== undefined) updateData.sale_price = String(sale_price)
      if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity
      if (stock_status !== undefined) updateData.stock_status = stock_status

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        return NextResponse.json({ error: 'Failed to update product', details: err }, { status: res.status })
      }

      return NextResponse.json({ success: true })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // ----- Existing order status update -----
  const { storeId, orderId, status } = body

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
  const bodyData: any = {}

  if (platform === 'woocommerce') {
    const key = process.env[`STORE${storeId}_CONSUMER_KEY`]
    const secret = process.env[`STORE${storeId}_CONSUMER_SECRET`]
    if (!key || !secret) return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
    headers['Authorization'] = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
    headers['Content-Type'] = 'application/json'
    apiUrl = `${baseUrl}/wp-json/wc/v3/orders/${orderId}`
    bodyData.status = status
  } else if (platform === 'shopify') {
    const token = process.env[`STORE${storeId}_ACCESS_TOKEN`]
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 500 })
    headers['X-Shopify-Access-Token'] = token
    headers['Content-Type'] = 'application/json'
    apiUrl = `https://${baseUrl}/admin/api/2024-07/orders/${orderId}.json`
    bodyData.order = { id: orderId, financial_status: status }
  } else {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  try {
    const res = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(bodyData) })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: 'Update failed', details: data }, { status: res.status })
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}