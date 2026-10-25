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
