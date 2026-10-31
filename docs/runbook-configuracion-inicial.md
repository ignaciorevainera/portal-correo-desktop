# Runbook: configuración inicial

Guía para dejar funcionando la entrega sin secretos: share de configuración, bootstrap y
verificación de punta a punta.

> **Placeholders:** este documento está versionado y la auditoría de seguridad prohíbe
> escribir el hostname real, el dominio corporativo o IPs internas en archivos rastreados.
> Por eso aparecen `<EQUIPO>` y `<DOMINIO>`. Los valores reales van únicamente en
> `bootstrap.local.json` (ignorado por Git) y en el archivo del share.

---

## Cómo funciona en 30 segundos

```
Instalador (sin secretos)
   └── trae compilada la ruta del share (bootstrap.default.json)
          └── al abrir, la app lee el share con la sesión de Windows
                 ├── puede  → interfaz normal
                 └── no puede → pantalla de bloqueo con un código
```

No hay claves en el instalador y nada se escribe en el disco del operador: la configuración
vive en memoria mientras la app está abierta.

---

## Requisitos

| Requisito | Cómo verificar |
| --- | --- |
| Un share accesible desde la red donde corren los operadores | `Get-Content '\\<EQUIPO>.<DOMINIO>\portal-correo-desktop-config$\portal-correo-desktop.config.json'` desde otra máquina |
| Grupo de AD con los operadores | `Get-ADGroup -Identity PortalCorreoDesktop-Operadores` |
| Los valores de SQL y VNC de la versión anterior | Están en `.env` o `cmda.config.local.json` de la máquina que hoy funciona |

Para derivar los placeholders en el equipo que aloja el share:

```powershell
"$env:COMPUTERNAME.$env:USERDNSDOMAIN"    # → <EQUIPO>.<DOMINIO>
```

El share se publica siempre con el sufijo `$` (oculto) y el nombre exacto
`portal-correo-desktop-config`.

---

## Valores que hay que trasladar

| Campo del archivo nuevo | Variable vieja |
| --- | --- |
| `dbServer` | `CMDA_DB_SERVER` |
| `dbDatabase` | `CMDA_DB_NAME` |
| `dbUser` | `CMDA_DB_USER` |
| `dbPassword` | `CMDA_DB_PASSWORD` |
| `dbPort` | `CMDA_DB_PORT` (1433 si falta) |
| `vncPassword` | `CMDA_VNC_PASSWORD` |
| `corporateDomain` | `CMDA_CORP_DOMAIN` |
| `authMode` | nuevo: `static-sql` |

`CMDA_ACCESS_KEY` no se traslada: la clave de activación desapareció del diseño.

---

## Fase 1 — Archivo de configuración en el share

### 1.1 Crear el archivo

Con los valores a mano, editá este archivo (ya existe con placeholders):

```
C:\portal-correo-desktop\config\portal-correo-desktop.config.json
```

```json
{
  "dbServer": "SERVIDOR_SQL",
  "dbDatabase": "BASE_DE_DATOS",
  "dbUser": "USUARIO_SQL",
  "dbPassword": "CLAVE_SQL",
  "dbPort": 1433,
  "vncPassword": "CLAVE_VNC",
  "corporateDomain": "dominio.corporativo.local",
  "authMode": "static-sql"
}
```

Para generarlo automáticamente desde el `.env` de desarrollo, sin copiar claves a mano:

```powershell
$vals = @{}
Get-Content .env | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $i = $line.IndexOf('=')
    $vals[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim()
  }
}

@{
  dbServer        = $vals['CMDA_DB_SERVER']
  dbDatabase      = $vals['CMDA_DB_NAME']
  dbUser          = $vals['CMDA_DB_USER']
  dbPassword      = $vals['CMDA_DB_PASSWORD']
  dbPort          = 1433
  vncPassword     = $vals['CMDA_VNC_PASSWORD']
  corporateDomain = $vals['CMDA_CORP_DOMAIN']
  authMode        = 'static-sql'
} | ConvertTo-Json |
  Set-Content 'C:\portal-correo-desktop\config\portal-correo-desktop.config.json' -Encoding UTF8
```

> **Cuidado con el BOM.** `Set-Content -Encoding UTF8` en Windows PowerShell 5.1 escribe un BOM
> al inicio del archivo. La aplicación lo tolera (se ignora al parsear), pero si editás el archivo
> con otra herramienta y falla, verificá que no tenga caracteres invisibles al inicio. Para
> escribirlo sin BOM desde cualquier versión:
>
> ```powershell
> $json = @{ dbServer = 'X' } | ConvertTo-Json
> [System.IO.File]::WriteAllText(
>   'C:\portal-correo-desktop\config\portal-correo-desktop.config.json',
>   $json,
>   (New-Object System.Text.UTF8Encoding($false))
> )
> ```

### 1.2 Publicar el share

```powershell
New-SmbShare -Name 'portal-correo-desktop-config$' `
  -Path 'C:\portal-correo-desktop\config' `
  -ReadAccess "$env:USERDOMAIN\PortalCorreoDesktop-Operadores" `
  -FullAccess "${env:USERDOMAIN}\${env:USERNAME}"
```

Si el grupo todavía no existe, para el piloto usá tu usuario en `-ReadAccess`.

**Ojo:** `New-SmbShare` agrega por defecto `Todos` con lectura. Hay que quitarlo, o el share
queda legible por cualquiera que llegue al equipo:

```powershell
Revoke-SmbShareAccess -Name 'portal-correo-desktop-config$' -AccountName 'Todos' -Force
Get-SmbShareAccess -Name 'portal-correo-desktop-config$'
```

Después, la ACL NTFS. **Usá llaves** en `${env:USERNAME}`: sin ellas, PowerShell interpreta
`:` como calificador y el comando falla con "parámetro no válido".

```powershell
$cuenta = "$env:USERDOMAIN\$env:USERNAME"
icacls C:\portal-correo-desktop\config /inheritance:r
icacls C:\portal-correo-desktop\config /grant "${cuenta}:(OI)(CI)F"
icacls C:\portal-correo-desktop\config
```

> **No compartas la carpeta del repositorio.** Si `C:\Projects` está publicada por SMB
> (por ejemplo, un share `Projects` con `Todos`), el `.env` con las credenciales queda
> accesible por red y todo el diseño de secretos se pierde. Verificá con
> `Get-SmbShare | Where-Object Path -like 'C:\Projects*'` y quitá ese share o restringilo.

### 1.3 Verificar antes de seguir

Desde **otra** máquina de la red:

```powershell
Get-Content '\\<EQUIPO>.<DOMINIO>\portal-correo-desktop-config$\portal-correo-desktop.config.json'
```

Si esto no abre, la app tampoco va a abrir. No avances hasta resolverlo.

---

## Fase 2 — Bootstrap

El instalador lleva compilada la ruta del share. Para generarla, editá
`bootstrap.local.json` en la raíz del repo (está ignorado por Git):

```json
{
  "configSource": "unc",
  "uncConfigPath": "\\\\<EQUIPO>.<DOMINIO>\\portal-correo-desktop-config$\\portal-correo-desktop.config.json",
  "updateFeed": "",
  "updateMirror": ""
}
```

```powershell
node scripts/prepare-bootstrap.cjs
Get-Content electron\bootstrap.default.json
```

Ese archivo es el que viaja en el paquete. `npm run release:build` lo regenera solo.

### Cambiar la ruta sin publicar una release

Creá en el equipo:

```
%ProgramData%\portal-correo-desktop\bootstrap.json
```

con el mismo contenido. Ese archivo tiene prioridad sobre el valor compilado. Es el
mecanismo para mudar el share a un servidor definitivo sin recompilar.

---

## Fase 3 — Probar en desarrollo

En desarrollo la app **no usa el share**: usa variables `PCD_*` o un archivo local.
Para un smoke test sin red corporativa:

```powershell
Copy-Item portal-correo-desktop.config.example.json portal-correo-desktop.config.local.json
# completar el archivo con los mismos valores del paso 1.1
npx electron .
```

Resultado esperado: interfaz normal. Si aparece la pantalla de bloqueo acá, el problema
es el archivo local (no existe, está mal formado o le falta `dbPassword`).

---

## Fase 4 — Empaquetar y probar el camino real

Requiere red para electron-builder:

```powershell
npm run release:build
```

Instalar `release\Portal Correo Desktop-Corporativo-*.exe` en un equipo de la red:

| Escenario | Resultado esperado |
| --- | --- |
| Equipo en la red, con acceso al share | Interfaz normal |
| Equipo en la red, sin pertenencia al grupo | Bloqueo con `NO_PERMISSION` |
| Equipo fuera de la red | Bloqueo con `NO_LAN_ROUTE` o `NO_LAN_DNS` |

---

## Fase 5 — Publicar

`npm run release:build` deja la carpeta `release\` lista para subir: la vacía antes de
empaquetar (para no mezclar versiones) y genera los `.sha256` al final. Los nombres son
los que produce electron-builder para la versión actual:

| Archivo | Motivo |
| --- | --- |
| `Portal Correo Desktop Setup <version>.exe` | Instalador |
| `Portal Correo Desktop Setup <version>.exe.sha256` | El actualizador rechaza la descarga si falta |
| `Portal Correo Desktop-Portable-<version>.exe` | Versión portable (opcional) |
| `Portal Correo Desktop-Portable-<version>.exe.sha256` | Checksum de la portable |

Subir los `.sha256` con ese nombre exacto, al lado de su `.exe`: el actualizador pide
`<url del exe>.sha256`. Si hace falta regenerarlos sin recompilar:

```powershell
npm run release:checksums
```

Copiar también el `.exe` a `\\<EQUIPO>\portal-correo-desktop-public$\` como espejo interno.

---

## Checklist de cierre

- [ ] El archivo del share se lee desde otra máquina.
- [ ] `electron/bootstrap.default.json` tiene la ruta real.
- [ ] En desarrollo, con el config local, la app abre.
- [ ] El paquete instalado con red abre.
- [ ] El paquete instalado sin red bloquea.
- [ ] En `%APPDATA%\portal-correo-desktop\` no quedó ningún `cmda.config.json`.
- [ ] El `.sha256` está publicado junto al `.exe`.

---

## Diagnóstico por código

La pantalla de bloqueo y **Ajustes → Conexión Corporativa** muestran estado, código,
origen y si se encontró el bootstrap.

| Código | Significado | Qué revisar |
| --- | --- | --- |
| `NO_LAN_DNS` | El nombre del equipo no resuelve | DNS o que el equipo esté en la red |
| `NO_LAN_ROUTE` | Sin ruta al equipo | Firewall o que estés fuera de la red |
| `NO_LAN_TIMEOUT` | Hay ruta pero no responde | Que el equipo esté encendido |
| `NO_PERMISSION` | El share rechazó al usuario | ACL y grupo de AD |
| `NO_CONFIG` | Share accesible, archivo ausente | Nombre y ruta del archivo |
| `BAD_CONFIG` | Archivo inválido o incompleto | Falta `dbServer`, `dbUser` o `dbPassword` |
| `SECRET_UNAVAILABLE` | No se pudo obtener la clave VNC | `vncPassword` vacío en el archivo |
| `UNKNOWN` | Fallo inesperado | Consola de Electron |

---

## Operaciones habituales

**Rotar la clave SQL o VNC.** Editá el archivo del share. No hay que reinstalar nada:
la app lo lee en el próximo arranque.

**Mudar el share a un servidor definitivo.** Publicá el mismo share en el servidor,
copiá el archivo y actualizá `uncConfigPath` en `%ProgramData%\portal-correo-desktop\bootstrap.json`
de cada equipo (o publicá una release con el nuevo `bootstrap.local.json`).

**Habilitar autenticación integrada de SQL.** Cuando el DBA lo confirme: cambiá
`authMode` a `integrated` y quitá `dbPassword`. Requiere además migrar el driver
(`mssql`/`tedious` no soporta SSPI; hace falta `msnodesqlv8`).

**Un operador no puede entrar.** Pedile el código de la pantalla: `NO_PERMISSION` es
grupo/ACL, `NO_LAN_*` es red, `NO_CONFIG` es archivo.

---

## Equipos donde la ventana no aparece

En algunas máquinas (VMs, sesiones RDP, equipos con EDR estricto) Chromium no puede crear
sus procesos hijos. Síntoma: la app se abre y se cierra al instante; en la consola aparece
`Renderer process launch-failed` o `GPU process launch failed: error_code=18`, y el log del
gate alcanza a escribir `READY` antes de morir.

La aplicación se recupera sola: detecta el fallo y se relanza una vez con `--no-sandbox`,
registrando `[Compat] ... relanzando sin sandbox`. En una máquina sin la restricción sigue
usando el sandbox normal.

Para evitar el primer intento fallido en un equipo que ya sabés restringido:

```powershell
$env:PCD_COMPAT_MODE = "1"
& "C:\Program Files\Portal Correo Desktop\Portal Correo Desktop.exe"
```

---

## Deuda conocida

- El actualizador todavía usa el repositorio fijo del código, no `updateFeed` / `updateMirror`
  del bootstrap.
- No hay re-evaluación periódica del gate: si el share deja de estar accesible con la app
  abierta, sigue funcionando hasta reiniciar.
- El primer pintado de la interfaz ocurre antes de que responda el gate (ventana de
  milisegundos).
- Sin certificado de firma de código, SmartScreen advierte al instalar.
