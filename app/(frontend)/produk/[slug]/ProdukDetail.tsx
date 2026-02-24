'use client'

import { useEffect, useState, use, useCallback, useRef } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { 
  ChevronLeft, LayoutGrid, Loader2, 
  ShieldCheck, ShoppingBag, Info, RefreshCw, Share2,
  ChevronRight, Zap
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
  price_promo: number; // Tambahkan ini
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

        // QUERY RELATED: Tambahkan p.price_promo
        const relRes = await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ 
            sql: `SELECT p.id, p.name, p.slug, p.images, p.price_regular, p.price_promo, b.name as "brandName",
                  (SELECT json_agg(json_build_object('size', s.value))
                   FROM public."ProductSizeStock" pss 
                   JOIN public."Size" s ON s.id = pss."sizeId" 
                   WHERE pss."productId" = p.id AND pss.stock > 0) as "available_sizes"
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

  const handleOrderWA = () => {
    if (!selectedSize) return alert("Pilih ukuran dulu!")
    
    // LOGIC PESAN WA: Cek apakah ada promo atau normal
    const isPromo = product?.price_promo && Number(product.price_promo) > 0;
    const finalPrice = isPromo 
      ? Number(product!.price_regular) - Number(product!.price_promo)
      : Number(product!.price_regular);

    const formattedPrice = finalPrice.toLocaleString('id-ID')
    const cleanNumber = waConfig?.phone_number.replace(/[^0-9]/g, '') || ''
    const msg = (waConfig?.template_message || '')
      .replace(/{produk}/g, product?.name || '')
      .replace(/{harga}/g, `Rp ${formattedPrice}`)
      .replace(/{link}/g, typeof window !== 'undefined' ? window.location.href : '') + `\n\n*Pilihan Size:* ${selectedSize}`
      
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // ... (handleShare, handleScroll, scrollToIndex tetap sama)
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
    <div className="min-h-screen bg-white text-black font-sans pb-24 md:pb-12 pt-24 md:pt-32">
      
      {/* MOBILE HEADER */}
      <div className="fixed top-0 left-0 w-full z-50 px-4 py-4 flex items-center justify-between md:hidden print:hidden">
        <Link href="/produk" className="p-2 bg-black/40 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all shadow-lg">
          <ChevronLeft size={24} />
        </Link>
        <button onClick={handleShare} className="p-2 bg-black/40 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all shadow-lg">
          <Share2 size={20} />
        </button>
      </div>

      {/* DESKTOP HEADER NAV */}
      <div className="hidden md:block w-full border-b border-gray-100 bg-white sticky top-px z-40">
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

      <div className="max-w-7xl mx-auto md:px-10 py-0 md:py-10">
        <div className="flex flex-col lg:flex-row gap-0 md:gap-16 lg:gap-24">
          
          {/* GALLERY AREA */}
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-square md:rounded-2xl bg-white border-b md:border border-gray-100 shadow-sm overflow-hidden group">
              <div 
                ref={sliderRef}
                onScroll={handleScroll}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none' }}
              >
                {product.images?.map((img, i) => (
                  <div key={i} className="w-full h-full shrink-0 snap-center relative">
                    <Image src={`/uploads/${img}`} alt={product.name} fill className="object-cover" unoptimized priority />
                  </div>
                ))}
              </div>
              <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2 z-10 pointer-events-none">
                {product.images?.map((_, idx) => (
                  <div key={idx} className={`h-1.5 transition-all duration-300 rounded-full ${activeImage === idx ? 'w-8 bg-black' : 'w-2 bg-black/20'}`} />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 px-4 md:px-0">
              {product.images?.map((img, idx) => (
                <button key={idx} onClick={() => scrollToIndex(idx)} className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeImage === idx ? 'border-black scale-95' : 'border-transparent opacity-60'}`}>
                  <Image src={`/uploads/${img}`} alt="thumb" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCT INFO AREA */}
          <div className="w-full lg:w-1/2 flex flex-col p-8 md:p-0 text-black font-bold">
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md mb-6 border border-gray-100">
                <ShoppingBag size={12} className="text-gray-400" />
                <span className="text-[10px] uppercase tracking-widest text-gray-500">{product.Brand?.name} Original</span>
              </div>
              <h1 className="text-4xl md:text-5xl uppercase tracking-tighter leading-tight mb-4">{product.name}</h1>
              
              {/* UPDATE HARGA PROMO */}
              {product.price_promo && Number(product.price_promo) > 0 ? (
                <div className="flex flex-col">
                  <p className="text-3xl md:text-4xl tracking-tight text-red-600">
                    Rp {(Number(product.price_regular) - Number(product.price_promo)).toLocaleString('id-ID')}
                  </p>
                  <p className="text-lg text-gray-400 line-through">
                    Rp {Number(product.price_regular).toLocaleString('id-ID')}
                  </p>
                </div>
              ) : (
                <p className="text-3xl md:text-4xl tracking-tight">Rp {Number(product.price_regular || 0).toLocaleString('id-ID')}</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-10 mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} className="text-gray-400" />
                <h3 className="text-xs uppercase tracking-widest text-gray-400">Deskripsi Produk</h3>
              </div>
              <div className="text-[14px] md:text-sm text-gray-600 tracking-tight leading-relaxed">
                {product.description || 'Informasi produk tidak tersedia.'}
              </div>
            </div>

            {/* SIZE SELECTION */}
            <div className="mb-12">
              <p className="text-xs uppercase tracking-widest mb-6 text-zinc-400">Pilih Ukuran Tersedia</p>
              <div className="flex flex-wrap gap-3">
                {product.ProductSizeStock?.map((s, i) => (
                  <button key={i} disabled={s.stock <= 0} onClick={() => setSelectedSize(s.Size?.value || null)} className={`min-w-16 h-16 px-4 rounded-xl border font-bold text-sm uppercase transition-all flex items-center justify-center ${selectedSize === s.Size?.value ? 'bg-black border-black text-white shadow-xl -translate-y-1' : s.stock > 0 ? 'bg-white border-gray-100 hover:border-black text-black' : 'bg-gray-50 text-gray-200 cursor-not-allowed line-through opacity-40'}`}>
                    {s.Size?.value}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleOrderWA} className="hidden md:flex w-full py-6 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] items-center justify-center gap-4 hover:bg-zinc-800 transition-all shadow-xl active:scale-95 group">
              <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform" />
              Beli via WhatsApp
            </button>
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 md:mt-40 border-t border-gray-100 pt-20 px-4 md:px-0 text-black font-bold">
            <h2 className="text-3xl md:text-4xl uppercase tracking-tighter mb-12">Lengkapi Koleksi</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10">
              {relatedProducts.map((rp: any) => (
                <Link key={rp.id} href={`/produk/${rp.slug}`} className="group block relative">
                  <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
                    <Image src={rp.images?.[0] ? `/uploads/${rp.images[0]}` : '/placeholder.png'} alt={rp.name} fill className="object-cover transition-all duration-700 group-hover:scale-110" unoptimized />
                  </div>
                  <div className="mt-4 md:mt-6 space-y-2">
                    <h3 className="text-xs md:text-sm uppercase truncate">{rp.name}</h3>
                    
                    {/* HARGA RELATED */}
                    {rp.price_promo && Number(rp.price_promo) > 0 ? (
                      <div className="flex flex-col">
                        <p className="text-sm md:text-lg text-red-600">Rp {(Number(rp.price_regular) - Number(rp.price_promo)).toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-gray-400 line-through">Rp {Number(rp.price_regular).toLocaleString('id-ID')}</p>
                      </div>
                    ) : (
                      <p className="text-sm md:text-lg">Rp {Number(rp.price_regular || 0).toLocaleString('id-ID')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY BUTTON */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-100 p-5 z-50 flex items-center gap-3 md:hidden font-bold">
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