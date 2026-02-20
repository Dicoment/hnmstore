import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    
    // Cek apakah folder ada, kalau belum ada balikin array kosong
    try {
      await fs.access(uploadDir);
    } catch {
      return NextResponse.json({ data: [] });
    }

    const filenames = await fs.readdir(uploadDir);
    
    // Ambil detail file (size, dll)
    const files = await Promise.all(
      filenames.map(async (name) => {
        const stats = await fs.stat(path.join(uploadDir, name));
        return {
          id: name, // Pake nama file sebagai ID
          name: name,
          size: stats.size,
          url: `/uploads/${name}`,
          createdAt: stats.birthtime
        };
      })
    );

    // Urutkan berdasarkan yang terbaru
    files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ data: files });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// API untuk hapus file
export async function DELETE(req: Request) {
  try {
    const { filenames } = await req.json();
    const uploadDir = path.join(process.cwd(), 'public/uploads');

    for (const name of filenames) {
      const filePath = path.join(uploadDir, name);
      await fs.unlink(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}