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
   - Provisión mediante archivo externo `cmda.config.json` en red interna (UNC Share) o cifrado local AES-256-GCM.
   - Verificación dual adaptativa de pertenencia al Dominio Active Directory corporativo o alcance de red/VPN antes de desbloquear el aplicativo.

## 🛠️ Configuración de Desarrollo Local

Copie `.env.example` a `.env` (o `cmda.config.example.json` a `cmda.config.local.json`) y complete los parámetros de su entorno. Ambos archivos están excluidos del control de versiones mediante `.gitignore`.

```bash
# Instalar dependencias
npm install

# Iniciar Vite en modo desarrollo web
npm run dev

# Ejecutar la aplicación en escritorio con Electron
npx electron .

# Compilar para producción
npm run build

# Correr suite completa de pruebas unitarias
npm test
```

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
| `CMDA_ENABLE_GPU=1` | Reactiva la aceleración por hardware (solo en equipos con GPU funcional). |
| `CMDA_COMPAT_MODE=1` | Modo compatibilidad agresivo: añade `--no-sandbox` y deshabilita `RendererCodeIntegrity`. Usar solo si aparece `Renderer process launch-failed` por bloqueo del antivirus/EDR corporativo. |

Ejemplos en PowerShell:

```powershell
$env:CMDA_ENABLE_GPU = "1"; npx electron .
$env:CMDA_COMPAT_MODE = "1"; npx electron .

# Atajo equivalente a CMDA_COMPAT_MODE=1
npm run electron:compat
```

### `Failed to load URL: http://localhost:5173` al usar `npx electron .`

Es esperado: en modo desarrollo la app intenta el servidor de Vite y, si no está
corriendo, carga automáticamente `dist/index.html`. Ejecute `npm run build` antes
o use `npm run electron:dev` para levantar Vite y Electron juntos.

