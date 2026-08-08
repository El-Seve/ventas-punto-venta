# Configurar el backend de Google Sheets

La app guarda las ventas en una Google Sheet compartida, para que todos los promotores registren ahí y tú puedas ver todo centralizado en el Dashboard. Requiere un solo despliegue de 5 minutos, hecho una vez, por ti (el dueño de la hoja).

## 1. Crear la hoja de cálculo

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva. Nómbrala, por ejemplo, `Ventas POS`.
2. No hace falta crear columnas manualmente — el script las crea solo la primera vez que se usa.

## 2. Agregar el script

1. En la hoja, ve a **Extensiones > Apps Script**.
2. Borra el contenido de `Code.gs` y pega el contenido de [`google-apps-script/Code.gs`](google-apps-script/Code.gs) de este repositorio.
3. Guarda el proyecto (ícono de disco o `Ctrl+S`).

## 3. Desplegar como Web App

1. Arriba a la derecha, haz clic en **Desplegar > Nueva implementación**.
2. En "Selecciona el tipo", elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier usuario
4. Haz clic en **Desplegar** y autoriza los permisos que pida Google (es tu propio script, es seguro).
5. Copia la **URL de la aplicación web** que te da (termina en `/exec`).

## 4. Conectar la app

1. Abre `index.html` en este repositorio.
2. Busca la constante `CONFIG.SHEETS_URL` cerca del inicio del `<script>`.
3. Reemplaza el valor por la URL que copiaste en el paso anterior.
4. Guarda y sube el cambio (commit + push).

## Actualizar el script más adelante

Si vuelves a `google-apps-script/Code.gs` para cambiar algo, no basta con guardar: debes ir a **Desplegar > Administrar implementaciones**, editar la implementación existente (ícono de lápiz) y elegir **Nueva versión** para que los cambios queden activos en la URL ya publicada.

## ⚠️ Nota de seguridad

Esta URL queda visible en el código fuente de la página (cualquiera que la use puede verla en las herramientas de desarrollador del navegador) y con acceso "Cualquier usuario" acepta escrituras de quien la tenga, sin autenticación. Es un esquema adecuado para un equipo pequeño y de confianza (tus promotores), **no** para una app pública o con datos sensibles. Si más adelante necesitas control de acceso real, el siguiente paso sería un backend propio con autenticación.

## Reporte diario de tiendas (PDVs) sin registrar

El script incluye un reporte automático: todos los días a las 9:00am revisa qué tiendas **no** registraron su cierre del día anterior, arma un Excel con el detalle y lo manda por correo.

**Activarlo (una sola vez):**

1. En el editor de Apps Script, en el desplegable de funciones (arriba, junto a "Depurar"), elige **`setupDailyTrigger`**.
2. Presiona **Ejecutar**.
3. Te va a pedir autorizar permisos (enviar correo, crear archivos temporales en Drive, programar disparadores) — acepta todos, son necesarios para armar y enviar el Excel.
4. Listo. Corre solo, todos los días, sin que nadie tenga que abrir nada.

**Configurar el correo destino:** cambia el valor de `REPORT_EMAIL` al inicio del bloque de reporte en `Code.gs`, y vuelve a guardar (no hace falta redesplegar el Web App para esto, solo guardar el script).

**Importante:** la lista de tiendas (`COVERAGE`) está duplicada en `Code.gs` porque el reporte corre del lado del servidor. Si agregas una tienda nueva, debe actualizarse en **ambos** archivos: `index.html` y `google-apps-script/Code.gs`.
