'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Filter, LayoutGrid, ChevronRight, X, Zap } from 'lucide-react'

// --- INTERFACES ---
interface Brand { id: string; name: string }
interface Model { id: string; name: string }
interface Product {
  id: string
  name: string
  slug: string
  price_regular: number
  brandId: string
  modelId: string
  images: string[]
  brandName?: string
  ProductSizeStock: {
    stock: number
    Size: { value: string }
  }[]
}

function ShopContent() {
  const searchParams = useSearchParams()
  const initialBrand = searchParams.get('brand') || 'all'

  const [products, setProducts] = useState<Product[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [activeModel, setActiveModel] = useState('all')
  const [activeBrand, setActiveBrand] = useState(initialBrand)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

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
    const matchModel = activeModel === 'all' || p.modelId === activeModel
    const matchBrand = activeBrand === 'all' || p.brandId === activeBrand
    return matchModel && matchBrand
  })

  return (
    <div className="min-h-screen bg-white font-sans text-black pt-20">
      
      {/* 1. HERO SECTION */}
      <div className="h-[30vh] md:h-[40vh] relative flex items-center justify-center bg-zinc-900 overflow-hidden mt-2">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <Image 
          src="/images/hero-bg.jpg" 
          alt="Banner" fill className="object-cover scale-110" 
          priority unoptimized
        />
        <div className="relative z-20 text-center space-y-4 px-4">
            <h1 className="text-white text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">Katalog</h1>
            <p className="text-white/40 text-[12px] md:text-[10px] font-black uppercase tracking-[0.5em]">HnM Authentic Selection</p>
        </div>
      </div>

      <div className="max-w-400 mx-auto px-6 md:px-10 py-12 flex flex-col lg:flex-row gap-12 text-black">
        
        {/* MOBILE FILTER BUTTON */}
        <button 
          onClick={() => setShowMobileFilter(true)}
          className="lg:hidden w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest"
        >
          <Filter size={18} /> Filter Koleksi
        </button>

        {/* 2. SIDEBAR FILTER */}
        <aside className={`fixed inset-0 z-150 bg-white p-8 overflow-y-auto transition-transform duration-500 lg:relative lg:inset-auto lg:z-0 lg:p-0 lg:w-80 lg:translate-x-0 ${showMobileFilter ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between lg:hidden mb-8 border-b-2 border-zinc-100 pb-4">
             <h2 className="text-xl font-black uppercase tracking-tighter text-black">Filter</h2>
             <button onClick={() => setShowMobileFilter(false)} className="p-2 bg-zinc-100 rounded-lg"><X size={20} className="text-black" /></button>
          </div>

          <div className="sticky top-28 space-y-10">
            <div className="hidden lg:flex items-center gap-3 border-b-4 border-black pb-4 text-black">
              <Filter size={20} strokeWidth={3} />
              <h2 className="text-xl font-black uppercase tracking-tighter">Filter Koleksi</h2>
            </div>

            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Kategori Sepatu</p>
              <div className="grid grid-cols-2 gap-2">
                <FilterButton active={activeModel === 'all'} label="Semua" onClick={() => {setActiveModel('all'); setShowMobileFilter(false)}} />
                {models.map((m) => (
                  <FilterButton key={m.id} active={activeModel === m.id} label={m.name} onClick={() => {setActiveModel(m.id); setShowMobileFilter(false)}} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Pilih Brand</p>
              <div className="flex flex-col gap-1">
                <BrandButton active={activeBrand === 'all'} label="Semua Merk" onClick={() => {setActiveBrand('all'); setShowMobileFilter(false)}} />
                {brands.map((b) => (
                  <BrandButton key={b.id} active={activeBrand === b.id} label={b.name} onClick={() => {setActiveBrand(b.id); setShowMobileFilter(false)}} />
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 3. PRODUCT GRID - STYLE PREMIUM & SIZE READY */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <LayoutGrid size={18} className="text-black" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                {filteredProducts.length} <span className="text-black">Koleksi Tersedia</span>
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6 text-black font-bold">
                <Loader2 className="animate-spin" size={40} strokeWidth={3} />
                <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-400">Filtering Inventory...</p>
            </div>
          ) : (
            /* GRID: 2 COL MOBILE / 3 COL XL DESKTOP */
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
              {filteredProducts.map((p) => (
                <Link 
                  key={p.id} 
                  href={`/produk/${p.slug}`} 
                  className="group block relative"
                >
                  {/* Image Container dengan Shadow Kaku */}
                  <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
                    <Image 
                      src={p.images && p.images[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} 
                      alt={p.name} 
                      fill 
                      className="object-cover transition-all duration-700 group-hover:scale-110" 
                      unoptimized 
                    />
                    <div className="absolute top-3 left-3 md:top-4 md:left-4">
                      <span className="bg-black text-white text-[7px] md:text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase shadow-lg">
                        {p.brandName || "Brand"}
                      </span>
                    </div>
                    {/* ICON INDICATOR MOBILE */}
                    <div className="absolute bottom-4 right-4 md:hidden">
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white shadow-xl">
                        <Zap size={14} className="fill-white" />
                      </div>
                    </div>
                  </div>

                  {/* Info Section - SIZE READY SELALU MUNCUL */}
                  <div className="mt-6 space-y-3 px-1 text-black font-bold">
                    <div className="space-y-1">
                      <h2 className="text-xs md:text-base uppercase tracking-tight line-clamp-1 group-hover:text-zinc-500 transition-colors">
                        {p.name}
                      </h2>
                      <p className="text-sm md:text-lg tracking-tighter">
                        RP {Number(p.price_regular || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    {/* SIZE AREA: Statik (Tanpa Hover) */}
                    <div className="space-y-2 pt-3 border-t-2 border-zinc-50">
                      <p className="text-[10px] md:text-[12px] uppercase tracking-widest text-zinc-400">Pilihan Size</p>
                      <div className="flex flex-wrap gap-1 md:gap-1.5">
                        {p.ProductSizeStock && p.ProductSizeStock.length > 0 ? p.ProductSizeStock.map((s: any, sIdx: number) => (
                          <span key={sIdx} className="text-[10px] md:text-[12px] bg-white border border-zinc-200 text-zinc-800 px-1.5 py-1 rounded min-w-7 text-center hover:border-black transition-colors uppercase">
                            {s.Size?.value}
                          </span>
                        )) : (
                          <span className="text-[10px] text-red-400 italic">Cek Stok via Chat</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// Helpers
function FilterButton({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${active ? 'bg-black border-black text-white' : 'bg-white border-zinc-100 text-zinc-400 hover:border-black hover:text-black'}`}>
      {label}
    </button>
  )
}

function BrandButton({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${active ? 'bg-zinc-50 border-black font-black text-black' : 'bg-white border-transparent text-zinc-400 font-bold hover:bg-zinc-50 hover:text-black'}`}>
      <span className="text-xs uppercase">{label}</span>
      {active && <ChevronRight size={14} className="text-black" />}
    </button>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <ShopContent />
    </Suspense>
  )
}