import { NextRequest, NextResponse } from 'next/server'
import { getProductDetail } from '@/lib/shop-server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    if (!slug || slug.length > 200) {
      return NextResponse.json({ data: null }, { status: 404 })
    }

    const data = await getProductDetail(slug)
    if (!data) return NextResponse.json({ data: null }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('❌ /api/shop/product:', err.message)
    return NextResponse.json({ data: null, error: 'Gagal memuat data' }, { status: 500 })
  }
}