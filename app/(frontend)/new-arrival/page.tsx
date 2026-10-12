'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Zap, ArrowRight, LayoutGrid } from 'lucide-react'

interface Product {
  id: string
  name: string
  slug: string
  price_regular: number
  productImages: string[]
  brandName: string
  createdAt: string
  available_sizes: { size: string }[] 
}

export default function NewArrivalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNewArrivals() {
      try {
        setLoading(true)
        const res = await fetch('/api/shop/new-arrivals')
        const result = await res.json()
        setProducts(result.data || [])
      } catch (err) {
        console.error("Gagal load data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchNewArrivals()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans text-black">
      <Loader2 className="animate-spin" size={40} strokeWidth={3} />
      <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-400 mt-4">Scanning Fresh Inventory...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans text-black pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b-8 border-black pb-12 mb-20 text-black">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-yellow-400 px-3 py-1 rounded-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-black">
               <Zap size={14} className="fill-black" />
               <span className="text-[10px] uppercase tracking-widest">Fresh Drops</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
              New <span className="text-zinc-300">Arrivals.</span>
            </h1>
          </div>
          <p className="max-w-md text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed text-right">
            Latest arrivals from the world's most iconic brands. <br /> Updated daily, curated for excellence.
          </p>
        </div>

        {/* PRODUCTS GRID */}
        {products.length === 0 ? (
          <div className="py-40 text-center border-4 border-dashed border-zinc-100 rounded-xl">
             <p className="text-zinc-300 font-bold text-2xl uppercase tracking-[0.5em]">No Fresh Drops Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
            {products.map((p) => (
              <Link key={p.id} href={`/produk/${p.slug}`} className="group block relative">
                
                {/* Image Container */}
                <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
                  <Image 
                    src={p.productImages && p.productImages[0] ? `/uploads/${p.productImages[0]}` : '/placeholder.png'} 
                    alt={p.name} 
                    fill 
                    className="object-cover transition-all duration-700 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute top-3 left-3 md:top-4 md:left-4">
                    <span className="bg-black text-white text-[7px] md:text-[8px] font-bold uppercase px-2 py-1 rounded tracking-widest shadow-lg">
                      {p.brandName || 'Brand'}
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4 md:hidden">
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white">
                      <Zap size={14} className="fill-white" />
                    </div>
                  </div>
                </div>

                {/* Info Container - FIX SIZE READY ALWAYS VISIBLE */}
                <div className="mt-4 md:mt-6 space-y-3 px-1 text-black">
                  <div>
                    <h3 className="font-bold text-xs md:text-base uppercase tracking-tight truncate group-hover:text-zinc-500 transition-colors">
                      {p.name}
                    </h3>
                    <p className="font-bold text-sm md:text-lg tracking-tighter mt-1">
                      RP {Number(p.price_regular || 0).toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* SIZE READY AREA: Gak perlu hover */}
                  <div className="space-y-2 pt-2 border-t-2 border-zinc-50 font-bold">
                    <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-zinc-400">Size Ready</p>
                    <div className="flex flex-wrap gap-1 md:gap-1.5">
                      {p.available_sizes ? p.available_sizes.map((s, sIdx) => (
                        <span key={sIdx} className="text-[8px] md:text-[9px] bg-white border border-zinc-200 text-zinc-800 px-1.5 py-1 rounded min-w-7 text-center hover:border-black transition-colors uppercase">
                          {s.size}
                        </span>
                      )) : (
                        <span className="text-[8px] font-bold text-red-400 italic uppercase">Sold Out</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* BOTTOM DECORATION */}
        <div className="mt-32 pt-12 border-t-2 border-zinc-100 flex justify-center">
            <Link href="/produk" className="group flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.4em] bg-zinc-50 px-10 py-5 rounded-xl border-2 border-zinc-100 hover:border-black hover:bg-white transition-all text-black">
                Explore Full Catalog <LayoutGrid size={16} />
            </Link>
        </div>

      </div>
    </div>
  )
}