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

    // Encontrar las filas clave (buscar en más filas)
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

    // Si no encuentra SALDO NETO y SALDO ACUMULADO, buscar después de Total Impuestos
    if (saldoNetoRow === -1 && impuestosRow > 0) {
      // Buscar las siguientes 10 filas después de impuestos
      for (let i = impuestosRow + 1; i < Math.min(impuestosRow + 10, rows.length); i++) {
        const firstCell = rows[i][0];
        if (firstCell === 'SALDO NETO') saldoNetoRow = i;
        if (firstCell === 'SALDO ACUMULADO') saldoAcumRow = i;
      }
    }

    // Si aún no encuentra saldoNetoRow, buscar en todo el documento
    if (saldoNetoRow === -1) {
      for (let i = 0; i < rows.length; i++) {
        const firstCell = rows[i][0];
        if (firstCell && firstCell.includes('SALDO NETO')) saldoNetoRow = i;
        if (firstCell && firstCell.includes('SALDO ACUMULADO')) saldoAcumRow = i;
      }
    }

    if (ingresosRow === -1) {
      return res.status(200).json({ 
        meses: {},
        error: "No se encontró la fila 'Total Ingresos'"
      });
    }

    // Los meses están en la fila 1 (índice 1)
    // Los headers de semana están en la fila 2 (índice 2)
    const monthsRow = rows[1] || [];
    const headersRow = rows[2] || [];
    
    const meses = {};
    let currentMonth = null;

    // Procesar cada columna a partir de la columna 1
    for (let col = 1; col < Math.min(headersRow.length, 30); col++) {
      const monthName = monthsRow[col];
      const weekName = headersRow[col];
      
      // Si hay un nombre de mes nuevo, actualízalo
      if (monthName && monthName.trim()) {
        currentMonth = monthName.trim();
      }
      
      // Si no hay mes actual, saltar
      if (!currentMonth) continue;

      const ingresos = cleanValue(rows[ingresosRow][col]);
      const opex = opexRow > 0 ? cleanValue(rows[opexRow][col]) : 0;
      const capex = capexRow > 0 ? cleanValue(rows[capexRow][col]) : 0;
      const impuestos = impuestosRow > 0 ? cleanValue(rows[impuestosRow][col]) : 0;
      const saldoNeto = saldoNetoRow > 0 ? cleanValue(rows[saldoNetoRow][col]) : (ingresos - opex - capex - impuestos);
      const saldoAcum = saldoAcumRow > 0 ? cleanValue(rows[saldoAcumRow][col]) : 0;

      // Solo agregar si hay datos significativos
      if (ingresos > 0 || opex > 0 || capex > 0 || Math.abs(saldoAcum) > 0 || Math.abs(saldoNeto) > 0) {
        if (!meses[currentMonth]) {
          meses[currentMonth] = [];
        }

        meses[currentMonth].push({
          semana: meses[currentMonth].length + 1,
          weekName: weekName ? weekName.trim() : `Semana ${meses[currentMonth].length + 1}`,
          ingresos,
          opex,
          capex,
          impuestos,
          saldo: saldoNeto,
          saldoAcumulado: saldoAcum
        });
      }
    }

    res.status(200).json({ 
      meses,
      totalWeeks: Object.values(meses).reduce((sum, m) => sum + m.length, 0)
    });

  } catch (error) {
    console.error("Sheets error:", error);
    res.status(500).json({ 
      error: error.message,
      meses: {}
    });
  }
}
