'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Plus, Search, Edit3, Trash2, Eye, Loader2, X, Save, 
  CheckSquare, Square, CheckCircle2 
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

  // State baru untuk Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  useEffect(() => {
    fetchInitialData()
    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Product' }, () => fetchInitialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ProductSizeStock' }, () => fetchInitialData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchInitialData() {
    try {
      setLoading(true)
      const [p, b, m, s] = await Promise.all([
        supabase.from('Product').select(`
          *, 
          Brand!brand_id(name), 
          Model!model_id(name),
          ProductSizeStock!productId(
            id,
            stock, 
            sizeId,
            Size!sizeId(value)
          )
        `).order('createdAt', { ascending: false }),
        supabase.from('Brand').select('*'),
        supabase.from('Model').select('*'),
        supabase.from('Size').select('*').order('value', { ascending: true })
      ])

      const productsWithUrls = (p.data as Product[])?.map(product => ({
        ...product,
        images: product.images?.map(img => 
          img.startsWith('http') ? img : supabase.storage.from('ProductImage').getPublicUrl(`public/${img}`).data.publicUrl
        )
      })) || []
      
      setProducts(productsWithUrls)
      setBrands((b.data as Brand[]) || [])
      setModels((m.data as Model[]) || [])
      setSizes((s.data as Size[]) || [])
    } finally {
      setLoading(false)
    }
  }

  // LOGIC SELEKSI BULK
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === displayProducts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(displayProducts.map(p => p.id))
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedIds.length} produk terpilih secara permanen?`)) return
    setIsDeletingBulk(true)
    try {
      const { error } = await supabase.from('Product').delete().in('id', selectedIds)
      if (error) throw error
      setSelectedIds([])
      alert('Produk berhasil dibersihkan!')
      fetchInitialData()
    } catch (err: any) {
      alert("Gagal hapus massal: " + err.message)
    } finally {
      setIsDeletingBulk(false)
    }
  }

  // --- LOGIC BAWAAN LO (GAK DIUBAH) ---
  const handleAddSizeRow = () => {
    if (!selectedProduct) return
    const firstSize = sizes[0]
    const newStockRow: ProductSizeStock = {
      sizeId: firstSize?.id,
      stock: 0,
      Size: { value: firstSize?.value }
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
    const updatedStock: ProductSizeStock[] = selectedProduct.ProductSizeStock.filter(
      (_: ProductSizeStock, i: number): boolean => i !== index
    )
    setSelectedProduct({ ...selectedProduct, ProductSizeStock: updatedStock })
  }

  async function handleFullUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return
    setIsSaving(true)
    try {
      const { error: pError } = await supabase
        .from('Product')
        .update({
          name: selectedProduct.name,
          price_regular: selectedProduct.price_regular,
          price_promo: selectedProduct.price_promo || null,
          description: selectedProduct.description,
          brand_id: selectedProduct.brand_id, 
          model_id: selectedProduct.model_id,
        })
        .eq('id', selectedProduct.id)

      if (pError) throw pError
      await supabase.from('ProductSizeStock').delete().eq('productId', selectedProduct.id)
      const stockData = selectedProduct.ProductSizeStock.map((s) => ({
        productId: selectedProduct.id,
        sizeId: s.sizeId,
        stock: s.stock
      }))
      if (stockData.length > 0) {
        const { error: sError } = await supabase.from('ProductSizeStock').insert(stockData)
        if (sError) throw sError
      }
      alert('Mantap, Data Berhasil Diupdate!')
      setSelectedProduct(null)
      fetchInitialData()
    } catch (err: unknown) {
      alert("Gagal update: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if(!confirm("Yakin ingin menghapus sepatu ini?")) return;
    const { error } = await supabase.from('Product').delete().eq('id', id);
    if (error) alert(error.message);
  }

  const displayProducts = products
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => filterBrand === 'all' || p.brand_id === filterBrand)
    .sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:overflow-hidden font-sans gap-6 bg-gray-50/50">
      <div className="flex flex-col flex-1 h-screen bg-white rounded-xl border border-gray-100  overflow-hidden">
        
        {/* Header Section */}
        <div className="p-4 md:p-8 border-b border-gray-50 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-black italic tracking-tighter text-gray-900 leading-tight uppercase">SEMUA PRODUK</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Inventory Management</p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {/* TOMBOL BULK DELETE ALA WORDPRESS */}
              {selectedIds.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="flex-1 md:flex-none bg-red-600 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isDeletingBulk ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  HAPUS ({selectedIds.length})
                </button>
              )}
              <Link href="/admin/produk/tambah" className="flex-1 md:flex-none bg-black text-white px-6 py-3 rounded-2xl text-xs font-black shadow-xl text-center transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                <Plus size={16} /> TAMBAH PRODUK
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input type="text" placeholder="Search product..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none text-sm font-medium focus:ring-2 focus:ring-black/5 text-black" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <select className="flex-1 md:flex-none bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none text-black/50" onChange={(e) => setFilterBrand(e.target.value)}>
                <option value="all">Brands</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select className="flex-1 md:flex-none bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none text-black/50" onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-black" /></div>
          ) : (
            <>
              <table className="hidden lg:table w-full text-left">
                <thead className="sticky top-0 bg-white z-10 text-[10px] font-black text-gray-400 uppercase tracking-[2px] border-b">
                  <tr>
                    <th className="pl-10 py-6 w-10">
                      <button onClick={toggleSelectAll} className="text-gray-300 hover:text-black transition-colors">
                        {selectedIds.length === displayProducts.length && displayProducts.length > 0 ? <CheckSquare size={20} className="text-black" /> : <Square size={20} />}
                      </button>
                    </th>
                    <th className="px-6 py-6 text-black/40">Product Details</th>
                    <th className="px-10 py-6">Sizes & Stock</th>
                    <th className="px-10 py-6">Price</th>
                    <th className="px-10 py-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayProducts.map((p) => {
                    const isSelected = selectedIds.includes(p.id)
                    return (
                      <tr key={p.id} className={`transition-all group ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50/30'}`}>
                        <td className="pl-10 py-6">
                          <button onClick={() => toggleSelect(p.id)} className="transition-colors">
                            {isSelected ? <CheckCircle2 size={20} className="text-black" /> : <Square size={20} className="text-gray-200 group-hover:text-gray-300" />}
                          </button>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 relative rounded-[20px] overflow-hidden bg-gray-50 border shadow-sm shrink-0">
                              <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover" unoptimized />
                            </div>
                            <div className="min-w-0 text-black">
                              <p className="text-base font-black tracking-tight leading-tight truncate uppercase">{p.name}</p>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{p.Brand?.name} • {p.Model?.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex text-black flex-wrap gap-2 max-w-[220px]">
                            {p.ProductSizeStock?.map((s, i) => (
                              <div key={i} className="bg-gray-50 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] font-black">
                                {s.Size?.value}: <span className={s.stock < 5 ? 'text-red-500' : 'text-gray-900'}>{s.stock}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-10 py-6 font-black text-sm text-black">
                          Rp {p.price_regular?.toLocaleString()}
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex justify-center gap-3 text-black">
                            <Link href={`/produk/${p.slug}`} target="_blank" className="p-3 bg-gray-50 hover:bg-black hover:text-white rounded-2xl transition-all"><Eye size={16} /></Link>
                            <button onClick={() => setSelectedProduct(p)} className="p-3 bg-gray-50 hover:bg-black hover:text-white rounded-2xl transition-all"><Edit3 size={16} /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-2xl transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Edit Drawer (Slide in from right) tetap sama */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 md:p-10 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="font-black text-xl md:text-2xl italic tracking-tighter text-gray-900 uppercase">Edit Product</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">HnM Store Admin</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-3 bg-white border rounded-full hover:bg-gray-50 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleFullUpdate} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
              <div className="aspect-square relative rounded-3xl overflow-hidden border-4 border-gray-50 shadow-inner group">
                <Image src={selectedProduct.images?.[0] || '/placeholder.png'} alt="preview" fill className="object-cover" unoptimized />
              </div>

              <div className="space-y-6">
                <div className="group border-b-2 border-gray-50 focus-within:border-black transition-all py-2 text-black">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Product Name</label>
                  <input type="text" value={selectedProduct.name} onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})} className="w-full outline-none font-black text-lg bg-transparent uppercase" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Stock per Size</label>
                    <button type="button" onClick={handleAddSizeRow} className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline">
                      <Plus size={14} /> ADD SIZE
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedProduct.ProductSizeStock?.map((s, index) => (
                      <div key={index} className="flex gap-3 items-end bg-gray-50 p-4 rounded-2xl border border-gray-100 text-black">
                        <div className="flex-1">
                          <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Size</p>
                          <select value={s.sizeId} onChange={(e) => handleUpdateStockValue(index, 'sizeId', e.target.value)} className="w-full bg-white border-none rounded-lg p-2 text-xs font-black outline-none">
                            {sizes.map(sz => <option key={sz.id} value={sz.id}>Size {sz.value}</option>)}
                          </select>
                        </div>
                        <div className="w-20 md:w-24">
                          <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Stock</p>
                          <input type="number" value={s.stock} onChange={(e) => handleUpdateStockValue(index, 'stock', e.target.value)} className="w-full bg-white border-none rounded-lg p-2 text-xs font-black outline-none" />
                        </div>
                        <button type="button" onClick={() => handleRemoveSizeRow(index)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-black">
                  <div className="group border-b-2 border-gray-50 focus-within:border-black transition-all py-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Regular Price</label>
                    <input type="number" value={selectedProduct.price_regular} onChange={(e) => setSelectedProduct({...selectedProduct, price_regular: parseInt(e.target.value)})} className="w-full outline-none font-black bg-transparent text-sm" />
                  </div>
                  <div className="group border-b-2 border-gray-50 focus-within:border-black transition-all py-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Promo Price</label>
                    <input type="number" value={selectedProduct.price_promo || ''} onChange={(e) => setSelectedProduct({...selectedProduct, price_promo: parseInt(e.target.value)})} className="w-full outline-none font-black text-red-500 bg-transparent text-sm" placeholder="0" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase block">Brand</label>
                    <select value={selectedProduct.brand_id} onChange={(e) => setSelectedProduct({...selectedProduct, brand_id: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-[10px] font-black uppercase outline-none text-black">
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase block">Model</label>
                    <select value={selectedProduct.model_id} onChange={(e) => setSelectedProduct({...selectedProduct, model_id: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-[10px] font-black uppercase outline-none text-black">
                      {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1 pb-10">
                  <label className="text-[9px] font-black text-gray-400 uppercase block">Description</label>
                  <textarea value={selectedProduct.description} onChange={(e) => setSelectedProduct({...selectedProduct, description: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-medium h-32 resize-none outline-none focus:ring-1 focus:ring-black text-black/60" />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-4 pb-2">
                <button type="submit" disabled={isSaving} className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}