'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Save, Package, Boxes, Search, AlertCircle } from 'lucide-react'
import Image from 'next/image'

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
      const { data } = await supabase.from('Product').select(`
        id, name, images,
        ProductSizeStock!productId(
          id, stock, sizeId,
          Size!sizeId(value)
        )
      `)
      
      if (data) {
        // FIX GAMBAR: Tambahkan prefix 'public/' jika URL tidak lengkap
        const fixedData = data.map((p: any) => ({
          ...p,
          images: p.images?.map((img: string) => 
            img.includes('http') ? img : supabase.storage.from('ProductImage').getPublicUrl(`public/${img}`).data.publicUrl
          )
        }))

        // FITUR: Urutkan berdasarkan stok menipis (stock < 5)
        const sortedData = fixedData.sort((a: any, b: any) => {
          const aLow = a.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          const bLow = b.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          return aLow - bLow
        })

        setProducts(sortedData)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = (pIndex: number, sIndex: number, newVal: string) => {
    const updated = [...products]
    updated[pIndex].ProductSizeStock[sIndex].stock = parseInt(newVal) || 0
    setProducts(updated)
  }

  async function saveAllStok() {
    setIsSaving(true)
    try {
      const updatePromises = products.flatMap(p => 
        p.ProductSizeStock.map(s => 
          supabase.from('ProductSizeStock').update({ stock: s.stock }).eq('id', s.id)
        )
      )
      await Promise.all(updatePromises)
      alert("Stok HnM Store Berhasil Diupdate!")
    } catch {
      alert("Gagal simpan stok")
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)] font-sans">
      <div className="flex flex-col flex-1 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden transition-all duration-500">
        
        {/* Header Section */}
        <div className="p-6 md:p-10 border-b border-gray-50 flex flex-col gap-6 bg-white/80 backdrop-blur-md z-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-gray-900 uppercase flex items-center gap-3">
                <Boxes className="text-blue-600" size={28} /> Inventori Stok
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Update Stok Cepat Berdasarkan Gambar Produk
              </p>
            </div>
            
            <button 
              onClick={saveAllStok}
              disabled={isSaving}
              className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-[22px] text-xs font-black shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
              SIMPAN SEMUA DATA
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="Cari sepatu (Contoh: Jordan, Adidas...)" 
              className="w-full pl-16 pr-6 py-4 md:py-5 bg-gray-50 border-none rounded-3xl outline-none font-bold text-sm focus:ring-4 focus:ring-black/5 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-white">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <Loader2 className="animate-spin text-black" size={48} />
            </div>
          ) : (
            <div className="space-y-8 max-w-6xl">
              {filteredProducts.map((p, pIdx) => (
                <div key={p.id} className="group flex flex-col md:flex-row gap-6 bg-gray-50/50 border border-gray-100 p-6 rounded-[35px] transition-all hover:bg-white hover:shadow-2xl">
                  
                  {/* FOTO PRODUK (FIXED PATH) */}
                  <div className="w-full md:w-32 h-32 relative rounded-3xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
                    <Image 
                      src={p.images?.[0] || '/placeholder.png'} 
                      alt={p.name} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      unoptimized
                    />
                  </div>

                  {/* INFO & INPUT STOK */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <h2 className="font-black text-gray-900 uppercase text-lg tracking-tighter italic">{p.name}</h2>
                      {p.ProductSizeStock.some(s => s.stock < 5) && (
                        <span className="flex items-center gap-1 bg-red-50 text-red-500 px-2 py-1 rounded-lg text-[10px] font-black uppercase animate-pulse">
                          <AlertCircle size={10} /> Stok Menipis
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                      {p.ProductSizeStock?.map((s, sIdx) => (
                        <div key={s.id} className={`p-3 rounded-2xl border transition-all ${s.stock < 5 ? 'bg-red-50/50 border-red-100 shadow-inner' : 'bg-white border-gray-100'}`}>
                          <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${s.stock < 5 ? 'text-red-400' : 'text-gray-400'}`}>
                            Size {s.Size?.value}
                          </p>
                          <input 
                            type="number" 
                            value={s.stock}
                            onChange={(e) => handleUpdateStock(pIdx, sIdx, e.target.value)}
                            className={`w-full bg-transparent outline-none font-black text-xl ${s.stock < 5 ? 'text-red-600' : 'text-gray-800'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}