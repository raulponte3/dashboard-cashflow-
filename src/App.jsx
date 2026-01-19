import { useEffect, useState, useMemo } from "react"

/* ─────────────────────────────
   Utils
───────────────────────────── */
const parseCLP = (v) => {
  if (!v) return 0
  if (typeof v === "number") return v
  return Number(
    v.replace(/\$/g, "")
     .replace(/\./g, "")
     .replace(/,/g, "")
     .trim()
  ) || 0
}

const formatCLP = (n) =>
  n.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  })

/* ───────────────────────────── */

export default function App() {
  const [raw, setRaw] = useState(null)
  const [mes, setMes] = useState("ALL")
  const [semana, setSemana] = useState("ALL")

  useEffect(() => {
    fetch("/api/sheets")
      .then(r => r.json())
      .then(setRaw)
  }, [])

  if (!raw) return <div style={styles.loading}>Cargando…</div>

  /* ─────────────────────────────
     Estructura esperada del backend
     raw.semanas = [
       {
         mes: "Octubre",
         semana: "Semana 2 (6-12)",
         ingresosDetalle: { Mercadolibre: "$5.000.000", ... },
         egresosDetalle: { Publicidad: "$2.455.084", ... },
         capexDetalle: {...},
         impuestosDetalle: {...}
       }
     ]
  ───────────────────────────── */

  const meses = [...new Set(raw.semanas.map(s => s.mes))]

  const semanasDisponibles = raw.semanas
    .filter(s => mes === "ALL" || s.mes === mes)
    .map(s => s.semana)

  const dataFiltrada = raw.semanas.filter(s =>
    (mes === "ALL" || s.mes === mes) &&
    (semana === "ALL" || s.semana === semana)
  )

  /* ─────────────────────────────
     Cálculos reales
  ───────────────────────────── */
  const resumen = useMemo(() => {
    let ingresos = 0
    let egresos = 0
    let capex = 0
    let impuestos = 0

    const ingresosCat = {}
    const egresosCat = {}

    dataFiltrada.forEach(s => {
      Object.entries(s.ingresosDetalle || {}).forEach(([k, v]) => {
        const n = parseCLP(v)
        ingresos += n
        ingresosCat[k] = (ingresosCat[k] || 0) + n
      })

      Object.entries(s.egresosDetalle || {}).forEach(([k, v]) => {
        const n = parseCLP(v)
        egresos += n
        egresosCat[k] = (egresosCat[k] || 0) + n
      })

      Object.values(s.capexDetalle || {}).forEach(v => capex += parseCLP(v))
      Object.values(s.impuestosDetalle || {}).forEach(v => impuestos += parseCLP(v))
    })

    return {
      ingresos,
      egresos,
      capex,
      impuestos,
      saldo: ingresos - egresos - capex - impuestos,
      topIngresos: Object.entries(ingresosCat)
        .map(([k, v]) => ({ categoria: k, monto: v }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5),
      topEgresos: Object.entries(egresosCat)
        .map(([k, v]) => ({ categoria: k, monto: v }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5)
    }
  }, [dataFiltrada])

  /* ───────────────────────────── */
  return (
    <div style={styles.page}>
      <h1>Dashboard Flujo de Caja</h1>

      <div style={styles.filters}>
        <select value={mes} onChange={e => {
          setMes(e.target.value)
          setSemana("ALL")
        }}>
          <option value="ALL">Todos los meses</option>
          {meses.map(m => <option key={m}>{m}</option>)}
        </select>

        <select value={semana} onChange={e => setSemana(e.target.value)}>
          <option value="ALL">Todas las semanas</option>
          {semanasDisponibles.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={styles.kpis}>
        <KPI title="Ingresos" value={formatCLP(resumen.ingresos)} />
        <KPI title="Egresos" value={formatCLP(resumen.egresos)} />
        <KPI title="CAPEX" value={formatCLP(resumen.capex)} />
        <KPI title="Impuestos" value={formatCLP(resumen.impuestos)} />
        <KPI title="Saldo Neto" value={formatCLP(resumen.saldo)} />
      </div>

      <div style={styles.columns}>
        <Ranking title="Top Ingresos" items={resumen.topIngresos} />
        <Ranking title="Top Egresos" items={resumen.topEgresos} />
      </div>
    </div>
  )
}

/* ───────────────────────────── */

function KPI({ title, value }) {
  return (
    <div style={styles.kpi}>
      <div>{title}</div>
      <strong>{value}</strong>
    </div>
  )
}

function Ranking({ title, items }) {
  return (
    <div style={styles.card}>
      <h3>{title}</h3>
      {items.map(i => (
        <div key={i.categoria} style={styles.row}>
          <span>{i.categoria}</span>
          <strong>{formatCLP(i.monto)}</strong>
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────────── */

const styles = {
  page: { padding: 24, fontFamily: "system-ui", background: "#f5f7fa" },
  loading: { padding: 40 },
  filters: { display: "flex", gap: 12, marginBottom: 20 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 16 },
  kpi: { background: "#fff", padding: 16, borderRadius: 8 },
  columns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 },
  card: { background: "#fff", padding: 20, borderRadius: 8 },
  row: { display: "flex", justifyContent: "space-between", marginBottom: 8 }
}
