'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Plus, Search, Edit3, Trash2, Eye, Loader2, X, Save, 
  Square, CheckCircle2, ImageIcon, RefreshCw, Upload,
  ChevronLeft, ChevronRight, CheckSquare, Zap
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
  price_promo: number | null
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

  // --- STATE BARU: MODAL BULK EDIT ---
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkData, setBulkData] = useState({ price_regular: '', price_promo: '' })

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)
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

  // --- FUNGSI BARU: LOGIK BULK UPDATE HARGA ---
  async function handleBulkUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkData.price_regular && !bulkData.price_promo) return alert("Isi minimal satu kolom!");
    setIsSaving(true);
    try {
      let setClause = [];
      let params = [selectedIds];
      if (bulkData.price_regular) { setClause.push(`price_regular = $${params.length + 1}`); params.push(bulkData.price_regular as any); }
      if (bulkData.price_promo) { setClause.push(`price_promo = $${params.length + 1}`); params.push(bulkData.price_promo as any); }

      await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: `UPDATE public."Product" SET ${setClause.join(', ')} WHERE id = ANY($1::uuid[])`,
          params: params
        })
      });

      alert(`Berhasil update ${selectedIds.length} produk!`);
      setShowBulkModal(false); setSelectedIds([]); setBulkData({ price_regular: '', price_promo: '' });
      fetchInitialData();
    } catch (err) { alert("Gagal update massal"); } finally { setIsSaving(false); }
  }

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
      <div className="border-b border-gray-100 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between sticky top-10 z-40 bg-white w-full gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-xl lg:text-2xl font-bold uppercase tracking-tight text-black leading-none">Katalog Produk</h1>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">Inventori Produk HnM Store</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <div className="flex gap-2 w-full md:w-auto">
              {/* TOMBOL BARU: BULK EDIT HARGA */}
              <button onClick={() => setShowBulkModal(true)} className="flex-1 md:flex-none bg-yellow-400 text-black px-5 py-3 lg:py-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:bg-yellow-500">
                <Zap size={14} fill="black" /> Bulk Harga ({selectedIds.length})
              </button>
              <button onClick={handleBulkDelete} disabled={isDeletingBulk} className="flex-1 md:flex-none bg-red-600 text-white px-5 py-3 lg:py-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 shadow-lg">
                {isDeletingBulk ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Hapus
              </button>
            </div>
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
                      {/* HARGA CORET DI TABEL ADMIN */}
                      <div className="flex flex-col gap-1">
                        {p.price_promo && Number(p.price_promo) > 0 ? (
                          <>
                            <p className="text-red-600 font-bold">RP {(Number(p.price_regular) - Number(p.price_promo)).toLocaleString('id-ID')}</p>
                            <p className="text-zinc-400 line-through text-[10px]">RP {Number(p.price_regular).toLocaleString('id-ID')}</p>
                          </>
                        ) : (
                          <p className="text-black font-bold">RP {Number(p.price_regular || 0).toLocaleString('id-ID')}</p>
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
                    <p className="text-xs font-bold text-black mt-1">Rp {(p.price_regular || 0).toLocaleString()}</p>
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

      {/* --- MODAL BULK EDIT HARGA --- */}
      {showBulkModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBulkModal(false)} />
          <form onSubmit={handleBulkUpdate} className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col font-bold">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-yellow-400 text-black">
              <h2 className="text-xl font-black uppercase tracking-tight leading-none"><Zap size={24} className="inline mr-2 fill-black"/> Bulk Edit Harga</h2>
              <button type="button" onClick={() => setShowBulkModal(false)} className="p-2 bg-black/10 rounded-xl hover:bg-black/20"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Update massal untuk {selectedIds.length} produk. Kosongkan kolom yang tidak ingin diubah.</p>
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-zinc-400 tracking-widest">Harga Normal Baru</label>
                <input type="number" value={bulkData.price_regular} onChange={(e) => setBulkData({...bulkData, price_regular: e.target.value})} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-black text-black" placeholder="Contoh: 280000" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-red-600 tracking-widest">Potongan Promo Baru</label>
                <input type="number" value={bulkData.price_promo} onChange={(e) => setBulkData({...bulkData, price_promo: e.target.value})} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-red-500 text-red-600" placeholder="Contoh: 20000" />
              </div>
              <button type="submit" disabled={isSaving} className="w-full py-6 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all">
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} Update {selectedIds.length} Produk
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL EDITOR SATUAN (DESKRIPSI TETAP ADA) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full md:max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden text-black font-bold">
            <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 text-black">
              <div className="space-y-1">
                <h2 className="text-xl lg:text-2xl font-bold uppercase tracking-tight">Editor Produk</h2>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Update Data Produk di Gudang</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-red-500 hover:text-white transition-all text-black"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 lg:space-y-10 pb-32 bg-white text-black font-bold">
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
                <div className="space-y-2 border-b border-gray-100 focus-within:border-black transition-all pb-2 text-black">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Nama Produk</label>
                  <input type="text" value={selectedProduct.name} onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})} className="w-full outline-none font-bold text-xl uppercase tracking-tighter bg-transparent text-black" />
                </div>
                
                {/* DESKRIPSI PRODUK */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Deskripsi Produk</label>
                  <textarea 
                    value={selectedProduct.description || ''} 
                    onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})} 
                    className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-black text-[13px] font-bold transition-all text-black leading-relaxed"
                    placeholder="Tulis detail bahan, kualitas, dll..."
                  />
                </div>
                
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-black">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-widest block">Harga Normal</label>
                    <input type="number" value={selectedProduct.price_regular} onChange={(e) => setSelectedProduct({...selectedProduct, price_regular: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl outline-none focus:ring-1 focus:ring-black font-bold text-lg text-black" />
                  </div>
                  <div className="space-y-2 text-black">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-widest block">Harga Promo (Potongan)</label>
                    <input type="number" value={selectedProduct.price_promo || 0} onChange={(e) => setSelectedProduct({...selectedProduct, price_promo: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-red-100 p-4 rounded-xl outline-none focus:ring-1 focus:ring-red-500 font-bold text-lg text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8 bg-white border-t border-gray-100 sticky bottom-15 text-black font-bold">
              <button type="submit" onClick={handleFullUpdate} disabled={isSaving} className="w-full py-5 bg-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all text-white">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Update Item Katalog
              </button>
            </div>
          </div>
        </div>
      )}

{showMediaModal && (
  <div className="fixed inset-0 z-100 flex items-center justify-center p-4 lg:p-10 text-black">
    {/* Overlay */}
    <div 
      className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      onClick={() => setShowMediaModal(false)} 
    />

    {/* Modal Container - Fixed rounded-4xl */}
    <div className="relative bg-white w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl">
      
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-white z-20">
        <div className="space-y-1">
          <h3 className="font-bold uppercase tracking-tighter text-2xl text-black leading-none">Cloud Library</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Aset produk HnM Store</p>
        </div>
        <button 
          onClick={() => setShowMediaModal(false)} 
          className="bg-gray-100 p-3 rounded-2xl text-black hover:bg-red-500 hover:text-white transition-all active:scale-90"
        >
          <X size={20}/>
        </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/50">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 lg:gap-6">
          {existingImages.map((file: any, i) => {
            const isSelected = selectedProduct?.images.includes(file.name);
            
            return (
              <div 
                key={i} 
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all duration-300 group shadow-sm ${
                  isSelected ? 'border-black scale-[0.96] shadow-xl' : 'border-white hover:border-gray-200'
                }`}
                onClick={() => {
                  if (!selectedProduct) return;
                  const has = selectedProduct.images.includes(file.name);
                  setSelectedProduct({
                    ...selectedProduct, 
                    images: has 
                      ? selectedProduct.images.filter(u => u !== file.name) 
                      : [...selectedProduct.images, file.name]
                  });
                }}
              >
                <div className="absolute inset-0">
                  <Image 
                    src={file.url || `/api/media/view?bucket=ProductImage&name=${file.name}`} 
                    fill 
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt="HnM" 
                    unoptimized 
                  />
                </div>
                
                {/* Overlay Checkmark - FIXED ICON NAME */}
                {isSelected && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in zoom-in duration-300">
                    <div className="bg-white text-black rounded-full p-2 shadow-2xl border-2 border-white">
                      <CheckCircle2 className="font-bold" size={24} strokeWidth={4} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 lg:p-8 bg-white border-t border-gray-100 flex justify-between items-center z-20">
        <div className="flex flex-col font-bold">
          <p className="text-xs text-gray-400 uppercase tracking-widest leading-none mb-1">Pilihan</p>
          <p className="text-sm text-black uppercase leading-none font-bold">
            {selectedProduct?.images.length || 0} File terpilih
          </p>
        </div>
        <button 
          onClick={() => setShowMediaModal(false)} 
          className="bg-black text-white px-10 py-4 lg:py-5 rounded-2xl font-bold text-xs lg:text-sm uppercase tracking-widest shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
        >
          Selesai
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}