'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Filter, LayoutGrid, ChevronRight } from 'lucide-react'

// --- INTERFACES ---
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
  brandName?: string
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
      const productQuery = `
        SELECT p.*, b.name as "brandName", m.name as "modelName",
          (SELECT json_agg(json_build_object('stock', pss.stock, 'Size', json_build_object('value', s.value)) ORDER BY s.value ASC)
           FROM public."ProductSizeStock" pss JOIN public."Size" s ON s.id = pss."sizeId" WHERE pss."productId" = p.id) as "ProductSizeStock"
        FROM public."Product" p
        LEFT JOIN public."Brand" b ON p."brandId" = b.id
        LEFT JOIN public."Model" m ON p."modelId" = m.id
        WHERE p.draft = false ORDER BY p."createdAt" DESC
      `;

      const [pRes, bRes, mRes] = await Promise.all([
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: productQuery }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Brand" ORDER BY name ASC' }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Model" ORDER BY name ASC' }) }).then(r => r.json())
      ])

      setProducts(pRes.data || [])
      setBrands(bRes.data || [])
      setModels(mRes.data || [])
    } catch (err) {
      console.error(err)
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
    <div className="min-h-screen bg-white font-sans text-black">
      {/* 1. HERO BANNER - INDUSTRIAL LOOK */}
      <div className="h-[40vh] relative flex items-center justify-center bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-60 z-10" />
        <Image 
          src="/images/shop-banner.jpg" 
          alt="Banner" fill className="object-cover scale-110 transition-transform duration-1000" 
          priority unoptimized
        />
        <div className="relative z-20 text-center space-y-4 px-4">
            <h1 className="text-white text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">Katalog</h1>
            <div className="flex items-center justify-center gap-4 text-white/40">
              <div className="h-[2px] w-12 bg-white/20" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">HnM Authentic Selection</p>
              <div className="h-[2px] w-12 bg-white/20" />
            </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-10 py-16 flex flex-col lg:flex-row gap-12">
        
        {/* 2. SIDEBAR FILTER - COMPACT BOXES */}
        <aside className="w-full lg:w-80 shrink-0 space-y-12">
          <div className="sticky top-10 space-y-12">
            {/* Filter Header */}
            <div className="flex items-center gap-3 border-b-4 border-black pb-4">
              <Filter size={20} strokeWidth={3} />
              <h2 className="text-xl font-black uppercase tracking-tighter">Filter Koleksi</h2>
            </div>

            {/* Model Grid */}
            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Kategori Sepatu</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setActiveModel('all')}
                  className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${activeModel === 'all' ? 'bg-black border-black text-white shadow-xl' : 'bg-white border-zinc-100 text-zinc-400 hover:border-black hover:text-black'}`}
                >
                  Semua
                </button>
                {models.map((m) => (
                  <button 
                    key={m.id} onClick={() => setActiveModel(m.id)}
                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${activeModel === m.id ? 'bg-black border-black text-white shadow-xl' : 'bg-white border-zinc-100 text-zinc-400 hover:border-black hover:text-black'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand List */}
            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Pilih Brand</p>
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setActiveBrand('all')}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${activeBrand === 'all' ? 'bg-zinc-50 border-black font-black' : 'bg-white border-transparent text-zinc-400 font-bold hover:bg-zinc-50 hover:text-black'}`}
                >
                  <span className="text-xs uppercase">Semua Merk</span>
                  <ChevronRight size={14} className={activeBrand === 'all' ? 'opacity-100' : 'opacity-0'} />
                </button>
                {brands.map((b) => (
                  <button 
                    key={b.id} onClick={() => setActiveBrand(b.id)}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${activeBrand === b.id ? 'bg-zinc-50 border-black font-black' : 'bg-white border-transparent text-zinc-400 font-bold hover:bg-zinc-50 hover:text-black'}`}
                  >
                    <span className="text-xs uppercase">{b.name}</span>
                    <ChevronRight size={14} className={activeBrand === b.id ? 'opacity-100' : 'opacity-0'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 3. PRODUCT GRID - SOLID BOXES */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <LayoutGrid size={18} />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{filteredProducts.length} Produk Ditemukan</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="animate-spin text-black" size={48} strokeWidth={3} />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-300">Menyusun Katalog...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
              {filteredProducts.map((p) => (
                <Link key={p.id} href={`/produk/${p.slug}`} className="group flex flex-col bg-white border-2 border-zinc-100 rounded-xl overflow-hidden transition-all hover:border-black hover:shadow-[20px_20px_0px_0px_rgba(0,0,0,0.03)]">
                  {/* Image Holder - Fixed Square */}
                  <div className="aspect-square relative overflow-hidden bg-zinc-50 border-b-2 border-zinc-50">
                    <Image 
                      src={p.images?.[0] || '/placeholder.png'} 
                      alt={p.name} fill className="object-cover transition-all duration-700 group-hover:scale-110" 
                      unoptimized
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-black text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg">
                        {p.brandName}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content Holder */}
                  <div className="p-6 flex-1 flex flex-col space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-black text-zinc-900 leading-none uppercase tracking-tight line-clamp-1">{p.name}</h2>
                      <p className="text-xl font-black text-black tracking-tighter">RP {Number(p.price_regular || 0).toLocaleString('id-ID')}</p>
                    </div>
                    
                    {/* Size Info - Compact */}
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-3">Sizes Available</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.ProductSizeStock?.slice(0, 5).map((s, i) => (
                          <div key={i} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-[10px] font-black transition-all ${s.stock > 0 ? 'border-zinc-100 text-black group-hover:border-zinc-200' : 'border-zinc-50 text-zinc-200 line-through bg-zinc-50'}`}>
                            {s.Size?.value}
                          </div>
                        ))}
                        {p.ProductSizeStock?.length > 5 && (
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-[9px] font-black text-zinc-400">+</div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t-2 border-zinc-50 flex items-center justify-between text-black">
                       <span className="text-[10px] font-black uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-300">Detail Produk</span>
                       <ChevronRight size={16} strokeWidth={3} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="py-40 text-center border-4 border-dashed border-zinc-100 rounded-xl">
              <p className="text-zinc-300 font-black text-2xl uppercase tracking-tighter">Koleksi Tidak Ditemukan</p>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}