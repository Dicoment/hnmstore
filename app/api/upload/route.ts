import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Mana filenya?' }, { status: 400 });
    }

    // 1. GUNAKAN PATH ABSOLUT (Sesuai Mounting EasyPanel)
    const uploadDir = '/app/public/uploads'; 
    
    // Pastikan folder tersedia
    try {
      await fs.access(uploadDir);
    } catch {
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

    // --- BAGIAN PENTING: OTOMATISASI IZIN AKSES ---
try {
      // 1. Buka gembok file akses penuh
      await execPromise(`chmod 777 ${filePath}`);
      // 2. Paksa pemilik file jadi user web server (www-data)
      await execPromise(`chown www-data:www-data ${filePath}`);
    } catch (chmodErr: any) {
      console.error("Gagal ganti izin/owner file:", chmodErr.message);
    }
    // ----------------------------------------------

    // 4. Balikin URL path untuk Frontend
    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Upload Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}