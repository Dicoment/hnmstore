'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, ArrowRight } from 'lucide-react'

interface Brand {
  id: string
  name: string
  images: string 
}

export function BrandsList() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBrands() {
      try {
        setLoading(true)
        const res = await fetch('/api/shop/brands')
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black pt-32 pb-24 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b-8 border-black pb-12 mb-20">
          <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
            The <span className="text-zinc-300">Brands.</span>
          </h1>
          <p className="max-w-md text-zinc-400 text-[11px] font-bold uppercase tracking-[0.2em] text-right">
            Curated selection of iconic footwear. 100% Authentic verified drops.
          </p>
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/produk?brand=${brand.id}`} className="group relative bg-zinc-50 border-2 border-zinc-100 rounded-xl overflow-hidden hover:border-black transition-all">
              <div className="aspect-video relative bg-white border-b-2 border-zinc-50 overflow-hidden">
                {brand.images ? (
                  <Image 
                    src={`/uploads/${brand.images}`} 
                    alt={brand.name} 
                    fill 
                    className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                    unoptimized 
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-200 font-bold uppercase text-2xl">{brand.name}</div>
                )}
              </div>
              <div className="p-8 flex justify-between items-center bg-zinc-50 group-hover:bg-white transition-colors">
                <h2 className="text-2xl font-bold uppercase tracking-tighter">{brand.name}</h2>
                <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-all shadow-lg">
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