'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import ProductsTable from './ProductsTable'
import ProductDrawer from './ProductDrawer'
import {
  Search, Plus, Download, Upload, Filter
} from 'lucide-react'

// Quick summary stats – uses the same stats API with metric orders? We'll need a new endpoint that returns product stats.
// For now, we can create a /api/orders?type=products-stats to return total, active, out-of-stock, draft, low-stock.
// We'll implement that as part of the unified products API.

async function fetchProductStats() {
  const res = await fetch('/api/orders?type=products-stats')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchProducts(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`/api/orders?type=products-list&${query}`)
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export default function ProductsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedStoreForDrawer, setSelectedStoreForDrawer] = useState('')

  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('all')
  const [category, setCategory] = useState('all')
  const [stockStatus, setStockStatus] = useState('all')
  const [storeId, setStoreId] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  const { data: stats } = useQuery({
    queryKey: ['product-stats'],
    queryFn: fetchProductStats,
  })

  const { data: productData, isLoading } = useQuery({
    queryKey: ['products', search, brand, category, stockStatus, storeId, currentPage],
    queryFn: () => fetchProducts({
      search, brand, category, stockStatus, storeId,
      offset: String((currentPage - 1) * limit),
      limit: String(limit),
    }),
  })

  const products = productData?.products || []
  const total = productData?.total || 0

  const handleRowClick = (product: any) => {
    setSelectedProduct(product)
    setSelectedStoreForDrawer(product._storeId)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#303030]">Products</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
              className="pl-9 pr-4 py-1.5 border border-[#E3E3E3] rounded-md text-sm w-64"
            />
          </div>
          <button className="flex items-center gap-1.5 border border-[#E3E3E3] rounded-md px-4 py-2 text-sm hover:bg-gray-50">
            <Upload size={16} /> Import
          </button>
          <button className="flex items-center gap-1.5 border border-[#E3E3E3] rounded-md px-4 py-2 text-sm hover:bg-gray-50">
            <Download size={16} /> Export
          </button>
          <button className="flex items-center gap-1.5 bg-[#008060] text-white rounded-md px-4 py-2 text-sm font-medium">
            <Plus size={16} /> Create product
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Products', value: stats?.total || 0 },
          { label: 'Active', value: stats?.active || 0 },
          { label: 'Out of Stock', value: stats?.outOfStock || 0 },
          { label: 'Draft', value: stats?.draft || 0 },
          { label: 'Low Stock', value: stats?.lowStock || 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-[#E3E3E3] p-4">
            <p className="text-xs text-[#616161] uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select value={brand} onChange={e => setBrand(e.target.value)} className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm">
          <option value="all">All Brands</option>
          <option value="auracos">Auracos</option>
          <option value="makari">Makari</option>
          <option value="gamarde">Gamarde</option>
          <option value="alphascience">Alphascience</option>
          <option value="ainhoa">Ainhoa</option>
          <option value="hostinger">Hostinger</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm">
          <option value="all">All Categories</option>
          <option value="skincare">Skincare</option>
          <option value="hair">Hair</option>
          <option value="body">Body</option>
          <option value="supplements">Supplements</option>
        </select>
        <select value={stockStatus} onChange={e => setStockStatus(e.target.value)} className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm">
          <option value="all">All Stock</option>
          <option value="in-stock">In Stock</option>
          <option value="out-of-stock">Out of Stock</option>
          <option value="low-stock">Low Stock</option>
        </select>
        <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border border-[#E3E3E3] rounded-md px-3 py-1.5 text-sm">
          <option value="all">All Stores</option>
          <option value="1">Auracos</option>
          <option value="2">Makari</option>
          <option value="3">Gamarde</option>
          <option value="4">Alphascience</option>
          <option value="5">Ainhoa</option>
          <option value="6">Hostinger</option>
        </select>
      </div>

      {/* Table */}
      <ProductsTable
        products={products}
        total={total}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {/* Drawer */}
      <ProductDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={selectedProduct}
        storeId={selectedStoreForDrawer}
      />
    </div>
  )
}