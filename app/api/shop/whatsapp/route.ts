import { NextResponse } from 'next/server'
import { getWhatsAppConfig } from '@/lib/shop-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getWhatsAppConfig()
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('❌ /api/shop/whatsapp:', err.message)
    return NextResponse.json({ data: null, error: 'Gagal memuat data' }, { status: 500 })
  }
}