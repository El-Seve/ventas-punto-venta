# Ventas del Día — Punto de Venta

Aplicación web simple para registrar las ventas diarias de smartphones en un punto de venta. Corre completamente en el navegador, sin servidor ni instalación: basta con abrir `index.html`.

## Funcionalidades

- Registro de ventas por modelo de smartphone (marca, modelo, cantidad y precio unitario), con soporte para modelos personalizados vía la opción "Otro...".
- Navegación entre días (día anterior / siguiente / hoy) para consultar el historial de ventas.
- Resumen del día: total vendido, unidades vendidas, modelos distintos y número de ventas.
- Resumen agrupado por modelo con unidades y subtotal.
- Exportación del detalle de ventas del día a CSV.
- Opción para vaciar todas las ventas de un día.

## Uso

1. Abre `index.html` en cualquier navegador moderno.
2. Escribe el nombre del promotor (se guarda automáticamente).
3. Selecciona el modelo, cantidad y precio unitario, y presiona **Agregar venta**.
4. Consulta el resumen del día o exporta el detalle a CSV con el botón correspondiente.

## Almacenamiento de datos

Los datos se guardan en el `localStorage` del navegador, separados por día. No se envían a ningún servidor, por lo que solo están disponibles en el navegador y equipo donde se registraron.
