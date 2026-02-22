import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  
  // Hapus cookie session
  cookieStore.delete('session-token')
  
  return NextResponse.json({ success: true })
}