import { google } from 'googleapis'

export default async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    )

    const sheets = google.sheets({ version: 'v4', auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Hoja1!A2:E'
    })

    const rows = response.data.values || []

    const parsed = rows.map(r => ({
      week: r[0],
      ingresos: Number(r[1] || 0),
      egresos: Number(r[2] || 0),
      saldoInicial: Number(r[3] || 0),
      saldoFinal: Number(r[4] || 0),
      saldoNeto: Number(r[1] || 0) - Number(r[2] || 0)
    }))

    res.status(200).json(parsed)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error leyendo Google Sheets' })
  }
}
