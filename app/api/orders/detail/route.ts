import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const storeId = searchParams.get('storeId')
  const orderId = searchParams.get('orderId')

  if (!storeId || !orderId) {
    return NextResponse.json({ error: 'Missing storeId or orderId' }, { status: 400 })
  }

  const platform = process.env[`STORE${storeId}_PLATFORM`]
  const baseUrl = process.env[`STORE${storeId}_BASE_URL`]

  if (!platform || !baseUrl) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  let apiUrl = ''
  const headers: Record<string, string> = {}

  if (platform === 'woocommerce') {
    const key = process.env[`STORE${storeId}_CONSUMER_KEY`]
    const secret = process.env[`STORE${storeId}_CONSUMER_SECRET`]
    if (!key || !secret) return NextResponse.json({ error: 'Missing WooCommerce credentials' }, { status: 500 })

    const auth = Buffer.from(`${key}:${secret}`).toString('base64')
    headers['Authorization'] = `Basic ${auth}`
    apiUrl = `${baseUrl}/wp-json/wc/v3/orders/${orderId}`
  } else if (platform === 'shopify') {
    const token = process.env[`STORE${storeId}_ACCESS_TOKEN`]
    if (!token) return NextResponse.json({ error: 'Missing Shopify token' }, { status: 500 })

    headers['X-Shopify-Access-Token'] = token
    apiUrl = `https://${baseUrl}/admin/api/2024-07/orders/${orderId}.json`
  } else {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  try {
    const res = await fetch(apiUrl, { headers })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      return NextResponse.json({ error: 'Failed to fetch order', details: err }, { status: res.status })
    }

    const data = await res.json()
    const order = platform === 'shopify' ? data.order : data

    // Normalise
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
        city: order.shipping.city,
        state: order.shipping.state,
        postcode: order.shipping.postcode,
        country: order.shipping.country,
      } : null,
      billingAddress: order.billing ? {
        address1: order.billing.address_1 || order.billing.address1,
        address2: order.billing.address_2 || order.billing.address2,
        city: order.billing.city,
        state: order.billing.state,
        postcode: order.billing.postcode,
        country: order.billing.country,
      } : null,
      lineItems: (order.line_items || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.title,
        sku: item.sku,
        quantity: item.quantity,
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
    return NextResponse.json({ error: 'Internal error', details: err.message }, { status: 500 })
  }
}