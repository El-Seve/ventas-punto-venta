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

// Salvavidas por si alguna celda vieja quedó guardada como fecha real de
// Sheets (de antes de forzar las columnas C y D a texto plano). Para datos
// nuevos esto ya no debería activarse: ver ensurePlainTextColumns_().
function isDateValue_(v) {
  return !!v && typeof v.getTime === 'function' && !isNaN(v.getTime()) && typeof v.getFullYear === 'function';
}

function formatFecha_(v) {
  if (isDateValue_(v)) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return v;
}

function formatHora_(v) {
  if (isDateValue_(v)) {
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

  if (!body.items || !body.items.length) {
    return jsonOutput_({ ok: false, error: 'Sin datos para registrar.' });
  }

  // Una vez que una tienda tiene un cierre registrado para una fecha, ese
  // registro es definitivo: no se acepta un segundo envío para la misma
  // combinación de tienda + fecha (evita modificar lo ya registrado).
  if (tiendaFechaExiste_(sheet, body.tienda, body.fecha)) {
    return jsonOutput_({ ok: false, error: 'Ya existe un registro para esta tienda en esta fecha. No se puede modificar.' });
  }

  body.items.forEach(function (item) {
    sheet.appendRow([
      item.id,
      new Date(),
      body.fecha,
      body.hora,
      body.region || '',
      body.supervisor || '',
      body.tienda || '',
      body.promotor || '',
      item.marca,
      Number(item.cantidad) || 0,
    ]);
  });

  return jsonOutput_({ ok: true });
}

function tiendaFechaExiste_(sheet, tienda, fecha) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][6] === tienda && rows[i][2] === fecha) return true;
  }
  return false;
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
  ensurePlainTextColumns_(sheet);
  return sheet;
}

// La causa real del bug de fecha/hora: Sheets auto-convierte texto tipo
// "2026-08-06" o "14:35" a su propio tipo de fecha/hora AL ESCRIBIR la
// celda, no al leerla. Forzamos las columnas Fecha (C) y Hora (D) a texto
// plano para que eso nunca vuelva a pasar con datos nuevos.
function ensurePlainTextColumns_(sheet) {
  const numRows = Math.max(sheet.getMaxRows(), 1000);
  sheet.getRange(1, 3, numRows, 2).setNumberFormat('@');
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
