import { NextResponse } from 'next/server'
import { getHomeProducts } from '@/lib/shop-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getHomeProducts()
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('❌ /api/shop/home:', err.message)
    return NextResponse.json({ data: [], error: 'Gagal memuat data' }, { status: 500 })
  }
}