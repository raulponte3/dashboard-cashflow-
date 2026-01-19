import { useEffect, useState } from "react"

function parseCLP(value) {
  if (!value) return 0
  return Number(value.replace(/[^\d-]/g, ""))
}

function sumObject(obj = {}) {
  return Object.values(obj).reduce((acc, v) => acc + parseCLP(v), 0)
}

export default function App() {
  const [data, setData] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    fetch("/api/sheets")
      .then(res => res.json())
      .then(res => {
        const cleaned = res.semanas
          .map((s, idx) => ({
            index: idx,
            label: s.semana || `Semana ${idx + 1}`,
            ingresos: sumObject(s.ingresosDetalle),
            egresos:
              sumObject(s.egresosDetalle) +
              sumObject(s.capexDetalle) +
              sumObject(s.impuestosDetalle)
          }))
          .filter(s => s.ingresos !== 0 || s.egresos !== 0)

        setData(cleaned)
      })
  }, [])

  if (!data.length) {
    return <div style={{ padding: 40 }}>Cargando datos...</div>
  }

  const selected = data[selectedIndex]
  const saldo = selected.ingresos - selected.egresos

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Dashboard Cashflow</h1>

      <select
        value={selectedIndex}
        onChange={e => setSelectedIndex(Number(e.target.value))}
      >
        {data.map(s => (
          <option key={s.index} value={s.index}>
            {s.label}
          </option>
        ))}
      </select>

      <div style={{ marginTop: 30 }}>
        <h3>Ingresos</h3>
        <p>${selected.ingresos.toLocaleString("es-CL")}</p>

        <h3>Egresos</h3>
        <p>${selected.egresos.toLocaleString("es-CL")}</p>

        <h3>Saldo Neto</h3>
        <p
          style={{
            color: saldo >= 0 ? "green" : "red",
            fontWeight: "bold"
          }}
        >
          ${saldo.toLocaleString("es-CL")}
        </p>
      </div>
    </div>
  )
}
