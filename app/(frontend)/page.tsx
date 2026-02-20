'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, LayoutGrid, Loader2, Quote, ShieldCheck, Truck, Zap } from 'lucide-react'

export default function HomePage() {
  const [newArrivals, setNewArrivals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHomeData() {
      try {
        setLoading(true)
        const sql = `
          SELECT p.id, p.name, p.slug, p.price_regular, p.images, b.name as "brandName"
          FROM public."Product" p
          LEFT JOIN public."Brand" b ON p."brandId" = b.id
          WHERE p.draft = false
          ORDER BY p."createdAt" DESC
          LIMIT 4
        `
        const res = await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql }) })
        const result = await res.json()
        setNewArrivals(result.data || [])
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
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[1em] animate-fade-in">
              HNM STORE JEPARA • AUTHENTIC CURATOR
            </p>
            <h1 className="text-6xl md:text-[8rem] font-black text-white uppercase tracking-tighter leading-[0.8] mix-blend-difference">
              DEFINING STREET <br /> <span className="text-zinc-600">CULTURE.</span>
            </h1>
            <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] max-w-xl mx-auto leading-relaxed">
              Elevate your rotation with pure authenticity. Because your style deserves better than 'almost real'.
            </p>
          </div>
          
          <Link href="/produk" className="inline-flex items-center gap-4 bg-white text-black px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all">
            Browse Collection <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* 2. THE STATEMENT */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
                NOT JUST <br /> <span className="text-zinc-200 text-outline">A PAIR.</span> <br /> IT'S AN IDENTITY.
              </h2>
            </div>
            <div className="flex-1 space-y-8">
               <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest leading-relaxed">
                 We don't just sell shoes. We curate the history of street culture. Every drop is verified, every box is a legacy.
               </p>
               <div className="h-1 w-20 bg-black mx-auto md:mx-0" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORY HIGHLIGHTS */}
      <section className="grid grid-cols-1 md:grid-cols-2 h-[80vh] md:h-[60vh]">
        <Link href="/produk" className="relative group overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/20 transition-all duration-700" />
          <Image src="/uploads/sepatu.webp" alt="Performance" fill className="object-cover transition-all duration-1000 group-hover:scale-110" unoptimized />
          <div className="relative z-20 h-full flex flex-col justify-end p-12">
            <h3 className="text-white text-4xl font-black uppercase tracking-tighter">Performance</h3>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Built for the court</p>
          </div>
        </Link>
        <Link href="/produk" className="relative group overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/20 transition-all duration-700" />
          <Image src="/uploads/nike.webp" alt="Lifestyle" fill className="object-cover transition-all duration-1000 group-hover:scale-110" unoptimized />
          <div className="relative z-20 h-full flex flex-col justify-end p-12 text-right items-end">
            <h3 className="text-white text-4xl font-black uppercase tracking-tighter">Lifestyle</h3>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Master the streets</p>
          </div>
        </Link>
      </section>

      {/* 4. NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-6 py-32 md:py-40">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Live Inventory</p>
             </div>
            <h2 className="text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Fresh <span className="text-zinc-200 text-outline">Drops.</span>
            </h2>
          </div>
          <Link href="/produk" className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest bg-zinc-100 px-10 py-5 rounded-full hover:bg-black hover:text-white transition-all">
            Full Catalog <LayoutGrid size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-200" size={32} /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {newArrivals.map((p) => (
              <Link key={p.id} href={`/produk/${p.slug}`} className="group block">
                <div className="aspect-3/4 relative overflow-hidden bg-zinc-50 rounded-2xl border border-zinc-100">
                  <Image 
                    src={p.images?.[0]?.startsWith('http') ? p.images[0] : `/uploads/${p.images[0]}`} 
                    alt={p.name} 
                    fill 
                    className="object-cover transition-all duration-1000 group-hover:scale-110" 
                    unoptimized 
                  />
                  <div className="absolute top-6 left-6">
                    <span className="bg-black text-white text-[8px] font-black uppercase px-3 py-1 tracking-widest">
                      {p.brandName}
                    </span>
                  </div>
                </div>
                <div className="mt-8 space-y-2">
                  <h3 className="font-black text-[13px] uppercase tracking-wider text-zinc-800 line-clamp-1">{p.name}</h3>
                  <p className="font-black text-black text-xl tracking-tighter">
                    RP {Number(p.price_regular).toLocaleString('id-ID')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 5. TRUST BANNER */}
      <section className="bg-zinc-950 py-32 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-16">
          <Quote className="text-white/10 mx-auto" size={80} />
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight max-w-4xl mx-auto">
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
      <p className="text-white text-lg font-black uppercase tracking-tighter">{title}</p>
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{desc}</p>
    </div>
  )
}