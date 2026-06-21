export async function fetchAllOrders(
  storeId: string,
  platform: string,
  baseUrl: string,
  credentials: { key?: string; secret?: string; token?: string },
  dateRange?: { after?: string; before?: string },
  maxOrders = 5000
): Promise<any[]> {
  const headers: Record<string, string> = {}
  let baseApiUrl = ''

  if (platform === 'woocommerce') {
    if (!credentials.key || !credentials.secret) {
      console.log(`Store ${storeId}: missing WooCommerce keys`)
      return []
    }
    const auth = Buffer.from(`${credentials.key}:${credentials.secret}`).toString('base64')
    headers['Authorization'] = `Basic ${auth}`
    baseApiUrl = `${baseUrl}/wp-json/wc/v3/orders?per_page=100`
    if (dateRange?.after) baseApiUrl += `&after=${encodeURIComponent(dateRange.after)}`
    if (dateRange?.before) baseApiUrl += `&before=${encodeURIComponent(dateRange.before)}`
  } else if (platform === 'shopify') {
    if (!credentials.token) {
      console.log(`Store ${storeId}: missing Shopify token`)
      return []
    }
    headers['X-Shopify-Access-Token'] = credentials.token
    baseApiUrl = `https://${baseUrl}/admin/api/2024-07/orders.json?limit=250&status=any`
    if (dateRange?.after) baseApiUrl += `&created_at_min=${encodeURIComponent(dateRange.after)}`
    if (dateRange?.before) baseApiUrl += `&created_at_max=${encodeURIComponent(dateRange.before)}`
  } else {
    console.log(`Store ${storeId}: unknown platform`)
    return []
  }

  let allOrders: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore && allOrders.length < maxOrders) {
    let url = baseApiUrl

    if (platform === 'woocommerce') {
      url += `&page=${page}`
    } else if (platform === 'shopify') {
      url += `&page=${page}`
    }

    try {
      const res = await fetch(url, { headers })
      if (!res.ok) {
        console.error(`Store ${storeId}: HTTP ${res.status} on page ${page}`)
        break
      }

      const data = await res.json()
      const orders = Array.isArray(data) ? data : (data.orders || [])

      if (orders.length === 0) {
        hasMore = false
      } else {
        allOrders.push(...orders)
        page++

        if (platform === 'shopify' && orders.length < 250) hasMore = false
        if (platform === 'woocommerce' && orders.length < 100) hasMore = false
      }
    } catch (err) {
      console.error(`Store ${storeId}: fetch error on page ${page}`, err)
      break
    }
  }

  console.log(`Store ${storeId}: fetched ${allOrders.length} orders`)
  return allOrders.slice(0, maxOrders)
}

export function extractStoreName(baseUrl: string): string {
  try {
    let hostname = baseUrl.replace(/^https?:\/\//, '').replace(/^www\./, '')
    const parts = hostname.split('.')
    const name = parts[0]
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return 'Unknown Store'
  }
}