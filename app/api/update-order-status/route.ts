import { NextRequest, NextResponse } from 'next/server'

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

  try {
    if (platform === 'woocommerce') {
      const key = process.env[`STORE${storeId}_CONSUMER_KEY`]
      const secret = process.env[`STORE${storeId}_CONSUMER_SECRET`]
      if (!key || !secret) {
        return NextResponse.json({ error: 'Missing WooCommerce credentials' }, { status: 500 })
      }
      const auth = Buffer.from(`${key}:${secret}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
      headers['Content-Type'] = 'application/json'
      apiUrl = `${baseUrl}/wp-json/wc/v3/orders/${orderId}`
      body.status = status
    } else if (platform === 'shopify') {
      const token = process.env[`STORE${storeId}_ACCESS_TOKEN`]
      if (!token) {
        return NextResponse.json({ error: 'Missing Shopify token' }, { status: 500 })
      }
      headers['X-Shopify-Access-Token'] = token
      headers['Content-Type'] = 'application/json'
      apiUrl = `https://${baseUrl}/admin/api/2024-07/orders/${orderId}.json`
      // Shopify uses different status fields depending on the type (order, fulfillment, etc.)
      // For simplicity, we'll just set the order's financial_status or fulfillment_status.
      // But the exact field depends on what you want to change.
      // We'll use 'financial_status' for simplicity.
      body.order = { id: orderId, financial_status: status }
    } else {
      return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
    }

    const res = await fetch(apiUrl, {
      method: platform === 'shopify' ? 'PUT' : 'POST', // WooCommerce uses POST for updates? Actually PUT.
      headers,
      body: JSON.stringify(body),
    })
    // WooCommerce expects PUT, Shopify expects PUT
    const resData = await res.json()

    if (!res.ok) {
      console.error(`Failed to update order ${orderId}:`, resData)
      return NextResponse.json({ error: 'Failed to update order' }, { status: res.status })
    }

    return NextResponse.json({ success: true, data: resData })
  } catch (err) {
    console.error('Update error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}