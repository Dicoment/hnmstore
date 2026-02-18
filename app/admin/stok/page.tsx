'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Save, Boxes, Search, AlertCircle, RefreshCcw, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface StockItem {
  id: string
  stock: number
  sizeId: string
  Size: { value: string }
}

interface ProductStock {
  id: string
  name: string
  images: string[]
  ProductSizeStock: StockItem[]
}

export default function StokHnMStore() {
  const [products, setProducts] = useState<ProductStock[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchStokData()
  }, [])

  async function fetchStokData() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('Product').select(`
        id, name, images,
        ProductSizeStock!productId(
          id, stock, sizeId,
          Size!sizeId(value)
        )
      `)
      
      if (error) throw error

      if (data) {
        const fixedData = data.map((p: any) => ({
          ...p,
          images: p.images?.map((img: string) => 
            img.includes('http') ? img : supabase.storage.from('ProductImage').getPublicUrl(`public/${img}`).data.publicUrl
          )
        }))

        const sortedData = fixedData.sort((a: any, b: any) => {
          const aLow = a.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          const bLow = b.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          return aLow - bLow
        })

        setProducts(sortedData)
      }
    } catch (err: any) {
      console.error("Error load data:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = (pIndex: number, sIndex: number, newVal: string) => {
    const updated = [...products]
    updated[pIndex].ProductSizeStock[sIndex].stock = parseInt(newVal) || 0
    setProducts(updated)
  }

// Ganti fungsi saveAllStok kamu dengan ini
async function saveAllStok() {
  setIsSaving(true)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    for (const p of products) {
      for (const s of p.ProductSizeStock) {
        // 1. Ambil data stok lama dulu untuk perbandingan
        const { data: oldData } = await supabase
          .from('ProductSizeStock')
          .select('stock')
          .eq('id', s.id)
          .single()

        if (oldData && oldData.stock !== s.stock) {
          // 2. Update Stok Utama
          await supabase.from('ProductSizeStock').update({ stock: s.stock }).eq('id', s.id)

          // 3. Catat ke Log (History)
          await supabase.from('StockLog').insert({
            stock_id: s.id,
            product_name: p.name,
            size_value: s.Size.value,
            old_stock: oldData.stock,
            new_stock: s.stock,
            type: s.stock > oldData.stock ? 'MASUK' : 'KOREKSI',
            notes: 'Update manual via Manajemen Stok',
            created_by: user?.id
          })
        }
      }
    }
    
    alert("Stok HnM Store & History Berhasil Dicatat!")
    fetchStokData() 
  } catch (err: any) {
    alert("Gagal simpan: " + err.message)
  } finally {
    setIsSaving(false)
  }
}

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-black">
      
      {/* HEADER SECTION - Konsisten dengan Dashboard Utama */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href="/admin" className="text-[10px] font-black uppercase text-gray-400 hover:text-black mb-2 flex items-center gap-1 tracking-widest transition-all">
              <ArrowLeft size={12}/> Kembali ke Dashboard
            </Link>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
              <Boxes className="text-black" size={32} /> Inventori Stok
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Management Gudang HnM Store</p>
          </div>
          
          <button 
            onClick={saveAllStok}
            disabled={isSaving || loading}
            className="w-full md:w-auto bg-black text-white px-10 py-5 rounded-[22px] text-[10px] font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:bg-gray-200"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
            Simpan Perubahan
          </button>
        </div>

        <div className="max-w-7xl mx-auto mt-8 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="CARI NAMA SEPATU..." 
            className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-[25px] outline-none font-bold text-xs uppercase tracking-wider focus:ring-2 focus:ring-black transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LIST SECTION - Gaya Card Selaras */}
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-40">
            <Loader2 className="animate-spin text-black" size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest mt-4 text-gray-400">Menghubungkan ke Gudang...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredProducts.map((p, pIdx) => (
              <div key={p.id} className="flex flex-col md:flex-row gap-8 bg-white border border-gray-100 p-8 rounded-xl hover:shadow-2xl transition-all group">
                
                {/* Visual Produk */}
                <div className="w-full md:w-40 h-40 relative rounded-xl overflow-hidden border border-gray-50 shrink-0 shadow-sm bg-gray-50">
                  <Image 
                    src={p.images?.[0] || '/placeholder.png'} 
                    alt={p.name} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    unoptimized
                  />
                </div>

                {/* Kontrol Stok */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="font-black text-black uppercase text-xl tracking-tighter leading-none">{p.name}</h2>
                    {p.ProductSizeStock.some(s => s.stock < 5) && (
                      <span className="flex items-center gap-1 bg-red-50 text-red-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter animate-pulse">
                        <AlertCircle size={12} /> Perlu Stok Ulang
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {p.ProductSizeStock?.sort((a, b) => Number(a.Size?.value) - Number(b.Size?.value)).map((s, sIdx) => (
                      <div key={s.id} className={`p-4 rounded-xl border transition-all ${s.stock < 5 ? 'bg-red-50 border-red-100 shadow-inner' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'}`}>
                        <p className={`text-[10px] font-bold uppercase mb-2 tracking-widest ${s.stock < 5 ? 'text-red-500' : 'text-gray-400'}`}>
                          Size {s.Size?.value}
                        </p>
                        <input 
                          type="number" 
                          value={s.stock}
                          onChange={(e) => handleUpdateStock(pIdx, sIdx, e.target.value)}
                          className={`w-full bg-transparent outline-none font-black text-xl  ${s.stock < 5 ? 'text-red-600' : 'text-black'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="text-center py-20 opacity-30">
                <Boxes size={64} className="mx-auto mb-4" />
                <p className="font-black text-xs uppercase tracking-widest">Produk Tidak Ditemukan</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  )
}