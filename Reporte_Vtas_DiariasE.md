# Reporte_Vtas_DiariasE.md

## 1. Estado Actual del Proyecto (¿Dónde estamos?)

### Resumen ejecutivo

Se construyó una aplicación web (**"Ventas del Día"**) para que los promotores de Entel Perú registren el cierre de ventas diario de smartphones (Honor y otras marcas) por punto de venta (PDV), sin backend propio: el front-end es un único `index.html` estático servido por GitHub Pages, y la persistencia corre sobre una Google Sheet vía un Web App de Google Apps Script. Incluye dashboard gerencial, exportación de reportes, aviso automático de tiendas sin registrar por correo, y una guía visual de uso para distribuir al equipo.

### Lo que ya está hecho y funcional

- **Registro de cierre diario**: cascada Región → Supervisor → Tienda (según tabla "Coverage Ventas diarias"), nombre de promotor autocompletado, grid de 8 marcas (Samsung, Honor, Xiaomi, Zte, Oppo, Vivo, Motorola, Apple) con cantidades, envío en un solo lote con confirmación previa.
- **Inmutabilidad de registros**: una tienda solo puede registrar **hoy**, o **ayer** si quedó sin registrar (día de gracia). Una vez enviado un cierre para una tienda+fecha, queda bloqueado — validado tanto en cliente como en servidor.
- **Resumen del día progresivo**: se muestra apenas se elige la Región (agregado de toda la región), se acota al elegir Supervisor (esa zona), y se acota más al elegir Tienda (esa tienda sola). Corrige un bug donde se mezclaban las ventas de todas las tiendas del día.
- **Dashboard**: ventas de Honor vs. total, share de Honor, ranking de marcas, gráfico de línea de ventas diarias de Honor (14 días), ventas por región, ranking de promotores agrupado por región — filtrable por Hoy / Semana / Mes.
- **Compartir por WhatsApp**: botón que arma un mensaje (tienda, promotor, desglose por marca, total) y abre `wa.me` con el texto pre-cargado. Corregido para que solo muestre los datos de la tienda seleccionada.
- **Resumen mensual**: modal con el acumulado de unidades por marca del mes en curso.
- **Backend en Google Sheets** (Apps Script): `doGet`/`doPost`, normalización de fecha/hora (bug de auto-conversión de Sheets resuelto forzando columnas a texto plano), validación de duplicados atómica del lado del servidor.
- **Reporte diario automático de PDVs faltantes**: trigger de Apps Script que corre todos los días a las 9:00am, compara la cobertura completa contra lo registrado el día anterior, genera un Excel y lo envía por correo a `ivan.severinos@gmail.com` con el asunto *"Reporte de Ventas - Tiendas Faltantes"*. **Confirmado en producción**: el trigger quedó activado y el primer correo automático llegó correctamente.
- **Tiendas sin registrar en el Resumen del día**: al elegir Región o Supervisor (no aplica a nivel Tienda individual), debajo del resumen se listan en píldoras las tiendas de ese scope que todavía no enviaron su cierre para el día que se está viendo, con conteo `(faltantes de total)`.
- **Columna Share de Marca**: la tabla de Resumen del día ahora muestra, junto a las unidades por marca, el % que representa cada marca sobre el total del día (fila Total en 100%).
- **Guía visual de usuario**: infografía tipo "ticket de cierre de caja", con los colores de marca reales de Entel Perú (`#002EFF` / `#42E8B4`) y Honor (`#00B1FF → #FF00D0`), exportada como Artifact web, PNG y PDF para compartir por WhatsApp.
- **Distribución**: app publicada en GitHub Pages, con link corto personalizado (`tinyurl.com/cierre-ventas-diarias`) tras descartar `is.gd` (rechaza dominios `*.github.io`).

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

**Estado:** ambos cambios están en `index.html`, listos para publicar a GitHub Pages (no requieren cambios en `Code.gs` — se calculan en el cliente a partir de los datos ya sincronizados).

**Siguiente paso sugerido:** hacer commit + push de `index.html` a `main` para que se reflejen en `https://el-seve.github.io/ventas-punto-venta/`, y validar con el equipo de promotores que la lista de tiendas faltantes y el share se vean bien en campo (mobile).
