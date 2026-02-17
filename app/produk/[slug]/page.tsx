'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, LayoutGrid, Loader2 } from 'lucide-react'
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

export default function ProductDetailPage({ params }: { params: any }) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)

  const WHATSAPP_NUMBER = "6281234567890"

  useEffect(() => {
    async function getInitialData() {
      const { slug } = await params;
      
      const { data: mainProduct, error } = await supabase
        .from('Product')
        .select(`*, Brand!brand_id(name), Model!model_id(name), ProductSizeStock!productId(stock, Size!sizeId(value))`)
        .eq('slug', slug)
        .single()

      if (error || !mainProduct) {
        setLoading(false)
        return
      }

      setProduct(mainProduct as unknown as ProductDetail)

      const { data: related } = await supabase
        .from('Product')
        .select(`*, Brand!brand_id(name)`)
        .eq('brand_id', mainProduct.brand_id)
        .neq('id', mainProduct.id)
        .limit(4)

      if (related) setRelatedProducts(related as unknown as ProductDetail[])
      
      setLoading(false)
    }
    getInitialData()
  }, [params])

  const handleOrderWA = () => {
    if (!selectedSize) {
      alert("Tolong pilih Size dulu ya!")
      return
    }
    const message = `Halo HnM Store, saya mau pesan sepatu ini:\n\n*Produk:* ${product?.name}\n*Ukuran:* ${selectedSize}\n*Harga:* Rp ${product?.price_regular?.toLocaleString('id-ID')}\n\nApakah stoknya masih tersedia?`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={40} /></div>
  if (!product) return notFound()

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 px-4">
      <nav className="max-w-7xl mx-auto py-6 flex items-center justify-between border-b border-gray-50 mb-10">
        <Link href="/produk" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all group">
          <LayoutGrid size={16} className="group-hover:scale-110 transition-transform" /> Kembali ke Shop
        </Link>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400">
           {product.Brand?.name} <span className="text-gray-200">/</span> <span className="text-black">{product.name}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto pb-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 mb-32">
          
          <div className="lg:w-[55%] space-y-6">
            <div className="relative aspect-square rounded-[40px] overflow-hidden bg-gray-50 group shadow-2xl shadow-black/5 border border-gray-100">
              <Image 
                src={product.images?.[activeImage] || '/placeholder.png'} 
                alt={product.name} fill className="object-cover transition-all duration-700 hover:scale-105" 
                priority unoptimized
              />
              {product.images?.length > 1 && (
                <>
                  <button onClick={() => setActiveImage(activeImage === 0 ? product.images.length - 1 : activeImage - 1)} className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white z-10">
                    <ChevronLeft size={24} />
                  </button>
                  <button onClick={() => setActiveImage(activeImage === product.images.length - 1 ? 0 : activeImage + 1)} className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white z-10">
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {product.images?.map((img, idx) => (
                <div key={idx} onClick={() => setActiveImage(idx)} className={`relative w-24 h-24 rounded-[20px] overflow-hidden cursor-pointer border-4 transition-all ${activeImage === idx ? 'border-black' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                  <Image src={img} alt="thumb" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-[45%] flex flex-col justify-center">
            <p className="text-gray-500 font-black text-[12px] uppercase tracking-[4px] mb-4">{product.Brand?.name} ORIGINAL</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-6">{product.name}</h1>
            
            <p className="text-4xl font-black text-gray-900 mb-10 tracking-tighter">Rp {product.price_regular?.toLocaleString('id-ID')}</p>

            <div className="mb-10 space-y-4">
              <h3 className="font-black uppercase text-[12px] tracking-[2px] text-gray-400">Deskripsi Produk</h3>
              <div className="text-[17px] text-gray-500 leading-relaxed font-medium whitespace-pre-wrap">
                {product.description}
              </div>
            </div>

            <div className="mb-12">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-5">Pilih Ukuran (Ready Size)</p>
              <div className="flex flex-wrap gap-4">
                {product.ProductSizeStock?.map((s, i) => (
                  <button
                    key={i}
                    disabled={s.stock <= 0}
                    onClick={() => setSelectedSize(s.Size?.value || null)}
                    className={`w-16 h-16 rounded-[22px] border-2 font-black text-lg transition-all
                      ${selectedSize === s.Size?.value ? 'bg-black border-black text-white shadow-2xl -translate-y-2' : 'bg-white border-gray-100 text-gray-900 hover:border-black'}`}
                  >
                    {s.Size?.value}
                  </button>
                ))}
              </div>
            </div>
<div className="pt-8 border-t border-gray-100 space-y-4">
              <div className="flex gap-16 text-[13px] font-bold">
                <span className="w-20 text-gray-400 uppercase tracking-widest">Category</span>
                <span className="text-gray-600 font-black uppercase">{product.Model?.name || 'N/A'}</span>
              </div>
              <div className="flex gap-16 text-[13px] font-bold">
                <span className="w-20 text-gray-400 uppercase tracking-widest">Brand</span>
                <span className="text-gray-900 font-black uppercase">{product.Brand?.name || 'N/A'}</span>
              </div>
            <button 
              onClick={handleOrderWA} 
              className="w-full py-6 bg-black text-white rounded-[28px] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all shadow-2xl shadow-black/20 active:scale-95 mb-10"
            >
              <img 
                src="https://img.icons8.com/material-outlined/24/ffffff/whatsapp--v1.png" 
                alt="whatsapp icon"
                width={28} 
                height={28}
                className="object-contain"
              />
              HUBUNGI ADMIN (WA)
            </button>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="border-t border-gray-100 pt-20">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-gray-500 font-black text-[10px] uppercase tracking-[3px] mb-2">You might also like</p>
                <h2 className="text-2xl lg:text-4xl font-black tracking-tighter uppercase">Koleksi {product.Brand?.name} Lainnya</h2>
              </div>
              <Link href="/produk" className="text-[11px] font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-orange-500 hover:border-orange-500 transition-all">
                Lihat Semua
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((rp) => (
                <Link key={rp.id} href={`/produk/${rp.slug}`} className="group">
                  <div className="aspect-square relative rounded-2xl overflow-hidden bg-gray-50 mb-6 border border-gray-100 shadow-sm transition-all group-hover:shadow-xl group-hover:-translate-y-2">
                    <Image src={rp.images?.[0] || '/placeholder.png'} alt={rp.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{rp.Brand?.name}</p>
                  <h3 className="font-black text-lg uppercase italic tracking-tighter leading-tight group-hover:text-orange-500 transition-colors">{rp.name}</h3>
                  <p className="font-bold text-gray-900 mt-2 text-sm">Rp {rp.price_regular?.toLocaleString('id-ID')}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}