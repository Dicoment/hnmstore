import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  //  'tri_rahasia_123'  kode rahasia
  if (secret !== 'tri_rahasia_123') {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  try {
    // Memaksa Next.js untuk mereset cache di seluruh halaman admin dan publik
    revalidatePath('/', 'layout');
    
    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(),
      message: 'Cache cleared! Gambar harusnya seger lagi.' 
    });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}