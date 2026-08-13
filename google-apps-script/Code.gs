/**
 * Backend de Google Sheets para la app "Ventas del Día".
 * Pega este código en el editor de Apps Script de tu Google Sheet
 * (Extensiones > Apps Script) y despliégalo como Web App.
 * Instrucciones completas en /SETUP_SHEETS.md
 */

const SHEET_NAME = 'Ventas';
const HEADERS = ['ID', 'Timestamp', 'Fecha', 'Hora', 'Región', 'Supervisor', 'Tienda', 'Promotor', 'Marca', 'Cantidad'];

const JUSTIF_SHEET_NAME = 'Justificaciones';
const JUSTIF_HEADERS = ['ID', 'Timestamp', 'Fecha', 'Región', 'Supervisor', 'Tienda', 'Motivo', 'Comentario'];

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

  const justifSheet = getJustifSheet_();
  const jrows = justifSheet.getDataRange().getValues();
  jrows.shift();
  const justificaciones = jrows
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return {
        id: r[0],
        timestamp: r[1],
        fecha: formatFecha_(r[2]),
        region: r[3],
        supervisor: r[4],
        tienda: r[5],
        motivo: r[6],
        comentario: r[7],
      };
    });

  return jsonOutput_({ ok: true, data: data, justificaciones: justificaciones });
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

  if (body.action === 'delete') {
    return deleteRow_(getSheet_(), body.id);
  }

  if (body.action === 'justificar') {
    return saveJustificacion_(body);
  }

  const sheet = getSheet_();

  if (!body.items || !body.items.length) {
    return jsonOutput_({ ok: false, error: 'Sin datos para registrar.' });
  }

  // Una vez que una tienda tiene un cierre registrado para una fecha, ese
  // registro es definitivo: no se acepta un segundo envío para la misma
  // combinación de tienda + fecha (evita modificar lo ya registrado).
  if (tiendaFechaExiste_(sheet, body.tienda, body.fecha)) {
    return jsonOutput_({ ok: false, error: 'Ya existe un registro para esta tienda en esta fecha. No se puede modificar.' });
  }
  // Tampoco se puede registrar venta si esa tienda+fecha ya tiene un motivo
  // de no cierre justificado (vacaciones, descanso, etc.).
  if (justificacionExiste_(getJustifSheet_(), body.tienda, body.fecha)) {
    return jsonOutput_({ ok: false, error: 'Esta tienda tiene un motivo registrado para esta fecha. No se puede registrar venta.' });
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

// Registra el motivo por el que una tienda no hizo su cierre (vacaciones,
// descanso semanal, descanso médico, otros). Lo marca el supervisor o
// gerencia al revisar la lista de tiendas faltantes, no el promotor.
function saveJustificacion_(body) {
  if (!body.tienda || !body.fecha || !body.motivo) {
    return jsonOutput_({ ok: false, error: 'Faltan datos para registrar el motivo.' });
  }

  const ventasSheet = getSheet_();
  const justifSheet = getJustifSheet_();

  if (tiendaFechaExiste_(ventasSheet, body.tienda, body.fecha)) {
    return jsonOutput_({ ok: false, error: 'Esta tienda ya registró ventas para esta fecha.' });
  }
  if (justificacionExiste_(justifSheet, body.tienda, body.fecha)) {
    return jsonOutput_({ ok: false, error: 'Ya existe un motivo registrado para esta tienda en esta fecha.' });
  }

  justifSheet.appendRow([
    body.id || Utilities.getUuid(),
    new Date(),
    body.fecha,
    body.region || '',
    body.supervisor || '',
    body.tienda,
    body.motivo,
    body.comentario || '',
  ]);

  return jsonOutput_({ ok: true });
}

function justificacionExiste_(sheet, tienda, fecha) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][5] === tienda && formatFecha_(rows[i][2]) === fecha) return true;
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

function getJustifSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(JUSTIF_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(JUSTIF_SHEET_NAME);
    sheet.appendRow(JUSTIF_HEADERS);
  }
  // Misma corrección que en la hoja de Ventas: forzar la columna Fecha (C)
  // a texto plano para que Sheets no la reconvierta a su tipo Date interno.
  sheet.getRange(1, 3, Math.max(sheet.getMaxRows(), 1000), 1).setNumberFormat('@');
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

// Cascada Región > Zona > Punto de Venta, según "Coberturas Entel.xlsx".
// Cada Punto de Venta puede ser una Tienda fija o una Ruta (promotor
// viajero); ambas se registran igual en la app. DEBE coincidir exactamente
// con el COVERAGE de index.html.
const COVERAGE = {
  'Región Lima': {
    'Zona Norte': ['RUTA COMAS PRO', 'RUTA HUACHO - HUARAL', 'RUTA MEGA PLAZA', 'RUTA PLAZA NORTE', 'RUTA PUENTE PIEDRA', 'TP HUACHO', 'TP MEGAPLAZA', 'TP PLIMA NORTE', 'TP PUENTE PIEDRA', 'TPF COMAS'],
    'Zona Sur': ['RUTA ATOCONGO', 'RUTA MALL DEL SUR', 'RUTA VES', 'TP_CHORRILLOS', 'TP_JOCKEY', 'TP_LARCO', 'TP_MALLDELSUR', 'TP_REPÚBLICA', 'TP_VILLAELSALVADOR'],
    'Zona Este': ['RUTA SANTA ANITA - PURUCHUCO', 'RUTA SJL 1', 'RUTA SJL 2', 'TPF ANGAMOS', 'TPF MAP SJL', 'TPF PURUCHUCO', 'TPF SANTA ANITA', 'TPF SANTA CLARA', 'TPF SJL'],
    'Zona Centro': ['RUTA CALLAO', 'RUTA CENTRO CIVICO', 'TP_BELLAVISTA', 'TP_CENTRO CIVICO', 'TP_MINKA', 'TP_SALAVERRY', 'TP_SAN MIGUEL'],
  },
  'Región Centro': {
    'Zona Ayacucho': ['TPF-TC AYACASAMBLEA2'],
    'Zona Ica': ['RUTA CHINCHA', 'RUTA ICA', 'RUTA PISCO', 'TPF_CHINCHAITALIA', 'TPF_ICA'],
    'Zona Huancayo': ['RUTA HUANCAYO', 'TPF HUANCAYO1', 'TPF HUANCAYO'],
    'Zona Huánuco': ['RUTA HUANUCO', 'TPF HUANUCO'],
    'Zona Iquitos': ['TPF_IQUITOS', 'TPF_MAPIQUITOS'],
    'Zona Pucallpa': ['TP_PUCALLPA'],
    'Zona Tarapoto': ['TP_TARAPOTO'],
  },
  'Región Sur': {
    'Zona Arequipa': ['RUTA MALL CAYMA', 'RUTA AREQUIPA', 'TP_TPF_MAPAREQUIPA', 'TPF AREQUIPA', 'TPF PANORAMICO'],
    'Zona Cuzco': ['RUTA CUSCO', 'TPF CUSCO', 'TPF CUSCO SOL'],
    'Zona Puno': ['TP_JULIACA'],
    'Zona Tacna': ['TP_TACNA'],
  },
  'Región Norte': {
    'Zona CAX': ['TPF CAJAMARCA'],
    'Zona CIX': ['RUTA MALL CHICLAYO', 'TP_CHICLAYO', 'TP_RPCHICLAYO', 'TP_MAPCHICLAYO'],
    'Zona Chimbote': ['RUTA CHIMBOTE', 'TP_CHIMBOTE'],
    'Zona Huaraz': ['TPF_HUARAZ'],
    'Zona Jaen': ['TPF_ JAEN'],
    'Zona Piura': ['TP_PAITA', 'RUTA OPEN PIURA', 'TPF-TC PIUREAL', 'TPF PIURA GRAU', 'TPF PIURA', 'RUTA REAL PIURA', 'TP_SULLANA', 'TP_TALARA'],
    'Zona TRUX': ['TP_TRUJILLO LARCO', 'TPF_PORVENIR', 'RUTA OPEN TRUJILLO', 'RUTA MALL TRUJILLO', 'TP_TRUJILLOJUNIN', 'TPF_TRUJILLO'],
    'Zona Tumbes': ['TP_TUMBES'],
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

  const justifSheet = getJustifSheet_();
  const jrows = justifSheet.getDataRange().getValues();
  jrows.shift();
  const motivos = {};
  jrows.forEach(function (r) {
    if (r[0] && formatFecha_(r[2]) === fecha) motivos[r[5]] = r[6];
  });

  const allTiendas = [];
  Object.keys(COVERAGE).forEach(function (region) {
    Object.keys(COVERAGE[region]).forEach(function (supervisor) {
      COVERAGE[region][supervisor].forEach(function (tienda) {
        allTiendas.push({ region: region, supervisor: supervisor, tienda: tienda });
      });
    });
  });

  const missing = allTiendas
    .filter(function (t) { return !submitted[t.tienda]; })
    .map(function (t) { return Object.assign({}, t, { motivo: motivos[t.tienda] || '' }); });

  const sinMotivo = missing.filter(function (m) { return !m.motivo; }).length;

  const blob = buildMissingPdvExcel_(fecha, missing);

  const body = [
    'Reporte de tiendas (PDVs) que no registraron su cierre de ventas del ' + fecha + '.',
    '',
    missing.length + ' de ' + allTiendas.length + ' tiendas sin registrar (' + sinMotivo + ' sin motivo justificado).',
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
  sheet.appendRow(['Región', 'Supervisor', 'Tienda', 'Motivo']);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  missing.forEach(function (m) {
    sheet.appendRow([m.region, m.supervisor, m.tienda, m.motivo]);
  });
  if (missing.length === 0) {
    sheet.appendRow(['Todas las tiendas registraron su cierre.', '', '', '']);
  }
  sheet.autoResizeColumns(1, 4);
  SpreadsheetApp.flush();

  const url = 'https://docs.google.com/spreadsheets/d/' + temp.getId() + '/export?format=xlsx';
  const blob = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  }).getBlob().setName('PDVs_sin_registrar_' + fecha + '.xlsx');

  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return blob;
}
