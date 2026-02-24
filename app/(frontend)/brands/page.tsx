'use client'

import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, ArrowRight, LayoutGrid } from 'lucide-react'

// Pisahin interface biar rapi
interface Brand {
  id: string
  name: string
  images: string 
}

// INI KOMPONEN REAL-NYA [cite: 2026-02-24]
function BrandsList() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBrands() {
      try {
        setLoading(true)
        const sql = `SELECT * FROM public."Brand" ORDER BY name ASC`
        const res = await fetch('/api/vps-db', { 
          method: 'POST', 
          body: JSON.stringify({ sql }) 
        })
        const result = await res.json()
        setBrands(result.data || [])
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchBrands()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black">
      <Loader2 className="animate-spin" size={40} strokeWidth={3} />
      <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-400 mt-4">Syncing Brands...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans text-black pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b-8 border-black pb-12 mb-20">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-zinc-100 px-3 py-1 rounded-full font-bold">
               <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
               <span className="text-[9px] uppercase tracking-widest text-zinc-500">Official Partners</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
              The <span className="text-zinc-300">Brands.</span>
            </h1>
          </div>
          <p className="max-w-md text-zinc-400 text-[11px] font-bold uppercase tracking-[0.2em] leading-relaxed text-right">
            Curated selection of iconic footwear. 100% Authentic verified drops.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/produk?brand=${brand.id}`} className="group relative flex flex-col bg-zinc-50 border-2 border-zinc-100 rounded-xl overflow-hidden transition-all hover:border-black">
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-white border-b-2 border-zinc-50">
                {brand.images ? (
                  <Image src={`/uploads/${brand.images}`} alt={brand.name} fill className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" unoptimized />
                ) : (
                  <span className="text-4xl font-bold text-zinc-200 uppercase">{brand.name}</span>
                )}
              </div>
              <div className="p-8 flex justify-between items-center bg-zinc-50 group-hover:bg-white transition-colors font-bold">
                <h2 className="text-2xl uppercase tracking-tighter">{brand.name}</h2>
                <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform shadow-xl">
                  <ArrowRight size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// EXPORT DEFAULT WAJIB BERSIH CUMA SUSPENSE [cite: 2026-02-24]
export default function BrandsPage() {
  return (
    <Suspense fallback={null}>
      <BrandsList />
    </Suspense>
  )
}