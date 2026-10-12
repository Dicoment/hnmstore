import { NextRequest, NextResponse } from 'next/server'
import { getFilterOptions } from '@/lib/shop-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const tipe = (req.nextUrl.searchParams.get('tipe') ?? '').trim().slice(0, 100) || 'all'
    const data = await getFilterOptions(tipe)
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('❌ /api/shop/filters:', err.message)
    return NextResponse.json({ data: { brands: [], models: [] }, error: 'Gagal memuat data' }, { status: 500 })
  }
}