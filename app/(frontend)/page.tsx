'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, LayoutGrid, Loader2, Quote, ShieldCheck, ChevronLeft, ChevronRight, Truck, Zap, Info } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'

function CategoryTile({ href, image, title, subtitle, alignRight = false }: {
  href: string; image: string; title: string; subtitle: string; alignRight?: boolean
}) {
  return (
    <Link href={href} className="relative group overflow-hidden bg-zinc-900">
      <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/20 transition-all duration-700" />
      {/* kalau gambarnya belum ada, kotak tetap tampil dengan latar gelap */}
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover transition-all duration-1000 group-hover:scale-110"
        unoptimized
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <div className={`relative z-20 h-full flex flex-col justify-end p-12 ${alignRight ? 'text-right items-end' : ''}`}>
        <h3 className="text-white text-4xl font-bold uppercase tracking-tighter">{title}</h3>
        <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">{subtitle}</p>
      </div>
    </Link>
  )
}

function HomeContent() {
  const [dataByBrand, setDataByBrand] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchHomeData() {
      try {
        setLoading(true)
        const sql = `
          SELECT 
            p.id, p.name, p.slug, p.price_regular, p.price_promo, p.images, b.name as "brandName", b.slug as "brandSlug",
            (SELECT json_agg(json_build_object('size', s.value) ORDER BY CASE s.value WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 WHEN 'XXL' THEN 5 ELSE 0 END, s.value)
             FROM public."ProductSizeStock" pss 
             JOIN public."Size" s ON s.id = pss."sizeId" 
             WHERE pss."productId" = p.id AND pss.stock > 0) as "available_sizes"
          FROM public."Product" p
          LEFT JOIN public."Brand" b ON p."brandId" = b.id
          WHERE p.draft = false
          ORDER BY p."createdAt" DESC
        `
        const res = await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql }) })
        const result = await res.json()
        
        // ProductCard membaca daftar ukuran dari field "sizes"
        const rows = (result.data || []).map((r: any) => ({ ...r, sizes: (r.available_sizes || []).map((x: any) => x.size) }))
        const grouped = rows.reduce((acc: any, curr: any) => {
          const brand = curr.brandName || 'Others'
          if (!acc[brand]) acc[brand] = []
          acc[brand].push(curr)
          return acc
        }, {})

        const sectionArray = Object.keys(grouped).map(brand => ({
          brandName: brand,
          brandSlug: grouped[brand][0]?.brandSlug,
          products: grouped[brand].slice(0, 4)
        }))
        
        setDataByBrand(sectionArray)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
  }, [])

  return (
    <div className="bg-white text-black font-sans overflow-x-hidden">
      
{/* 1. HERO SECTION */}
<section className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
  <div className="absolute inset-0 z-10 bg-black/50" />

  <Image
    src="/uploads/hero.png"
    alt="Koleksi sepatu original HnM Store Jepara"
    fill
    className="object-cover opacity-70 scale-105 animate-slow-pan"
    priority
    unoptimized
  />

  <div className="relative z-20 text-center space-y-10 px-6 py-24 max-w-6xl">
    <div className="space-y-6">
      <p className="text-white/70 text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] animate-fade-in">
        HNM STORE JEPARA • KOLEKSI SEPATU PILIHAN
      </p>

      <h1 className="text-5xl md:text-[7rem] font-bold text-white uppercase tracking-tighter leading-[0.9]">
        TEMUKAN <br />
        <span className="text-zinc-400">SEPATU FAVORITMU.</span>
      </h1>

      <p className="text-white/80 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
        Jelajahi koleksi sepatu Adidas, Nike, New Balance, ASICS,
        dan Puma di HnM Store Jepara. Lihat pilihan model, ukuran,
        harga, dan promo yang tersedia untuk menemukan sepatu
        yang sesuai dengan gaya kamu.
      </p>
    </div>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <Link
        href="/produk"
        className="inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl w-full sm:w-auto"
      >
        Lihat Katalog
        <ArrowRight size={16} />
      </Link>

      <Link
        href="/produk"
        className="inline-flex items-center justify-center gap-3 border border-white/40 text-white px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all w-full sm:w-auto"
      >
        Cari Pilihanmu
      </Link>
    </div>

    <p className="text-white/50 text-[10px] md:text-xs tracking-wide">
      Pilih model • Cek ukuran dan harga • Temukan sepatu favoritmu
    </p>
  </div>
</section>


      {/* 2. THE STATEMENT + PREMIUM SLIDER */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-20">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b-4 border-black pb-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-yellow-400 px-3 py-1 rounded-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Zap size={14} className="fill-black" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-black">New Drops</span>
              </div>
              <h2 className="text-5xl md:text-8xl font-bold uppercase tracking-tighter leading-[0.9] text-black">
                NOT JUST <br /> <span className="text-zinc-300">A PAIR.</span> <br /> IT'S AN IDENTITY.
              </h2>
            </div>
            <div className="flex flex-col items-end gap-6 max-w-md">
               <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed text-right">
                 We curate the history of street culture. Every drop is verified, every box is a legacy. Pure authenticity for your rotation.
               </p>
               <div className="flex gap-2">
                 <button onClick={() => { if(sliderRef.current) sliderRef.current.scrollBy({left: -300, behavior: 'smooth'}) }} className="p-4 bg-zinc-100 rounded-full hover:bg-black hover:text-white transition-all active:scale-90 shadow-sm border border-zinc-200">
                   <ChevronLeft size={20} />
                 </button>
                 <button onClick={() => { if(sliderRef.current) sliderRef.current.scrollBy({left: 300, behavior: 'smooth'}) }} className="p-4 bg-black text-white rounded-full hover:bg-zinc-800 transition-all active:scale-90 shadow-xl">
                   <ChevronRight size={20} />
                 </button>
               </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div 
            ref={sliderRef}
            className="flex overflow-x-auto gap-6 px-6 md:px-20 pb-10 no-scrollbar snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none' }}
          >
            {loading ? (
              <div className="w-full flex justify-center py-20"><Loader2 className="animate-spin text-black" size={32} /></div>
            ) : (
              dataByBrand.flatMap(b => b.products).slice(0, 10).map((p: any) => (
                <Link 
                  key={p.id} 
                  href={`/produk/${p.slug}`} 
                  className="min-w-70 md:min-w-95 snap-center group block relative"
                >
                  <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
                    <Image 
                      src={`/uploads/${p.images?.[0]}`} 
                      alt={p.name} 
                      fill 
                      className="object-cover transition-all duration-700 group-hover:scale-110"
                      unoptimized
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-black text-white text-[8px] font-bold uppercase px-2 py-1 rounded tracking-widest shadow-lg">
                        {p.brandName}
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-black group-hover:bg-black group-hover:text-white transition-all duration-500">
                        <Zap size={16} className="group-hover:fill-white" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 px-2 space-y-2">
                    <h3 className="font-bold text-base uppercase tracking-tight truncate group-hover:text-zinc-500 transition-colors">
                      {p.name}
                    </h3>
                    <div className="flex flex-col border-t-2 border-zinc-50 pt-2 text-black">
                      <div className="flex items-center justify-between gap-4">
                        {p.price_promo && Number(p.price_promo) > 0 ? (
                          <div className="flex flex-col">
                            <p className="font-bold text-lg tracking-tighter text-red-600 leading-none">
                              RP {(Number(p.price_regular) - Number(p.price_promo)).toLocaleString('id-ID')}
                            </p>
                            <p className="text-[12px] text-zinc-400 line-through font-medium">
                              RP {Number(p.price_regular).toLocaleString('id-ID')}
                            </p>
                          </div>
                        ) : (
                          <p className="font-bold text-lg tracking-tighter">
                            RP {Number(p.price_regular || 0).toLocaleString('id-ID')}
                          </p>
                        )}
                        <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500" />
                      </div>
                    </div>
                    <span className="text-xs font-medium uppercase text-zinc-700">Ready Size:</span>
                    <div className="flex flex-wrap pt-2 gap-1">
                          {p.available_sizes ? p.available_sizes.slice(0, 10).map((s: any, sIdx: number) => (
                            <span key={sIdx} className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-200 hover:border-zinc-800 transition-colors uppercase">
                              {s.size}
                            </span>
                          )) : (
                            <span className="text-[10px] font-bold text-red-400 italic">Out of Stock</span>
                          )}
                          {p.available_sizes?.length > 10 && <span className="text-[8px] font-bold text-zinc-400">+{p.available_sizes.length - 10}</span>}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. JENIS PRODUK */}
      <section className="grid grid-cols-1 md:grid-cols-2 h-[80vh] md:h-[60vh]">
        <CategoryTile href="/produk?tipe=sepatu" image="/uploads/sepatu.webp" title="Sepatu" subtitle="Lihat koleksi sepatu" />
        <CategoryTile href="/produk?tipe=baju" image="/uploads/baju.png" title="Baju" subtitle="Lihat koleksi baju" alignRight />
      </section>

      {/* FILTER CEPAT PER BRAND */}
      {!loading && dataByBrand.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em] mb-4">Belanja per brand</p>
          <div className="flex flex-wrap gap-2">
            {dataByBrand.map((sec) => (
              <Link
                key={sec.brandName}
                href={sec.brandSlug ? `/produk?brand=${sec.brandSlug}` : '/produk'}
                className="px-5 py-3 rounded-xl border-2 border-zinc-100 text-[10px] font-bold uppercase tracking-widest hover:border-black transition-all"
              >
                {sec.brandName}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. DYNAMIC BRAND SECTIONS */}
      <div className="bg-white space-y-24 md:space-y-40 py-24 md:py-32">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-black" size={32} /></div>
        ) : (
          dataByBrand.map((section, idx) => (
            <section key={idx} className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-black pb-12 mb-20">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 bg-yellow-400 px-3 py-1 rounded-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Zap size={15} className="fill-black" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black">Official Drop</span>
                  </div>
                  <h2 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none text-black">
                    {section.brandName.split(' ')[0]} <span className="text-zinc-300">{section.brandName.split(' ')[1] || 'Brand.'}</span>
                  </h2>
                </div>
                <Link href={section.brandSlug ? `/produk?brand=${section.brandSlug}` : '/produk'} className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 px-10 py-5 rounded-full hover:bg-black hover:text-white transition-all">
                  Lihat Koleksi <LayoutGrid size={16} />
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
                {section.products.map((p: any) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes slow-pan { 0% { transform: scale(1.1) translateX(-2%); } 100% { transform: scale(1.1) translateX(2%); } }
        .animate-slow-pan { animation: slow-pan 20s infinite alternate ease-in-out; }
      `}</style>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-black" size={40} /></div>}>
      <HomeContent />
    </Suspense>
  )
}