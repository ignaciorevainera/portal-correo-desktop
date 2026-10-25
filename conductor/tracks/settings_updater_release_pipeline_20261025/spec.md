# Especificación Técnica (`spec.md`)
## Track: `settings_updater_release_pipeline_20261025`
### Nombre: CTA de Ajustes en Navbar, In-App Updater con Descarga en Segundo Plano y Pipeline de Releases Zero-Secrets

### 1. Resumen Ejecutivo (Overview)
Implementar un botón de Ajustes (⚙️) en la barra superior (`Topbar`) que despliega un modal unificado (`SettingsModal`) basado en primitivas vanilla de Shadcn UI. Este diálogo centraliza el control de actualizaciones en vivo (*In-App Updater* mediante GitHub Releases) con confirmación de usuario, descarga silenciosa en segundo plano y aviso de reinicio para aplicar cambios. Asimismo, incluye configuración de preferencias de usuario (bandeja del sistema, atajo global `Ctrl+Espacio`, modo de ping por defecto y diagnóstico de conectividad) y el pipeline de empaquetado seguro dual (`electron-builder`: Instalador Setup NSIS y Portable `.exe`) blindado por la compuerta previa obligatoria de auditoría *Zero-Secrets*.

---

### 2. Requerimientos Funcionales

#### 2.1 CTA de Ajustes en Barra Superior (`src/components/Topbar.tsx`)
- Botón accesible con icono de engranaje (`Settings` de `lucide-react`) con variante `outline`/`ghost` alineado con el preset Shadcn, ubicado a la derecha junto a los controles de ventana y el botón de Portal MDA.
- Tooltip informativo (*"Configuración y Actualizaciones (F10)"*) y soporte para atajo de teclado (`F10` o `Ctrl+,`).
- Abre fluidamente el componente `SettingsModal`.

#### 2.2 Modal de Configuración (`src/components/SettingsModal.tsx`)
- Construido con componentes Shadcn Radix (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Tabs`, `Button`, `Badge`, `Switch`, `Label`, `Separator`).
- Organizado en 3 secciones / pestañas:
  1. **Actualizaciones**: Versión instalada actual, botón para buscar updates, visualizador de novedades (*changelog* de la release) y barra/indicador de progreso de descarga.
  2. **Preferencias Generales**:
     - *Bandeja del sistema*: Alternar entre minimizar al Tray al presionar la 'X' o cerrar definitivamente la app.
     - *Atajo Global*: Habilitar/deshabilitar la invocación global con portapapeles (`Ctrl + Espacio`).
     - *Modo de Ping por defecto*: Seleccionar si la terminal debe auto-iniciar con Ping de 4 paquetes o Ping continuo `-t`.
  3. **Diagnóstico y Red**:
     - Estado de conectividad de backend (SQL Server / Mock / Offline).
     - Estado de alcance de red corporativa / VPN sin exponer IPs privadas ni contraseñas.

#### 2.3 Servicio In-App Updater en Electron (`electron/updaterService.cjs`) y Bridge (`src/services/electronClient.ts`)
- **Canal IPC `cmda:check-updates`**:
  - Consulta los metadatos públicos de la última release en la API de GitHub Releases (`/repos/:owner/:repo/releases/latest`).
  - Compara la versión del tag de la release contra `package.json` (`version`).
- **Flujo de Confirmación & Descarga en Segundo Plano**:
  1. Si hay una versión superior disponible, el modal informa la novedad y **pregunta al usuario** si desea proceder con la actualización.
  2. Si el usuario confirma: se inicia la **descarga silenciosa en segundo plano** del archivo ejecutable de la release sin interrumpir la operación normal del operador.
  3. Durante la descarga se reporta el progreso porcentual (`cmda:update-progress`).
  4. Al finalizar la descarga: se dispara un Toast de notificación en pantalla: *"Actualización lista para instalar"*, con el botón *"Reiniciar ahora"*.
  5. Si el operador decide no reiniciar en ese momento, el archivo queda preparado para aplicarse automáticamente la próxima vez que se cierre y vuelva a abrir el aplicativo.

#### 2.4 Pipeline de Empaquetado y Releases Seguras (`electron-builder`)
- Configuración de empaquetado en `package.json`:
  - **Instalador de Windows NSIS**: `PortalCorreoDesktop-Setup-X.Y.Z.exe` (crea accesos directos y desinstalador limpio).
  - **Ejecutable Portable**: `PortalCorreoDesktop-X.Y.Z-portable.exe` (para ejecución directa en estaciones sin requerir permisos de administrador).
- **Compuerta de Seguridad Zero-Secrets Pre-Release**:
  - Script `npm run release:check`: corre `vitest run src/test/securityAudit.test.ts` y verifica que el historial de commits y los archivos no contengan credenciales ni IPs corporativas antes de permitir compilar o subir nada.
  - Script `npm run release:build`: compila los binarios listos para publicar en GitHub Releases.

---

### 3. Criterios de Aceptación
1. El botón de ajustes ⚙️ en `Topbar` abre el diálogo de configuración con diseño estilizado Shadcn.
2. Al pulsar *"Buscar actualizaciones"*, el sistema detecta con precisión si la versión actual es la más reciente o si existe una nueva versión en GitHub Releases.
3. Si existe una actualización y el usuario pulsa *"Actualizar"*, la descarga ocurre en segundo plano y emite la notificación final de reinicio.
4. Las preferencias de usuario (minimizar a bandeja, atajo global, modo de ping default) persisten entre sesiones.
5. El script de empaquetado bloquea la compilación si falla la auditoría de seguridad criptográfica de `securityAudit.test.ts`.
6. La cobertura de pruebas supera el 85% para los nuevos módulos con 100% de tests en verde.

---

### 4. Fuera de Alcance (Out of Scope)
- Actualizaciones diferenciales binarias byte-a-byte (se descarga el paquete completo portable/setup de la release).
- Servidores de actualización privados propietarios (se utiliza el endpoint seguro de GitHub Releases del propio repositorio).
