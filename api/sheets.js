import { google } from "googleapis"

export default async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Hoja 1!A1:Z300"
    })

    const rows = response.data.values

    const parseMoney = (v) =>
      Number(
        String(v || "0")
          .replace(/\$/g, "")
          .replace(/\./g, "")
          .replace(/,/g, "")
      )

    const findRowIndex = (label) =>
      rows.findIndex(r => r[0]?.toLowerCase().includes(label.toLowerCase()))

    // ─────────────────────────────
    // Semanas
    // ─────────────────────────────
    const semanas = rows[2].slice(1)

    // ─────────────────────────────
    // Totales
    // ─────────────────────────────
    const idxIngresos = findRowIndex("total ingresos")
    const idxEgresos = findRowIndex("total egresos")
    const idxSaldoFinal = findRowIndex("saldo final")

    const semanasData = semanas.map((s, i) => ({
      semana: s,
      ingresos: parseMoney(rows[idxIngresos]?.[i + 1]),
      egresos: parseMoney(rows[idxEgresos]?.[i + 1]),
      saldo: parseMoney(rows[idxSaldoFinal]?.[i + 1])
    }))

    // ─────────────────────────────
    // Acumulados
    // ─────────────────────────────
    const totalIngresos = semanasData.reduce((a, b) => a + b.ingresos, 0)
    const totalEgresos = semanasData.reduce((a, b) => a + b.egresos, 0)

    // ─────────────────────────────
    // OPEX / CAPEX / IMPUESTOS
    // ─────────────────────────────
    const idxOpex = findRowIndex("opex")
    const idxCapex = findRowIndex("capex")
    const idxImpuestos = findRowIndex("impuesto")

    const sumSection = (startIdx) => {
      let sum = 0
      for (let i = startIdx + 1; i < rows.length; i++) {
        if (!rows[i][0]) break
        for (let c = 1; c < semanas.length + 1; c++) {
          sum += parseMoney(rows[i][c])
        }
      }
      return sum
    }

    const totalOpex = idxOpex !== -1 ? sumSection(idxOpex) : 0
    const totalCapex = idxCapex !== -1 ? sumSection(idxCapex) : 0
    const totalImpuestos = idxImpuestos !== -1 ? sumSection(idxImpuestos) : 0

    // ─────────────────────────────
    // Top Ingresos
    // ─────────────────────────────
    const idxDetalleIngresos = findRowIndex("detalle ingresos")
    const idxTotalIngresos = idxIngresos

    const ingresosMap = {}

    for (let i = idxDetalleIngresos + 1; i < idxTotalIngresos; i++) {
      const categoria = rows[i][0]
      if (!categoria) continue

      let sum = 0
      for (let c = 1; c < semanas.length + 1; c++) {
        sum += parseMoney(rows[i][c])
      }

      if (sum > 0) ingresosMap[categoria] = sum
    }

    const topIngresos = Object.entries(ingresosMap)
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5)

    // ─────────────────────────────
    // Top Egresos (OPEX + CAPEX)
    // ─────────────────────────────
    const egresosMap = {}

    const processEgresos = (startIdx) => {
      for (let i = startIdx + 1; i < rows.length; i++) {
        const categoria = rows[i][0]
        if (!categoria) break

        let sum = 0
        for (let c = 1; c < semanas.length + 1; c++) {
          sum += parseMoney(rows[i][c])
        }

        if (sum > 0) {
          egresosMap[categoria] = (egresosMap[categoria] || 0) + sum
        }
      }
    }

    if (idxOpex !== -1) processEgresos(idxOpex)
    if (idxCapex !== -1) processEgresos(idxCapex)

    const topEgresos = Object.entries(egresosMap)
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5)

    // ─────────────────────────────
    // Resumen final
    // ─────────────────────────────
    const saldoNeto = totalIngresos - totalEgresos
    const saldoAcumulado = semanasData[semanasData.length - 1]?.saldo || 0

    res.status(200).json({
      resumen: {
        totalIngresos,
        totalOpex,
        totalCapex,
        totalImpuestos,
        saldoNeto,
        saldoAcumulado
      },
      semanas: semanasData,
      topIngresos,
      topEgresos
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error leyendo Google Sheets" })
  }
}
