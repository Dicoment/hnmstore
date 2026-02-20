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
  productImages: string[] // Sesuai alias SQL di bawah
  brandName: string
  createdAt: string
}

export default function NewArrivalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNewArrivals() {
      try {
        setLoading(true)
        // QUERY FIX: Pastikan memanggil kolom images dengan benar
        const sql = `
          SELECT 
            p.id, p.name, p.slug, p.price_regular, p.images as "productImages", 
            p."createdAt", b.name as "brandName"
          FROM public."Product" p
          LEFT JOIN public."Brand" b ON p."brandId" = b.id
          WHERE p.draft = false
          ORDER BY p."createdAt" DESC
          LIMIT 12
        `
        const res = await fetch('/api/vps-db', { 
          method: 'POST', 
          body: JSON.stringify({ sql }) 
        })
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <Loader2 className="animate-spin text-black" size={40} strokeWidth={3} />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400 mt-4">Scanning Fresh Inventory...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans text-black pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b-8 border-black pb-12 mb-20">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-yellow-400 px-3 py-1 rounded-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               <Zap size={14} className="fill-black" />
               <span className="text-[10px] font-black uppercase tracking-widest text-black">Fresh Drops</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
              New <span className="text-zinc-300">Arrivals.</span>
            </h1>
          </div>
          <p className="max-w-md text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed text-right">
            Latest arrivals from the world's most iconic brands. <br /> Updated daily, curated for excellence.
          </p>
        </div>

        {/* PRODUCTS GRID */}
        {products.length === 0 ? (
          <div className="py-40 text-center border-4 border-dashed border-zinc-100 rounded-xl">
             <p className="text-zinc-300 font-black text-2xl uppercase tracking-[0.5em]">No Fresh Drops Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {products.map((p) => (
              <Link key={p.id} href={`/produk/${p.slug}`} className="group block relative">
                
                {/* Image Container */}
                <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]">
                  <Image 
                    // FIX: Path wajib pake /uploads/ dan ambil index ke-0
                    src={p.productImages && p.productImages[0] ? `/uploads/${p.productImages[0]}` : '/placeholder.png'} 
                    alt={p.name} 
                    fill 
                    className="object-cover transition-all duration-700 group-hover:scale-110"
                    unoptimized
                  />
                  
                  <div className="absolute top-4 left-4">
                    <span className="bg-black text-white text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest shadow-lg">
                      {p.brandName || 'Brand'}
                    </span>
                  </div>

                  <div className="absolute bottom-4 right-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-black group-hover:bg-black group-hover:text-white transition-colors duration-500">
                      <Zap size={16} className="group-hover:fill-white" />
                    </div>
                  </div>
                </div>

                {/* Info Container */}
                <div className="mt-6 space-y-2 px-2">
                  <h3 className="font-black text-base uppercase tracking-tight truncate group-hover:text-zinc-500 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-between gap-4 border-t-2 border-zinc-50 pt-2">
                    <p className="font-black text-black text-lg tracking-tighter leading-none">
                      RP {Number(p.price_regular || 0).toLocaleString('id-ID')}
                    </p>
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* BOTTOM DECORATION */}
        <div className="mt-32 pt-12 border-t-2 border-zinc-100 flex justify-center">
            <Link href="/produk" className="group flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] bg-zinc-50 px-10 py-5 rounded-xl border-2 border-zinc-100 hover:border-black hover:bg-white transition-all">
                Explore Full Catalog <LayoutGrid size={16} />
            </Link>
        </div>

      </div>
    </div>
  )
}