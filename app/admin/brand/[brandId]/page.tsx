'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, Hash } from 'lucide-react'

export default function BrandPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (brandId) fetchBrandProducts()
  }, [brandId])

  async function fetchBrandProducts() {
    try {
      setLoading(true)
      // Query SQL dengan JOIN untuk mengambil Produk, Stok, dan Nilai Size-nya
      const sql = `
        SELECT 
          p.id, 
          p.name, 
          p.price,
          json_agg(
            json_build_object(
              'size', s.value,
              'stock', pss.stock
            ) ORDER BY s.value ASC
          ) as stocks
        FROM public."Product" p
        LEFT JOIN public."ProductSizeStock" pss ON p.id = pss."productId"
        LEFT JOIN public."Size" s ON pss."sizeId" = s.id
        WHERE p."brandId" = $1
        GROUP BY p.id
      `

      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql, params: [brandId] })
      })
      const result = await res.json()
      
      if (result.data) setProducts(result.data)
    } catch (err) {
      console.error("Gagal load detail brand:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 font-sans text-black">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
            <Package size={24} /> Koleksi Produk Brand
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory VPS Monitoring</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 italic font-black text-gray-200 uppercase animate-pulse">Memuat Produk...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 font-black uppercase text-xs">
          Belum ada produk untuk brand ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-white border-2 border-gray-50 rounded-2xl p-6 shadow-sm hover:border-black transition-all group">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-black text-lg uppercase leading-tight group-hover:italic">{p.name || 'Tanpa Nama'}</h2>
                <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded">ID: {p.id.slice(0,5)}</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <Hash size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Rincian Stok Per Size</span>
                </div>
                
                <div className="overflow-hidden rounded-xl border border-gray-50">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 tracking-widest">
                      <tr>
                        <th className="px-4 py-2">Size</th>
                        <th className="px-4 py-2">Tersedia</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {p.stocks && p.stocks[0].size !== null ? (
                        p.stocks.map((st: any, idx: number) => (
                          <tr key={idx} className="text-xs font-bold uppercase">
                            <td className="px-4 py-3 text-black">{st.size}</td>
                            <td className="px-4 py-3 text-gray-500">{st.stock} pcs</td>
                            <td className="px-4 py-3">
                              {st.stock > 0 ? (
                                <span className="text-[8px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Ready</span>
                              ) : (
                                <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Sold Out</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-[10px] italic text-gray-300">Stok belum diatur</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}