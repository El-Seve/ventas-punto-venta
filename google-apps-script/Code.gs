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

/**
 * ---------------------------------------------------------------------
 * Reporte diario de PDVs (tiendas) sin registrar
 * ---------------------------------------------------------------------
 * Cada mañana a las 9:00am revisa qué tiendas NO registraron su cierre
 * el día anterior y manda un Excel por correo con el detalle.
 *
 * Para activarlo (una sola vez):
 * 1. En el editor de Apps Script, selecciona la función "setupDailyTrigger"
 *    en el desplegable de arriba y presiona "Ejecutar".
 * 2. Autoriza los permisos que pida (enviar correo y crear triggers).
 * Con eso queda funcionando solo, todos los días, sin que nadie abra nada.
 *
 * IMPORTANTE: este COVERAGE debe coincidir con el de index.html. Si se
 * agrega una tienda nueva ahí, hay que agregarla acá también.
 */

const REPORT_EMAIL = 'ivan.severinos@gmail.com';

const COVERAGE = {
  'Región Lima - Cleiber Cortez': {
    'Zona Sur': ['TPF_VILLASALVADOR', 'TP_TPF_MALLDELSUR', 'TP_TPF_JOCKEYPLAZA', 'TP_PLAZAREPUBLICA', 'TP_TPF_CHORRILLOS', 'TP_LARCO'],
    'Zona Norte': ['TPF_PUENTEPIEDRA', 'TP_TPF_PLIMANORTE', 'TP_TPF_MEGAPLAZA', 'TP_TPF_COMAS', 'TPF_HUACHO28'],
    'Zona Centro': ['TP_TPF_PLAZASANMIGUEL', 'TP_TPF_CENTRODELIMA', 'TPF_RPSALAVERRY', 'TP_TPF_MINKA2', 'TPF_BELLAVISTA'],
    'Zona Este': ['TP_TPF_OPENANGAMOS', 'TP_TPF_SANTAANITA', 'TPF_MAPSJLURIGANCHO', 'TP_TPF_PURUCHUCO', 'TP_SJUANLURIGANCHO', 'TPF-TC SANTACLARA'],
  },
  'Región Norte - Liliana Bonilla': {
    'Zona TRUX - CHIM': ['TP_CHIMBOTE', 'TPF_TRUJILLO', 'TP_TRUJILLO', 'TPF_HUARAZ', 'TPF_TRUJILLOJUNIN', 'TPF_MPCHIMBOTE', 'TPF_TRUJILLOPORVENIR', 'TPF_TRUPIZARRO'],
    'Zona LAM - CAX': ['TPF_RPCHICLAYO', 'TP_CHICLAYO', 'TPF_MAPCHICLAYO', 'TPF_CAJAMARCA', 'TPF_JAEN', 'TPF_MPCAJAMARCA'],
    'Zona PIU - TUM': ['TPF_PIUREAL', 'TP_TALARA', 'TP_PIURA', 'TPF_PAITA2', 'TPF_PIURA', 'TPF_SULLANA', 'TP_TPF_TUMBES'],
  },
  'Región Sur - Tephy Diaz': {
    'Jhon Lopez': ['TP_TPF_CUSCO', 'TP_CUSCO'],
    'Omar Quispe': ['TP_TPF_JULIACA'],
    'Rene Lopez': ['TPF_AQPPANORAMICO', 'TP_TPF_MAPAREQUIPA', 'TP_AREQUIPA', 'TP_TACNA'],
  },
  'Región Centro - Wendy Cawen': {
    'Sacya Navarro': ['TP_HUANCAYO', 'TPF_HUANCAYO'],
    'Cesar Ching': ['TP_ICA', 'TPF_CHINCHAITALIA', 'TPF_ICAPISCO'],
    'Claudia Fajardo': ['TP_TPF_IQUITOS', 'TPF_TARAPOTO', 'TPF_MOYOBAMBA'],
    'Sheila Flores': ['TPF_AYACASAMBLEA2'],
    'Alexander Santiago': ['TPF_HUANUCO', 'TPF_PUCALLPA'],
  },
};

function setupDailyTrigger() {
  existingReportTriggers_().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('generateMissingPdvReport')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
}

function existingReportTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'generateMissingPdvReport';
  });
}

function generateMissingPdvReport() {
  const tz = Session.getScriptTimeZone();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const fecha = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');

  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  rows.shift();

  const submitted = {};
  rows.forEach(function (r) {
    if (r[0] && formatFecha_(r[2]) === fecha) submitted[r[6]] = true;
  });

  const allTiendas = [];
  Object.keys(COVERAGE).forEach(function (region) {
    Object.keys(COVERAGE[region]).forEach(function (supervisor) {
      COVERAGE[region][supervisor].forEach(function (tienda) {
        allTiendas.push({ region: region, supervisor: supervisor, tienda: tienda });
      });
    });
  });

  const missing = allTiendas.filter(function (t) { return !submitted[t.tienda]; });

  const blob = buildMissingPdvExcel_(fecha, missing);

  const body = [
    'Reporte de tiendas (PDVs) que no registraron su cierre de ventas del ' + fecha + '.',
    '',
    missing.length + ' de ' + allTiendas.length + ' tiendas sin registrar.',
    '',
    'Detalle en el Excel adjunto.',
  ].join('\n');

  MailApp.sendEmail({
    to: REPORT_EMAIL,
    subject: 'Reporte de Ventas - Tiendas Faltantes',
    body: body,
    attachments: [blob],
  });
}

function buildMissingPdvExcel_(fecha, missing) {
  const temp = SpreadsheetApp.create('Reporte_PDVs_Faltantes_' + fecha);
  const sheet = temp.getSheets()[0];
  sheet.setName('PDVs sin registrar');
  sheet.appendRow(['Región', 'Supervisor', 'Tienda']);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  missing.forEach(function (m) {
    sheet.appendRow([m.region, m.supervisor, m.tienda]);
  });
  if (missing.length === 0) {
    sheet.appendRow(['Todas las tiendas registraron su cierre.', '', '']);
  }
  sheet.autoResizeColumns(1, 3);
  SpreadsheetApp.flush();

  const url = 'https://docs.google.com/spreadsheets/d/' + temp.getId() + '/export?format=xlsx';
  const blob = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  }).getBlob().setName('PDVs_sin_registrar_' + fecha + '.xlsx');

  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return blob;
}
