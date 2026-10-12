'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Save, Search, AlertCircle } from 'lucide-react'
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

// Helper: jalankan SQL dan lempar error kalau database menolak
const runSql = async (sql: string, params: any[] = []) => {
  const res = await fetch('/api/vps-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
  })
  const result = await res.json()
  if (!res.ok || result.error) throw new Error(result.error || 'Query gagal')
  return result.data as any[]
}

export default function StokHnMStore() {
  const [products, setProducts] = useState<ProductStock[]>([])
  // Stok awal saat halaman dimuat, untuk tahu baris mana yang benar-benar diubah
  const [originalStock, setOriginalStock] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchStokData = useCallback(async () => {
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
      const rows = await runSql(sql)

      if (rows) {
        const sortedData = rows.sort((a: any, b: any) => {
          const aLow = a.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          const bLow = b.ProductSizeStock.some((s: any) => s.stock < 5) ? 0 : 1
          return aLow - bLow
        })
        setProducts(sortedData)

        const originals: Record<string, number> = {}
        sortedData.forEach((p: ProductStock) =>
          p.ProductSizeStock.forEach((s) => { originals[s.id] = s.stock })
        )
        setOriginalStock(originals)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStokData() }, [fetchStokData])

  const handleUpdateStock = (pIndex: number, sIndex: number, newVal: string) => {
    const updated = [...products]
    updated[pIndex].ProductSizeStock[sIndex].stock = Math.max(0, parseInt(newVal) || 0)
    setProducts(updated)
  }

  async function saveAllStok() {
    setIsSaving(true)
    try {
      // Identitas admin dari token login (server), bukan localStorage
      const meRes = await fetch('/api/me')
      const me = await meRes.json()
      const adminId: string | null = me?.id ?? null
      if (!meRes.ok || !adminId) {
        alert('Sesi login tidak valid, silakan login ulang.')
        return
      }

      let changedCount = 0

      for (const p of products) {
        for (const s of p.ProductSizeStock) {
          // Lewati baris yang tidak diubah
          if (originalStock[s.id] === s.stock) continue

          const rows = await runSql(
            `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`,
            [s.id]
          )
          const oldStock = rows?.[0]?.stock
          if (oldStock === undefined || oldStock === s.stock) continue

          await runSql(
            `UPDATE public."ProductSizeStock" SET stock = $1 WHERE id = $2`,
            [s.stock, s.id]
          )
          await runSql(
            `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              p.name,
              s.Size.value,
              oldStock,
              s.stock,
              s.stock > oldStock ? 'MASUK' : 'KOREKSI',
              'Penyesuaian stok manual',
              adminId
            ]
          )
          changedCount++
        }
      }

      if (changedCount === 0) {
        alert('Tidak ada perubahan stok.')
      } else {
        alert(`Inventori & History berhasil diperbarui (${changedCount} perubahan)!`)
      }
      fetchStokData()
    } catch (err: any) {
      console.error(err)
      alert('Gagal simpan: ' + (err?.message || ''))
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-black text-xs font-bold uppercase tracking-widest"><Loader2 className="animate-spin mr-3" /> Syncing Database...</div>

  return (
    <div className="min-h-screen bg-white text-black font-sans w-full overflow-x-hidden">
      {/* HEADER NAV - RESPONSIVE PADDING */}
      <div className="border-b border-gray-100 px-4 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 bg-white/90 backdrop-blur-md w-full gap-4">

        <button
          onClick={saveAllStok}
          disabled={isSaving}
          className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-gray-200"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Simpan Inventori
        </button>
      </div>

      <div className="w-full px-4 lg:px-10 py-6 lg:py-8 space-y-6 lg:space-y-8">
        {/* SEARCH BAR - CLEAN UI */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="CARI NAMA SEPATU..."
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-xs font-bold uppercase tracking-wider focus:ring-1 focus:ring-black transition-all text-black"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* LIST AREA - RESPONSIVE CARDS */}
        <div className="space-y-4 lg:space-y-6 pb-20">
          {filteredProducts.map((p) => {
            const pIdx = products.findIndex(x => x.id === p.id)
            return (
              <div key={p.id} className="flex flex-col md:flex-row gap-4 lg:gap-8 bg-white border border-gray-100 p-4 lg:p-8 rounded-2xl hover:border-black transition-all group shadow-sm">
                {/* IMAGE WRAPPER */}
                <div className="w-full md:w-32 lg:w-40 aspect-square relative rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                  <Image src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} alt={p.name} fill className="object-cover group-hover:scale-102 transition-transform duration-500" unoptimized />
                </div>

                {/* CONTENT WRAPPER */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h2 className="font-bold text-black uppercase text-base lg:text-xl tracking-tight leading-none truncate max-w-full">{p.name}</h2>
                    {p.ProductSizeStock.some(s => s.stock < 5) && (
                      <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-red-100 animate-pulse shrink-0">
                        <AlertCircle size={12} /> Low Stock
                      </div>
                    )}
                  </div>

                  {/* SIZE GRID - RESPONSIVE COLUMNS */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {p.ProductSizeStock.map((s, sIdx) => (
                      <div key={s.id} className={`p-3 rounded-xl border transition-all ${s.stock < 5 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100 hover:border-black'}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 tracking-widest ${s.stock < 5 ? 'text-red-600' : 'text-gray-400'}`}>SZ {s.Size?.value}</p>
                        <input
                          type="number"
                          value={s.stock}
                          onChange={(e) => handleUpdateStock(pIdx, sIdx, e.target.value)}
                          className={`w-full bg-transparent outline-none font-bold text-lg ${s.stock < 5 ? 'text-red-700' : 'text-black'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          {filteredProducts.length === 0 && (
            <div className="text-center py-32 border border-dashed border-gray-200 rounded-3xl text-gray-300 font-bold uppercase text-[10px] tracking-widest">Barang tidak ditemukan</div>
          )}
        </div>
      </div>

      <style jsx global>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  )
}