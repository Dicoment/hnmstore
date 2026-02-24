'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Plus, Search, Edit3, Trash2, Eye, Loader2, X, Save, 
  Square, CheckCircle2, ImageIcon, RefreshCw, Upload,
  ChevronLeft, ChevronRight, CheckSquare
} from 'lucide-react'

// --- DEFINISI INTERFACE ---
interface Size { id: string; value: string }
interface Brand { id: string; name: string }

interface ProductSizeStock {
  id?: string
  stock: number
  sizeId: string
  Size?: { value: string }
}

interface Product {
  id: string
  name: string
  slug: string
  description: string
  price_regular: number
  price_promo: number | null // Tetap pastikan ini ada
  brand_id: string
  model_id: string
  images: string[]
  createdAt: string
  Brand?: { name: string }
  Model?: { name: string }
  ProductSizeStock: ProductSizeStock[]
}

export default function InventoryHnMStore() {
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBrand, setFilterBrand] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [existingImages, setExistingImages] = useState<any[]>([])
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)
      // FIX QUERY: Pastiin p.price_promo ketarik
      const productQuery = `
        SELECT p.id, p.name, p.slug, p.description, p.price_regular, p.price_promo, p.images, p."brandId", p."modelId", p."createdAt", b.name as "brandName", m.name as "modelName",
        (SELECT json_agg(json_build_object('id', pss.id, 'stock', pss.stock, 'sizeId', pss."sizeId", 'Size', json_build_object('value', s.value)))
         FROM public."ProductSizeStock" pss JOIN public."Size" s ON s.id = pss."sizeId" WHERE pss."productId" = p.id) as "vps_stocks"
        FROM public."Product" p
        LEFT JOIN public."Brand" b ON p."brandId" = b.id
        LEFT JOIN public."Model" m ON p."modelId" = m.id
        ORDER BY p."createdAt" DESC
      `;
      const [pRes, bRes, sRes, imgRes] = await Promise.all([
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: productQuery }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Brand" ORDER BY name ASC' }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Size" ORDER BY value ASC' }) }).then(r => r.json()),
        fetch('/api/media').then(r => r.json())
      ])
      const mapped = (pRes.data || []).map((p: any) => ({
        ...p,
        brand_id: p.brandId || "", 
        model_id: p.modelId || "",
        Brand: { name: p.brandName || "No Brand" },
        Model: { name: p.modelName || "No Model" },
        ProductSizeStock: p.vps_stocks || []
      }))
      setProducts(mapped); setBrands(bRes.data || []); setSizes(sRes.data || []);
      if (imgRes.data) setExistingImages(imgRes.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchInitialData() }, [fetchInitialData])

  const handleUpdateStockValue = (index: number, field: string, value: string | number) => {
    if (!selectedProduct) return
    const updatedStock = [...selectedProduct.ProductSizeStock]
    if (field === 'sizeId') {
      const selectedSize = sizes.find(sz => sz.id === value)
      updatedStock[index] = { ...updatedStock[index], sizeId: value as string, Size: { value: selectedSize?.value || '' } }
    } else {
      updatedStock[index] = { ...updatedStock[index], [field]: parseInt(value as string) || 0 }
    }
    setSelectedProduct({ ...selectedProduct, ProductSizeStock: updatedStock })
  }

  async function handleDelete(id: string) {
    if(!confirm("Hapus item?")) return;
    await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `DELETE FROM public."Product" WHERE id = $1`, params: [id] }) });
    fetchInitialData();
  }

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => filterBrand === 'all' || p.brand_id === filterBrand)
  }, [products, searchTerm, filterBrand])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const displayProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(start, start + itemsPerPage)
  }, [filteredProducts, currentPage])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    const currentDisplayIds = displayProducts.map(p => p.id)
    const allSelected = currentDisplayIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentDisplayIds.includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentDisplayIds])])
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedIds.length} produk?`)) return
    setIsDeletingBulk(true)
    try {
      await fetch('/api/vps-db', { 
        method: 'POST', 
        body: JSON.stringify({ 
          sql: `DELETE FROM public."Product" WHERE id = ANY($1::uuid[])`, 
          params: [selectedIds] 
        }) 
      })
      setSelectedIds([]); fetchInitialData()
    } finally { setIsDeletingBulk(false) }
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedProduct) return
    setUploading(true)
    try {
      const file = e.target.files[0]
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        const fileName = data.url.split('/').pop() || ""
        setSelectedProduct({ ...selectedProduct, images: [...(selectedProduct.images || []), fileName] })
      }
    } catch (err) { alert("Upload gagal!") } finally { setUploading(false) }
  }

  async function handleFullUpdate(e: React.FormEvent) {
    e.preventDefault(); if (!selectedProduct) return; setIsSaving(true)
    try {
      await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: `UPDATE public."Product" SET name = $1, price_regular = $2, price_promo = $3, description = $4, "brandId" = $5, "modelId" = $6, images = $7 WHERE id = $8`,
          params: [selectedProduct.name, selectedProduct.price_regular, selectedProduct.price_promo, selectedProduct.description, selectedProduct.brand_id, selectedProduct.model_id, selectedProduct.images, selectedProduct.id]
        })
      });
      await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `DELETE FROM public."ProductSizeStock" WHERE "productId" = $1`, params: [selectedProduct.id] }) });
      for (const s of selectedProduct.ProductSizeStock) {
        await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `INSERT INTO public."ProductSizeStock" ("productId", "sizeId", stock) VALUES ($1, $2, $3)`, params: [selectedProduct.id, s.sizeId, s.stock] }) });
      }
      alert('Berhasil Update!'); setSelectedProduct(null); fetchInitialData()
    } catch (err: any) { alert(err.message) } finally { setIsSaving(false) }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-black text-xs font-bold uppercase tracking-widest"><Loader2 className="animate-spin mr-3" size={24} /> Syncing...</div>

  return (
    <div className="min-h-screen bg-white text-black font-sans w-full pb-20 lg:pb-0">
      <div className="border-b border-gray-100 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between sticky top-0 z-40 bg-white w-full gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-xl lg:text-2xl font-bold uppercase tracking-tight text-black leading-none">Katalog Produk</h1>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">Inventori Produk HnM Store</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={isDeletingBulk} className="flex-1 md:flex-none bg-red-600 text-white px-5 py-3 lg:py-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all shadow-lg">
              {isDeletingBulk ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Hapus ({selectedIds.length})
            </button>
          )}
          <Link href="/admin/produk/tambah" className="flex-1 md:flex-none bg-black text-white px-6 py-3 lg:py-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
            <Plus size={16} /> Tambah Item
          </Link>
        </div>
      </div>

      <div className="w-full py-6 lg:py-8 space-y-6 lg:space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 font-bold">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari item di gudang..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-xs font-bold focus:ring-1 focus:ring-black transition-all text-black" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-black outline-none" onChange={(e) => setFilterBrand(e.target.value)}>
              <option value="all">Semua Brand</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={fetchInitialData} className="p-3 bg-black text-white rounded-xl active:scale-95 transition-all shadow-lg"><RefreshCw size={16} /></button>
          </div>
        </div>

        <div className="bg-white lg:border lg:border-gray-100 lg:rounded-xl overflow-hidden lg:shadow-sm">
          <div className="hidden lg:block">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-widest border-b">
                <tr>
                  <th className="pl-8 py-6 w-12">
                    <button onClick={toggleSelectAll}>
                      {displayProducts.length > 0 && displayProducts.every(p => selectedIds.includes(p.id)) ? <CheckSquare size={25} className="text-black" /> : <Square size={25} />}
                    </button>
                  </th>
                  <th className="px-6 py-6 text-black">Produk</th>
                  <th className="px-6 py-6 text-black">Varian & Stock</th>
                  <th className="px-6 py-6 text-black">Harga</th>
                  <th className="px-6 py-6 text-right text-black">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-black font-bold">
                {displayProducts.map((p) => (
                  <tr key={p.id} className={`group transition-all ${selectedIds.includes(p.id) ? 'bg-zinc-50' : 'hover:bg-gray-50'}`}>
                    <td className="pl-8 py-5">
                      <button onClick={() => toggleSelect(p.id)}>
                        {selectedIds.includes(p.id) ? <CheckCircle2 size={25} className="text-black" /> : <Square size={25} className="text-gray-200 group-hover:text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                          <Image src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} alt={p.name} fill className="object-cover" unoptimized />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase truncate text-black">{p.name || 'NONAME'}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{p.Brand?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {p.ProductSizeStock?.map((s, i) => (
                          <span key={i} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${s.stock < 5 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>SZ {s.Size?.value}: {s.stock}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs text-black font-bold">
                      {/* TAMPILAN HARGA DI TABEL ADMIN */}
                      <div className="flex flex-col gap-1">
  {/* 1. Cek apakah ada nominal promo yang diinput klien */}
  {p.price_promo && Number(p.price_promo) > 0 ? (
    <>
      {/* 2. Tampilkan Harga Akhir (Warna Merah untuk Menarik Perhatian) [cite: 2026-02-25] */}
      <p className="font-bold text-red-600 text-lg tracking-tighter leading-none">
        RP {(Number(p.price_regular) - Number(p.price_promo)).toLocaleString('id-ID')}
      </p>
      
      {/* 3. Tampilkan Harga Asli dengan Efek Coret (Line-through) [cite: 2025-11-12, 2026-02-25] */}
      <p className="text-[12px] text-zinc-400 line-through font-medium leading-none mt-1">
        RP {Number(p.price_regular).toLocaleString('id-ID')}
      </p>
    </>
  ) : (
    /* 4. Tampilan Normal jika tidak ada promo [cite: 2026-02-25] */
    <p className="font-bold text-black text-lg tracking-tighter leading-none">
      RP {Number(p.price_regular || 0).toLocaleString('id-ID')}
    </p>
  )}
</div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/produk/${p.slug}`} target="_blank" className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm text-black"><Eye size={14}/></Link>
                        <button onClick={() => setSelectedProduct(p)} className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm text-black"><Edit3 size={14}/></button>
                        <button onClick={() => handleDelete(p.id)} className="p-3 bg-white border border-red-50 rounded-xl hover:bg-red-600 hover:text-white text-red-400 transition-all shadow-sm"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-4">
            {displayProducts.map((p) => (
              <div key={p.id} className={`p-4 rounded-2xl border transition-all ${selectedIds.includes(p.id) ? 'bg-zinc-50 border-black' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-start gap-4 text-black">
                  <button onClick={() => toggleSelect(p.id)} className="mt-1">
                    {selectedIds.includes(p.id) ? <CheckCircle2 size={25} className="text-black" /> : <Square size={25} className="text-gray-200" />}
                  </button>
                  <div className="w-16 h-16 relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                    <Image src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} alt={p.name} fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold uppercase truncate text-black">{p.name || 'NONAME'}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.Brand?.name}</p>
                    <div className="flex flex-col mt-1">
                      <p className="text-xs font-bold text-black">Rp {(p.price_regular || 0).toLocaleString()}</p>
                      {p.price_promo && p.price_promo > 0 && <p className="text-[10px] text-red-600">Promo: -{p.price_promo.toLocaleString()}</p>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-50 pt-4">
                  {p.ProductSizeStock?.map((s, i) => (
                    <span key={i} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${s.stock < 5 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>SZ {s.Size?.value}: {s.stock}</span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/produk/${p.slug}`} target="_blank" className="flex-1 flex justify-center items-center py-3 bg-gray-50 rounded-xl text-black border border-gray-100 transition-all"><Eye size={16}/></Link>
                  <button onClick={() => setSelectedProduct(p)} className="flex-1 flex justify-center items-center py-3 bg-gray-50 rounded-xl text-black border border-gray-100 transition-all"><Edit3 size={16}/></button>
                  <button onClick={() => handleDelete(p.id)} className="flex-1 flex justify-center items-center py-3 bg-red-50 rounded-xl text-red-600 border border-red-100 transition-all"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAGINATION ... tetap sama */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-10 text-black">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} items
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-3 border border-gray-200 rounded-xl hover:bg-black hover:text-white disabled:opacity-30 transition-all active:scale-90">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-2 overflow-x-auto max-w-50 lg:max-w-none">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`min-w-10 h-10 rounded-xl text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-black text-white' : 'bg-gray-50 text-black hover:bg-gray-200'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-3 border border-gray-200 rounded-xl hover:bg-black hover:text-white disabled:opacity-30 transition-all active:scale-90">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

     {/* MODAL EDITOR PRODUK */}
{selectedProduct && (
  <div className="fixed inset-0 z-50 flex justify-end">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
    <div className="relative w-full md:max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden text-black font-bold">
      <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 text-black">
        <div className="space-y-1">
          <h2 className="text-xl lg:text-2xl font-bold uppercase tracking-tight">Editor Produk</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Update Data Gudang</p>
        </div>
        <button onClick={() => setSelectedProduct(null)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-red-500 hover:text-white transition-all text-black"><X size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 lg:space-y-10 pb-32 bg-white text-black font-bold">
        {/* 1. GALERI PRODUK */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Galeri Produk</label>
          <div className="grid grid-cols-3 gap-3">
            {selectedProduct.images?.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50 group">
                <Image src={`/uploads/${img}`} fill className="object-cover" alt="p" unoptimized />
                <button type="button" onClick={() => setSelectedProduct({...selectedProduct, images: selectedProduct.images.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-black text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-600"><X size={12}/></button>
              </div>
            ))}
            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl hover:border-black transition-all cursor-pointer group">
              <Upload size={20} className={uploading ? "animate-bounce" : "text-gray-300"} />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-widest text-gray-400">New Photo</span>
              <input type="file" className="hidden" onChange={handleUploadFile} accept="image/*" />
            </label>
            <button type="button" onClick={() => setShowMediaModal(true)} className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl hover:border-black transition-all group text-black">
              <ImageIcon size={20} className="text-gray-300 group-hover:text-black" />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-widest text-gray-400 group-hover:text-black">Library</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 2. NAMA PRODUK */}
          <div className="space-y-2 border-b border-gray-100 focus-within:border-black transition-all pb-2 text-black">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Nama Produk</label>
            <input type="text" value={selectedProduct.name} onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})} className="w-full outline-none font-bold text-xl uppercase tracking-tighter bg-transparent text-black" />
          </div>

          {/* 3. DESKRIPSI PRODUK (YANG TADI HILANG) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Deskripsi Produk</label>
            <textarea 
              value={selectedProduct.description || ''} 
              onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})} 
              className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-black text-[13px] font-bold transition-all text-black leading-relaxed"
              placeholder="Tulis detail bahan, kualitas, dll..."
            />
          </div>
          
          {/* 4. STOK VARIAN */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest block text-black">Stok Varian</label>
            <div className="space-y-2">
              {selectedProduct.ProductSizeStock?.map((s, index) => (
                <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border border-transparent hover:border-black transition-all text-black">
                  <select value={s.sizeId} onChange={(e) => handleUpdateStockValue(index, 'sizeId', e.target.value)} className="flex-1 bg-white rounded-lg p-2.5 text-xs font-bold uppercase outline-none appearance-none cursor-pointer shadow-sm text-black border-none">
                    {sizes.map(sz => <option key={sz.id} value={sz.id}>SZ {sz.value}</option>)}
                  </select>
                  <input type="number" value={s.stock} onChange={(e) => handleUpdateStockValue(index, 'stock', e.target.value)} className="w-20 bg-white rounded-lg p-2.5 text-xs font-bold text-center outline-none shadow-sm text-black border-none" />
                  <button type="button" onClick={() => setSelectedProduct({...selectedProduct, ProductSizeStock: selectedProduct.ProductSizeStock.filter((_, i) => i !== index)})} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setSelectedProduct({...selectedProduct, ProductSizeStock: [...(selectedProduct.ProductSizeStock || []), {sizeId: sizes[0]?.id, stock: 0, Size: {value: sizes[0]?.value}}]})} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-xs font-bold uppercase text-gray-400 hover:border-black hover:text-black transition-all">+ Add Size Variant</button>
            </div>
          </div>

          {/* 5. HARGA & PROMO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-black">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest block">Harga Normal</label>
              <input type="number" value={selectedProduct.price_regular} onChange={(e) => setSelectedProduct({...selectedProduct, price_regular: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl outline-none focus:ring-1 focus:ring-black font-bold text-lg text-black" />
            </div>
            <div className="space-y-2 text-black">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest block">Harga Promo (Potongan)</label>
              <input type="number" value={selectedProduct.price_promo || 0} onChange={(e) => setSelectedProduct({...selectedProduct, price_promo: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-red-100 p-4 rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold text-lg text-red-600" />
              <p className="text-[9px] text-gray-400 uppercase italic">Input nominal potongan saja</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 bg-white border-t border-gray-100 sticky bottom-0 text-black font-bold">
        <button type="submit" onClick={handleFullUpdate} disabled={isSaving} className="w-full py-5 bg-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all text-white">
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Update Item Katalog
        </button>
      </div>
    </div>
  </div>
)}

      {/* MEDIA MODAL ... tetap sama */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-black font-bold">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowMediaModal(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 text-black font-bold">
              <h3 className="font-bold uppercase tracking-tight text-xl text-black">Cloud Library</h3>
              <button onClick={() => setShowMediaModal(false)} className="bg-gray-50 p-2.5 rounded-xl text-black hover:bg-red-500 hover:text-white transition-all "><X size={20}/></button>
            </div>
            <div className="p-6 lg:p-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 bg-gray-50">
              {existingImages.map((file: any, i) => (
                <div key={i} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${selectedProduct?.images.includes(file.name) ? 'border-black' : 'border-transparent'}`}
                  onClick={() => {
                    if (!selectedProduct) return
                    const has = selectedProduct.images.includes(file.name)
                    setSelectedProduct({...selectedProduct, images: has ? selectedProduct.images.filter(u => u !== file.name) : [...selectedProduct.images, file.name]})
                  }}>
                  <Image src={file.url || `/uploads/${file.name}`} fill className="object-cover" alt="m" unoptimized />
                  {selectedProduct?.images.includes(file.name) && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><CheckCircle2 className="text-white" size={25} /></div>}
                </div>
              ))}
            </div>
            <div className="p-6 lg:p-8 bg-white border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowMediaModal(false)} className="bg-black text-white px-12 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl">Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}