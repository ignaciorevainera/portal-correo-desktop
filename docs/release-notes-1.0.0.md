# Portal Correo Desktop 1.0.0

Primera versión con **instalador sin secretos**. La configuración corporativa ya no viaja
dentro del ejecutable: se lee de un share de la red al abrir la aplicación.

## Lo más importante

- **El instalador no contiene credenciales.** Ninguna clave SQL, de VNC ni de dominio se
  empaqueta. Cualquiera puede descargar el `.exe` sin que eso exponga nada.
- **La configuración se lee de la red.** Al abrir, la app busca
  `\\<HOST>\portal-correo-desktop-config$\portal-correo-desktop.config.json` con la sesión
  de Windows del operador. No hay nada que configurar: la ruta ya viene en el paquete.
- **Si no hay acceso, la app se bloquea y lo explica.** Muestra un código
  (`NO_LAN_ROUTE`, `NO_PERMISSION`, `NO_CONFIG`, `BAD_CONFIG`) en vez de fallar en silencio.
- **Nada queda en el disco del operador.** La configuración vive en memoria. La clave VNC se
  pide bajo demanda y el archivo temporal se borra al instante.
- **Migración automática.** Al primer arranque de la versión instalada se eliminan los
  `cmda.config.json` y `.env` en texto plano que hubieran dejado versiones anteriores.

## Cambios de comportamiento

- **Ya no funciona fuera de la red corporativa.** Antes, con la configuración embebida,
  funcionaba por VPN. Ahora requiere acceso al share; es la contrapartida de no llevar
  secretos en el binario.
- **Desaparece la importación manual de configuración.** El panel de Ajustes muestra el
  diagnóstico del acceso (estado, código, origen, bootstrap) en lugar de pedir un archivo.
- **El actualizador verifica integridad.** Descarga el `.sha256` publicado junto al
  instalador y rechaza el archivo si no coincide. Si el checksum no está disponible, no
  instala.

## Equipos con restricciones (EDR, VMs, RDP)

Si el sistema impide crear los procesos hijos de Chromium, la app se relanza sola una vez
sin sandbox y lo registra en el log. En equipos sin esa restricción el sandbox se mantiene.
Se puede forzar desde el arranque con `PCD_COMPAT_MODE=1`.

## Instalación

1. Descargar `Portal Correo Desktop Setup 1.0.0.exe`.
2. Ejecutarlo. **Windows va a mostrar una advertencia de SmartScreen** porque el binario no
   está firmado: *Más información → Ejecutar de todas formas*.
3. Abrir la aplicación desde el acceso directo.

Alternativa sin instalación: `Portal Correo Desktop-Portable-1.0.0.exe`.

### Verificar la descarga

Cada ejecutable tiene su archivo `.sha256` al lado. Para comprobar que no fue alterado:

```powershell
$exe = 'Portal Correo Desktop Setup 1.0.0.exe'
$esperado = (Get-Content "$exe.sha256").Split(' ')[0]
$real = (Get-FileHash -Algorithm SHA256 $exe).Hash.ToLower()
if ($esperado -eq $real) { 'OK' } else { 'NO COINCIDE' }
```

### Requisitos

- Windows 10 o superior, x64.
- Equipo en la red corporativa con acceso al share de configuración.
- Cuenta de AD incluida en el grupo de operadores.

## Qué hacer si no abre

| Síntoma | Causa |
| --- | --- |
| Pantalla de bloqueo con `NO_LAN_ROUTE` / `NO_LAN_DNS` | El equipo no llega al share |
| Pantalla de bloqueo con `NO_PERMISSION` | La cuenta no está en el grupo de operadores |
| Pantalla de bloqueo con `NO_CONFIG` / `BAD_CONFIG` | El archivo del share falta o está incompleto |
| No aparece ninguna ventana | Restricción de EDR: revisar el log; la app debería relanzarse sola |

## Limitaciones conocidas

- El binario no está firmado: SmartScreen advierte en cada instalación.
- La interfaz se dibuja antes de que el gate confirme el acceso (ventana de milisegundos).
- No hay re-evaluación periódica: si el share deja de estar accesible con la app abierta,
  sigue funcionando hasta reiniciar.
- Sin verificación de firma Authenticode en las actualizaciones (solo SHA-256).
