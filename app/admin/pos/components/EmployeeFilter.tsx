'use client'

import { useEffect, useState } from 'react'
import { User } from 'lucide-react'

type Employee = { id: string; full_name: string }

interface Props {
  value: string
  onChange: (id: string) => void
}

export default function EmployeeFilter({ value, onChange }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `SELECT id, full_name FROM public."Profiles" ORDER BY full_name ASC`,
            params: []
          })
        })
        const result = await res.json()
        setEmployees(result.data || [])
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  return (
    <div className="relative w-full md:w-56">
      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl text-xs uppercase outline-none border-none shadow-sm font-bold appearance-none"
      >
        <option value="">Semua Karyawan</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.full_name}
          </option>
        ))}
      </select>
    </div>
  )
}