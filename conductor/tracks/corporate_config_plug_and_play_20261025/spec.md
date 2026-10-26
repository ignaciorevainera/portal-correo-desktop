# Especificación: Importación de Configuración Corporativa en Ajustes, Autodescubrimiento en Arranque y Empaquetado Interno Plug & Play

## 1. Visión General
Proveer una experiencia de usuario completamente "Plug & Play" para operadores de Correo Argentino. Al instalar o ejecutar la versión corporativa interna, la aplicación debe arrancar directamente en modo "SQL Online" conectada al inventario de terminales. Para usuarios con la versión base de distribución pública, se proporciona en el modal de **Ajustes** una pestaña dedicada a la **Conexión Corporativa** donde pueden importar o arrastrar su archivo maestro de configuración (`cmda.config.json` o `.env`) una única vez, persistiendo los parámetros de forma segura en `%APPDATA%`.

Todo esto convive estrictamente con la política **Zero-Secrets** en el repositorio Git y en los instaladores públicos de GitHub Releases.

---

## 2. Requerimientos Funcionales

### RF-01: Autodescubrimiento y Persistencia en Electron (`electron/configManager.cjs`)
1. **Prioridad de Carga en Arranque**:
   - Nivel 1: `%APPDATA%/Portal Correo Desktop/cmda.config.json` (configuración local persistida por el usuario o instalador).
   - Nivel 2: Directorio de ejecución adyacente (`process.execPath` / archivo `cmda.config.json` o `cmda.env` en la misma carpeta del `.exe`).
   - Nivel 3: Variables de entorno del sistema o archivo `.env` en la raíz del proyecto (para desarrollo).
2. Si se detecta configuración válida con `dbServer`, `dbUser` y `dbPassword`, Electron intenta inicializar el pool de conexión con SQL Server en arranque.
3. Exponer handlers IPC en `electron/main.cjs` y `electron/preload.cjs`:
   - `cmda:import-config-file`: Abre cuadro de diálogo nativo (`dialog.showOpenDialog`) o recibe la ruta / contenido del archivo, lo valida y lo almacena en `%APPDATA%/Portal Correo Desktop/cmda.config.json`.
   - `cmda:test-sql-connection`: Ejecuta un ping de prueba contra SQL Server con la configuración cargada y devuelve latencia y estado.
   - `cmda:clear-config`: Elimina la configuración persistida de `%APPDATA%`, desconecta el pool SQL y reinicia la app a modo Offline/Mock.

### RF-02: Pestaña "Conexión Corporativa" en `SettingsModal.tsx`
1. Incorporar una nueva pestaña en el diálogo de Ajustes con icono de base de datos (`Database`).
2. Visualizar:
   - Estado actual de conexión: Badge `SQL Online` (verde) o `Modo Local / Mock` (ámbar).
   - Datos del servidor actual (Servidor, Base de datos, Puerto) sin mostrar contraseñas.
   - Botón *"Importar Archivo de Configuración (.json / .env)"*.
   - Área visual Drag & Drop para arrastrar el archivo de configuración.
   - Botón de *"Probar Conexión"* y botón de *"Eliminar Configuración"* (con confirmación).

### RF-03: Pipeline de Empaquetado Interno Plug & Play
1. Mantener intacto el comando `npm run release:build` que pasa por `securityAudit.test.ts` para las releases públicas de GitHub sin secretos.
2. Crear script dedicado `npm run release:internal`:
   - Toma el archivo de configuración maestro local (ej. `cmda.config.local.json` o `.env` no versionado).
   - Empaqueta el instalador corporativo `Portal-Correo-Desktop-Setup-Corporativo.exe`.
   - En el empaquetado NSIS incluye el archivo maestro para que se instale automáticamente en `%APPDATA%/Portal Correo Desktop/cmda.config.json`.
   - Al terminar de instalar, el usuario abre la app y tiene SQL Online inmediato sin ventanas de carga ni configuración manual.

---

## 3. Criterios de Aceptación
1. **Importación Manual en UI**: Al importar un `cmda.config.json` válido en el modal de Ajustes, la aplicación actualiza el estado a "SQL Online" inmediatamente sin necesidad de reiniciar.
2. **Persistencia entre Reinicios**: Al cerrar y volver a abrir la aplicación, la configuración guardada en `%APPDATA%` se recupera automáticamente y conecta a SQL.
3. **Restablecimiento**: Al hacer clic en "Eliminar Configuración", el archivo en `%APPDATA%` se borra y la aplicación regresa a modo Offline/Mock de forma segura.
4. **Zero-Secrets Garantizado**: Ningún archivo con contraseñas o IPs reales es versionado en Git ni empaquetado en las builds públicas (`npm run release:check` sigue validando al 100%).
