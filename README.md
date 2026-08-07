# Ventas del Día — Punto de Venta

Aplicación web para que un equipo de promotores registre ventas diarias de smartphones y el dueño vea todo centralizado en un dashboard. Corre completamente en el navegador (sin build ni backend propio): basta con abrir `index.html`. Los datos se sincronizan en una Google Sheet compartida.

## Funcionalidades

- Registro de cierre de día: cascada **Región → Supervisor → Tienda** (según la tabla Coverage Ventas diarias), nombre del promotor (se autocompleta desde el 2do registro) y un grid con la cantidad vendida de cada **Marca** (Samsung, Honor, Xiaomi, Zte, Oppo, Vivo, Motorola, Apple). Se llena una sola vez al final del día y se registra todo junto con el botón **Enviar**, que pide confirmación antes de guardar.
- **Registros inmutables**: una vez que una tienda tiene un cierre registrado para un día, ese registro queda bloqueado — no se puede volver a enviar ni modificar. Solo se permite registrar para **hoy**, o para **ayer** si ayer se quedó sin registrar (día de gracia).
- Navegación entre días (día anterior / siguiente / hoy): muestra el resumen de unidades vendidas por marca de ese día.
- Botón **Resumen**: muestra las unidades acumuladas del mes en curso, por marca.
- **Dashboard** con resumen agregado (unidades vendidas, # de ventas, promotores activos, regiones activas), gráfico diario de ventas de Honor (últimos 14 días), ventas por marca, ventas por región y ranking de promotores — filtrable por Hoy / 7 días / 30 días / Todo.
- Sincronización con Google Sheets: todos los promotores registran desde su propio dispositivo y los datos quedan centralizados. Se actualiza automáticamente cada 30 segundos.
- Modo sin conexión: si Sheets no está configurado o falla la red, la app sigue funcionando con una copia local en el navegador.

## Uso

1. Configura el backend siguiendo [`SETUP_SHEETS.md`](SETUP_SHEETS.md) (una vez, 5 minutos).
2. Comparte `index.html` (idealmente publicado, ver más abajo) con tus promotores.
3. Al final del día, cada promotor elige región, supervisor y tienda, escribe su nombre, ingresa cuántas unidades vendió de cada marca, y presiona **Enviar** (confirmando el resumen antes de registrar).
4. Entra a la pestaña **Dashboard** para ver el consolidado de todo el equipo.

## Almacenamiento de datos

Los datos se guardan en una Google Sheet compartida (ver [`SETUP_SHEETS.md`](SETUP_SHEETS.md) y [`google-apps-script/Code.gs`](google-apps-script/Code.gs)). El navegador guarda además una copia local (`localStorage`) como respaldo para seguir funcionando sin conexión.
