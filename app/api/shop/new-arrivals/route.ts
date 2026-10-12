import { NextResponse } from 'next/server'
import { getNewArrivals } from '@/lib/shop-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getNewArrivals()
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('❌ /api/shop/new-arrivals:', err.message)
    return NextResponse.json({ data: [], error: 'Gagal memuat data' }, { status: 500 })
  }
}