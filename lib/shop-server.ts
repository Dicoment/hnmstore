import { Pool } from 'pg'

// Pool khusus halaman publik: koneksi sedikit, tiap query dibatasi 5 detik.
// Disimpan di globalThis supaya tidak membuat pool baru setiap kode di-reload.
const g = globalThis as any
const pool: Pool =
  g.__shopPool ??
  (g.__shopPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
    ssl: false
  }))

// Cache sederhana di memori server, supaya VPS tidak di-query setiap pengunjung buka halaman.
// Hasil kosong (null) tidak disimpan, dan jumlah cache dibatasi.
const cache: Map<string, { at: number; data: any }> =
  g.__shopCache ?? (g.__shopCache = new Map())

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T
  const data = await load()
  if (data !== null && data !== undefined) {
    if (cache.size > 300) cache.clear()
    cache.set(key, { at: Date.now(), data })
  }
  return data
}

// Ukuran: angka (sepatu) dulu, lalu baju S < M < L < XL < XXL
const SIZE_ORDER = `CASE s.value WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 WHEN 'XXL' THEN 5 ELSE 0 END, s.value`

// ---------- WHATSAPP ----------
export function getWhatsAppConfig() {
  return cached('wa', 5 * 60 * 1000, async () => {
    const r = await pool.query(
      `SELECT phone_number, template_message
       FROM public."WhatsAppConfig"
       WHERE is_active = true
       LIMIT 1`
    )
    return r.rows[0] ?? null
  })
}

// ---------- BRAND ----------
export function getBrands() {
  return cached('brands', 30 * 1000, async () => {
    const r = await pool.query(
      `SELECT id, name, slug, images
       FROM public."Brand"
       ORDER BY name ASC`
    )
    return r.rows
  })
}

// ---------- BERANDA: 4 produk terbaru per brand ----------
export function getHomeProducts() {
  return cached('home', 30 * 1000, async () => {
    const r = await pool.query(
      `SELECT
         t.id, t.name, t.slug, t.price_regular, t.price_promo, t.images,
         t."brandName", t."brandSlug",
         (SELECT json_agg(json_build_object('size', s.value) ORDER BY ${SIZE_ORDER})
          FROM public."ProductSizeStock" pss
          JOIN public."Size" s ON s.id = pss."sizeId"
          WHERE pss."productId" = t.id AND pss.stock > 0) AS "available_sizes"
       FROM (
         SELECT
           p.id, p.name, p.slug, p.price_regular, p.price_promo, p.images,
           b.name AS "brandName", b.slug AS "brandSlug", p."createdAt",
           ROW_NUMBER() OVER (
             PARTITION BY COALESCE(b.name, 'Others')
             ORDER BY p."createdAt" DESC, p.id
           ) AS rn
         FROM public."Product" p
         LEFT JOIN public."Brand" b ON p."brandId" = b.id
         WHERE p.draft = false
       ) t
       WHERE t.rn <= 4
       ORDER BY t."createdAt" DESC`
    )
    return r.rows
  })
}

// ---------- NEW ARRIVAL: 24 produk terbaru ----------
export function getNewArrivals() {
  return cached('new-arrivals', 30 * 1000, async () => {
    const r = await pool.query(
      `SELECT 
         p.id, p.name, p.slug, p.price_regular, p.images AS "productImages", 
         p."createdAt", b.name AS "brandName",
         (SELECT json_agg(json_build_object('size', s.value))
          FROM public."ProductSizeStock" pss 
          JOIN public."Size" s ON s.id = pss."sizeId" 
          WHERE pss."productId" = p.id AND pss.stock > 0) AS "available_sizes"
       FROM public."Product" p
       LEFT JOIN public."Brand" b ON p."brandId" = b.id
       WHERE p.draft = false
       ORDER BY p."createdAt" DESC
       LIMIT 24`
    )
    return r.rows
  })
}

// ---------- DETAIL PRODUK (+ produk terkait) ----------
export function getProductDetail(slug: string) {
  return cached(`detail:${slug}`, 15 * 1000, async () => {
    const r = await pool.query(
      `SELECT
         p.id, p.name, p.slug, p.description, p.price_regular, p.price_promo, p.images,
         p."brandId", p."modelId", b.name AS "brandName", m.name AS "modelName",
         (SELECT json_agg(json_build_object('stock', pss.stock, 'Size', json_build_object('value', s.value)) ORDER BY s.value ASC)
          FROM public."ProductSizeStock" pss 
          JOIN public."Size" s ON s.id = pss."sizeId" 
          WHERE pss."productId" = p.id) AS "v_stocks"
       FROM public."Product" p
       LEFT JOIN public."Brand" b ON p."brandId" = b.id
       LEFT JOIN public."Model" m ON p."modelId" = m.id
       WHERE p.slug = $1 AND p.draft = false
       LIMIT 1`,
      [slug]
    )
    const product = r.rows[0]
    if (!product) return null

    const rel = await pool.query(
      `SELECT p.id, p.name, p.slug, p.images, p.price_regular, p.price_promo, b.name AS "brandName",
         (SELECT json_agg(json_build_object('size', s.value))
          FROM public."ProductSizeStock" pss 
          JOIN public."Size" s ON s.id = pss."sizeId" 
          WHERE pss."productId" = p.id AND pss.stock > 0) AS "available_sizes"
       FROM public."Product" p
       LEFT JOIN public."Brand" b ON p."brandId" = b.id 
       WHERE p."brandId" = $1 AND p.id != $2 AND p.draft = false
       LIMIT 4`,
      [product.brandId, product.id]
    )
    return { product, related: rel.rows }
  })
}

// ---------- METADATA (SEO & preview WhatsApp) ----------
export function getProductMeta(slug: string) {
  return cached(`meta:${slug}`, 60 * 1000, async () => {
    const r = await pool.query(
      `SELECT name, images, price_regular
       FROM public."Product"
       WHERE slug = $1 AND draft = false
       LIMIT 1`,
      [slug]
    )
    return r.rows[0] ?? null
  })
}

// ---------- KATALOG ----------
const SORTS: Record<string, string> = {
  newest: `p."createdAt" DESC`,
  'name-az': `p.name ASC`,
  'name-za': `p.name DESC`,
  'price-low': `p.price_regular ASC`,
  'price-high': `p.price_regular DESC`
}

// Produk promo selalu di atas, apa pun urutan yang dipilih
const PROMO_FIRST = `CASE WHEN p.price_promo IS NOT NULL AND p.price_promo > 0 THEN 0 ELSE 1 END`

const CATALOG_PAGE_SIZE = 12

export function getCatalog(opts: { brand: string; model: string; tipe: string; sort: string; page: number }) {
  const { brand, model, tipe, sort, page } = opts

  return cached(`catalog:${brand}|${model}|${tipe}|${sort}|${page}`, 20 * 1000, async () => {
    const params: string[] = []
    const where = ['p.draft = false']

    // slug atau UUID lama; nilai selalu dikirim sebagai parameter
    if (brand !== 'all') {
      params.push(brand)
      const n = params.length
      where.push(`p."brandId" = (SELECT id FROM public."Brand" WHERE slug = $${n} OR id::text = $${n} LIMIT 1)`)
    }
    if (model !== 'all') {
      params.push(model)
      const n = params.length
      where.push(`p."modelId" = (SELECT id FROM public."Model" WHERE slug = $${n} OR id::text = $${n} LIMIT 1)`)
    }
    if (tipe !== 'all') {
      params.push(tipe)
      where.push(`p.type = $${params.length}`)
    }

    const whereSql = `WHERE ${where.join(' AND ')}`
    const offset = (page - 1) * CATALOG_PAGE_SIZE
    const orderSql = Object.prototype.hasOwnProperty.call(SORTS, sort) ? SORTS[sort] : SORTS.newest

    const productSql = `
      SELECT p.id, p.name, p.slug, p.price_regular, p.price_promo, p.images, b.name AS "brandName",
        (SELECT json_agg(s.value ORDER BY ${SIZE_ORDER})
         FROM public."ProductSizeStock" pss
         JOIN public."Size" s ON s.id = pss."sizeId"
         WHERE pss."productId" = p.id AND pss.stock > 0) AS sizes
      FROM public."Product" p
      LEFT JOIN public."Brand" b ON p."brandId" = b.id
      ${whereSql}
      ORDER BY ${PROMO_FIRST}, ${orderSql}, p.id ASC
      LIMIT ${CATALOG_PAGE_SIZE} OFFSET ${offset}
    `
    const countSql = `SELECT COUNT(*)::int AS count FROM public."Product" p ${whereSql}`

    const [rows, count] = await Promise.all([
      pool.query(productSql, params),
      pool.query(countSql, params)
    ])
    return { products: rows.rows, total: Number(count.rows[0]?.count ?? 0) }
  })
}

// Daftar brand & model di sidebar filter (hanya yang punya produk)
export function getFilterOptions(tipe: string) {
  return cached(`filters:${tipe}`, 60 * 1000, async () => {
    const params: string[] = []
    let typeFilter = ''
    if (tipe !== 'all') {
      params.push(tipe)
      typeFilter = ' AND p.type = $1'
    }

    const listSql = (table: 'Brand' | 'Model', fk: 'brandId' | 'modelId') => `
      SELECT DISTINCT x.id, x.name, x.slug
      FROM public."${table}" x
      JOIN public."Product" p ON p."${fk}" = x.id
      WHERE p.draft = false${typeFilter}
      ORDER BY x.name ASC
    `
    const [b, m] = await Promise.all([
      pool.query(listSql('Brand', 'brandId'), params),
      pool.query(listSql('Model', 'modelId'), params)
    ])
    return { brands: b.rows, models: m.rows }
  })
}

// ---------- SITEMAP ----------
export function getSitemapProducts() {
  return cached('sitemap', 60 * 60 * 1000, async () => {
    try {
      const r = await pool.query(
        `SELECT slug, updated_at AS modified
         FROM public."Product"
         WHERE draft = false
         ORDER BY updated_at DESC NULLS LAST`
      )
      return r.rows as { slug: string; modified: string | null }[]
    } catch {
      // kolom updated_at tidak ada: pakai tanggal dibuat
      const r = await pool.query(
        `SELECT slug, "createdAt" AS modified
         FROM public."Product"
         WHERE draft = false
         ORDER BY "createdAt" DESC`
      )
      return r.rows as { slug: string; modified: string | null }[]
    }
  })
}