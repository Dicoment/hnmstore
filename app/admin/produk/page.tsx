'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Plus, Search, Edit3, Trash2, Eye, Loader2, X, Save, 
  CheckSquare, Square, CheckCircle2, ImageIcon, Upload, Filter, MoreVertical
} from 'lucide-react'

// --- DEFINISI INTERFACE ---
interface Size { id: string; value: string }
interface Brand { id: string; name: string }
interface Model { id: string; name: string }

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
  const [models, setModels] = useState<Model[]>([])
  const [sizes, setSizes] = useState<Size[]>([]) 
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterBrand, setFilterBrand] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    try {
      setLoading(true)
      const productQuery = `
        SELECT 
          p.*, 
          b.name as "brandName", 
          m.name as "modelName",
          (
            SELECT json_agg(json_build_object(
              'id', pss.id,
              'stock', pss.stock,
              'sizeId', pss."sizeId",
              'Size', json_build_object('value', s.value)
            ))
            FROM public."ProductSizeStock" pss
            JOIN public."Size" s ON s.id = pss."sizeId"
            WHERE pss."productId" = p.id
          ) as "ProductSizeStock"
        FROM public."Product" p
        LEFT JOIN public."Brand" b ON p."brandId" = b.id
        LEFT JOIN public."Model" m ON p."modelId" = m.id
        ORDER BY p."createdAt" DESC
      `;

      const [pRes, bRes, mRes, sRes, imgRes] = await Promise.all([
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: productQuery }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Brand"' }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Model"' }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'SELECT * FROM public."Size" ORDER BY value ASC' }) }).then(r => r.json()),
        fetch('/api/media').then(r => r.json())
      ])

      const mappedProducts = (pRes.data || []).map((p: any) => ({
        ...p,
        brand_id: p.brandId || "", 
        model_id: p.modelId || "",
        Brand: { name: p.brandName || "No Brand" },
        Model: { name: p.modelName || "No Model" },
        ProductSizeStock: p.ProductSizeStock || []
      }))

      setProducts(mappedProducts)
      setBrands(bRes.data || [])
      setModels(mRes.data || [])
      setSizes(sRes.data || [])
      if (imgRes.data) setExistingImages(imgRes.data.map((i: any) => i.name))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedProduct) return
    setUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) {
           const fileName = data.url.split('/').pop() || ""
           uploadedUrls.push(fileName)
        }
      }
      setSelectedProduct({
        ...selectedProduct,
        images: [...(selectedProduct.images || []), ...uploadedUrls]
      })
      fetchInitialData()
    } catch (err) {
      alert("Upload gagal!")
    } finally {
      setUploading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === displayProducts.length) setSelectedIds([])
    else setSelectedIds(displayProducts.map(p => p.id))
  }

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedIds.length} produk terpilih?`)) return
    setIsDeletingBulk(true)
    try {
      await fetch('/api/vps-db', { 
        method: 'POST', 
        body: JSON.stringify({ sql: `DELETE FROM public."Product" WHERE id = ANY($1)`, params: [selectedIds] }) 
      })
      setSelectedIds([])
      fetchInitialData()
    } finally { setIsDeletingBulk(false) }
  }

  const handleAddSizeRow = () => {
    if (!selectedProduct || sizes.length === 0) return
    const firstSize = sizes[0]
    const newStockRow: ProductSizeStock = {
      sizeId: firstSize.id,
      stock: 0,
      Size: { value: firstSize.value }
    }
    setSelectedProduct({
      ...selectedProduct,
      ProductSizeStock: [...(selectedProduct.ProductSizeStock || []), newStockRow]
    })
  }

  const handleUpdateStockValue = (index: number, field: string, value: string | number) => {
    if (!selectedProduct) return
    const updatedStock = [...selectedProduct.ProductSizeStock]
    if (field === 'sizeId') {
      const selectedSize = sizes.find(sz => sz.id === value)
      updatedStock[index] = { 
        ...updatedStock[index], 
        sizeId: value as string, 
        Size: { value: selectedSize?.value || '' } 
      }
    } else {
      updatedStock[index] = { ...updatedStock[index], [field]: parseInt(value as string) || 0 }
    }
    setSelectedProduct({ ...selectedProduct, ProductSizeStock: updatedStock })
  }

  const handleRemoveSizeRow = (index: number) => {
    if (!selectedProduct || !selectedProduct.ProductSizeStock) return
    const updatedStock = selectedProduct.ProductSizeStock.filter((_, i) => i !== index)
    setSelectedProduct({ ...selectedProduct, ProductSizeStock: updatedStock })
  }

  async function handleFullUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return
    setIsSaving(true)
    try {
      const updateProductSql = `
        UPDATE public."Product" 
        SET name = $1, price_regular = $2, price_promo = $3, description = $4, "brandId" = $5, "modelId" = $6, images = $7
        WHERE id = $8
      `;
      await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: updateProductSql,
          params: [
            selectedProduct.name, selectedProduct.price_regular, selectedProduct.price_promo, 
            selectedProduct.description, selectedProduct.brand_id, selectedProduct.model_id, 
            selectedProduct.images, selectedProduct.id
          ]
        })
      });

      await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql: `DELETE FROM public."ProductSizeStock" WHERE "productId" = $1`, params: [selectedProduct.id] })
      });

      for (const s of selectedProduct.ProductSizeStock) {
        await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({
            sql: `INSERT INTO public."ProductSizeStock" ("productId", "sizeId", stock) VALUES ($1, $2, $3)`,
            params: [selectedProduct.id, s.sizeId, s.stock]
          })
        });
      }

      alert('Mantap, Data Berhasil Diupdate!')
      setSelectedProduct(null)
      fetchInitialData()
    } catch (err: any) {
      alert("Gagal update: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if(!confirm("Yakin ingin menghapus?")) return;
    await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `DELETE FROM public."Product" WHERE id = $1`, params: [id] }) });
    fetchInitialData();
  }

  const displayProducts = products
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => filterBrand === 'all' || p.brand_id === filterBrand)
    .sort((a, b) => sortBy === 'az' ? a.name.localeCompare(b.name) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#FBFBFB] font-sans text-black overflow-x-hidden">
      
      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-h-screen lg:h-screen bg-white md:m-4 md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* HEADER SECTION */}
        <div className="p-4 md:p-8 border-b border-gray-50 flex flex-col gap-6 sticky top-0 bg-white z-40">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-black leading-none uppercase">SEMUA PRODUK</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 italic">HnM Store Produk</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {selectedIds.length > 0 && (
                <button onClick={handleBulkDelete} disabled={isDeletingBulk} className="flex-1 sm:flex-none bg-red-600 text-white px-5 py-3 rounded-xl text-[10px] font-black shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
                  {isDeletingBulk ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Hapus ({selectedIds.length})
                </button>
              )}
              <Link href="/admin/produk/tambah" className="flex-1 sm:flex-none bg-black text-white px-6 py-4 rounded-xl text-[10px] font-black shadow-xl flex items-center justify-center gap-2 uppercase tracking-[0.15em] active:scale-95 transition-all">
                <Plus size={16} /> Tambah Item
              </Link>
            </div>
          </div>

          {/* FILTERS SECTION */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari item di gudang..." 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-xl outline-none text-xs font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-black transition-all" 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            {/* Mobile Filter Toggle */}
            <button 
              className="md:hidden flex items-center justify-center gap-2 bg-gray-50 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
              onClick={() => setShowMobileFilter(!showMobileFilter)}
            >
              <Filter size={14} /> {showMobileFilter ? 'Tutup Filter' : 'Filter & Sort'}
            </button>

            <div className={`${showMobileFilter ? 'flex' : 'hidden'} md:flex flex-row gap-2`}>
              <select className="flex-1 bg-gray-50 rounded-xl px-4 py-4 text-[10px] font-black uppercase text-black outline-none cursor-pointer hover:bg-gray-100 transition-colors" onChange={(e) => setFilterBrand(e.target.value)}>
                <option value="all">Brands</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select className="flex-1 bg-gray-50 rounded-xl px-4 py-4 text-[10px] font-black uppercase text-black outline-none cursor-pointer hover:bg-gray-100 transition-colors" onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Terbaru</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-0">
          {loading ? (
            <div className="py-40 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-black" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Syncing database...</p>
            </div>
          ) : (
            <>
              {/* --- DESKTOP TABLE VIEW --- */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-white z-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b">
                    <tr>
                      <th className="pl-8 py-6 w-10 text-black">
                        <button onClick={toggleSelectAll}>
                          {selectedIds.length === displayProducts.length && displayProducts.length > 0 ? <CheckSquare size={18} className="text-black" /> : <Square size={18} />}
                        </button>
                      </th>
                      <th className="px-6 py-6 font-black">Detail Produk</th>
                      <th className="px-6 py-6 font-black">Varian & Stock</th>
                      <th className="px-6 py-6 font-black">Price Unit</th>
                      <th className="px-6 py-6 text-center font-black">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayProducts.map((p) => (
                      <tr key={p.id} className={`group transition-all ${selectedIds.includes(p.id) ? 'bg-gray-50/80' : 'hover:bg-gray-50/40'}`}>
                        <td className="pl-8 py-6">
                          <button onClick={() => toggleSelect(p.id)}>
                            {selectedIds.includes(p.id) ? <CheckCircle2 size={18} className="text-black" /> : <Square size={18} className="text-gray-100 group-hover:text-gray-300 transition-colors" />}
                          </button>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-sm">
                              <Image src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} alt={p.name} fill className="object-cover" unoptimized />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black truncate uppercase tracking-tight text-black leading-none">{p.name}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[9px] font-black bg-zinc-100 px-2 py-0.5 rounded uppercase text-zinc-500">{p.Brand?.name}</span>
                                <span className="text-[9px] font-bold text-gray-300">/</span>
                                <span className="text-[9px] font-black text-zinc-300 uppercase">{p.Model?.name}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-wrap gap-1.5 max-w-60">
                            {p.ProductSizeStock?.map((s, i) => (
                              <div key={i} className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase transition-all ${s.stock < 5 ? 'bg-red-50 border-red-100 text-red-600 shadow-[0_4px_10px_rgba(220,38,38,0.1)]' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                SZ {s.Size?.value}: <span className={s.stock < 5 ? 'text-red-700' : 'text-black'}>{s.stock}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                           <div className="space-y-1">
                              <p className="font-black text-xs italic tracking-tighter">Rp {p.price_regular?.toLocaleString()}</p>
                              {p.price_promo && <p className="text-[9px] font-bold text-red-500 uppercase">Promo Active</p>}
                           </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Link href={`/produk/${p.slug}`} target="_blank" className="p-3 bg-white border border-gray-100 hover:bg-black hover:text-white rounded-xl transition-all shadow-sm"><Eye size={14} /></Link>
                            <button onClick={() => setSelectedProduct(p)} className="p-3 bg-white border border-gray-100 hover:bg-black hover:text-white rounded-xl transition-all shadow-sm"><Edit3 size={14} /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-3 bg-white border border-red-100 hover:bg-red-500 hover:text-white text-red-400 rounded-xl transition-all shadow-sm"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- MOBILE CARD VIEW --- */}
              <div className="lg:hidden space-y-4 pb-20">
                {displayProducts.map((p) => (
                  <div key={p.id} className={`p-4 rounded-xl border-2 transition-all ${selectedIds.includes(p.id) ? 'bg-zinc-50 border-black' : 'bg-white border-gray-50 shadow-sm'}`}>
                    <div className="flex gap-4">
                      <div className="w-20 h-20 relative rounded-xl overflow-hidden border border-gray-100 shrink-0 shadow-md">
                        <Image src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'} alt={p.name} fill className="object-cover" unoptimized />
                        <button 
                          onClick={() => toggleSelect(p.id)}
                          className="absolute top-1 left-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm"
                        >
                          {selectedIds.includes(p.id) ? <CheckCircle2 size={16} className="text-black" /> : <Square size={16} className="text-gray-200" />}
                        </button>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] font-black uppercase leading-tight truncate">{p.name}</p>
                          <p className="text-[9px] font-black text-blue-600 uppercase mt-1 tracking-widest">{p.Brand?.name}</p>
                        </div>
                        <p className="font-black text-xs italic mt-2">Rp {p.price_regular?.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                         <button onClick={() => setSelectedProduct(p)} className="p-2.5 bg-gray-50 rounded-xl"><Edit3 size={16} /></button>
                         <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5 pt-4 border-t border-gray-50">
                      {p.ProductSizeStock?.map((s, i) => (
                        <span key={i} className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${s.stock < 5 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100'}`}>
                          {s.Size?.value}: {s.stock}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- EDIT DRAWER (RESPONSIVE) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-100 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !showMediaModal && setSelectedProduct(null)} />
          <div className="relative w-full md:max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col overflow-hidden md:rounded-l-[3rem]">
            
            <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="space-y-1">
                <h2 className="font-black text-xl md:text-2xl italic text-black uppercase tracking-tighter leading-none">Editor <span className="text-zinc-300">Produk.</span></h2>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Update Master Data Gudang</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-3 bg-gray-50 rounded-xl hover:rotate-90 text-black hover:bg-red-500 hover:text-white transition-all duration-300"><X size={24} /></button>
            </div>

            <form onSubmit={handleFullUpdate} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar pb-32">
              
              {/* IMAGE GALLERY EDITOR */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">Visual Asset</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedProduct.images?.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group bg-gray-50 shadow-sm">
                      <Image src={`/uploads/${img}`} fill className="object-cover" alt="p" unoptimized />
                      <button type="button" onClick={() => setSelectedProduct({...selectedProduct, images: selectedProduct.images.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-black text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-600"><X size={12}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setShowMediaModal(true)} className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl hover:bg-black hover:border-black hover:text-white transition-all group">
                    <ImageIcon size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black mt-2 uppercase tracking-widest">Library</span>
                  </button>
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl hover:bg-black hover:border-black hover:text-white cursor-pointer transition-all group">
                    {uploading ? <Loader2 className="animate-spin" size={24}/> : <Upload size={24} className="group-hover:scale-110 transition-transform" />}
                    <span className="text-[9px] font-black mt-2 uppercase tracking-widest">Upload</span>
                    <input type="file" multiple className="hidden" onChange={handleEditUpload} />
                  </label>
                </div>
              </div>

              {/* FORM FIELDS */}
              <div className="space-y-8">
                <div className="group border-b-2 border-gray-50 focus-within:border-black transition-all py-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Product Identity</label>
                  <input type="text" value={selectedProduct.name} onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})} className="w-full outline-none font-black text-xl md:text-2xl bg-transparent uppercase tracking-tighter" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Inventory Stock</label>
                    <div className="space-y-2">
                      {selectedProduct.ProductSizeStock?.map((s, index) => (
                        <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border border-transparent hover:border-black transition-all group">
                          <select value={s.sizeId} onChange={(e) => handleUpdateStockValue(index, 'sizeId', e.target.value)} className="flex-1 bg-white rounded-xl p-2.5 text-[10px] font-black outline-none appearance-none cursor-pointer uppercase">
                            {sizes.map(sz => <option key={sz.id} value={sz.id}>SZ {sz.value}</option>)}
                          </select>
                          <input type="number" value={s.stock} onChange={(e) => handleUpdateStockValue(index, 'stock', e.target.value)} className="w-16 bg-white rounded-xl p-2.5 text-[10px] font-black text-center outline-none border-none shadow-sm" />
                          <button type="button" onClick={() => handleRemoveSizeRow(index)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={handleAddSizeRow} className="w-full py-3 border-2 border-dashed border-gray-100 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:border-black hover:text-black transition-all tracking-widest">+ Add Size Row</button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Financials</label>
                       <div className="bg-zinc-900 p-6 rounded-xl text-white shadow-2xl space-y-6">
                          <div>
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.2em] block mb-2">Price Regular</label>
                            <input type="number" value={selectedProduct.price_regular} onChange={(e) => setSelectedProduct({...selectedProduct, price_regular: parseInt(e.target.value)})} className="w-full bg-transparent border-b border-zinc-800 focus:border-white outline-none font-black text-lg italic transition-all" />
                          </div>
                          <div>
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.2em] block mb-2 ">Price Promo</label>
                            <input type="number" value={selectedProduct.price_promo || ''} onChange={(e) => setSelectedProduct({...selectedProduct, price_promo: parseInt(e.target.value)})} className="w-full bg-transparent border-b border-zinc-800 focus:border-red-500 outline-none font-black text-lg italic text-red-500 transition-all" />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Brand Label</label>
                    <select value={selectedProduct.brand_id} onChange={(e) => setSelectedProduct({...selectedProduct, brand_id: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-[11px] font-black uppercase outline-none appearance-none cursor-pointer hover:bg-zinc-100 transition-colors">
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Series Model</label>
                    <select value={selectedProduct.model_id} onChange={(e) => setSelectedProduct({...selectedProduct, model_id: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-[11px] font-black uppercase outline-none appearance-none cursor-pointer hover:bg-zinc-100 transition-colors">
                      {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic px-1">Description Brief</label>
                  <textarea value={selectedProduct.description} onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})} className="w-full bg-gray-50 rounded-xl p-6 text-xs font-medium h-40 resize-none outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>
              </div>
            </form>

            <div className="p-6 md:p-10 bg-white border-t border-gray-50 sticky bottom-0">
              <button type="submit" onClick={handleFullUpdate} disabled={isSaving} className="w-full py-6 bg-black text-white rounded-xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-zinc-800 disabled:bg-gray-200">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Update Item Katalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MEDIA MODAL (RESPONSIVE) --- */}
      {showMediaModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowMediaModal(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-black uppercase italic tracking-tighter text-xl">Cloud <span className="text-zinc-300">Library.</span></h3>
              <button onClick={() => setShowMediaModal(false)} className="bg-gray-50 p-2 rounded-xl text-black"><X size={20}/></button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-gray-50 custom-scrollbar">
              {existingImages.map((name, i) => (
                <div 
                  key={i} 
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all duration-300 ${selectedProduct?.images.includes(name) ? 'border-black scale-95 shadow-xl' : 'border-transparent hover:scale-105'}`}
                  onClick={() => {
                    if (!selectedProduct) return
                    const has = selectedProduct.images.includes(name)
                    setSelectedProduct({
                      ...selectedProduct,
                      images: has ? selectedProduct.images.filter(u => u !== name) : [...selectedProduct.images, name]
                    })
                  }}
                >
                  <Image src={`/uploads/${name}`} fill className="object-cover" alt="m" unoptimized />
                  {selectedProduct?.images.includes(name) && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <CheckCircle2 className="text-white drop-shadow-lg" size={40} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 bg-white border-t flex justify-end">
               <button onClick={() => setShowMediaModal(false)} className="bg-black text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Selesai</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #000; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  )
}