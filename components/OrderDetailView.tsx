'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Package, CreditCard, FileText, User, MapPin, Shield, Tag, Truck, Printer, Edit, RotateCcw, XCircle, CheckCircle } from 'lucide-react'
import StatusBadge from './StatusBadge'

const formatCurrency = (amount: number | string, currency: string = 'MAD') => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(num)
}

interface OrderDetailViewProps {
  order: any
  storeId: string
  onBack: () => void
}

export default function OrderDetailView({ order, storeId, onBack }: OrderDetailViewProps) {
  // Fetch full order details using the unified API
  const { data: fullOrder, isLoading } = useQuery({
    queryKey: ['order-detail', storeId, order.id],
    queryFn: async () => {
      const res = await fetch(`/api/orders?type=detail&storeId=${storeId}&orderId=${order.id}`)
      if (!res.ok) throw new Error('Failed to load order')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-[#008060] rounded-full" />
      </div>
    )
  }

  const o = fullOrder || order   // fallback to list data

  // Quick action handlers (some are just placeholders)
  const handlePrint = () => window.open(`/invoice/${o.id}?storeId=${storeId}`, '_blank')

  // Timeline events (you can extend this later with real notes/events)
  const timeline = [
    { icon: Package, title: 'Order placed', desc: `by ${o.customer.firstName} ${o.customer.lastName}` },
    { icon: CreditCard, title: `Payment ${o.paymentStatus}`, desc: `${o.paymentMethodTitle || 'COD'} – ${formatCurrency(o.total, o.currency)}` },
    { icon: Truck, title: 'Fulfillment', desc: o.status === 'completed' ? 'Fulfilled' : 'Unfulfilled' },
  ]

  return (
    <div className="space-y-6">
      {/* ---- Top bar with back button & actions ---- */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
          <ArrowLeft size={18} /> Back to Orders
        </button>
        <h1 className="text-xl font-semibold">Order #{o.orderNumber}</h1>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={handlePrint} className="flex items-center gap-1 border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">
            <Printer size={16} /> Print
          </button>
          <button className="flex items-center gap-1 border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">
            <Edit size={16} /> Edit
          </button>
          <button className="flex items-center gap-1 border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">
            <RotateCcw size={16} /> Refund
          </button>
          <button className="flex items-center gap-1 border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">
            <XCircle size={16} /> Cancel
          </button>
          <button className="flex items-center gap-1 bg-[#008060] text-white rounded-md px-3 py-1.5 text-sm">
            <CheckCircle size={16} /> Mark as Fulfilled
          </button>
        </div>
      </div>

      {/* ---- Status badges ---- */}
      <div className="flex gap-2">
        <StatusBadge currentStatus={o.status} readonly />
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          o.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {o.paymentStatus}
        </span>
      </div>

      {/* ---- Two column layout ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ===== LEFT COLUMN ===== */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Timeline</h2>
            <ul className="space-y-4">
              {timeline.map((ev, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <ev.icon size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-gray-500">{ev.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Items</h2>
            <div className="space-y-4">
              {o.lineItems.map((item: any) => (
                <div key={item.id} className="flex gap-4">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded border object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded border bg-gray-50 flex items-center justify-center text-gray-400">
                      <Package size={16} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.variantTitle && <p className="text-xs text-gray-500">{item.variantTitle}</p>}
                    <p className="text-xs text-gray-500">SKU: {item.sku || 'N/A'}</p>
                    <p className="text-xs text-gray-500">×{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(item.total, o.currency)}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price, o.currency)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(o.subtotal || o.total - o.shippingTotal, o.currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{o.shippingTotal > 0 ? formatCurrency(o.shippingTotal, o.currency) : 'Free'}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(o.total, o.currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Payment</span><span>{o.paymentMethodTitle || 'N/A'}</span></div>
            </div>
          </div>

          {/* Fulfillment */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Fulfillment</h2>
            <p className="text-sm">{o.status === 'completed' ? 'Fulfilled' : 'Unfulfilled'}</p>
            {o.shippingLines?.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{o.shippingLines[0].method_title}</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Notes</h2>
            <p className="text-sm text-gray-600">{o.customerNote || 'No notes'}</p>
            <textarea placeholder="Add internal note..." rows={2} className="mt-2 w-full border border-[#E3E3E3] rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <div className="flex items-center gap-2 mb-3"><User size={16} className="text-gray-400" /><h3 className="text-sm font-semibold uppercase tracking-wider">Customer</h3></div>
            <p className="font-medium">{o.customer.firstName} {o.customer.lastName}</p>
            <p className="text-xs text-gray-600">{o.customer.email}</p>
            <p className="text-xs text-gray-600">{o.customer.phone}</p>
          </div>

          {/* Shipping */}
          {o.shippingAddress && (
            <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
              <div className="flex items-center gap-2 mb-3"><MapPin size={16} className="text-gray-400" /><h3 className="text-sm font-semibold uppercase tracking-wider">Shipping</h3></div>
              <p className="text-sm">{o.shippingAddress.address1}<br />{o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.postcode}<br />{o.shippingAddress.country}</p>
            </div>
          )}

          {/* Billing */}
          {o.billingAddress && (
            <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
              <div className="flex items-center gap-2 mb-3"><FileText size={16} className="text-gray-400" /><h3 className="text-sm font-semibold uppercase tracking-wider">Billing</h3></div>
              <p className="text-sm">{o.billingAddress.address1}<br />{o.billingAddress.city}, {o.billingAddress.state} {o.billingAddress.postcode}<br />{o.billingAddress.country}</p>
            </div>
          )}

          {/* Channel */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Channel</h3>
            <p className="text-sm">{order._storeName}</p>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Tags</h3>
            <input type="text" placeholder="Add tags..." className="w-full border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm" />
          </div>

          {/* Risk & Fraud */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-5">
            <div className="flex items-center gap-2 mb-3"><Shield size={16} className="text-gray-400" /><h3 className="text-sm font-semibold uppercase tracking-wider">Risk & Fraud</h3></div>
            <p className="text-xs text-gray-500">Risk analysis not available</p>
          </div>
        </div>
      </div>
    </div>
  )
}