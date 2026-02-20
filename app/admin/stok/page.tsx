'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Boxes, Search, AlertCircle, ArrowLeft } from 'lucide-react'
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
      const sql = `
        SELECT 
          p.id, p.name, p.images,
          json_agg(json_build_object(
            'id', pss.id,
            'stock', pss.stock,
            'sizeId', pss."sizeId",
            'Size', json_build_object('value', s.value)
          ) ORDER BY s.value ASC) as "ProductSizeStock"
        FROM public."Product" p
        JOIN public."ProductSizeStock" pss ON p.id = pss."productId"
        JOIN public."Size" s ON s.id = pss."sizeId"
        GROUP BY p.id
      `
      
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql })
      })
      const result = await res.json()

      if (result.data) {
        const sortedData = result.data.sort((a: any, b: any) => {
          const aLow = a.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          const bLow = b.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          return aLow - bLow
        })
        setProducts(sortedData)
      }
    } catch (err) {
      console.error("Gagal load stok:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = (pIndex: number, sIndex: number, newVal: string) => {
    const updated = [...products]
    updated[pIndex].ProductSizeStock[sIndex].stock = parseInt(newVal) || 0
    setProducts(updated)
  }

  // --- LOGIKA SIMPAN + CATAT HISTORY VIA VPS ---
  async function saveAllStok() {
    setIsSaving(true)
    try {
      // Ambil email admin dari localStorage yang di-set pas login
      const adminEmail = localStorage.getItem('user_email') || 'Admin Toko';

      for (const p of products) {
        for (const s of p.ProductSizeStock) {
          // 1. Cek stok lama di VPS
          const checkRes = await fetch('/api/vps-db', {
            method: 'POST',
            body: JSON.stringify({ 
              sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, 
              params: [s.id] 
            })
          })
          const checkResult = await checkRes.json()
          const oldStock = checkResult.data?.[0]?.stock

          // 2. Jika ada perubahan, update stok dan catat log ke VPS
          if (oldStock !== undefined && oldStock !== s.stock) {
            // Update tabel stok utama
            await fetch('/api/vps-db', {
              method: 'POST',
              body: JSON.stringify({ 
                sql: `UPDATE public."ProductSizeStock" SET stock = $1 WHERE id = $2`, 
                params: [s.stock, s.id] 
              })
            })

            // Masukkan record baru ke tabel StockLog
            await fetch('/api/vps-db', {
              method: 'POST',
              body: JSON.stringify({
                sql: `
                  INSERT INTO public."StockLog" 
                  (product_name, size_value, old_stock, new_stock, type, notes) 
                  VALUES ($1, $2, $3, $4, $5, $6)
                `,
                params: [
                  p.name, 
                  s.Size.value, 
                  oldStock, 
                  s.stock, 
                  s.stock > oldStock ? 'MASUK' : 'KOREKSI',
                  adminEmail // Akan muncul di kolom OLEH
                ]
              })
            })
          }
        }
      }
      
      alert("Inventory & History Berhasil Diperbarui!");
      fetchStokData();
    } catch (err) {
      alert("Gagal simpan data ke server!");
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-black">
      
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href="/admin" className="text-xs font-black uppercase text-gray-400 hover:text-black mb-2 flex items-center gap-2 tracking-widest transition-all">
              <ArrowLeft size={14}/> Dashboard
            </Link>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
              <Boxes className="text-black" size={32} /> Management Stok
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Pantau & Update Ketersediaan Barang</p>
          </div>
          
          <button 
            onClick={saveAllStok}
            disabled={isSaving || loading}
            className="w-full md:w-auto bg-black text-white px-10 py-5 rounded-2xl text-xs font-black shadow-2xl hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest disabled:bg-gray-200"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
            Simpan Inventori
          </button>
        </div>

        <div className="max-w-7xl mx-auto mt-8 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            type="text" 
            placeholder="CARI NAMA SEPATU..." 
            className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-2xl outline-none font-black text-sm uppercase tracking-wider focus:ring-2 focus:ring-black/5 transition-all text-black"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-40">
            <Loader2 className="animate-spin text-black" size={48} />
            <p className="text-xs font-black uppercase tracking-widest mt-4 text-gray-400">Menghubungkan ke Database...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredProducts.map((p, pIdx) => (
              <div key={p.id} className="flex flex-col md:flex-row gap-8 bg-white border border-gray-100 p-8 rounded-3xl hover:shadow-xl transition-all group">
                
                <div className="w-full md:w-44 h-44 relative rounded-2xl overflow-hidden border border-gray-50 shrink-0 shadow-sm bg-gray-50">
                  <Image 
                    src={p.images?.[0] || '/placeholder.png'} 
                    alt={p.name} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    unoptimized
                  />
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <h2 className="font-black text-black uppercase text-2xl italic tracking-tighter leading-none">{p.name}</h2>
                    {p.ProductSizeStock.some(s => s.stock < 5) && (
                      <span className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest animate-pulse border border-red-100">
                        <AlertCircle size={14} /> Low Stock
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {p.ProductSizeStock.map((s, sIdx) => (
                      <div key={s.id} className={`p-5 rounded-2xl border-2 transition-all ${s.stock < 5 ? 'bg-red-50 border-red-200' : 'bg-gray-50/50 border-gray-100 hover:border-black'}`}>
                        <p className={`text-[11px] font-black uppercase mb-3 tracking-widest ${s.stock < 5 ? 'text-red-600' : 'text-gray-400'}`}>
                          Size {s.Size?.value}
                        </p>
                        <input 
                          type="number" 
                          value={s.stock}
                          onChange={(e) => handleUpdateStock(pIdx, sIdx, e.target.value)}
                          className={`w-full bg-transparent outline-none font-black text-2xl ${s.stock < 5 ? 'text-red-700' : 'text-black'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="text-center py-32 opacity-20">
                <Boxes size={80} className="mx-auto mb-4" />
                <p className="font-black text-sm uppercase tracking-widest">Barang Tidak Ditemukan</p>
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