import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

export default function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sheets')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-10">Cargando dashboard…</div>
  }

  const totalIngresos = data.reduce((a, b) => a + b.ingresos, 0)
  const totalEgresos = data.reduce((a, b) => a + b.egresos, 0)
  const saldoFinal = data.at(-1)?.saldoFinal ?? 0

  const money = v => '$' + v.toLocaleString('es-CL')

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Cashflow Dashboard</h1>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Ingresos</p>
            <p className="text-xl font-bold">{money(totalIngresos)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Egresos</p>
            <p className="text-xl font-bold">{money(totalEgresos)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Saldo Final</p>
            <p className="text-xl font-bold">{money(saldoFinal)}</p>
          </div>
        </div>

        {/* Cashflow */}
        <div className="bg-white p-6 rounded-xl shadow">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip formatter={money} />
              <Area dataKey="ingresos" stroke="#22c55e" fill="#bbf7d0" />
              <Area dataKey="egresos" stroke="#ef4444" fill="#fecaca" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Resultado */}
        <div className="bg-white p-6 rounded-xl shadow">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip formatter={money} />
              <Bar dataKey="saldoNeto" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
