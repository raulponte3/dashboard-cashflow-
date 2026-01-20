import { google } from "googleapis";

function cleanValue(val) {
  if (!val) return 0;
  const cleaned = val.toString().replace(/[,$]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

export default async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Hoja1!A1:Z100"
    });

    const rows = response.data.values || [];

    if (!rows || rows.length === 0) {
      return res.status(200).json({ 
        meses: {}, 
        error: "No se encontraron datos en el sheet"
      });
    }

    // Encontrar las filas clave
    let ingresosRow = -1;
    let opexRow = -1;
    let capexRow = -1;
    let impuestosRow = -1;
    let saldoNetoRow = -1;
    let saldoAcumRow = -1;

    for (let i = 0; i < rows.length; i++) {
      const firstCell = rows[i][0];
      if (firstCell === 'Total Ingresos') ingresosRow = i;
      if (firstCell === 'Total OPEX') opexRow = i;
      if (firstCell === 'Total CAPEX') capexRow = i;
      if (firstCell === 'Total Impuestos') impuestosRow = i;
      if (firstCell === 'SALDO NETO') saldoNetoRow = i;
      if (firstCell === 'SALDO ACUMULADO') saldoAcumRow = i;
    }

    if (ingresosRow === -1 || saldoAcumRow === -1) {
      return res.status(200).json({ 
        meses: {},
        error: "No se encontraron las filas necesarias"
      });
    }

    // Headers están en la fila 1 (índice 1, porque fila 0 tiene los meses)
    const headers = rows[1];
    const monthsRow = rows[0];
    
    const meses = {};
    let currentMonth = null;

    // Procesar cada columna a partir de la columna 1
    for (let col = 1; col < headers.length; col++) {
      const monthName = monthsRow[col];
      const weekName = headers[col];
      
      // Si hay un nombre de mes nuevo, actualízalo
      if (monthName && monthName.trim()) {
        currentMonth = monthName.trim();
      }
      
      // Si no hay semana o mes, saltar
      if (!weekName || !weekName.trim() || !currentMonth) continue;

      const ingresos = cleanValue(rows[ingresosRow][col]);
      const opex = cleanValue(rows[opexRow][col]);
      const capex = cleanValue(rows[capexRow][col]);
      const impuestos = cleanValue(rows[impuestosRow][col]);
      const saldoNeto = cleanValue(rows[saldoNetoRow][col]);
      const saldoAcum = cleanValue(rows[saldoAcumRow][col]);

      // Solo agregar si hay datos significativos
      if (ingresos > 0 || opex > 0 || capex > 0 || Math.abs(saldoAcum) > 0) {
        if (!meses[currentMonth]) {
          meses[currentMonth] = [];
        }

        meses[currentMonth].push({
          semana: meses[currentMonth].length + 1,
          weekName: weekName.trim(),
          ingresos,
          opex,
          capex,
          impuestos,
          saldo: saldoNeto,
          saldoAcumulado: saldoAcum
        });
      }
    }

    res.status(200).json({ meses });

  } catch (error) {
    console.error("Sheets error:", error);
    res.status(500).json({ 
      error: error.message,
      meses: {}
    });
  }
}
