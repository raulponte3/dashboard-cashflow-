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

    // Obtener todos los datos de la hoja
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Hoja 1!A1:Z100" // Ajusta "Hoja 1" al nombre real de tu hoja
    });

    const rows = response.data.values || [];

    if (!rows || rows.length === 0) {
      return res.status(200).json({ 
        meses: {}, 
        error: "No se encontraron datos en el sheet",
        debug: {
          sheetId: process.env.SHEET_ID ? "✓ Configurado" : "✗ No configurado",
          email: process.env.GOOGLE_CLIENT_EMAIL ? "✓ Configurado" : "✗ No configurado",
          privateKey: process.env.GOOGLE_PRIVATE_KEY ? "✓ Configurado" : "✗ No configurado"
        }
      });
    }

    // Buscar las filas importantes
    let dataStartRow = -1;
    let ingresosRow = -1;
    let opexRow = -1;
    let capexRow = -1;
    let impuestosRow = -1;
    let saldoNetoRow = -1;
    let saldoAcumRow = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === 'Saldo Inicial') dataStartRow = i;
      if (rows[i][0] === 'Total Ingresos') ingresosRow = i;
      if (rows[i][0] === 'Total OPEX') opexRow = i;
      if (rows[i][0] === 'Total CAPEX') capexRow = i;
      if (rows[i][0] === 'Total Impuestos') impuestosRow = i;
      if (rows[i][0] === 'SALDO NETO') saldoNetoRow = i;
      if (rows[i][0] === 'SALDO ACUMULADO') saldoAcumRow = i;
    }

    if (ingresosRow === -1 || saldoAcumRow === -1) {
      return res.status(200).json({ 
        meses: {},
        error: "No se encontraron las filas 'Total Ingresos' o 'SALDO ACUMULADO'",
        debug: {
          primeraCelda: rows[0] ? rows[0][0] : "vacía",
          totalFilas: rows.length,
          primerasFilas: rows.slice(0, 10).map(r => r[0])
        }
      });
    }

    const headers = rows[0];
    const meses = {};

    // Mapeo de meses en español
    const mesesMap = {
      'Octubre': 'Oct',
      'Noviembre': 'Nov', 
      'Diciembre': 'Dic',
      'Enero': 'Ene',
      'Febrero': 'Feb',
      'Marzo': 'Mar',
      'Abril': 'Abr',
      'Mayo': 'May',
      'Junio': 'Jun',
      'Julio': 'Jul',
      'Agosto': 'Ago',
      'Septiembre': 'Sep'
    };

    // Procesar cada columna (cada semana)
    for (let col = 1; col < Math.min(headers.length, 30); col++) {
      const weekHeader = headers[col];
      if (!weekHeader || !weekHeader.trim()) continue;

      // Extraer mes y semana del header
      // Formato esperado: "Semana 1 (6-12)" o similar
      let mesNombre = 'Desconocido';
      let semanaNum = col;

      // Intentar detectar el mes basándose en el header o en la estructura
      // Por simplicidad, vamos a usar el header directamente
      const ingresos = ingresosRow >= 0 && rows[ingresosRow][col] ? cleanValue(rows[ingresosRow][col]) : 0;
      const opex = opexRow >= 0 && rows[opexRow][col] ? cleanValue(rows[opexRow][col]) : 0;
      const capex = capexRow >= 0 && rows[capexRow][col] ? cleanValue(rows[capexRow][col]) : 0;
      const impuestos = impuestosRow >= 0 && rows[impuestosRow][col] ? cleanValue(rows[impuestosRow][col]) : 0;
      const saldoNeto = saldoNetoRow >= 0 && rows[saldoNetoRow][col] ? cleanValue(rows[saldoNetoRow][col]) : 0;
      const saldoAcum = saldoAcumRow >= 0 && rows[saldoAcumRow][col] ? cleanValue(rows[saldoAcumRow][col]) : 0;

      // Solo agregar si hay datos
      if (ingresos > 0 || opex > 0 || saldoAcum !== 0) {
        // Usar el header como identificador del mes
        const mesKey = weekHeader;
        
        if (!meses[mesKey]) {
          meses[mesKey] = [];
        }

        meses[mesKey].push({
          semana: meses[mesKey].length + 1,
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
      debug: {
        totalColumnas: headers.length,
        filasEncontradas: {
          ingresos: ingresosRow,
          opex: opexRow,
          capex: capexRow,
          saldoNeto: saldoNetoRow,
          saldoAcum: saldoAcumRow
        },
        primerosHeaders: headers.slice(0, 5),
        totalSemanas: Object.values(meses).reduce((sum, m) => sum + m.length, 0)
      }
    });

  } catch (error) {
    console.error("Sheets error:", error);
    res.status(500).json({ 
      error: error.message,
      meses: {},
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    });
  }
}
