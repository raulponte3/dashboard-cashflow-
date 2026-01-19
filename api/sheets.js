import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const { sheetId, range = "Hoja 1!A1:Z100" } = req.query;

    if (!sheetId) {
      return res.status(400).json({ error: "Missing sheetId" });
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    res.status(200).json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sheet" });
  }
}
