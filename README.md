# Portal Correo Desktop - Consola de Monitoreo y Diagnóstico de Terminales

Aplicación nativa moderna basada en Electron, React 19, TypeScript y Tailwind CSS, diseñada para el soporte técnico y administración de estaciones de trabajo en entorno corporativo.

## 🚀 Características Principales

1. **Búsqueda Unificada & Resolución DNS en Vivo**:
   - Conexión con base histórica SQL Server corporativa configurada externamente.
   - Resolución dinámica en tiempo real vía DNS de dominio corporativo e inverso (`PTR`).
   - Generación automática de ficha de red para equipos no inventariados o con IP actualizada.

2. **Herramientas de Asistencia Remota Nativas**:
   - **Asistencia Remota de Windows (MSRA)**: Invocación segura mediante `cmd.exe /c start "" msra.exe /offerRA <host>` (evitando errores `EACCES` de permisos `uiAccess="true"`).
   - **VNC Viewer Inteligente**: Sondeo automático de puertos TCP (`5901` y `5900`) con soporte para archivos de configuración `/config`.
   - **Diagnóstico Inteligente**: Si los puertos VNC están cerrados en el equipo pero el puerto `3389` está abierto, la consola informa el estado y permite iniciar **MSRA** con 1 clic.

3. **Arquitectura de Seguridad Zero-Secrets y Candado Corporativo (Gatekeeper)**:
   - Ninguna credencial SQL, clave VNC, IP interna ni sufijo de dominio se almacena en el repositorio de código.
   - Provisión mediante archivo externo `portal-correo-desktop.config.json` alojado en un share corporativo con ACL de AD. El instalador publicado no contiene secretos.
   - Candado por alcanzabilidad real: la aplicación sólo se desbloquea si logra leer la configuración desde la red corporativa. La pertenencia al dominio **no** autoriza por sí sola.

## 🛠️ Configuración de Desarrollo Local

La aplicación no guarda credenciales en el equipo. En producción lee su configuración
de un share corporativo; en desarrollo usa variables de entorno `PCD_*` o un archivo
local no versionado.

1. Para trabajar con variables de entorno, copiá `.env.example` a `.env` y completá los valores.
2. Para trabajar con archivo, copiá `portal-correo-desktop.config.example.json` a
   `portal-correo-desktop.config.local.json`. El proveedor de desarrollo no lee `.env`:
   usa las variables de entorno del proceso o ese archivo.

```bash
npm install
npm run dev            # Vite en modo web
npx electron .         # Escritorio (variables PCD_* o el config local)
npm run build
npm test
```

### Modelo de configuración en producción

| Artefacto | Ubicación |
| --- | --- |
| Bootstrap de máquina | `%ProgramData%\portal-correo-desktop\bootstrap.json` |
| Configuración corporativa | `\\<HOST>\portal-correo-desktop-config$\portal-correo-desktop.config.json` |

Si la aplicación no alcanza el share, se bloquea y muestra un código de diagnóstico
(`NO_LAN_ROUTE`, `NO_PERMISSION`, `NO_CONFIG`, `BAD_CONFIG`).

## 🩺 Solución de problemas de arranque en escritorio

### `GPU process launch failed: error_code=18` / `GPU process isn't usable. Goodbye.`

Ocurre en equipos corporativos (escritorios virtuales, sesiones RDP, VMs sin GPU
o GPU bloqueada por política/EDR). Electron no logra iniciar su proceso gráfico y
aborta antes de mostrar la ventana.

La aplicación ya arranca en **modo software** por defecto (`main.cjs` deshabilita
la aceleración por hardware y el sandbox del proceso GPU), por lo que el error no
debería volver a aparecer. Variables de entorno disponibles:

| Variable | Efecto |
| --- | --- |
| `PCD_ENABLE_GPU=1` | Reactiva la aceleración por hardware (solo en equipos con GPU funcional). |
| `PCD_COMPAT_MODE=1` | Modo compatibilidad agresivo: añade `--no-sandbox` y deshabilita `RendererCodeIntegrity`. Usar solo si aparece `Renderer process launch-failed` por bloqueo del antivirus/EDR corporativo. |

Ejemplos en PowerShell:

```powershell
$env:PCD_ENABLE_GPU = "1"; npx electron .
$env:PCD_COMPAT_MODE = "1"; npx electron .

# Atajo equivalente a PCD_COMPAT_MODE=1
npm run electron:compat
```

### `Failed to load URL: http://localhost:5173` al usar `npx electron .`

Es esperado: en modo desarrollo la app intenta el servidor de Vite y, si no está
corriendo, carga automáticamente `dist/index.html`. Ejecute `npm run build` antes
o use `npm run electron:dev` para levantar Vite y Electron juntos.

