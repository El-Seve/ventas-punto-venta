/**
 * Backend de Google Sheets para la app "Ventas del Día".
 * Pega este código en el editor de Apps Script de tu Google Sheet
 * (Extensiones > Apps Script) y despliégalo como Web App.
 * Instrucciones completas en /SETUP_SHEETS.md
 */

const SHEET_NAME = 'Ventas';
const HEADERS = ['ID', 'Timestamp', 'Fecha', 'Hora', 'Región', 'Supervisor', 'Tienda', 'Promotor', 'Marca', 'Cantidad'];

function doGet(e) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  rows.shift(); // quitar encabezados
  const data = rows
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return {
        id: r[0],
        timestamp: r[1],
        fecha: formatFecha_(r[2]),
        hora: formatHora_(r[3]),
        region: r[4],
        supervisor: r[5],
        tienda: r[6],
        promotor: r[7],
        marca: r[8],
        cantidad: r[9],
      };
    });
  return jsonOutput_({ ok: true, data: data });
}

// Google Sheets a veces auto-convierte texto tipo "2026-08-06" o "14:35"
// a su propio tipo Date internamente. Normalizamos al leer para que el
// front-end siempre reciba el mismo formato de string sin importar cómo
// quedó guardada la celda.
function formatFecha_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return v;
}

function formatHora_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
  }
  return v;
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const sheet = getSheet_();

  if (body.action === 'delete') {
    return deleteRow_(sheet, body.id);
  }

  const cantidad = Number(body.cantidad) || 0;
  sheet.appendRow([
    body.id,
    new Date(),
    body.fecha,
    body.hora,
    body.region || '',
    body.supervisor || '',
    body.tienda || '',
    body.promotor || '',
    body.marca,
    cantidad,
  ]);
  return jsonOutput_({ ok: true });
}

function deleteRow_(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return jsonOutput_({ ok: true });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
