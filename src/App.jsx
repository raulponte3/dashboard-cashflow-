import { useEffect, useState } from "react"

const formatCLP = (n) =>
  n.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  })

export default function App() {
  const [data, setData] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState("ALL")

  useEffect(() => {
    fetch("/api/sheets")
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
  }, [])

  if (!data) return <div style={styles.loading}>Cargando dashboard…</div>

  const semanas = data.semanas

  // ─────────────────────────────
  // Filtro por semana
  // ─────────────────────────────
  const filteredWeeks =
    selectedWeek === "ALL"
      ? semanas
      : semanas.filter(s => s.semana === selectedWeek)

  const sum = (key) =>
    filteredWeeks.reduce((acc, w) => acc + (w[key] || 0), 0)

  const ingresos = sum("ingresos")
  const egresos = sum("egresos")
  const saldo = sum("saldo")

  // ─────────────────────────────
  // FORECAST (promedio últimas 4 semanas)
  // ─────────────────────────────
  const lastWeeks = semanas.slice(-4)

  const avg = (key) =>
    Math.round(
      lastWeeks.reduce((a, b) => a + b[key], 0) / lastWeeks.length
    )

  const forecast = {
    ingresos: avg("ingresos"),
    egresos: avg("egresos"),
    saldo: avg("ingresos") - avg("egresos")
  }

  return (
    <div style={styles.page}>
      <h1>📊 Dashboard Flujo de Caja</h1>

      {/* Selector */}
      <div style={styles.selector}>
        <label>Semana:</label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
        >
          <option value="ALL">Todas</option>
          {semanas.map(s => (
            <option key={s.semana} value={s.semana}>
              {s.semana}
            </option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div style={styles.kpis}>
        <KPI title="Ingresos" value={formatCLP(ingresos)} />
        <KPI title="Egresos" value={formatCLP(egresos)} />
        <KPI title="Saldo" value={formatCLP(saldo)} />
        <KPI
          title="Saldo Acumulado"
          value={formatCLP(data.resumen.saldoAcumulado)}
        />
      </div>

      {/* Forecast */}
      <h2>🔮 Forecast próxima semana</h2>
      <div style={styles.kpis}>
        <KPI title="Ingresos esperados" value={formatCLP(forecast.ingresos)} />
        <KPI title="Egresos esperados" value={formatCLP(forecast.egresos)} />
        <KPI title="Saldo proyectado" value={formatCLP(forecast.saldo)} />
      </div>

      {/* Rankings */}
      <div style={styles.columns}>
        <Ranking
          title="Top Ingresos"
          items={data.topIngresos}
          positive
        />
        <Ranking
          title="Top Egresos"
          items={data.topEgresos}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────
// COMPONENTES
// ─────────────────────────────

function KPI({ title, value }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiTitle}>{title}</div>
      <div style={styles.kpiValue}>{value}</div>
    </div>
  )
}

function Ranking({ title, items }) {
  return (
    <div style={styles.card}>
      <h3>{title}</h3>
      <ul style={styles.list}>
        {items.map(i => (
          <li key={i.categoria} style={styles.listItem}>
            <span>{i.categoria}</span>
            <strong>{formatCLP(i.monto)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────
// STYLES
// ─────────────────────────────

const styles = {
  page: {
    padding: "24px",
    fontFamily: "system-ui",
    background: "#f5f7fa",
    minHeight: "100vh"
  },
  loading: {
    padding: 40,
    fontSize: 18
  },
  selector: {
    marginBottom: 20,
    display: "flex",
    gap: 12,
    alignItems: "center"
  },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 32
  },
  kpi: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
  },
  kpiTitle: {
    fontSize: 14,
    color: "#555"
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 8
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24
  },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #eee"
  }
}
