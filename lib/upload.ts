// Satu-satunya tempat yang memanggil /api/upload.
// Mengembalikan nama file yang tersimpan (mis. "nike-air-max-90.webp"),
// atau melempar Error dengan pesan yang bisa langsung ditampilkan ke admin.
export async function uploadImage(file: File, productName = ''): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', productName) // nama file mengikuti nama produk

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))

  if (!res.ok || data.error) throw new Error(data.error || 'Upload gagal!')
  return data.fileName ?? String(data.url).split('/').pop() ?? ''
}