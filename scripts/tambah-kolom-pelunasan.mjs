// Jalankan SEKALI dari folder root proyek (lihat cara di bawah).
// Aman diulang: pakai IF NOT EXISTS, tidak mengubah data yang sudah ada.
//
//   node --env-file=.env scripts/tambah-kolom-pelunasan.mjs
//   (kalau DATABASE_URL ada di .env.local: --env-file=.env.local)

import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL tidak ditemukan. Jalankan dengan: node --env-file=.env scripts/tambah-kolom-pelunasan.mjs')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url, ssl: false })

try {
  await client.connect()

  await client.query(`ALTER TABLE public."Transactions" ADD COLUMN IF NOT EXISTS paid_by uuid`)
  await client.query(`ALTER TABLE public."Transactions" ADD COLUMN IF NOT EXISTS paid_at timestamptz`)

  const { rows } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Transactions'
      AND column_name IN ('paid_by', 'paid_at')
    ORDER BY column_name
  `)

  console.table(rows)
  if (rows.length === 2) {
    console.log('BERHASIL: kolom paid_by dan paid_at sudah ada.')
  } else {
    console.error('GAGAL: kolom belum lengkap, cek koneksi database.')
    process.exitCode = 1
  }
} catch (err) {
  console.error('Error:', err.message)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
