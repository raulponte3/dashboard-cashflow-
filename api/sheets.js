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

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Hoja 1"
    })

    const rows = data.values

    // ───────── Detectar semanas ─────────
    const meses = rows[0].slice(1)
    const semanas = rows[1].slice(1)

    let currentSection = null
    const semanasData = semanas.map((s, i) => ({
      mes: meses[i],
      semana: s,
      ingresosDetalle: {},
      egresosDetalle: {},
      capexDetalle: {},
      impuestosDetalle: {}
    }))

    for (let i = 2; i < rows.length; i++) {
      const [label, ...values] = rows[i]

      if (!label) continue

      if (label === "Detalle Ingresos") currentSection = "ingresosDetalle"
      else if (label === "Detalle Egresos" || label === "OPEX") currentSection = "egresosDetalle"
      else if (label === "CAPEX") currentSection = "capexDetalle"
      else if (label === "Impuestos") currentSection = "impuestosDetalle"
      else if (label.startsWith("Total") || label.startsWith("SALDO")) {
        currentSection = null
      } else if (currentSection) {
        values.forEach((v, idx) => {
          if (v && semanasData[idx]) {
            semanasData[idx][currentSection][label] = v
          }
        })
      }
    }

    res.status(200).json({ semanas: semanasData })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Error leyendo Google Sheets" })
  }
}
