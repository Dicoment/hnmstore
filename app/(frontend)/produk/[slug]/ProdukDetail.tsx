'use client'

import { useEffect, useState, use } from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, LayoutGrid, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
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
  is_active: boolean;
}

export default function ProductDetailClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [waConfig, setWaConfig] = useState<WAConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    async function getInitialData() {
      try {
        setLoading(true)
        const [res, waRes] = await Promise.all([
          fetch('/api/vps-db', {
            method: 'POST',
            body: JSON.stringify({ 
              // PERBAIKAN: Nama tabel menggunakan tanda petik dua (Case Sensitive untuk VPS)
              sql: `
                SELECT p.*, b.name as "brandName", m.name as "modelName",
                (SELECT json_agg(json_build_object('stock', pss.stock, 'Size', json_build_object('value', s.value)) ORDER BY s.value ASC)
                 FROM public."ProductSizeStock" pss 
                 JOIN public."Size" s ON s.id = pss."sizeId" 
                 WHERE pss."productId" = p.id) as "ProductSizeStock"
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
            body: JSON.stringify({ 
              sql: 'SELECT phone_number, template_message, is_active FROM public."WhatsAppConfig" LIMIT 1' 
            })
          }).then(r => r.json())
        ])

        if (!res.data || res.data.length === 0) {
          setProduct(null)
        } else {
          const rawProduct = res.data[0]
          setProduct({
            ...rawProduct,
            Brand: { name: rawProduct.brandName || "N/A" },
            Model: { name: rawProduct.modelName || "N/A" },
            ProductSizeStock: rawProduct.ProductSizeStock || []
          })

          // PERBAIKAN: Query Produk Terkait juga disesuaikan tabelnya
          const relRes = await fetch('/api/vps-db', {
            method: 'POST',
            body: JSON.stringify({ 
              sql: `SELECT p.id, p.name, p.slug, p.images, p.price_regular, b.name as "brandName" 
                    FROM public."Product" p 
                    LEFT JOIN public."Brand" b ON p."brandId" = b.id 
                    WHERE p."brandId" = $1 AND p.id != $2 AND p.draft = false LIMIT 4`,
              params: [rawProduct.brandId, rawProduct.id]
            })
          }).then(r => r.json())
          if (relRes.data) setRelatedProducts(relRes.data)
        }
        if (waRes.data?.[0]) setWaConfig(waRes.data[0])
      } catch (err) { 
        console.error("Gagal ambil data produk:", err) 
      } finally { 
        setLoading(false) 
      }
    }
    getInitialData()
  }, [slug])

  const handleOrderWA = () => {
    if (!selectedSize) return alert("Pilih ukuran dulu!")
    const formattedPrice = Number(product?.price_regular || 0).toLocaleString('id-ID')
    const cleanNumber = waConfig?.phone_number.replace(/[^0-9]/g, '') || ''
    const msg = waConfig?.template_message
      .replace(/{produk}/g, product?.name || '')
      .replace(/{harga}/g, `Rp ${formattedPrice}`)
      .replace(/{link}/g, window.location.href) + `\n\n*Pilihan Size:* ${selectedSize}`
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest mt-4">Memuat Produk...</p>
    </div>
  )
  
  if (!product) return notFound()

  return (
    <div className="min-h-screen bg-white font-sans text-black px-4 md:px-10">
      <nav className="max-w-7xl mx-auto py-8 flex items-center justify-between border-b-2 border-zinc-50 mb-12">
        <Link href="/produk" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-all">
          <LayoutGrid size={18} /> Katalog
        </Link>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-zinc-300">
           <span>{product.Brand?.name}</span> <span className="text-zinc-200">/</span> <span className="text-black">{product.name}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 mb-32">
          {/* Gallery */}
          <div className="lg:w-[55%] space-y-6">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 group shadow-sm">
              <Image 
                src={product.images && product.images[activeImage] ? `/uploads/${product.images[activeImage]}` : '/placeholder.png'} 
                alt={product.name} 
                fill 
                className="object-cover transition-all duration-700 group-hover:scale-105" 
                priority 
                unoptimized 
              />
              {product.images?.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setActiveImage(activeImage === 0 ? product.images.length - 1 : activeImage - 1)} className="bg-white p-4 rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><ChevronLeft size={24} strokeWidth={3} /></button>
                  <button onClick={() => setActiveImage(activeImage === product.images.length - 1 ? 0 : activeImage + 1)} className="bg-white p-4 rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><ChevronRight size={24} strokeWidth={3} /></button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {product.images?.map((img, idx) => (
                <button key={idx} onClick={() => setActiveImage(idx)} className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-black' : 'border-zinc-100 opacity-50'}`}>
                  <Image src={`/uploads/${img}`} alt="thumb" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="lg:w-[45%] text-black">
            <span className="bg-black text-white text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-lg mb-6 inline-block">{product.Brand?.name} AUTHENTIC</span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-6">{product.name}</h1>
            <p className="text-3xl font-black mb-10 tracking-tighter text-black">RP {Number(product.price_regular || 0).toLocaleString('id-ID')}</p>
            
            <div className="space-y-4 mb-10 border-l-8 border-black pl-8 py-2">
               <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} />
                  <h3 className="font-black uppercase text-[10px] tracking-[0.3em] text-zinc-400">Deskripsi</h3>
               </div>
              <div className="text-sm text-zinc-600 font-bold leading-relaxed whitespace-pre-wrap italic uppercase tracking-tight">{product.description}</div>
            </div>

            <div className="mb-12">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6">Pilih Ukuran</p>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {product.ProductSizeStock?.map((s, i) => (
                  <button 
                    key={i} 
                    disabled={s.stock <= 0} 
                    onClick={() => setSelectedSize(s.Size?.value || null)} 
                    className={`aspect-square rounded-2xl border-2 font-black text-xs transition-all uppercase flex items-center justify-center ${selectedSize === s.Size?.value ? 'bg-black border-black text-white shadow-2xl scale-110' : s.stock > 0 ? 'bg-white border-zinc-100 hover:border-black' : 'bg-zinc-50 text-zinc-200 cursor-not-allowed line-through'}`}
                  >
                    {s.Size?.value}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleOrderWA} className="w-full py-6 bg-black text-white rounded-xl font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all shadow-2xl active:scale-95 group">
              <img src="https://img.icons8.com/material-outlined/24/ffffff/whatsapp--v1.png" alt="wa" width={22} height={22} className="group-hover:rotate-12 transition-transform" />
              Checkout via WhatsApp
            </button>
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="pb-32 border-t-4 border-black pt-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-zinc-100 px-3 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">More From {product.Brand?.name}</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Produk Serupa</h2>
              </div>
              <Link href="/produk" className="group flex items-center gap-3 text-[11px] font-black uppercase tracking-widest border-b-4 border-black pb-2 hover:text-zinc-500 transition-all">
                Lihat Semua <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {relatedProducts.map((rp: any) => (
                <Link key={rp.id} href={`/produk/${rp.slug}`} className="group block relative text-black">
                  <div className="aspect-4/5 relative rounded-2xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]">
                    <Image 
                      src={rp.images && rp.images[0] ? `/uploads/${rp.images[0]}` : '/placeholder.png'} 
                      alt={rp.name} 
                      fill 
                      className="object-cover transition-all duration-700 group-hover:scale-110" 
                      unoptimized 
                    />
                  </div>

                  <div className="mt-6 space-y-2">
                    <h3 className="font-black text-sm md:text-base uppercase tracking-tight truncate group-hover:text-zinc-500 transition-colors">
                      {rp.name}
                    </h3>
                    <p className="font-black text-black text-base md:text-lg tracking-tighter leading-none italic">
                      RP {Number(rp.price_regular || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}