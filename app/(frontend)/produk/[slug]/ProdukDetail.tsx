'use client'

import { useEffect, useState, use, useCallback, useRef } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { 
  ChevronLeft, LayoutGrid, Loader2, 
  ShieldCheck, ShoppingBag, Info, RefreshCw, Share2,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

// --- INTERFACES ---
interface SizeStock {
  stock: number;
  Size: { value: string; } | null;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price_regular: number;
  brand_id: string;
  slug: string;
  images: string[];
  Brand: { name: string } | null;
  Model: { name: string } | null;
  ProductSizeStock: SizeStock[];
}

interface WAConfig {
  phone_number: string;
  template_message: string;
}

export default function ProductDetailClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [waConfig, setWaConfig] = useState<WAConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)

  const getInitialData = useCallback(async () => {
    try {
      setLoading(true)
      const [res, waRes] = await Promise.all([
        fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ 
            sql: `
              SELECT p.*, b.name as "brandName", m.name as "modelName",
              (SELECT json_agg(json_build_object('stock', pss.stock, 'Size', json_build_object('value', s.value)) ORDER BY s.value ASC)
               FROM public."ProductSizeStock" pss 
               JOIN public."Size" s ON s.id = pss."sizeId" 
               WHERE pss."productId" = p.id) as "v_stocks"
              FROM public."Product" p
              LEFT JOIN public."Brand" b ON p."brandId" = b.id
              LEFT JOIN public."Model" m ON p."modelId" = m.id
              WHERE p.slug = $1 LIMIT 1
            `, 
            params: [slug] 
          })
        }).then(r => r.json()),
        fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ sql: 'SELECT phone_number, template_message FROM public."WhatsAppConfig" LIMIT 1' })
        }).then(r => r.json())
      ])

      if (res.data?.[0]) {
        const raw = res.data[0]
        setProduct({
          ...raw,
          Brand: { name: raw.brandName || "N/A" },
          Model: { name: raw.modelName || "N/A" },
          ProductSizeStock: raw.v_stocks || []
        })

        const relRes = await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ 
            sql: `SELECT p.id, p.name, p.slug, p.images, p.price_regular, b.name as "brandName" 
                  FROM public."Product" p LEFT JOIN public."Brand" b ON p."brandId" = b.id 
                  WHERE p."brandId" = $1 AND p.id != $2 AND p.draft = false LIMIT 4`,
            params: [raw.brandId, raw.id]
          })
        }).then(r => r.json())
        if (relRes.data) setRelatedProducts(relRes.data)
      }
      if (waRes.data?.[0]) setWaConfig(waRes.data[0])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { getInitialData() }, [getInitialData])

  // --- JURUS SHARE IPHONE/SAFARI [cite: 2026-02-24] ---
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Cek sepatu ${product?.name} ini di HnM Store!`,
          url: window.location.href,
        })
      } catch (err) { console.log('Share dibatalkan') }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link disalin ke clipboard!')
    }
  }

  // --- LOGIC WA ASLI LU ---
  const handleOrderWA = () => {
    if (!selectedSize) return alert("Pilih ukuran dulu!")
    const formattedPrice = Number(product?.price_regular || 0).toLocaleString('id-ID')
    const cleanNumber = waConfig?.phone_number.replace(/[^0-9]/g, '') || ''
    const msg = (waConfig?.template_message || '')
      .replace(/{produk}/g, product?.name || '')
      .replace(/{harga}/g, `Rp ${formattedPrice}`)
      .replace(/{link}/g, typeof window !== 'undefined' ? window.location.href : '') + `\n\n*Pilihan Size:* ${selectedSize}`
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // --- NATIVE SCROLL HANDLER ---
  const handleScroll = () => {
    if (sliderRef.current) {
      const index = Math.round(sliderRef.current.scrollLeft / sliderRef.current.offsetWidth)
      setActiveImage(index)
    }
  }

  const scrollToIndex = (idx: number) => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: idx * sliderRef.current.offsetWidth, behavior: 'smooth' })
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-black" size={40} /></div>
  if (!product) return notFound()

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-24 md:pb-12">
      
      {/* MOBILE HEADER - SHARE FUNCTION CONNECTED [cite: 2026-02-24] */}
      <div className="fixed top-0 left-0 w-full z-50 px-4 py-4 flex items-center justify-between md:hidden print:hidden">
        <Link href="/produk" className="p-2 bg-black/40 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all shadow-lg">
          <ChevronLeft size={24} />
        </Link>
        <button onClick={handleShare} className="p-2 bg-black/40 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all shadow-lg">
          <Share2 size={20} />
        </button>
      </div>

      {/* DESKTOP HEADER NAV */}
      <div className="hidden md:block w-full border-b border-gray-100 bg-white sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-10 py-6 flex items-center justify-between text-black">
          <Link href="/produk" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-all">
            <LayoutGrid size={16} /> Katalog
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black">
             <span className="text-gray-300">{product.Brand?.name}</span>
             <span className="text-gray-100">/</span>
             <span className="font-bold">{product.name}</span>
          </div>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto md:px-10 py-0 md:py-20">
        <div className="flex flex-col lg:flex-row gap-0 md:gap-16 lg:gap-24">
          
          {/* GALLERY AREA: NATIVE SWIPEABLE SLIDER */}
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-square md:rounded-2xl bg-white border-b md:border border-gray-100 shadow-sm overflow-hidden">
              <div 
                ref={sliderRef}
                onScroll={handleScroll}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
                style={{ scrollbarWidth: 'none' }}
              >
                {product.images?.map((img, i) => (
                  <div key={i} className="w-full h-full shrink-0 snap-center relative">
                    <Image 
                      src={`/uploads/${img}`} 
                      alt={product.name} fill className="object-cover" 
                      unoptimized priority
                    />
                  </div>
                ))}
              </div>

              {/* SLIDER NAVIGATION (DESKTOP) */}
              {product.images?.length > 1 && (
                <>
                  <button onClick={() => scrollToIndex(activeImage - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-md rounded-full text-black shadow-lg hidden md:flex active:scale-90 transition-all">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => scrollToIndex(activeImage + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-md rounded-full text-black shadow-lg hidden md:flex active:scale-90 transition-all">
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* SLIDER INDICATOR DOTS */}
              <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2 z-10 pointer-events-none">
                {product.images?.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 transition-all duration-300 rounded-full ${activeImage === idx ? 'w-8 bg-black' : 'w-2 bg-black/20'}`}
                  />
                ))}
              </div>
              
              <div className="absolute top-6 right-6 bg-black/60 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md">
                {activeImage + 1} / {product.images?.length}
              </div>
            </div>

            {/* Thumbnails Grid */}
            <div className="flex flex-wrap gap-3 mt-6 px-4 md:px-0">
              {product.images?.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => scrollToIndex(idx)} 
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeImage === idx ? 'border-black scale-95' : 'border-gray-100 opacity-60'}`}
                >
                  <Image src={`/uploads/${img}`} alt="thumb" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCT INFO AREA */}
          <div className="w-full lg:w-1/2 flex flex-col p-8 md:p-0 text-black">
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md mb-6 border border-gray-100 text-black font-bold">
                <ShoppingBag size={12} className="text-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{product.Brand?.name} Original</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter leading-tight mb-4 text-black">{product.name}</h1>
              <p className="text-3xl md:text-4xl font-bold tracking-tight text-black">Rp {Number(product.price_regular || 0).toLocaleString('id-ID')}</p>
            </div>

            <div className="border-t border-gray-100 pt-10 mb-10 text-black font-bold">
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} className="text-gray-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Deskripsi Produk</h3>
              </div>
              <div className="text-[14px] md:text-sm text-gray-600 tracking-tight leading-relaxed">
                {product.description || 'Informasi produk tidak tersedia.'}
              </div>
            </div>

            <div className="mb-12 text-black font-bold">
              <p className="text-xs font-bold uppercase tracking-widest mb-6 text-black">Pilih Ukuran Tersedia</p>
              <div className="flex flex-wrap gap-3">
                {product.ProductSizeStock?.map((s, i) => (
                  <button 
                    key={i} 
                    disabled={s.stock <= 0} 
                    onClick={() => setSelectedSize(s.Size?.value || null)} 
                    className={`min-w-16 h-16 px-4 rounded-xl border font-bold text-sm uppercase transition-all flex items-center justify-center ${selectedSize === s.Size?.value ? 'bg-black border-black text-white shadow-xl -translate-y-1' : s.stock > 0 ? 'bg-white border-gray-100 hover:border-black text-black' : 'bg-gray-50 text-gray-200 cursor-not-allowed line-through opacity-40'}`}
                  >
                    {s.Size?.value}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleOrderWA} className="hidden md:flex w-full py-6 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] items-center justify-center gap-4 hover:bg-zinc-800 transition-all shadow-xl active:scale-95 group">
              <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform" />
              Beli via WhatsApp
            </button>
            
            <div className="mt-10 flex items-center gap-8 justify-center md:justify-start text-black font-bold">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">100% Authentic</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Garansi Retur</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 md:mt-40 border-t border-gray-100 pt-20 px-4 md:px-0 text-black font-bold">
            <div className="flex items-end justify-between mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter text-black leading-none">Lengkapi Koleksi</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Produk {product.Brand?.name} Terkait</p>
              </div>
              <Link href="/produk" className="text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-1 hover:text-gray-400 transition-colors text-black">
                Lihat Semua
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10">
              {relatedProducts.map((rp: any) => (
                <Link key={rp.id} href={`/produk/${rp.slug}`} className="group block text-black">
                  <div className="aspect-square relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-5 shadow-sm">
                    <Image 
                      src={rp.images?.[0] ? `/uploads/${rp.images[0]}` : '/placeholder.png'} 
                      alt={rp.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" 
                      unoptimized 
                    />
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-tight truncate mb-1.5 text-black">{rp.name}</h3>
                  <p className="font-bold text-gray-400 text-[11px]">Rp {Number(rp.price_regular || 0).toLocaleString('id-ID')}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY BUTTON */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-100 p-5 z-50 flex items-center gap-3 md:hidden text-black font-bold">
        <button onClick={handleOrderWA} className="flex-1 bg-black text-white py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 shadow-2xl">
          <ShoppingBag size={20} /> Order Whatsapp
        </button>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}