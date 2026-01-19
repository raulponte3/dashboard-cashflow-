import { google } from "googleapis"

function parseCLP(value) {
  if (!value) return 0
  return Number(value.replace(/[^\d-]/g, ""))
}

function sum(obj = {}) {
  return Object.values(obj).reduce((a, v) => a + parseCLP(v), 0)
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

    const sheetId = process.env.SHEET_ID
    const range = "Hoja1!A2:Z"

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range
    })

    const rows = response.data.values || []

    let currentMes = null
    let saldoAcumulado = 0
    const meses = {}

    rows.forEach(row => {
      const semanaLabel = row[0]?.trim()

      if (["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].includes(semanaLabel)) {
        currentMes = semanaLabel
        if (!meses[currentMes]) meses[currentMes] = []
        return
      }

      if (!currentMes) return

      const ingresosDetalle = JSON.parse(row[1] || "{}")
      const egresosDetalle = JSON.parse(row[2] || "{}")
      const capexDetalle = JSON.parse(row[3] || "{}")
      const impuestosDetalle = JSON.parse(row[4] || "{}")

      const ingresos = sum(ingresosDetalle)
      const opex = sum(egresosDetalle)
      const capex = sum(capexDetalle)
      const impuestos = sum(impuestosDetalle)

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
    console.error(error)
    res.status(500).json({ error: "Error procesando Google Sheets" })
  }
}
