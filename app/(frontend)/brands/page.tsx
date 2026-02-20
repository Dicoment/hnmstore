'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, ArrowRight, LayoutGrid } from 'lucide-react'

interface Brand {
  id: string
  name: string
  images: string // Biasanya logo brand disimpan di sini
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBrands() {
      try {
        setLoading(true)
        // Ambil semua brand dari VPS
        const sql = `SELECT * FROM public."Brand" ORDER BY name ASC`
        const res = await fetch('/api/vps-db', { 
          method: 'POST', 
          body: JSON.stringify({ sql }) 
        })
        const result = await res.json()
        setBrands(result.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchBrands()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} strokeWidth={3} />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400 mt-4">Syncing Brands...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans text-black pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b-8 border-black pb-12 mb-20">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-zinc-100 px-3 py-1 rounded-full">
               <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Official Partners</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
              The <span className="text-zinc-300">Brands.</span>
            </h1>
          </div>
          <p className="max-w-md text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed text-right">
            Curated selection of the world's most iconic footwear manufacturers. 100% Authentic or money back.
          </p>
        </div>

        {/* BRANDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {brands.map((brand) => (
            <Link 
              key={brand.id} 
              href={`/produk?brand=${brand.id}`} 
              className="group relative flex flex-col bg-zinc-50 border-2 border-zinc-100 rounded-xl overflow-hidden transition-all hover:border-black hover:shadow-[30px_30px_0px_0px_rgba(0,0,0,0.03)]"
            >
              {/* BRAND LOGO/COVER AREA */}
              <div className="aspect-[16/9] relative overflow-hidden flex items-center justify-center p-12 bg-white border-b-2 border-zinc-50">
                {brand.images ? (
                  <Image 
                    src={brand.images} 
                    alt={brand.name} 
                    fill 
                    className="object-contain p-10 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                    unoptimized
                  />
                ) : (
                  <span className="text-4xl font-black text-zinc-200 uppercase tracking-tighter">{brand.name}</span>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
              </div>

              {/* BRAND INFO */}
              <div className="p-8 flex justify-between items-center bg-zinc-50 group-hover:bg-white transition-colors">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{brand.name}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Koleksi Terverifikasi</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform duration-500 shadow-xl">
                  <ArrowRight size={20} strokeWidth={3} />
                </div>
              </div>

              {/* Decorative Corner */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-zinc-100 flex items-center justify-center border-b-2 border-l-2 border-zinc-200 group-hover:bg-black group-hover:border-black transition-colors">
                 <LayoutGrid size={12} className="text-zinc-300 group-hover:text-white" />
              </div>
            </Link>
          ))}
        </div>

        {/* EMPTY STATE */}
        {brands.length === 0 && (
          <div className="py-40 text-center border-4 border-dashed border-zinc-100 rounded-xl">
             <p className="text-zinc-300 font-black text-2xl uppercase tracking-[0.5em]">Inventory Sync Pending</p>
          </div>
        )}

      </div>
    </div>
  )
}