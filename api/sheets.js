import { google } from "googleapis"

function parseCLP(value) {
  if (!value) return 0
  return Number(String(value).replace(/[^\d-]/g, ""))
}

function sumObject(obj = {}) {
  return Object.values(obj).reduce((acc, val) => acc + parseCLP(val), 0)
}

export default async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )

    const sheets = google.sheets({ version: "v4", auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Hoja1!A2:Z"
    })

    const rows = response.data.values || []

    let currentMes = null
    let saldoAcumulado = 0
    const meses = {}

    rows.forEach(row => {
      const label = row[0]?.trim()

      // Detecta mes
      if (
        [
          "Enero","Febrero","Marzo","Abril","Mayo","Junio",
          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
        ].includes(label)
      ) {
        currentMes = label
        if (!meses[currentMes]) meses[currentMes] = []
        return
      }

      if (!currentMes) return

      const ingresosDetalle = row[1] || {}
      const egresosDetalle = row[2] || {}
      const capexDetalle = row[3] || {}
      const impuestosDetalle = row[4] || {}

      const ingresos = sumObject(ingresosDetalle)
      const opex = sumObject(egresosDetalle)
      const capex = sumObject(capexDetalle)
      const impuestos = sumObject(impuestosDetalle)

      const saldo = ingresos - opex - capex - impuestos
      saldoAcumulado += saldo

      meses[currentMes].push({
        semana: meses[currentMes].length + 1,
        ingresos,
        opex,
        capex,
        impuestos,
        saldo,
        saldoAcumulado
      })
    })

    res.status(200).json({ meses })

  } catch (error) {
    console.error("Sheets error:", error)
    res.status(500).json({ error: error.message })
  }
}
