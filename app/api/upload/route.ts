import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Mana filenya?' }, { status: 400 });
    }

    // 1. GUNAKAN PATH ABSOLUT (Sesuai Mounting EasyPanel)
    // Jangan pakai process.cwd() karena Docker sering bingung baca volume
    const uploadDir = '/app/public/uploads'; 
    
    // Pastikan folder tersedia
    try {
      await fs.access(uploadDir);
    } catch {
      // Jika folder belum ada (jarang terjadi kalau mounting benar), kita buatkan
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // 2. Buat Nama File Unik
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    // 3. Proses Simpan File
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // 4. Balikin URL path untuk Frontend
    // Next.js bakal baca ini dari folder public secara otomatis
    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Upload Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}