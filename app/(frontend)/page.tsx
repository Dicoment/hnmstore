'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, LayoutGrid, Zap, ShieldCheck, Truck, Loader2 } from 'lucide-react'

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
      
      {/* 1. HERO SECTION - INDUSTRIAL POWER */}
      <section className="relative h-[90vh] flex items-center justify-center bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
        <Image 
          src="/images/hero-bg.jpg" 
          alt="HnM Hero" 
          fill 
          className="object-cover scale-105 animate-slow-zoom"
          priority
          unoptimized
        />
        
        <div className="relative z-20 text-center space-y-8 px-4 max-w-5xl">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 animate-fade-in-down">
            <Zap size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-white text-[10px] font-black uppercase tracking-[0.4em]">New Season Drops</span>
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black text-white uppercase tracking-tighter leading-[0.85] animate-fade-in-up">
            STEP UP <br /> <span className="text-zinc-500">YOUR GAME.</span>
          </h1>
          
          <p className="text-white/60 text-xs md:text-sm font-bold uppercase tracking-[0.3em] max-w-xl mx-auto leading-relaxed">
            Authentic sneakers collection for those who never compromise on style and quality.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-6">
            <Link href="/produk" className="w-full md:w-auto bg-white text-black px-12 py-5 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 group shadow-2xl text-black">
              Shop Collection <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Vertical Brand Label */}
        <div className="absolute left-10 bottom-10 z-20 hidden lg:block">
          <p className="text-white/20 text-sm font-black uppercase tracking-[1em] [writing-mode:vertical-lr] rotate-180">
            HNM STORE AUTHENTIC
          </p>
        </div>
      </section>

      {/* 2. FEATURES BAR */}
      <div className="border-b-2 border-zinc-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-zinc-100">
          <Feature item="100% Authentic" sub="Money back guarantee" icon={<ShieldCheck size={24}/>} />
          <Feature item="Fast Shipping" sub="Nationwide delivery" icon={<Truck size={24}/>} />
          <Feature item="Premium Service" sub="24/7 WhatsApp support" icon={<Zap size={24}/>} />
        </div>
      </div>

      {/* 3. NEW ARRIVALS - INDUSTRIAL GRID */}
      <section className="max-w-7xl mx-auto px-4 py-24 md:py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">
              New <span className="text-zinc-300">Arrivals</span>
            </h2>
            <div className="h-2 w-24 bg-black" />
          </div>
          <Link href="/produk" className="group flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-4 border-black pb-2 hover:text-zinc-500 transition-all">
            Explore All <LayoutGrid size={18} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={40} /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {newArrivals.map((p) => (
              <Link key={p.id} href={`/produk/${p.slug}`} className="group block">
                <div className="aspect-[4/5] relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[30px_30px_0px_0px_rgba(0,0,0,0.03)]">
                  <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover transition-all duration-700 group-hover:scale-110" unoptimized />
                  <div className="absolute top-4 left-4">
                    <span className="bg-black text-white text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest">
                      {p.brandName}
                    </span>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="font-black text-base uppercase tracking-tight truncate">{p.name}</h3>
                  <p className="font-black text-zinc-400 text-lg tracking-tighter">
                    RP {Number(p.price_regular).toLocaleString('id-ID')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style jsx global>{`
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        .animate-slow-zoom { animation: slow-zoom 20s infinite alternate ease-in-out; }
        .animate-fade-in-up { animation: fadeInUp 1s ease-out; }
        .animate-fade-in-down { animation: fadeInDown 1s ease-out; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function Feature({ item, sub, icon }: any) {
  return (
    <div className="p-10 flex flex-col items-center text-center gap-4 group">
      <div className="p-4 bg-zinc-50 rounded-2xl group-hover:bg-black group-hover:text-white transition-all duration-500">
        {icon}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1 text-black">{item}</p>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  )
}