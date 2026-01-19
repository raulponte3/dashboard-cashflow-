import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const SHEET_ID = import.meta.env.VITE_SHEET_ID
const RANGE = 'Hoja1!A2:E'

const COLORS = ['#6366f1', '#22c55e', '#ef4444']

function App() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`
        const res = await fetch(url)
        const data = await res.json()

        const parsed = data.values.map(r => ({
          week: r[0],
          ingresos: Number(r[1]),
          egresos: Number(r[2]),
          saldoInicial: Number(r[3]),
          saldoFinal: Number(r[4]),
          saldoNeto: Number(r[1]) - Number(r[2])
        }))

        setRows(parsed)
      } catch (e) {
        console.error('Error cargando datos', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-600">
        Cargando dashboard…
      </div>
    )
  }

  const totalIngresos = rows.reduce((a, b) => a + b.ingresos, 0)
  const totalEgresos = rows.reduce((a, b) => a + b.egresos, 0)
  const saldoFinal = rows.at(-1)?.saldoFinal ?? 0
  const avgIngresos = totalIngresos / rows.length
  const avgEgresos = totalEgresos / rows.length
  const weeksNegative = rows.filter(r => r.saldoNeto < 0).length

  const weeksUntilZero = (() => {
    const avgBurn = avgEgresos - avgIngresos
    if (avgBurn <= 0) return null
    return Math.ceil(saldoFinal / avgBurn)
  })()

  const pieData = [
    { name: 'Ingresos', value: totalIngresos },
    { name: 'Egresos', value: totalEgresos }
  ]

  const formatCurrency = v =>
    '$' + v.toLocaleString('es-CL')

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">
          Dashboard Financiero
        </h1>

        {/* Tabs */}
        <div className="flex gap-2">
          {['dashboard', 'cashflow', 'analysis'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-xl shadow p-6 space-y-6">

          {activeTab === 'dashboard' && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">Ingresos Totales</p>
                  <p className="text-xl font-bold">{formatCurrency(totalIngresos)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">Egresos Totales</p>
                  <p className="text-xl font-bold">{formatCurrency(totalEgresos)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">Saldo Final</p>
                  <p className="text-xl font-bold">{formatCurrency(saldoFinal)}</p>
                </div>
              </div>

              {/* Pie */}
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}

          {activeTab === 'cashflow' && (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={v => '$' + v / 1000000 + 'M'} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#22c55e" fill="#bbf7d0" />
                <Area type="monotone" dataKey="egresos" stackId="1" stroke="#ef4444" fill="#fecaca" />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" angle={-45} textAnchor="end" height={70} />
                  <YAxis tickFormatter={v => '$' + v / 1000000 + 'M'} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="saldoNeto" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>

              <div className="bg-slate-50 border rounded-lg p-6">
                <h3 className="font-semibold mb-3">Insights Clave</h3>
                <ul className="list-disc ml-5 space-y-2 text-sm">
                  <li>Promedio ingresos: <strong>{formatCurrency(avgIngresos)}</strong></li>
                  <li>Promedio egresos: <strong>{formatCurrency(avgEgresos)}</strong></li>
                  <li>Semanas negativas: <strong>{weeksNegative}</strong></li>
                  {weeksUntilZero && (
                    <li className="text-red-600 font-semibold">
                      Saldo a cero en ~{weeksUntilZero} semanas
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default App
