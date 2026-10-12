// Menambah kolom "type" (sepatu / baju) di tabel Product.
// Aman dijalankan berulang kali. Semua produk lama otomatis bertipe "sepatu".
//
//   node --env-file=.env.local scripts/add-product-type.cjs             -> tambah kolom + tampilkan produk yang tampak seperti baju
//   node --env-file=.env.local scripts/add-product-type.cjs --backfill  -> sekaligus tandai produk berukuran S/M/L/XL/XXL sebagai "baju"
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL tidak ditemukan. Jalankan dengan: node --env-file=.env.local scripts/add-product-type.cjs')
  process.exit(1)
}

const BACKFILL = process.argv.includes('--backfill')
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

let target = '(tidak diketahui)'
try { target = new URL(process.env.DATABASE_URL).host } catch {}
console.log('Database tujuan:', target)

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false, connectionTimeoutMillis: 8000 })

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'sepatu'`)

    // Produk bertipe sepatu yang punya ukuran baju: kemungkinan salah tipe
    const { rows: candidates } = await client.query(
      `SELECT p.id, p.name FROM public."Product" p
       WHERE p.type = 'sepatu' AND EXISTS (
         SELECT 1 FROM public."ProductSizeStock" pss
         JOIN public."Size" s ON s.id = pss."sizeId"
         WHERE pss."productId" = p.id AND upper(s.value) = ANY($1::text[])
       )
       ORDER BY p.name`,
      [CLOTHING_SIZES]
    )

    if (BACKFILL && candidates.length) {
      await client.query(`UPDATE public."Product" SET type = 'baju' WHERE id = ANY($1::uuid[])`, [candidates.map((c) => c.id)])
    }
    await client.query('COMMIT')

    const { rows: summary } = await client.query(
      `SELECT type, COUNT(*)::int AS jumlah FROM public."Product" GROUP BY type ORDER BY type`
    )
    console.log('\nBerhasil. Jumlah produk per tipe:')
    console.table(summary)

    if (candidates.length && !BACKFILL) {
      console.log(`${candidates.length} produk punya ukuran baju (S/M/L/XL/XXL) tapi bertipe "sepatu":`)
      console.table(candidates.slice(0, 20).map((c) => ({ nama: c.name })))
      console.log('Untuk menandainya sebagai baju, jalankan lagi dengan --backfill')
    } else if (candidates.length) {
      console.log(`${candidates.length} produk ditandai sebagai "baju".`)
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

main()
  .catch((err) => { console.error('\nGagal:', err.message); process.exitCode = 1 })
  .finally(() => pool.end())