'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'

interface ProductDrawerProps {
  open: boolean
  onClose: () => void
  product: any
  storeId: string
}

export default function ProductDrawer({ open, onClose, product, storeId }: ProductDrawerProps) {
  const queryClient = useQueryClient()

  // Local state – initialised when the product changes
  const [regularPrice, setRegularPrice] = useState<number>(0)
  const [salePrice, setSalePrice] = useState<number>(0)
  const [stockQuantity, setStockQuantity] = useState<number>(0)
  const [stockStatus, setStockStatus] = useState<string>('instock')

  // Update local state whenever a new product is opened
  useEffect(() => {
    if (product) {
      setRegularPrice(product.price || 0)
      setSalePrice(product.sale_price || 0)
      setStockQuantity(product.stock || 0)
      setStockStatus(product.stock_status || 'instock')
    }
  }, [product])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        type: 'product-update',
        storeId,
        productId: product.id,
        regular_price: regularPrice,
        sale_price: salePrice,
        stock_quantity: stockQuantity,
        stock_status: stockStatus,
      }
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }))
        throw new Error(err.error || 'Update failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-stats'] })
      onClose()
    },
    onError: (error: Error) => {
      alert('Update failed: ' + error.message)
    },
  })

  if (!open || !product) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 transform transition-transform overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E3E3E3] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{product.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Product Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">SKU</span>
                <span>{product.sku || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Category</span>
                <span>{product.category || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Regular Price (MAD)</span>
                <input
                  type="number"
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-0.5 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Promotional Price (MAD)</span>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-0.5 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Stock Quantity</span>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-0.5 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Stock Status</span>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="instock">In stock</option>
                  <option value="outofstock">Out of stock</option>
                  <option value="onbackorder">On backorder</option>
                </select>
              </div>
            </div>
          </section>

          {/* Store Availability (read-only overview) */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Store Availability</h3>
            <div className="space-y-3">
              {product.stores?.map((store: string) => (
                <div key={store} className="border border-[#E3E3E3] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{store}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" defaultChecked /> Active
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" defaultChecked /> In Stock
                    </label>
                    <span>{regularPrice} MAD</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 bg-[#008060] text-white rounded-md py-2 text-sm disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
            <button onClick={onClose} className="flex-1 border border-[#E3E3E3] rounded-md py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}