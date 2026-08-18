# Reporte_Vtas_DiariasE.md

## 1. Estado Actual del Proyecto (¿Dónde estamos?)

### Resumen ejecutivo

Se construyó una aplicación web (**"Ventas del Día"**) para que los promotores de Entel Perú registren el cierre de ventas diario de smartphones (Honor y otras marcas) por punto de venta (PDV), sin backend propio: el front-end es un único `index.html` estático servido por GitHub Pages, y la persistencia corre sobre una Google Sheet vía un Web App de Google Apps Script. Incluye dashboard gerencial, exportación de reportes, aviso automático de tiendas sin registrar por correo, y una guía visual de uso para distribuir al equipo.

### 🛑 APP EN BAJA — reemplazada por una nueva plataforma

Esta app fue puesta en modo **solo redirección**: cualquiera que entre ve únicamente una pantalla de migración con un botón hacia la nueva plataforma, y el backend rechaza cualquier intento de guardar o borrar datos. Nada del código ni de los datos históricos (`Ventas`, `Justificaciones`) se borró — todo sigue en el repo y en la Google Sheet, apagado detrás de una bandera `APP_ACTIVA = false` fácil de revertir. Detalle completo en la sección 3.

### Lo que ya está hecho y funcional

- **Registro de cierre diario**: cascada Región → Zona → Cobertura (Rutas/Tiendas) → Punto de Venta (según `Coberturas Entel.xlsx`), nombre de promotor autocompletado y obligatorio, grid de 8 marcas (Samsung, Honor, Xiaomi, Zte, Oppo, Vivo, Motorola, Apple) con cantidades, envío en un solo lote con confirmación previa.
- **Inmutabilidad de registros**: una tienda solo puede registrar **hoy**, o **ayer** si quedó sin registrar (día de gracia). Una vez enviado un cierre para una tienda+fecha, queda bloqueado — validado tanto en cliente como en servidor.
- **Resumen del día progresivo**: se muestra apenas se elige la Región (agregado de toda la región), se acota al elegir Supervisor (esa zona), y se acota más al elegir Tienda (esa tienda sola). Corrige un bug donde se mezclaban las ventas de todas las tiendas del día.
- **Dashboard**: ventas de Honor vs. total, share de Honor, ranking de marcas, gráfico de línea de ventas diarias de Honor (14 días), ventas por región, ranking de promotores agrupado por región — filtrable por Hoy / Semana / Mes.
- **Compartir por WhatsApp**: botón que arma un mensaje (tienda, promotor, desglose por marca, total) y abre `wa.me` con el texto pre-cargado. Corregido para que solo muestre los datos de la tienda seleccionada.
- **Resumen mensual**: modal con el acumulado de unidades por marca del mes en curso.
- **Backend en Google Sheets** (Apps Script): `doGet`/`doPost`, normalización de fecha/hora (bug de auto-conversión de Sheets resuelto forzando columnas a texto plano), validación de duplicados atómica del lado del servidor.
- **Reporte diario automático de PDVs faltantes**: trigger de Apps Script que corre todos los días a las 9:00am, compara la cobertura completa contra lo registrado el día anterior, genera un Excel y lo envía por correo a `ivan.severinos@gmail.com` con el asunto *"Reporte de Ventas - Tiendas Faltantes"*. **Confirmado en producción**: el trigger quedó activado y el primer correo automático llegó correctamente.
- **Tiendas sin registrar en el Resumen del día**: al elegir Región, Zona o Cobertura (no aplica a nivel Punto de Venta individual), debajo del resumen se listan en píldoras los puntos de venta de ese scope que todavía no enviaron su cierre para el día que se está viendo, con conteo `(faltantes de total)`.
- **Columna Share de Marca**: la tabla de Resumen del día ahora muestra, junto a las unidades por marca, el % que representa cada marca sobre el total del día (fila Total en 100%), ordenada siempre de mayor a menor.
- **Motivo de no cierre (Vacaciones / Descanso Semanal / Descanso Médico / Otros)**: el supervisor o gerencia puede hacer clic sobre cualquier tienda de la lista roja "Tiendas sin registrar" y marcarle un motivo desde un modal. La tienda pasa a mostrarse aparte (píldora gris con el motivo) en vez de figurar como faltante real. Se guarda en una hoja nueva de Sheets (`Justificaciones`), separada de `Ventas` para no ensuciar los cálculos de unidades/share. El reporte diario por correo también suma una columna **Motivo** al Excel.
- **Cobertura reemplazada por `Coberturas Entel.xlsx`**: la cascada pasó de Región → Supervisor → Tienda a **Región → Zona → Cobertura → Punto de Venta**, agregando "Cobertura" (Rutas / Tiendas) como su propio nivel con un 4to selector en el formulario — refleja fielmente las 4 columnas del Excel en vez de mezclar Rutas y Tiendas en una sola lista. Sin nombres de supervisor (reemplazados por Zona geográfica). Quedaron 4 regiones, 20 zonas y 84 puntos de venta en total.
- **Guía visual de usuario**: infografía tipo "ticket de cierre de caja", con los colores de marca reales de Entel Perú (`#002EFF` / `#42E8B4`) y Honor (`#00B1FF → #FF00D0`), exportada como Artifact web, PNG y PDF para compartir por WhatsApp.
- **Distribución**: app publicada en GitHub Pages, con link corto personalizado (`tinyurl.com/cierre-ventas-diarias`) tras descartar `is.gd` (rechaza dominios `*.github.io`).
- **Modo "app en baja" (retiro/redirección)**: bandera `APP_ACTIVA = false` en `index.html` y en `Code.gs`. En el front, la pantalla de migración es la vista por defecto vía CSS (no depende de que el JS llegue a correr) y el script corta antes de registrar un solo listener o llamar a Sheets. En el backend, `doPost`, `saveJustificacion_` y `deleteRow_` rechazan cualquier escritura con un mensaje que apunta a la nueva plataforma. No se borró nada: ni el código viejo, ni `Ventas`, ni `Justificaciones`. Revertir es cambiar la constante a `true` en ambos archivos.

### Estado de los componentes / archivos

| Archivo | Estado | Rol |
|---|---|---|
| `index.html` | ✅ Funcional, en producción | Front-end completo: registro, dashboard, modales, WhatsApp |
| `google-apps-script/Code.gs` | ✅ Funcional, desplegado | Backend (Sheets), candado de inmutabilidad, reporte diario |
| `README.md` | ✅ Actualizado | Descripción y guía de uso del proyecto |
| `SETUP_SHEETS.md` | ✅ Actualizado | Guía paso a paso: desplegar backend + activar reporte diario |
| Guía visual (Artifact/PNG/PDF) | ✅ Generada, entregada | No versionada en el repo; entregable aparte para compartir |
| Repo GitHub | `El-Seve/ventas-punto-venta`, rama `main` | Todo mergeado, sin PRs pendientes |
| URL pública | `https://el-seve.github.io/ventas-punto-venta/` | Verificado en vivo |
| Link corto | `https://tinyurl.com/cierre-ventas-diarias` | Verificado, redirige correctamente |

---

## 2. Registro de Decisiones de Arquitectura (ADR)

| Decisión Tomada | Contexto / Por qué se decidió | Impacto o Consecuencia |
|---|---|---|
| Backend: Google Apps Script + Google Sheets, sin servidor propio | Centralizar datos de múltiples promotores sin costo de infraestructura ni backend dedicado | Gratuito y simple, pero el Web App queda con acceso "Cualquiera" sin autenticación fuerte — aceptable solo para equipo interno de confianza |
| Cascada Región → Supervisor → Tienda embebida en el código | Reproducir la cobertura real de tiendas entregada por el negocio (Excel "Coverage Ventas diarias") | La lista de tiendas está **duplicada** en `index.html` y `Code.gs` (el backend no puede leer el front-end); toda tienda nueva debe agregarse en ambos archivos |
| Registro en lote (grid de 8 marcas + un solo botón "Enviar") en vez de "agregar venta" una por una | El diseño inicial (venta por venta) generaba registros duplicados al probar; el negocio confirmó que el cierre se hace una sola vez al final del día | Un solo POST por cierre; más simple de validar y de resumir/compartir |
| Inmutabilidad: tienda+fecha ya registrada no admite reenvío | Requisito explícito: "lo que ya se registró no se debe poder modificar" | Se eliminó el botón "Vaciar día"; validación de bloqueo duplicada en cliente (UX inmediata) y servidor (garantía real) |
| Ventana de registro: solo "hoy", o "ayer" como día de gracia si quedó sin registrar | Evitar reescritura de historial antiguo, permitiendo corregir un olvido reciente | Cualquier día anterior a "ayer" queda cerrado a nuevos envíos, sin excepción |
| Envío server-side en lote con chequeo de duplicado atómico (`tiendaFechaExiste_`) | Enviar una fila por marca en POSTs separados generaba condición de carrera con el candado de inmutabilidad | Se cambió el contrato del API: un solo POST con array `items`, en vez de N POSTs por cierre |
| Forzar columnas Fecha/Hora a texto plano en Sheets (`setNumberFormat('@')`) | Google Sheets auto-convertía el texto de fecha/hora a su tipo interno de Date **al escribir**, corrompiendo el dato al leerlo de vuelta | Bug de fecha/hora resuelto de forma permanente para todo registro nuevo |
| Resumen del día y WhatsApp filtrados por tienda, con vista progresiva por región/supervisor | Bug real reportado por usuarias en campo: el resumen mezclaba las ventas de **todas** las tiendas del día | Cada promotor ve/comparte solo lo suyo; se agregó vista agregada opcional a nivel región o zona |
| Diseño visual: minimalista (Inter, acento azul, fondo claro) | El usuario pidió cambiar de estilo tras ver una primera propuesta "brutalista" | Rediseño completo de la hoja de estilos sin tocar la lógica de negocio |
| Colores de marca reales (no aproximados) para la guía de usuario | Pedido explícito de usar el Pantone/hex oficial de Honor y Entel Perú | Se extrajeron los valores reales desde el CSS en producción de ambos sitios web |
| Distribución vía GitHub Pages + link corto con TinyURL | Se necesitaba un link fácil de compartir por WhatsApp con los promotores | `is.gd` rechazó acortar dominios `*.github.io` (política antispam); se usó TinyURL con alias personalizado |
| Reporte diario de PDVs faltantes vía trigger nativo de Apps Script (no cron externo) | Aviso automático de tiendas sin registrar, por correo, sin depender de que alguien abra la app | Requiere que el usuario ejecute `setupDailyTrigger()` **una sola vez**, manualmente, desde el editor de Apps Script, para autorizar permisos y activar el disparador. **Confirmado**: trigger activo y correo recibido correctamente |
| "Tiendas sin registrar" solo se muestra a nivel Región o Supervisor, no a nivel Tienda | A nivel Tienda ya existe el mensaje "Aún no hay ventas registradas para este día"; repetir la lista de faltantes ahí sería redundante (una sola tienda) | La cascada reutiliza `COVERAGE` (misma fuente que el resumen del día) para listar las tiendas del scope elegido y compara contra `tiendaHasRecord()` |
| Columna Share de Marca agregada solo en la tabla de Resumen del día (no en Resumen mensual ni Dashboard) | Los dos pendientes priorizados por el usuario apuntaban al mismo bloque de "Resumen del día"; se mantiene el cambio acotado a ese componente | Si se pide luego en Resumen mensual o en el ranking del Dashboard, es la misma fórmula (`unidades marca / total del scope`) aplicada a otra tabla |
| Motivo de no cierre lo marca el supervisor/gerencia "después" (no el promotor en el momento) | Decisión explícita del usuario: en vacaciones o descanso médico el promotor no puede entrar a la app ese día, así que quien revisa la lista de faltantes es quien debe poder justificarlas | La UI de justificar vive junto a la lista "Tiendas sin registrar" (clic en la píldora roja), no en el flujo de registro de ventas del promotor |
| Justificaciones en una hoja de Sheets separada (`Justificaciones`), no mezcladas con `Ventas` | Una justificación no es una venta; mezclarlas en la misma hoja hubiera obligado a filtrar marcas "falsas" en cada cálculo de unidades/ranking/share | Nuevo endpoint `action: 'justificar'` en `doPost`; `doGet` ahora devuelve `data` (ventas) y `justificaciones` por separado |
| Tienda+fecha con venta O con motivo son mutuamente excluyentes (igual que el candado de inmutabilidad) | Evitar que una tienda quede con ambos registros a la vez, lo cual no tiene sentido de negocio | Validado en cliente (`updateFormLock`, botón "Enviar" bloqueado) y en servidor (`saveJustificacion_` y `doPost` se chequean cruzado) |
| Cobertura reemplazada por completo desde `Coberturas Entel.xlsx`; nivel "Supervisor" pasa a ser "Zona" y se incluyen Rutas además de Tiendas | El Excel entregado no tenía nombres de supervisor, tenía Zona geográfica; se confirmó con el usuario (3 preguntas): usar Zona en vez de Supervisor, incluir Rutas igual que Tiendas, y reemplazar todo en vez de fusionar | Se pierden los nombres de supervisores en la cascada (label de UI cambiado de "Supervisor" a "Zona", variables internas sin renombrar para no ampliar el diff); el historial de ventas ya registrado con los códigos de tienda viejos queda intacto pero esos códigos ya no existen en el `COVERAGE` nuevo, así que el reporte diario de faltantes arrancará "en cero" bajo los 84 puntos de venta nuevos |
| Cobertura (Rutas/Tiendas) agregada como su propio 4to nivel de cascada, en vez de mezclarla dentro de la lista de puntos de venta por Zona | Primer intento fusionó Rutas y Tiendas en una sola lista por Zona; el usuario aclaró que quería reflejar fielmente las 4 columnas del Excel (Región, ZONA, Cobertura, Punto de Venta), no solo su contenido | `COVERAGE` pasó de 3 a 4 niveles anidados (`COVERAGE[región][zona][cobertura] = [...]`) en `index.html` y `Code.gs`; se agregó el selector "Cobertura" al formulario (grid de 4 columnas) y una función `populateCobertura()` nueva en la cascada. No se persiste la Cobertura en la hoja de Sheets — se recalcula buscando en `COVERAGE` a partir del código de Punto de Venta, igual que ya se hacía para encontrar la Zona |
| App puesta en baja con bandera `APP_ACTIVA` + pantalla de migración, en vez de borrar el código o dar de baja el deploy | La app va a ser reemplazada por una nueva plataforma; el usuario pidió explícitamente no perder código ni datos históricos y poder revertir fácil | En `index.html`: la pantalla de migración es el estado por defecto vía CSS (`#appRoot{display:none}`, `.migration-screen{display:flex}`), y el script corta con `if (!APP_ACTIVA) return;` antes de registrar cualquier listener o llamar a `syncFromSheets()` — así ni siquiera queda un botón "deshabilitado" pero clickeable, directamente no hay handler. En `Code.gs`: `doPost`, `saveJustificacion_` y `deleteRow_` devuelven un error fijo si `!isAppActiva_()`, cada uno con su propio chequeo (no solo en `doPost`) para que quede bloqueado incluso ejecutando esas funciones a mano desde el editor de Apps Script. `doGet` (lectura) y el reporte diario de faltantes quedan sin tocar — el pedido era bloquear escritura, no lectura |

---

## 3. Próximo Paso Concreto

### ✅ Completado: Trigger diario de PDVs faltantes

- [x] En el editor de Apps Script, la sección **Activadores** muestra un trigger activo para `generateMissingPdvReport`, tipo "Basado en tiempo", diario, ~9:00am.
- [x] No hay errores de autorización pendientes.
- [x] Llegó el correo **"Reporte de Ventas - Tiendas Faltantes"** a `ivan.severinos@gmail.com` con el Excel adjunto.
- [x] Confirmado por el usuario: "Si llego el mail."

### ✅ Completado: Mejoras al Resumen del día (priorizadas por el usuario)

1. **Tiendas sin registrar en el Resumen del día**, según lo elegido (Región/Supervisor) — implementado en `index.html`: nueva función `tiendasEnScope()` (reutiliza `COVERAGE`) + `renderMissingStores()`, con lista de píldoras y conteo. Probado en navegador contra datos reales de Sheets en los 3 niveles de la cascada (región, supervisor, tienda) — a nivel tienda no se muestra (redundante con el mensaje de "sin ventas registradas").
2. **Columna Share de Marca** en la tabla de Resumen del día — cada fila de marca muestra su % sobre el total del día, y la fila Total muestra 100%. Probado contra datos reales (ej. Región Sur, 7 de agosto: Samsung 23%, Honor 24%, Xiaomi 24%, etc.).

**Estado:** ambos cambios están en `index.html`, publicados en GitHub Pages (no requerían cambios en `Code.gs` — se calculan en el cliente a partir de los datos ya sincronizados).

### ✅ Completado: Cobertura nueva de 4 niveles + Motivo de no cierre (pendiente de redeploy, ver abajo)

Se agregó la función de Motivo de no cierre (front-end en `index.html` + backend en `Code.gs`, hoja nueva `Justificaciones`, columna Motivo en el reporte diario) y se reemplazó todo el `COVERAGE` por la estructura **Región → Zona → Cobertura → Punto de Venta** de `Coberturas Entel.xlsx` (4 regiones, 20 zonas, 84 puntos de venta entre Rutas y Tiendas). Probado en navegador en los 4 niveles de la cascada.

### 🛑 Completado: App puesta en baja (pantalla de migración + candado en el backend)

**Qué se hizo, a pedido explícito del usuario ("la app va a ser dada de baja y reemplazada"):**
- `index.html`: `APP_ACTIVA = false` al tope del script. La pantalla de migración (ícono, título "Nos estamos mudando a una nueva plataforma", texto, botón grande, y aviso de que ya no acepta registros) es la vista visible por defecto vía CSS — no depende de que el JS corra. El script corta con `return` antes de registrar un solo event listener, así que ningún botón viejo hace nada aunque alguien lo fuerce a visible por consola.
- `Code.gs`: mismo `APP_ACTIVA = false`. `doPost` (el único punto de entrada de escritura del Web App), `saveJustificacion_` y `deleteRow_` devuelven un error fijo apuntando a la nueva plataforma si la app está inactiva — las tres funciones que antes podían guardar o borrar datos quedan bloqueadas, incluso ejecutándolas a mano desde el editor de Apps Script.
- **Nada se borró**: el código viejo del formulario, dashboard, y toda la data en `Ventas`/`Justificaciones` sigue intacta. Revertir es cambiar `APP_ACTIVA` a `true` en los dos archivos.
- Probado en navegador (servidor local) en desktop, tablet (768px) y mobile (375px): la card de migración se ve centrada y legible en los tres tamaños, y `filter: interactive` sobre la página confirma que el único elemento interactivo es el botón "Ir a la nueva aplicación" — todo lo demás del formulario viejo queda fuera del árbol interactivo.

**Por qué sigue siendo el siguiente paso:** igual que los cambios anteriores, `Code.gs` no se redespliega solo con el push a GitHub — el Web App de Apps Script sigue sirviendo la versión vieja (sin candado, sin Cobertura de 4 niveles, sin Motivo) hasta que se publique manualmente una nueva versión. Mientras no se redespliegue, el backend real sigue aceptando escrituras aunque el front-end ya muestre la pantalla de migración.

**Criterios de aceptación:**
- [ ] En el editor de Apps Script, el contenido de `Code.gs` fue reemplazado por la versión actualizada del repo (incluye `APP_ACTIVA`, el candado en `doPost`/`saveJustificacion_`/`deleteRow_`, el `COVERAGE` de 4 niveles, y el endpoint de motivos).
- [ ] Se hizo **Desplegar > Administrar implementaciones** → lápiz ✏️ → **Nueva versión** → Desplegar.
- [ ] Probar que un POST al Web App (por ejemplo, intentando registrar una venta desde una copia vieja de la app, o con una herramienta como Postman) devuelve el error de "aplicación descontinuada" en vez de guardar la fila.
- [ ] `index.html` en producción (GitHub Pages) muestra la pantalla de migración al abrir el link, sin ningún rastro del formulario viejo.
