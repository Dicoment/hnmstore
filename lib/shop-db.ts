// Satu pintu untuk semua query dari browser ke /api/vps-db.
// Kalau endpoint nanti diamankan atau diganti, cukup ubah file ini.
// Pakai params ($1, $2, ...) untuk nilai dari user, jangan disambung ke string SQL.
export async function queryDb<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch('/api/vps-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data ?? []
}