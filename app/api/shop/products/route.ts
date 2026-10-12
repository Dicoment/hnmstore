import { NextRequest, NextResponse } from 'next/server'
import { getCatalog } from '@/lib/shop-server'

export const dynamic = 'force-dynamic'

// Rapikan nilai dari URL: dipotong 100 karakter, kosong = 'all'
const clean = (v: string | null) => (v ?? '').trim().slice(0, 100) || 'all'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const page = Math.min(1000, Math.max(1, Math.floor(Number(sp.get('page')) || 1)))

    const result = await getCatalog({
      brand: clean(sp.get('brand')),
      model: clean(sp.get('model')),
      tipe: clean(sp.get('tipe')),
      sort: clean(sp.get('sort')),
      page
    })

    return NextResponse.json({ data: result.products, total: result.total })
  } catch (err: any) {
    console.error('❌ /api/shop/products:', err.message)
    return NextResponse.json({ data: [], total: 0, error: 'Gagal memuat data' }, { status: 500 })
  }
}