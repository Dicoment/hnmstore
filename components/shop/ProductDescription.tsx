'use client'

import { useMemo } from 'react'

// Judul bagian yang dikenali pada deskripsi lama yang tersimpan tanpa baris baru.
// Tambahkan judul lain di sini kalau perlu (huruf besar-kecilnya harus sama persis).
const KNOWN_HEADINGS = [
  'Deskripsi Produk',
  'Jenis Produk',
  'Keunggulan Produk',
  'Spesifikasi Produk',
  'Kebijakan Retur',
  'Cara Perawatan',
  'Informasi Pengiriman',
]

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

const HEAD = KNOWN_HEADINGS.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const HEAD_MID = new RegExp(`\\s+(${HEAD})(?=\\s|:|$)`, 'g')
const HEAD_THEN_DASH = new RegExp(`(${HEAD})\\s+-\\s+`, 'g')
const HEAD_LINE = new RegExp(`^(${HEAD})(?=\\s|:|$)\\s*:?\\s*(.*)$`)
// Judul huruf besar di awal teks, mis. "DESKRIPSI PRODUK TOKO SEPATU Selamat datang..."
const CAPS_TITLE = /^([A-Z][A-Z0-9 &'.,-]{7,}?)\s+(?=[A-Z][a-z])/

function parseDescription(raw: string): Block[] {
  let t = raw.replace(/\r\n/g, '\n').trim()
  if (!t) return []

  // Teks lama yang tersimpan satu baris panjang: dipecah dengan aturan sederhana
  if (!t.includes('\n')) {
    t = t.replace(CAPS_TITLE, '$1\n')
    t = t.replace(HEAD_THEN_DASH, '$1\n- ')
    t = t.replace(HEAD_MID, '\n$1')
    t = t.replace(/\s+[-•]\s+/g, '\n- ')
  }

  const blocks: Block[] = []

  const pushList = (item: string) => {
    const last = blocks[blocks.length - 1]
    if (last && last.type === 'list') last.items.push(item)
    else blocks.push({ type: 'list', items: [item] })
  }

  for (const rawLine of t.split('\n')) {
    let line = rawLine.trim()
    if (!line) continue

    // Poin daftar: diawali "-", "•", atau "*"
    const bullet = line.match(/^[-•*]\s+(.*)$/)
    if (bullet) {
      pushList(bullet[1])
      continue
    }

    // Judul yang dikenali (boleh diikuti teks di baris yang sama)
    const head = line.match(HEAD_LINE)
    if (head) {
      blocks.push({ type: 'heading', text: head[1] })
      line = head[2].trim()
      if (!line) continue
      const bullet2 = line.match(/^[-•*]\s+(.*)$/)
      if (bullet2) {
        pushList(bullet2[1])
        continue
      }
    }

    // Judul lain: seluruhnya huruf besar, atau pendek dan berakhiran titik dua
    const isCaps =
      line.length <= 60 && /[A-Z]/.test(line) && line === line.toUpperCase() && !/[.!?]$/.test(line)
    const isLabel = line.endsWith(':') && line.length <= 40
    if (isCaps || isLabel) {
      blocks.push({ type: 'heading', text: line.replace(/:$/, '') })
      continue
    }

    blocks.push({ type: 'paragraph', text: line })
  }

  return blocks
}

// "Sepatu Running: Dirancang untuk..." -> label ditebalkan
function ListItem({ text }: { text: string }) {
  const m = text.match(/^([^:]{2,40}):\s+(.+)$/)
  return (
    <li className="flex gap-3 text-sm text-zinc-600 leading-relaxed">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-black shrink-0" />
      <span>
        {m ? (
          <>
            <strong className="font-bold text-black">{m[1]}:</strong> {m[2]}
          </>
        ) : (
          text
        )}
      </span>
    </li>
  )
}

export default function ProductDescription({ text }: { text?: string | null }) {
  const blocks = useMemo(() => parseDescription(text || ''), [text])

  if (blocks.length === 0) {
    return <p className="text-sm text-gray-400 font-medium">Informasi produk tidak tersedia.</p>
  }

  return (
    <div className="space-y-3 font-medium">
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <h4
              key={i}
              className="pt-4 first:pt-0 text-[11px] uppercase tracking-widest font-bold text-black"
            >
              {b.text}
            </h4>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((item, j) => (
                <ListItem key={j} text={item} />
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="text-sm text-zinc-600 leading-relaxed">
            {b.text}
          </p>
        )
      })}
    </div>
  )
}