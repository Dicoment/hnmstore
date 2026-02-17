'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

// --- INTERFACES UNTUK ZERO ERROR ---
interface Brand { id: string; name: string }
interface Model { id: string; name: string }

interface Product {
  id: string
  name: string
  slug: string
  price_regular: number
  brand_id: string
  model_id: string
  images: string[]
  Brand?: { name: string }
  ProductSizeStock: {
    stock: number
    Size: { value: string }
  }[]
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [activeModel, setActiveModel] = useState('all')
  const [activeBrand, setActiveBrand] = useState('all')

  useEffect(() => {
    fetchShopData()
  }, [])

  async function fetchShopData() {
    try {
      setLoading(true)
      const [p, b, m] = await Promise.all([
        supabase.from('Product').select(`
          *,
          Brand!brand_id(name),
          Model!model_id(name),
          ProductSizeStock!productId(stock, Size!sizeId(value))
        `),
        supabase.from('Brand').select('*'),
        supabase.from('Model').select('*')
      ])

      setProducts((p.data as Product[]) || [])
      setBrands((b.data as Brand[]) || [])
      setModels((m.data as Model[]) || [])
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const matchModel = activeModel === 'all' || p.model_id === activeModel
    const matchBrand = activeBrand === 'all' || p.brand_id === activeBrand
    return matchModel && matchBrand
  })

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Banner Shop Minimalis */}
      <div className="h-75 relative flex items-center justify-center bg-black">
        <Image 
          src="/images/shop-banner.jpg" 
          alt="Shop Banner" 
          fill 
          className="object-cover opacity-70"
          priority
        />
        <h1 className="relative text-white text-7xl font-bold tracking-tight z-10">Shop</h1>
      </div>

      <div className="max-w-350 mx-auto px-4 py-12 flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR FILTER (White Box Design) */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-8 sticky top-6 shadow-sm">
            <div className="mb-10">
              <h3 className="font-bold text-gray-900 text-lg mb-6">Filter Model</h3>
              <ul className="space-y-4">
                <li 
                  onClick={() => setActiveModel('all')}
                  className={`cursor-pointer text-[15px] transition ${activeModel === 'all' ? 'text-black font-bold' : 'text-gray-500 hover:text-black font-medium'}`}
                >
                  Semua Model
                </li>
                {models.map((m) => (
                  <li 
                    key={m.id}
                    onClick={() => setActiveModel(m.id)}
                    className={`cursor-pointer text-[15px] transition ${activeModel === m.id ? 'text-black font-bold' : 'text-gray-500 hover:text-black font-medium'}`}
                  >
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-6">Filter Brand</h3>
              <ul className="space-y-4">
                <li 
                  onClick={() => setActiveBrand('all')}
                  className={`cursor-pointer text-[15px] transition ${activeBrand === 'all' ? 'text-black font-bold' : 'text-gray-500 hover:text-black font-medium'}`}
                >
                  Semua Model
                </li>
                {brands.map((b) => (
                  <li 
                    key={b.id}
                    onClick={() => setActiveBrand(b.id)}
                    className={`cursor-pointer text-[15px] transition ${activeBrand === b.id ? 'text-black font-bold' : 'text-gray-500 hover:text-black font-medium'}`}
                  >
                    {b.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* PRODUCT GRID (WordPress Card Style) */}
        <main className="flex-1 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-black" size={40} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
              {filteredProducts.map((p) => (
                <div key={p.id} className="flex flex-col group">
                  {/* Image Holder */}
                  <div className="aspect-square relative overflow-hidden rounded-md mb-4">
                    <Image 
                      src={p.images?.[0] || '/placeholder.png'} 
                      alt={p.name} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  </div>
                  
                  {/* Content Holder */}
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-orange-400 flex items-center gap-1">
                       <span className="w-3 h-px bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                       {p.Brand?.name}
                    </p>
                    <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{p.name}</h2>
                    <p className="text-[17px] font-bold text-gray-900">Rp{p.price_regular?.toLocaleString('id-ID')}</p>
                    
                    {/* Ready Size Info */}
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-gray-900 mb-2">Ready Size</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.ProductSizeStock?.map((s, i) => (
                          <div key={i} className={`min-w-8 h-8 px-1 rounded-full border border-gray-300 flex items-center justify-center text-[11px] font-medium ${s.stock > 0 ? 'text-gray-900' : 'text-gray-300 line-through opacity-50'}`}>
                            {s.Size?.value}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Button Lihat Produk */}
                    <Link 
                      href={`/produk/${p.slug}`}
                      className="mt-6 block w-full py-3 bg-black text-white rounded-full text-[13px] font-bold text-center uppercase tracking-wider hover:bg-zinc-800 transition"
                    >
                      Lihat Produk
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="py-40 text-center">
              <p className="text-gray-400 font-bold text-xl tracking-tighter">Produk Belum Ditambahkan, Hubungi Admin untuk Menanyakan Ketersediaan Produk!</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}