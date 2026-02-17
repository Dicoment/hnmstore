//app/admin/brand/[brandId]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BrandPage() {
  const params = useParams()
  const brandId = params.brandId
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    fetchBrandProducts()
  }, [brandId])

  async function fetchBrandProducts() {
    const { data } = await supabase
      .from('Product')
      .select(`
        id, title,
        ProductSizeStock(stock, Size(value))
      `)
      .eq('brand_id', brandId)

    if (data) setProducts(data)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Produk Brand</h1>

      {products.map(p => (
        <div key={p.id} className="border rounded p-4 mb-4">
          <h2 className="font-semibold mb-2">{p.title}</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border px-2 py-1">Size</th>
                <th className="border px-2 py-1">Stok</th>
              </tr>
            </thead>
            <tbody>
              {p.ProductSizeStock.map((ps: any, idx: number) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">{ps.Size.value}</td>
                  <td className="border px-2 py-1">{ps.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}