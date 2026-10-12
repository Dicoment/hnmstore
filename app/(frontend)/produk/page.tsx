'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Filter, ChevronDown } from 'lucide-react'
import { queryDb } from '@/lib/shop-db'
import ProductCard, { type ShopProduct } from '@/components/shop/ProductCard'
import FilterSidebar, { type FilterOption } from '@/components/shop/FilterSidebar'
import Pagination from '@/components/shop/Pagination'
import { isProductType, typeLabel } from '@/lib/product-types'

const ITEMS_PER_PAGE = 12

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru', sql: `p."createdAt" DESC` },
  { value: 'name-az', label: 'Nama A-Z', sql: `p.name ASC` },
  { value: 'name-za', label: 'Nama Z-A', sql: `p.name DESC` },
  { value: 'price-low', label: 'Harga Termurah', sql: `p.price_regular ASC` },
  { value: 'price-high', label: 'Harga Termahal', sql: `p.price_regular DESC` },
]

// Produk promo selalu di atas, apa pun urutan yang dipilih
const PROMO_FIRST = `CASE WHEN p.price_promo IS NOT NULL AND p.price_promo > 0 THEN 0 ELSE 1 END`

// Ukuran: angka (sepatu) dulu, lalu baju S < M < L < XL < XXL
const SIZE_ORDER = `CASE s.value WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 WHEN 'XXL' THEN 5 ELSE 0 END, s.value`

function ShopContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // URL adalah satu-satunya sumber filter: /produk?brand=asics&model=running&sort=price-low&page=2
  const brand = searchParams.get('brand') || 'all'
  const model = searchParams.get('model') || 'all'
  const tipeParam = searchParams.get('tipe')
  const tipe = isProductType(tipeParam) ? tipeParam : 'all'
  const sort = SORT_OPTIONS.find((o) => o.value === searchParams.get('sort')) ?? SORT_OPTIONS[0]
  const currentPage = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1))

  const [products, setProducts] = useState<ShopProduct[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [brands, setBrands] = useState<FilterOption[]>([])
  const [models, setModels] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  // Ubah query string; nilai null / 'all' / '' menghapus parameternya
  const updateParams = useCallback(
    (changes: Record<string, string | null>, replace = false) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') params.delete(key)
        else params.set(key, value)
      })
      const qs = params.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      if (replace) router.replace(url, { scroll: false })
      else router.push(url, { scroll: false })
    },
    [searchParams, pathname, router]
  )

  // Daftar brand & kategori mengikuti jenis produk yang dipilih; yang belum punya produk disembunyikan
  useEffect(() => {
    const params: string[] = []
    let typeFilter = ''
    if (tipe !== 'all') { params.push(tipe); typeFilter = ' AND p.type = $1' }

    const listSql = (table: 'Brand' | 'Model', fk: 'brandId' | 'modelId') => `
      SELECT DISTINCT x.id, x.name, x.slug
      FROM public."${table}" x
      JOIN public."Product" p ON p."${fk}" = x.id
      WHERE p.draft = false${typeFilter}
      ORDER BY x.name ASC
    `
    queryDb<FilterOption>(listSql('Brand', 'brandId'), params).then(setBrands).catch(console.error)
    queryDb<FilterOption>(listSql('Model', 'modelId'), params).then(setModels).catch(console.error)
  }, [tipe])

  // Link lama berisi UUID (?brand=076245a4-...) dirapikan otomatis jadi slug
  useEffect(() => {
    const legacy = brands.find((b) => b.id === brand)
    if (legacy) updateParams({ brand: legacy.slug }, true)
  }, [brands, brand, updateParams])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const params: string[] = []
        const where = ['p.draft = false']

        // slug atau UUID lama; nilai dikirim sebagai parameter, bukan disambung ke SQL
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
        const offset = (currentPage - 1) * ITEMS_PER_PAGE

        const productSql = `
          SELECT p.id, p.name, p.slug, p.price_regular, p.price_promo, p.images, b.name AS "brandName",
            (SELECT json_agg(s.value ORDER BY ${SIZE_ORDER})
             FROM public."ProductSizeStock" pss
             JOIN public."Size" s ON s.id = pss."sizeId"
             WHERE pss."productId" = p.id AND pss.stock > 0) AS sizes
          FROM public."Product" p
          LEFT JOIN public."Brand" b ON p."brandId" = b.id
          ${whereSql}
          ORDER BY ${PROMO_FIRST}, ${sort.sql}, p.id ASC
          LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
        `
        const countSql = `SELECT COUNT(*)::int AS count FROM public."Product" p ${whereSql}`

        const [rows, countRows] = await Promise.all([
          queryDb<ShopProduct>(productSql, params),
          queryDb<{ count: number }>(countSql, params),
        ])
        if (cancelled) return
        setProducts(rows)
        setTotalItems(Number(countRows[0]?.count ?? 0))
      } catch (err) {
        console.error(err)
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) {
          setLoading(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [brand, model, tipe, sort.value, currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-white font-sans text-black pt-20">
      {/* 1. HERO */}
      <div className="h-[30vh] md:h-[40vh] relative flex items-center justify-center bg-zinc-900 overflow-hidden mt-2">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <Image src="/images/hero-bg.jpg" alt="Banner" fill className="object-cover scale-110" priority unoptimized />
        <div className="relative z-20 text-center space-y-4 px-4 font-bold text-white">
          <h1 className="text-5xl md:text-8xl uppercase tracking-tighter leading-none">{tipe === 'all' ? 'Katalog' : typeLabel(tipe)}</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.5em]">HnM Authentic Selection</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 flex flex-col lg:flex-row gap-12 items-start">
        <button
          onClick={() => setShowMobileFilter(true)}
          className="lg:hidden w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest"
        >
          <Filter size={18} /> Filter Koleksi
        </button>

        {/* 2. FILTER */}
        <FilterSidebar
          brands={brands}
          models={models}
          activeType={tipe}
          activeBrand={brand}
          activeModel={model}
          open={showMobileFilter}
          onClose={() => setShowMobileFilter(false)}
          onBrandChange={(slug) => updateParams({ brand: slug, page: null })}
          onModelChange={(slug) => updateParams({ model: slug, page: null })}
          onTypeChange={(t) => updateParams({ tipe: t, model: null, page: null })}
        />

        {/* 3. GRID (min-w-0 supaya konten lebar tidak mendesak sidebar) */}
        <main className="flex-1 w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 border-b-2 border-zinc-50 pb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Menampilkan <span className="text-black">{products.length} dari {totalItems}</span> Koleksi
            </p>

            <div className="relative group w-full sm:w-auto">
              <select
                value={sort.value}
                onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? null : e.target.value, page: null })}
                className="w-full sm:w-auto appearance-none bg-zinc-50 border-2 border-zinc-100 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:border-black transition-all outline-none pr-12"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>Urutkan: {o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-black transition-colors" />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6 font-bold text-black">
              <Loader2 className="animate-spin" size={40} strokeWidth={3} />
              <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-400">Refreshing Stock...</p>
            </div>
          ) : products.length === 0 ? (
            <p className="py-40 text-center text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Belum ada produk untuk filter ini
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onChange={(page) => updateParams({ page: page === 1 ? null : String(page) })}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-white font-bold">
          <Loader2 className="animate-spin" size={40} />
          <p className="mt-4 text-[10px] uppercase tracking-widest text-zinc-400">Loading Collection...</p>
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  )
}