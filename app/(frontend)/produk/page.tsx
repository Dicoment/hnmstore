'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Filter, LayoutGrid, ChevronRight, X, Zap, ChevronLeft, ChevronDown } from 'lucide-react'

// --- INTERFACES ---
interface Brand { id: string; name: string }
interface Model { id: string; name: string }
interface Product {
  id: string
  name: string
  slug: string
  price_regular: number
  price_promo: number // Tambahkan interface ini
  brandId: string
  modelId: string
  images: string[]
  brandName?: string
  ProductSizeStock: {
    stock: number
    Size: { value: string }
  }[]
}

const ITEMS_PER_PAGE = 12

function ShopContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const initialBrand = searchParams.get('brand') || 'all'
  const currentPage = Number(searchParams.get('page')) || 1
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')

  const [products, setProducts] = useState<Product[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [models, setModels] = useState<Model[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [activeModel, setActiveModel] = useState('all')
  const [activeBrand, setActiveBrand] = useState(initialBrand)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  useEffect(() => {
    fetchShopData()
  }, [activeBrand, activeModel, currentPage, sortBy])

  async function fetchShopData() {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * ITEMS_PER_PAGE

      // LOGIC ORDER BY
      let orderBy = `p."createdAt" DESC`
      if (sortBy === 'price-low') orderBy = `p.price_regular ASC`
      if (sortBy === 'price-high') orderBy = `p.price_regular DESC`
      if (sortBy === 'name-az') orderBy = `p.name ASC`
      if (sortBy === 'name-za') orderBy = `p.name DESC`

      let whereClause = `WHERE p.draft = false`
      if (activeBrand !== 'all') whereClause += ` AND p."brandId" = '${activeBrand}'`
      if (activeModel !== 'all') whereClause += ` AND p."modelId" = '${activeModel}'`

      // UPDATE QUERY: Tambahkan p.price_promo
      const productQuery = `
        SELECT p.id, p.name, p.slug, p.price_regular, p.price_promo, p.images, b.name as "brandName", m.name as "modelName",
          (SELECT json_agg(json_build_object('stock', pss.stock, 'Size', json_build_object('value', s.value)) ORDER BY s.value ASC)
           FROM public."ProductSizeStock" pss JOIN public."Size" s ON s.id = pss."sizeId" WHERE pss."productId" = p.id AND pss.stock > 0) as "ProductSizeStock"
        FROM public."Product" p
        LEFT JOIN public."Brand" b ON p."brandId" = b.id
        LEFT JOIN public."Model" m ON p."modelId" = m.id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
      `;

      const countQuery = `SELECT COUNT(*) FROM public."Product" p ${whereClause}`;

      const [pRes, bRes, mRes, cRes] = await Promise.all([
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: productQuery }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Brand" ORDER BY name ASC' }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Model" ORDER BY name ASC' }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: countQuery }) }).then(r => r.json())
      ])

      setProducts(pRes.data || [])
      setBrands(bRes.data || [])
      setModels(mRes.data || [])
      setTotalItems(Number(cRes.data?.[0]?.count || 0))
    } catch (err) { console.error(err) } finally { setLoading(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`?${params.toString()}`)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSortBy(val)
    const params = new URLSearchParams(searchParams)
    params.set('sort', val)
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-white font-sans text-black pt-20">
      {/* 1. HERO SECTION */}
      <div className="h-[30vh] md:h-[40vh] relative flex items-center justify-center bg-zinc-900 overflow-hidden mt-2">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <Image src="/images/hero-bg.jpg" alt="Banner" fill className="object-cover scale-110" priority unoptimized />
        <div className="relative z-20 text-center space-y-4 px-4 font-bold text-white">
            <h1 className="text-5xl md:text-8xl uppercase tracking-tighter leading-none">Katalog</h1>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.5em]">HnM Authentic Selection</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 flex flex-col lg:flex-row gap-12 items-start">
        
        {/* MOBILE FILTER BUTTON */}
        <button onClick={() => setShowMobileFilter(true)} className="lg:hidden w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest">
          <Filter size={18} /> Filter Koleksi
        </button>

        {/* 2. SIDEBAR FILTER */}
        <aside className={`fixed inset-0 z-100 bg-white p-8 overflow-y-auto transition-transform duration-500 lg:relative lg:inset-auto lg:z-0 lg:p-0 lg:w-80 lg:translate-x-0 ${showMobileFilter ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between lg:hidden mb-8 border-b-2 border-zinc-100 pb-4">
             <h2 className="text-xl font-bold uppercase tracking-tighter">Filter</h2>
             <button onClick={() => setShowMobileFilter(false)} className="p-2 bg-zinc-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="sticky top-28 space-y-10">
            <div className="hidden lg:flex items-center gap-3 border-b-2 border-black pb-4 font-bold">
              <Filter size={20} strokeWidth={3} />
              <h2 className="text-xl uppercase tracking-tighter">Filter Koleksi</h2>
            </div>
            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em]">Kategori Sepatu</p>
              <div className="grid grid-cols-2 gap-2">
                <FilterButton active={activeModel === 'all'} label="Semua" onClick={() => {setActiveModel('all'); handlePageChange(1); setShowMobileFilter(false)}} />
                {models.map((m) => (
                  <FilterButton key={m.id} active={activeModel === m.id} label={m.name} onClick={() => {setActiveModel(m.id); handlePageChange(1); setShowMobileFilter(false)}} />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em]">Pilih Brand</p>
              <div className="flex flex-col gap-1">
                <BrandButton active={activeBrand === 'all'} label="Semua Merk" onClick={() => {setActiveBrand('all'); handlePageChange(1); setShowMobileFilter(false)}} />
                {brands.map((b) => (
                  <BrandButton key={b.id} active={activeBrand === b.id} label={b.name} onClick={() => {setActiveBrand(b.id); handlePageChange(1); setShowMobileFilter(false)}} />
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 3. PRODUCT GRID */}
        <main className="flex-1 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 border-b-2 border-zinc-50 pb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Menampilkan <span className="text-black">{products.length} dari {totalItems}</span> Koleksi
            </p>
            
            <div className="relative group w-full sm:w-auto">
              <select 
                value={sortBy}
                onChange={handleSortChange}
                className="w-full sm:w-auto appearance-none bg-zinc-50 border-2 border-zinc-100 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:border-black transition-all outline-none pr-12"
              >
                <option value="newest">Urutkan: Terbaru</option>
                <option value="name-az">Urutkan: Nama A-Z</option>
                <option value="name-za">Urutkan: Nama Z-A</option>
                <option value="price-low">Urutkan: Harga Termurah</option>
                <option value="price-high">Urutkan: Harga Termahal</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-black transition-colors" />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6 font-bold text-black">
                <Loader2 className="animate-spin" size={40} strokeWidth={3} />
                <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-400">Refreshing Stock...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
                {products.map((p) => (
                  <Link key={p.id} href={`/produk/${p.slug}`} className="group block relative">
                    <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
                      <Image src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} alt={p.name} fill className="object-cover transition-all duration-700 group-hover:scale-110" unoptimized />
                      <div className="absolute top-3 left-3 md:top-4 md:left-4">
                        <span className="bg-black text-white text-[7px] md:text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase shadow-lg">{p.brandName}</span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3 px-1 font-bold text-black">
                      <h2 className="text-xs md:text-base uppercase tracking-tight truncate group-hover:text-zinc-500 transition-colors">{p.name}</h2>
                      
                      {/* UPDATE LOGIKA HARGA DI KATALOG */}
                      <div className="flex flex-col gap-0.5">
                        {p.price_promo && Number(p.price_promo) > 0 ? (
                          <>
                            <p className="text-sm md:text-lg tracking-tighter text-red-600 leading-none">
                              RP {(Number(p.price_regular) - Number(p.price_promo)).toLocaleString('id-ID')}
                            </p>
                            <p className="text-[10px] text-zinc-400 line-through font-medium">
                              RP {Number(p.price_regular).toLocaleString('id-ID')}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm md:text-lg tracking-tighter">
                            RP {Number(p.price_regular || 0).toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2 pt-3 border-t-2 border-zinc-50">
                        <p className="text-[10px] md:text-[12px] uppercase tracking-widest text-zinc-400">Ready Size</p>
                        <div className="flex flex-wrap gap-1">
                          {p.ProductSizeStock?.slice(0, 10).map((s: any, idx: number) => (
                            <span key={idx} className="text-[10px] md:text-[12px] bg-white border border-zinc-200 px-1.5 py-1 rounded min-w-7 text-center uppercase">{s.Size?.value}</span>
                          ))}
                          {p.ProductSizeStock?.length > 10 && <span className="text-[10px] text-zinc-400">+{p.ProductSizeStock.length - 10}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-20 pt-12 border-t-2 border-zinc-100 flex items-center justify-center gap-2 font-bold">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-3 rounded-xl border-2 border-zinc-100 disabled:opacity-30 hover:border-black transition-all text-black">
                    <ChevronLeft size={20} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => handlePageChange(page)} className={`w-12 h-12 rounded-xl border-2 transition-all ${currentPage === page ? 'bg-black border-black text-white shadow-xl' : 'bg-white border-zinc-100 hover:border-black text-black'}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-3 rounded-xl border-2 border-zinc-100 disabled:opacity-30 hover:border-black transition-all text-black">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function FilterButton({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`py-3 px-4 rounded-xl text-[10px] font-bold uppercase transition-all border-2 ${active ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-400 hover:border-black hover:text-black'}`}>
      {label}
    </button>
  )
}

function BrandButton({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${active ? 'bg-zinc-50 border-black font-bold text-black' : 'bg-white border-transparent text-zinc-400 font-bold hover:bg-zinc-50 hover:text-black'}`}>
      <span className="text-xs uppercase">{label}</span>
      {active && <ChevronRight size={14} />}
    </button>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-white font-bold"><Loader2 className="animate-spin" size={40} /><p className="mt-4 text-[10px] uppercase tracking-widest text-zinc-400">Loading Collection...</p></div>}>
      <ShopContent />
    </Suspense>
  )
}