'use client'

import { ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  status: string
  _storeId: string
  _storeName: string
  image?: string
  category?: string
  stores?: string[]      // connected stores
  lastUpdated: string
}

export default function ProductsTable({
  products,
  total,
  currentPage,
  onPageChange,
  isLoading,
  onRowClick,
}: {
  products: Product[]
  total: number
  currentPage: number
  onPageChange: (page: number) => void
  isLoading: boolean
  onRowClick: (product: Product) => void
}) {
  const limit = 20
  const totalPages = Math.ceil(total / limit)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-[#008060] rounded-full" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-xs font-medium text-[#616161] uppercase tracking-wider border-b border-[#E3E3E3]">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" /></th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stores</th>
              <th className="px-4 py-3">Last Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E3E3]">
            {products.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onRowClick(product)}
              >
                <td className="px-4 py-3"><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>
                <td className="px-4 py-3 flex items-center gap-3">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded border object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded border bg-gray-50 flex items-center justify-center text-gray-400">
                      <Edit size={16} />
                    </div>
                  )}
                  <span className="text-sm font-medium">{product.name}</span>
                </td>
                <td className="px-4 py-3 text-sm text-[#616161]">{product.sku}</td>
                <td className="px-4 py-3 text-sm">{product._storeName}</td>
                <td className="px-4 py-3 text-sm text-[#616161]">{product.category || '—'}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  {/* Inline price editing could be added here */}
                  {product.price} MAD
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`${product.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    product.status === 'publish' ? 'bg-green-100 text-green-800' :
                    product.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {product.stores?.map((store, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {store}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#616161]">
                  {new Date(product.lastUpdated).toLocaleDateString()}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[#E3E3E3] text-sm">
        <span className="text-[#616161]">
          {total > 0 ? `${(currentPage - 1) * limit + 1}-${Math.min(currentPage * limit, total)} of ${total}` : '0 products'}
        </span>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
          <span className="px-2">{currentPage}</span>
          <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  )
}