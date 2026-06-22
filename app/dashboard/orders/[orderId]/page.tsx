'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { ArrowLeft, Package, CreditCard, FileText, AlertCircle, User, MapPin, Shield, Tag, ChevronDown } from 'lucide-react'

const formatCurrency = (amount: number | string, currency: string = 'MAD') => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(num)
}

export default function OrderDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.orderId as string
  const storeId = searchParams.get('storeId') || ''

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-detail', storeId, orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders?type=detail&storeId=${storeId}&orderId=${orderId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Failed to load order')
      }
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f8]">
        <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-700 rounded-full" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-sm">{error?.message || 'Order not found'}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">← Back to dashboard</Link>
      </div>
    )
  }

  // Prepare timeline events (fully French)
  const timeline = [
    {
      icon: FileText,
      title: 'Confirmation de commande envoyée',
      desc: `E-mail de confirmation envoyé à ${order.customer.firstName} ${order.customer.lastName} (${order.customer.email}).`,
    },
    {
      icon: CreditCard,
      title: 'Paiement en attente',
      desc: `Un paiement de ${formatCurrency(order.total, order.currency)} est en attente via ${order.paymentMethodTitle || 'Paiement à la livraison (COD)'}.`,
    },
    {
      icon: AlertCircle,
      title: 'Confirmation générée',
      desc: `La confirmation #${order.orderNumber} a été générée pour cette commande.`,
    },
    {
      icon: Package,
      title: 'Commande passée',
      desc: `${order.customer.firstName} ${order.customer.lastName} a passé cette commande sur la boutique en ligne (paiement #${order.id}).`,
    },
  ]

  return (
    <div className="min-h-screen bg-[#f6f7f8] font-sans text-sm text-gray-900">
      {/* Top bar */}
      <div className="bg-white border-b border-[#e1e3e5] sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1280px] mx-auto px-5 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 p-1 -ml-1 rounded">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-base font-semibold text-gray-900 tracking-tight">#{order.orderNumber}</h1>

          {/* Status badges row */}
          <div className="flex items-center gap-2 ml-2">
            <StatusBadge currentStatus={order.status} readonly />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fef3e2] text-[#b25a00] border border-[#fddbb3]">
              Paiement en attente
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fbeae5] text-[#b2250d] border border-[#f8c7bf]">
              Non exécutée
            </span>
          </div>

          <div className="text-xs text-gray-500 ml-auto">
            {new Date(order.dateCreated).toLocaleDateString('fr-FR', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}{' '}
            · depuis la boutique en ligne
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-5 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Items card */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5]">
              <div className="px-5 py-3.5 border-b border-[#e1e3e5]">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-[0.05em]">Produits</h2>
              </div>
              <div className="divide-y divide-[#e1e3e5]">
                {order.lineItems.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-4 p-4">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded border border-[#e1e3e5] object-cover bg-gray-50" />
                    ) : (
                      <div className="w-10 h-10 rounded border border-[#e1e3e5] bg-gray-50 flex items-center justify-center text-gray-400">
                        <Package size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      {item.variantTitle && <p className="text-xs text-gray-500 mt-0.5">{item.variantTitle}</p>}
                      <p className="text-xs text-gray-500 mt-1">×{item.quantity}</p>
                      <p className="text-xs text-gray-500 mt-1">Prix unitaire {formatCurrency(item.price, order.currency)}</p>
                    </div>
                    <div className="text-right ml-6">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.total, order.currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment card */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5]">
              <div className="px-5 py-3.5 border-b border-[#e1e3e5]">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-[0.05em]">Paiement</h2>
              </div>
              <div className="p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sous‑total (1 article)</span>
                  <span className="text-gray-900">{formatCurrency(order.subtotal || order.total - order.shippingTotal, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expédition (Standard)</span>
                  <span className="text-gray-900">{order.shippingTotal > 0 ? formatCurrency(order.shippingTotal, order.currency) : 'Gratuit'}</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-[#e1e3e5] font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payé</span>
                  <span className="text-red-600 font-medium">{formatCurrency(0, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Solde dû</span>
                  <span className="font-medium">{formatCurrency(order.total, order.currency)}</span>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-[#fef3e2] text-[#b25a00] border border-[#fddbb3]">
                    {order.paymentMethodTitle || 'Paiement à la livraison (COD)'} – En attente
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5]">
              <div className="px-5 py-3.5 border-b border-[#e1e3e5]">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-[0.05em]">Historique</h2>
              </div>
              <div className="p-4">
                <ul className="space-y-3">
                  {timeline.map((ev, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <ev.icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800">{ev.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{ev.desc}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(order.dateCreated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Notes section */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5]">
              <div className="px-5 py-3.5 border-b border-[#e1e3e5]">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-[0.05em]">Notes</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Note du client</p>
                  <p className="text-sm text-gray-800 mt-1">{order.customerNote || 'Aucune note du client'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Commentaire interne</p>
                  <textarea
                    placeholder="Ajouter un commentaire..."
                    rows={2}
                    className="mt-1 w-full border border-[#e1e3e5] rounded-md px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <label className="text-xs text-gray-500 underline cursor-pointer">
                      <input type="file" className="hidden" />
                      Joindre un fichier
                    </label>
                    <span className="text-xs text-gray-400">Aucun fichier choisi</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Seuls vous et les autres employés peuvent voir les commentaires
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">
            {/* Customer */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={16} className="text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.05em]">Client</h3>
              </div>
              <p className="text-sm font-medium text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
              <p className="text-xs text-gray-600 mt-0.5">{order.customer.email}</p>
              {order.customer.phone && <p className="text-xs text-gray-600 mt-0.5">{order.customer.phone}</p>}
              <p className="text-xs text-gray-500 mt-2">2 commandes</p>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={16} className="text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.05em]">Coordonnées</h3>
              </div>
              <p className="text-xs text-gray-800">{order.customer.email}</p>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.05em]">Adresse d’expédition</h3>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {order.customer.firstName} {order.customer.lastName}<br />
                  {order.shippingAddress.address1}<br />
                  {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}<br />
                  {order.shippingAddress.country}
                </p>
                {order.customer.phone && <p className="text-xs text-gray-600 mt-1">{order.customer.phone}</p>}
              </div>
            )}

            {/* Billing Address */}
            {order.billingAddress && (
              <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.05em]">Adresse de facturation</h3>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {order.billingAddress.address1}<br />
                  {order.billingAddress.address2 && <>{order.billingAddress.address2}<br /></>}
                  {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postcode}<br />
                  {order.billingAddress.country}
                </p>
                {JSON.stringify(order.billingAddress) === JSON.stringify(order.shippingAddress) && (
                  <p className="text-xs text-gray-500 mt-1 italic">Identique à l’adresse d’expédition</p>
                )}
              </div>
            )}

            {/* Conversion summary */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.05em]">Résumé de la conversion</h3>
              </div>
              <p className="text-xs text-gray-800">Il s’agit de sa 2ᵉ commande.</p>
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <p>1ère session depuis Google</p>
                <p>2 visites sur 26 jours</p>
              </div>
            </div>

            {/* Risk */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.05em]">Risque de la commande</h3>
              </div>
              <p className="text-xs text-gray-500">Analyse non disponible</p>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e1e3e5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={16} className="text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.05em]">Balises</h3>
              </div>
              <input
                type="text"
                placeholder="Rechercher ou créer des balises"
                className="w-full border border-[#e1e3e5] rounded-md px-3 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {order.tags?.map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 bg-[#f6f7f8] text-gray-700 rounded text-xs border border-[#e1e3e5]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}