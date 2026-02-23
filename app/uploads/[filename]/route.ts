import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  // Ini mengambil file dari "Rumah Baru" di luar folder public
  const filePath = path.join('/app/data-uploads', filename);
  
  try {
    const fileBuffer = await fs.readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: { 
        'Content-Type': 'image/png', // atau jpeg, browser biasanya pinter deteksi
        'Cache-Control': 'no-store, max-age=0' 
      },
    });
  } catch (err) {
    return new NextResponse("File Tidak Ditemukan", { status: 404 });
  }
}