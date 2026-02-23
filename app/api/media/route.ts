import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // 1. PINDAH KE ALAMAT BARU (Sesuai Mounting EasyPanel) [cite: 2026-02-02]
    const uploadDir = '/app/data-uploads'; 
    
    try {
      await fs.access(uploadDir);
    } catch {
      return NextResponse.json({ data: [] });
    }

    const filenames = await fs.readdir(uploadDir);
    
    const files = await Promise.all(
      filenames.map(async (name) => {
        const stats = await fs.stat(path.join(uploadDir, name));
        return {
          id: name,
          name: name,
          size: stats.size,
          // URL Tetap /uploads/ karena sudah kita buatkan "Pintu" di route sebelah [cite: 2026-02-16]
          url: `/uploads/${name}`,
          createdAt: stats.birthtime
        };
      })
    );

    files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ data: files });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { filenames } = await req.json();
    // 2. PASTIIN DELETE JUGA NYARI KE ALAMAT BARU [cite: 2026-02-02]
    const uploadDir = '/app/data-uploads';

    for (const name of filenames) {
      const filePath = path.join(uploadDir, name);
      await fs.unlink(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}