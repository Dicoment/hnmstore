'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Plus, Search, Edit3, Trash2, Eye, Loader2, X, Save, 
  CheckSquare, Square, CheckCircle2, ImageIcon, Upload 
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
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT unnest(images) as url FROM public."Product" LIMIT 50` }) }).then(r => r.json())
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
      setExistingImages(Array.from(new Set((imgRes.data || []).map((i: any) => i.url))))
    } catch (err) {
      console.error("Gagal load data VPS:", err)
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
        formData.append('folder', 'products')
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) uploadedUrls.push(data.url)
      }
      setSelectedProduct({
        ...selectedProduct,
        images: [...(selectedProduct.images || []), ...uploadedUrls]
      })
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
    <div className="flex flex-col lg:flex-row h-screen lg:overflow-hidden font-sans gap-6 bg-gray-50/50">
      <div className="flex flex-col flex-1 h-screen bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        
        {/* Header Section */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter text-gray-900 leading-tight uppercase">MANAJEMEN KATALOG</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">HnM Store Inventory</p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {selectedIds.length > 0 && (
                <button onClick={handleBulkDelete} disabled={isDeletingBulk} className="flex-1 md:flex-none bg-red-600 text-white px-5 py-3 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2">
                  {isDeletingBulk ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} HAPUS ({selectedIds.length})
                </button>
              )}
              <Link href="/admin/produk/tambah" className="flex-1 md:flex-none bg-black text-white px-5 py-3 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2">
                <Plus size={14} /> TAMBAH PRODUK
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 text-black">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input type="text" placeholder="Cari nama produk..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none text-sm font-bold placeholder:text-gray-300" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <select className="bg-gray-50 rounded-xl px-4 py-3 text-xs font-black uppercase text-black outline-none" onChange={(e) => setFilterBrand(e.target.value)}>
                <option value="all">Semua Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select className="bg-gray-50 rounded-xl px-4 py-3 text-xs font-black uppercase text-black outline-none" onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Terbaru</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? <div className="py-20 text-center text-black"><Loader2 className="animate-spin mx-auto" /></div> : (
            <table className="hidden lg:table w-full text-left">
              <thead className="sticky top-0 bg-white z-10 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b">
                <tr>
                  <th className="pl-6 py-6 w-10"><button onClick={toggleSelectAll}>{selectedIds.length === displayProducts.length && displayProducts.length > 0 ? <CheckSquare size={18} className="text-black" /> : <Square size={18} />}</button></th>
                  <th className="px-6 py-6">Produk</th>
                  <th className="px-6 py-6">Varian & Stok</th>
                  <th className="px-6 py-6">Harga</th>
                  <th className="px-6 py-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-black">
                {displayProducts.map((p) => (
                  <tr key={p.id} className={`group ${selectedIds.includes(p.id) ? 'bg-gray-50' : 'hover:bg-gray-50/30'}`}>
                    <td className="pl-6 py-6"><button onClick={() => toggleSelect(p.id)}>{selectedIds.includes(p.id) ? <CheckCircle2 size={18} className="text-black" /> : <Square size={18} className="text-gray-200" />}</button></td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-gray-50 border shrink-0"><Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover" unoptimized /></div>
                        <div className="min-w-0"><p className="text-sm font-black truncate uppercase tracking-tight">{p.name}</p><p className="text-[11px] font-bold text-blue-600 uppercase mt-0.5">{p.Brand?.name}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-wrap gap-1.5 max-w-50">
                        {p.ProductSizeStock?.map((s, i) => (
                          <div key={i} className="bg-gray-50 px-2 py-1 border border-gray-100 rounded text-[11px] font-black">
                            {s.Size?.value}: <span className={s.stock < 5 ? 'text-red-500' : 'text-gray-900'}>{s.stock}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-6 font-black text-sm italic">Rp {p.price_regular?.toLocaleString()}</td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex justify-center gap-2">
                        <Link href={`/produk/${p.slug}`} target="_blank" className="p-2.5 bg-gray-50 hover:bg-black hover:text-white rounded-xl transition-all"><Eye size={14} /></Link>
                        <button onClick={() => setSelectedProduct(p)} className="p-2.5 bg-gray-50 hover:bg-black hover:text-white rounded-xl transition-all"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-xl transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 z-60 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !showMediaModal && setSelectedProduct(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden rounded-l-xl">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <div>
                <h2 className="font-black text-xl italic text-gray-900 uppercase tracking-tighter">Edit Produk</h2>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ubah Detail Item Katalog</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleFullUpdate} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Galeri Foto</label>
                <div className="grid grid-cols-3 gap-3">
                  {selectedProduct.images?.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border group bg-gray-50">
                      <Image src={img} fill className="object-cover" alt="p" unoptimized />
                      <button type="button" onClick={() => setSelectedProduct({...selectedProduct, images: selectedProduct.images.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-black text-white p-1  rounded-xl opacity-0 group-hover:opacity-100 transition-all"><X size={10}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setShowMediaModal(true)} className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl hover:bg-gray-50 text-gray-400 transition-all">
                    <ImageIcon size={20} />
                    <span className="text-[10px] font-black mt-2 uppercase">Media</span>
                  </button>
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl hover:bg-gray-50 text-gray-400 cursor-pointer transition-all">
                    {uploading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20} />}
                    <span className="text-[10px] font-black mt-2 uppercase">Upload</span>
                    <input type="file" multiple className="hidden" onChange={handleEditUpload} />
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <div className="group border-b border-gray-100 focus-within:border-black transition-all py-2 text-black">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1 italic">Nama Produk</label>
                  <input type="text" value={selectedProduct.name} onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})} className="w-full outline-none font-black text-base bg-transparent uppercase" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-black">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">Varian Stok</label>
                    <button type="button" onClick={handleAddSizeRow} className="text-[11px] font-black text-blue-600 hover:underline">+ TAMBAH SIZE</button>
                  </div>
                  <div className="space-y-2">
                    {selectedProduct.ProductSizeStock?.map((s, index) => (
                      <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-100 text-black">
                        <div className="flex-1">
                          <select value={s.sizeId} onChange={(e) => handleUpdateStockValue(index, 'sizeId', e.target.value)} className="w-full bg-white rounded-lg p-2 text-xs font-black outline-none border-gray-200 border">
                            {sizes.map(sz => <option key={sz.id} value={sz.id}>Size {sz.value}</option>)}
                          </select>
                        </div>
                        <div className="w-20">
                          <input type="number" value={s.stock} onChange={(e) => handleUpdateStockValue(index, 'stock', e.target.value)} className="w-full bg-white rounded-lg p-2 text-xs font-black outline-none border-gray-200 border" />
                        </div>
                        <button type="button" onClick={() => handleRemoveSizeRow(index)} className="p-2 text-red-400 hover:text-red-600 bg-white rounded-lg border border-gray-200"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-black">
                  <div className="group border-b border-gray-100 focus-within:border-black transition-all py-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase block mb-1">Harga Normal</label>
                    <input type="number" value={selectedProduct.price_regular} onChange={(e) => setSelectedProduct({...selectedProduct, price_regular: parseInt(e.target.value)})} className="w-full outline-none font-black text-sm italic bg-transparent" />
                  </div>
                  <div className="group border-b border-gray-100 focus-within:border-black transition-all py-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase block mb-1">Harga Promo</label>
                    <input type="number" value={selectedProduct.price_promo || ''} onChange={(e) => setSelectedProduct({...selectedProduct, price_promo: parseInt(e.target.value)})} className="w-full outline-none font-black text-sm italic text-red-500 bg-transparent" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-black">
                  <div className="space-y-1"><label className="text-[11px] font-black text-gray-400 uppercase block">Brand</label><select value={selectedProduct.brand_id} onChange={(e) => setSelectedProduct({...selectedProduct, brand_id: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-black uppercase outline-none">{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[11px] font-black text-gray-400 uppercase block">Model</label><select value={selectedProduct.model_id} onChange={(e) => setSelectedProduct({...selectedProduct, model_id: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-black uppercase outline-none">{models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                </div>

                <div className="space-y-1 pb-10 text-black">
                  <label className="text-[11px] font-black text-gray-400 uppercase block italic">Deskripsi Produk</label>
                  <textarea value={selectedProduct.description} onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-medium h-32 resize-none outline-none focus:ring-1 focus:ring-black" />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-4 pb-6 border-t">
                <button type="submit" disabled={isSaving} className="w-full py-4 bg-black text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} SIMPAN PERUBAHAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowMediaModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 font-black uppercase italic tracking-tighter">
              <h3 className="text-base text-black">Gudang Media VPS</h3>
              <button onClick={() => setShowMediaModal(false)} className="text-gray-400 hover:text-black transition-all"><X size={24}/></button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white">
              {existingImages.map((url, i) => (
                <div 
                  key={i} 
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${selectedProduct?.images.includes(url) ? 'border-black' : 'border-transparent hover:border-gray-100'}`}
                  onClick={() => {
                    if (!selectedProduct) return
                    const has = selectedProduct.images.includes(url)
                    setSelectedProduct({
                      ...selectedProduct,
                      images: has ? selectedProduct.images.filter(u => u !== url) : [...selectedProduct.images, url]
                    })
                  }}
                >
                  <Image src={url} fill className="object-cover" alt="m" unoptimized />
                  {selectedProduct?.images.includes(url) && <div className="absolute inset-0 bg-black/20 flex items-center justify-center animate-in fade-in zoom-in"><CheckCircle2 className="text-white shadow-lg" size={32} /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 4px; }
      `}</style>
    </div>
  )
}