import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import path from 'path'
import fs from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Folder upload (mounting EasyPanel), di luar folder public
const UPLOAD_DIR = '/app/data-uploads'

const ALLOWED_EXT = ['webp', 'jpg', 'jpeg', 'png', 'gif', 'avif']
const EXT_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

// "New Balance 530 — Putih!" -> "new-balance-530-putih"
function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

// Hanya admin yang sudah login yang boleh upload
async function isLoggedIn() {
  const secret = process.env.JWT_SECRET
  const token = (await cookies()).get('session-token')?.value
  if (!secret || !token) return false
  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isLoggedIn())) {
      return NextResponse.json({ error: 'Silakan login dulu' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Mana filenya?' }, { status: 400 })
    }

    // Ekstensi hanya dari daftar aman (tidak diambil mentah dari nama file user)
    const originalExt = file.name.split('.').pop()?.toLowerCase() ?? ''
    const ext = EXT_BY_TYPE[file.type] ?? (ALLOWED_EXT.includes(originalExt) ? originalExt : '')
    if (!ext) {
      return NextResponse.json(
        { error: 'Format gambar tidak didukung (pakai webp, jpg, png, gif, atau avif)' },
        { status: 400 }
      )
    }

    // Nama file: dari field "name" (nama produk), cadangan nama file asli, terakhir "gambar"
    const rawName = String(formData.get('name') || '').trim()
    const fallback = file.name.replace(/\.[^.]+$/, '')
    const base = slugify(rawName) || slugify(fallback) || 'gambar'

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())

    // new-balance-530.webp, lalu new-balance-530-2.webp, -3, dst.
    // flag 'wx' = gagal kalau file sudah ada, jadi tidak pernah menimpa gambar lain.
    let fileName = ''
    for (let i = 1; i <= 100; i++) {
      const candidate = `${base}${i === 1 ? '' : `-${i}`}.${ext}`
      try {
        await fs.writeFile(path.join(UPLOAD_DIR, candidate), buffer, { flag: 'wx' })
        fileName = candidate
        break
      } catch (e: any) {
        if (e.code !== 'EEXIST') throw e
      }
    }
    if (!fileName) {
      return NextResponse.json({ error: 'Terlalu banyak gambar dengan nama yang sama' }, { status: 409 })
    }

    // Izin akses: baca untuk semua, tulis hanya pemilik (bukan 777). Tanpa shell, jadi aman dari injeksi perintah.
    const filePath = path.join(UPLOAD_DIR, fileName)
    try {
      await fs.chmod(filePath, 0o644)
      await execFileAsync('chown', ['www-data:www-data', filePath])
    } catch (permErr: any) {
      console.error('Gagal ganti izin/owner file:', permErr.message)
    }

    return NextResponse.json({ url: `/uploads/${fileName}`, fileName })
  } catch (err: any) {
    console.error('Upload Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}