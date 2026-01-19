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

    const spreadsheetId = process.env.SPREADSHEET_ID

    const range = "'Hoja 1'!A2:E1000" // 👈 CORRECTO

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    })

    res.status(200).json(response.data.values || [])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error leyendo Google Sheets' })
  }
}
