'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, LayoutGrid, Loader2, Quote, ShieldCheck,ChevronLeft, ChevronRight , Truck, Zap, Info } from 'lucide-react'

export default function HomePage() {
  const [dataByBrand, setDataByBrand] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchHomeData() {
      try {
        setLoading(true)
        // QUERY SAKTI: Ambil produk aktif + Brand + Stok Size sekaligus [cite: 2026-02-24]
        const sql = `
          SELECT 
            p.id, p.name, p.slug, p.price_regular, p.images, b.name as "brandName",
            (SELECT json_agg(json_build_object('size', s.value))
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
        
        // Grouping data berdasarkan Brand secara dinamis [cite: 2026-02-24]
        const grouped = (result.data || []).reduce((acc: any, curr: any) => {
          const brand = curr.brandName || 'Others'
          if (!acc[brand]) acc[brand] = []
          acc[brand].push(curr)
          return acc
        }, {})

        // Transform jadi array section (Max 4 produk per brand buat homepage) [cite: 2026-02-24]
        const sectionArray = Object.keys(grouped).map(brand => ({
          brandName: brand,
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
      <section className="relative h-screen flex items-center justify-center bg-black overflow-hidden">
        <div className="absolute inset-0 z-10 bg-black/50" />
        <Image 
          src="/uploads/hero.png" 
          alt="HnM Hero" 
          fill 
          className="object-cover opacity-70 scale-105 animate-slow-pan"
          priority
          unoptimized
        />
        
        <div className="relative z-20 text-center space-y-12 px-6 max-w-6xl">
          <div className="space-y-6">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[1em] animate-fade-in">
              HNM STORE JEPARA • AUTHENTIC CURATOR
            </p>
            <h1 className="text-6xl md:text-[8rem] font-bold text-white uppercase tracking-tighter leading-[0.8] mix-blend-difference">
              DEFINING STREET <br /> <span className="text-zinc-600">CULTURE.</span>
            </h1>
            <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] max-w-xl mx-auto leading-relaxed">
              Elevate your rotation with pure authenticity. Because your style deserves better than 'almost real'.
            </p>
          </div>
          
          <Link href="/produk" className="inline-flex items-center gap-4 bg-white text-black px-12 py-5 rounded-full font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all shadow-xl">
            Browse Collection <ArrowRight size={14} />
          </Link>
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

        {/* SWIPEABLE SLIDER: STYLE NEW ARRIVAL */}
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
                  {/* Image with Shadow Drop */}
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
                    <div className="flex items-center justify-between gap-4 border-t-2 border-zinc-50 pt-2 text-black">
                      <p className="font-bold text-lg tracking-tighter">
                        RP {Number(p.price_regular).toLocaleString('id-ID')}
                      </p>
                      <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500" />
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

      {/* 3. CATEGORY HIGHLIGHTS */}
      <section className="grid grid-cols-1 md:grid-cols-2 h-[80vh] md:h-[60vh]">
        <Link href="/produk" className="relative group overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/20 transition-all duration-700" />
          <Image src="/uploads/sepatu.webp" alt="Performance" fill className="object-cover transition-all duration-1000 group-hover:scale-110" unoptimized />
          <div className="relative z-20 h-full flex flex-col justify-end p-12">
            <h3 className="text-white text-4xl font-bold uppercase tracking-tighter">Performance</h3>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Built for the court</p>
          </div>
        </Link>
        <Link href="/produk" className="relative group overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/20 transition-all duration-700" />
          <Image src="/uploads/nike.webp" alt="Lifestyle" fill className="object-cover transition-all duration-1000 group-hover:scale-110" unoptimized />
          <div className="relative z-20 h-full flex flex-col justify-end p-12 text-right items-end">
            <h3 className="text-white text-4xl font-bold uppercase tracking-tighter">Lifestyle</h3>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Master the streets</p>
          </div>
        </Link>
      </section>

{/* 4. DYNAMIC BRAND SECTIONS */}
      <div className="bg-white space-y-24 md:space-y-40 py-24 md:py-32">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-black" size={32} /></div>
        ) : (
          dataByBrand.map((section, idx) => (
            <section key={idx} className="max-w-7xl mx-auto px-4 md:px-6">
              
              {/* HEADER SECTION PER BRAND */}
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
                <Link href={`/produk?brand=${section.brandName}`} className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 px-10 py-5 rounded-full hover:bg-black hover:text-white transition-all">
                  See Collection <LayoutGrid size={16} />
                </Link>
              </div>

              {/* PRODUCTS GRID: 2 COL MOBILE / 4 COL DESKTOP */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
                {section.products.map((p: any) => (
                  <Link key={p.id} href={`/produk/${p.slug}`} className="group block relative">
                    
                    {/* Image Container with Hover Effect */}
                    <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
                      <Image 
                        src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} 
                        alt={p.name} 
                        fill 
                        className="object-cover transition-all duration-700 group-hover:scale-110"
                        unoptimized
                      />
                      
                      {/* BRAND OVERLAY */}
                      <div className="absolute top-3 left-3 md:top-4 md:left-4">
                        <span className="bg-black text-white text-[7px] md:text-[8px] font-bold uppercase px-2 py-1 rounded tracking-widest shadow-lg">
                          {p.brandName}
                        </span>
                      </div>

                      {/* QUICK SIZE OVERLAY - Muncul pas hover (Desktop) */}
                      
                    </div>

                    {/* Info Container */}
                    <div className="mt-4 md:mt-6 space-y-2 px-1">
                      <h3 className="font-bold text-xs md:text-base uppercase tracking-tight truncate group-hover:text-zinc-500 transition-colors">
                        {p.name}
                      </h3>
                      
                      <div className="flex flex-col gap-3 border-t-2 border-zinc-50 pt-2">
                        <p className="font-bold text-black text-sm md:text-lg tracking-tighter leading-none">
                          RP {Number(p.price_regular || 0).toLocaleString('id-ID')}
                        </p>
                  {/* READY SIZE INFO - Muncul selalu, tapi tampilkan stok size yang ready aja */}
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
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* 5. TRUST BANNER */}
      <section className="bg-zinc-950 py-32 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-16">
          <Quote className="text-white/10 mx-auto" size={80} />
          <h2 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-tighter leading-tight max-w-4xl mx-auto">
            "THE ONLY WAY TO PREDICT THE FUTURE IS TO CREATE IT."
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16">
            <FeatureItem title="100% Legit" desc="Double verification process" icon={<ShieldCheck className="mx-auto mb-4 text-zinc-500" size={24}/>} />
            <FeatureItem title="Fast Delivery" desc="Same day dispatch service" icon={<Truck className="mx-auto mb-4 text-zinc-500" size={24}/>} />
            <FeatureItem title="Expert Support" desc="Sneakerhead assistant 24/7" icon={<Zap className="mx-auto mb-4 text-zinc-500" size={24}/>} />
          </div>
        </div>
      </section>

      <style jsx global>{`
        .text-outline { -webkit-text-stroke: 1px #e4e4e7; color: transparent; }
        @keyframes slow-pan { 0% { transform: scale(1.1) translateX(-2%); } 100% { transform: scale(1.1) translateX(2%); } }
        .animate-slow-pan { animation: slow-pan 20s infinite alternate ease-in-out; }
        .animate-fade-in { animation: fadeIn 2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}

function FeatureItem({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {icon}
      <p className="text-white text-lg font-bold uppercase tracking-tighter">{title}</p>
      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{desc}</p>
    </div>
  )
}