# Diseño: instalador limpio y configuración por identidad

- **Fecha:** 2026-10-28
- **Estado:** aprobado para planificación
- **Producto:** Portal Correo Desktop
- **Alcance:** distribución, provisión de configuración, candado de acceso y manejo de secretos

---

## 1. Problema

Hoy la aplicación se distribuye como un instalador que **incrusta la configuración maestra en texto plano**. El script `scripts/build-internal.cjs` escribe `electron/embedded.config.json` con el usuario y la clave SQL, la clave VNC y el dominio corporativo, y ese archivo termina dentro del paquete `asar` porque `electron/**/*` está en la lista `files` de `electron-builder`.

Consecuencias verificadas:

- Cualquiera que obtenga el instalador puede extraer las credenciales en tres líneas de Node.
- El "candado corporativo" está anulado: `main.cjs` responde `authorized: true` de forma fija en `cmda:security-status` y `cmda:security-unlock`, sin consultar nunca a `securityGate.cjs`.
- Aun si el candado se activara, `checkDomainMembership` autorizaría a cualquier equipo unido al dominio aunque esté desconectado, porque `USERDNSDOMAIN` y `USERDOMAIN` persisten sin red.
- El actualizador descarga un ejecutable desde GitHub Releases y lo ejecuta **sin verificar hash ni firma**.
- El instalador no incluye `resources/bin/vncviewer.exe`, que no figura en `files`. La función VNC cae silenciosamente al `vncviewer.exe` del `PATH`.

## 2. Objetivo

Que un operador pueda obtener el instalador de un canal público, instalarlo sin credenciales ni pasos manuales, y que la aplicación funcione al abrirla — **sin que el artefacto publicado contenga un solo secreto**.

## 3. No objetivos

- No se rediseña la UI de trabajo ni los flujos de diagnóstico existentes.
- No se cambia el esquema de la base de datos ni se renombran los procedimientos almacenados.
- No se implementa el broker de datos (fase 3, fuera de este spec).
- No se resuelve el trabajo remoto: ver decisión D5.

## 4. Decisiones tomadas

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D1 | El artefacto publicado no contiene credenciales | El binario es público y permanente; una credencial filtrada no se puede despublicar |
| D2 | La configuración se entrega desde la red corporativa, no desde el instalador | Elimina el secreto del artefacto sin depender de un servicio nuevo |
| D3 | La app se bloquea por completo si no alcanza la configuración | Decisión de producto del usuario; simplifica el gate y la auditoría |
| D4 | El gate se basa en alcanzabilidad real, nunca en `USERDNSDOMAIN` | La pertenencia a dominio no prueba conectividad |
| D5 | **La aplicación solo funciona dentro de la red corporativa (LAN)** | Decisión de producto: el operador trabaja desde una cubic. Se descarta el acceso por VPN y, con ello, todo el problema del puerto 445 filtrado |
| D6 | El canal primario de descarga es interno; GitHub público es respaldo y feed de actualizaciones | TCP 443 a GitHub responde desde la LAN, pero falta validar TLS y proxy; el espejo interno siempre es alcanzable porque el operador ya está en la red |
| D7 | La clave VNC se entrega bajo demanda y se usa en memoria | Es el único secreto compartido que no se puede reemplazar por identidad |
| D8 | Se renombra `CMDA` a `Portal Correo Desktop` en todo identificador propio | El nombre viejo quedó en variables de entorno, archivos, canales IPC y temporales |
| D9 | Los procedimientos almacenados `CMDA_*` **no se renombran** | Son objetos del DBA; renombrarlos rompe la base |

## 5. Invariante central

> Todo lo que se publica es público. Si algo del artefacto obligaría a firmar un acuerdo de confidencialidad, está en el lugar equivocado.

Lo que **sí** puede viajar en el artefacto: código, URL del recurso interno, ruta del share, clave pública de actualizaciones. Lo que **nunca**: usuario, clave SQL, clave VNC, clave de activación.

## 6. Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  Instalador público (NSIS / portable)                        │
│  · código · bootstrap por defecto · clave pública de update  │
│  · CERO secretos                                             │
└──────────────────────────────┬───────────────────────────────┘
                               │ arranca
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Gate de red                                                 │
│  Éxito = pudo leer la configuración del share corporativo    │
│  Falla = pantalla de bloqueo con causa legible               │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  ConfigProvider (interfaz única)                             │
│   ├── UncConfigProvider    ← fase 1                          │
│   ├── HttpConfigProvider   ← fase 2 (IIS/443, Windows Auth)  │
│   └── DevEnvConfigProvider ← solo build de desarrollo        │
│                                                              │
│   getConfig() · getVncSecret()                               │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Consumidores sin cambios de contrato                        │
│  dbService · systemTools · dnsResolver · subnetScanner       │
│  Configuración en memoria. Sin secretos en disco.            │
└──────────────────────────────────────────────────────────────┘
```

### 6.1 Contrato del proveedor

```ts
interface ConfigProvider {
  /** Lee la configuración corporativa. Lanza ConfigError tipado si falla. */
  getConfig(): Promise<CorporateConfig>;

  /** Obtiene la clave VNC bajo demanda. Nunca se cachea en disco. */
  getVncSecret(): Promise<string>;

  /** Identifica la fuente para diagnóstico y logs. */
  readonly source: 'unc' | 'http' | 'dev';
}
```

`CorporateConfig` normalizado:

```ts
interface CorporateConfig {
  dbServer: string;
  dbDatabase: string;
  dbUser: string;
  dbPassword: string;
  dbPort: number;
  corporateDomain: string;
  authMode: 'static-sql' | 'session-sql' | 'integrated';
}
```

La clave VNC **no** forma parte de `CorporateConfig`: se obtiene únicamente con `getVncSecret()`, en el momento de lanzar VNC. Así el secreto no vive en memoria durante toda la sesión.

Los consumidores siguen leyendo de `configManager.getConfig()`; el proveedor vuelca su resultado con `configManager.setConfig()` y el diff queda acotado a la capa de arranque.

### 6.2 Bootstrap

La ruta del share **no se hardcodea en el binario** ni en un archivo versionado, por dos motivos: cambia cuando exista el servidor definitivo, y el nombre real del host no puede aparecer en el repositorio (ver §11.1).

```
%ProgramData%\PortalCorreoDesktop\bootstrap.json
```

```json
{
  "configSource": "unc",
  "uncConfigPath": "\\\\<HOST-PILOTO>\\PortalCorreoDesktop$\\portal-correo-desktop.config.json",
  "updateFeed": "https://api.github.com/repos/<org>/<repo-publico>/releases/latest",
  "updateMirror": "\\\\<HOST-PILOTO>\\PortalCorreoDesktop-Publico$\\updates\\"
}
```

Es un archivo de máquina, no de usuario: no está en OneDrive, no se sincroniza y no depende del perfil. El instalador escribe el valor por defecto; cambiarlo después no requiere publicar una release.

Orden de resolución: `%ProgramData%` → junto al ejecutable (solo desarrollo) → valores por defecto compilados.

### 6.3 Cadena de provisión

La aplicación nunca obtiene la configuración del repositorio. El repositorio solo entrega el ejecutable:

1. El operador descarga el `.exe` del repositorio público o del espejo interno.
2. El instalador escribe `%ProgramData%\PortalCorreoDesktop\bootstrap.json` con la ruta por defecto, compilada desde un `bootstrap.local.json` no versionado.
3. La aplicación lee el bootstrap y obtiene la ruta UNC.
4. Lee el share con la sesión de Windows y obtiene la configuración.

### 6.4 Nomenclatura canónica

| Contexto | Forma | Uso |
| --- | --- | --- |
| Nombre visible | `Portal Correo Desktop` | Ventana, instalador, accesos directos |
| Identificador sin espacios | `PortalCorreoDesktop` | Carpetas y shares |
| Identificador técnico | `portal-correo-desktop` | Paquete, archivos de configuración, `userData` |
| Prefijo corto | `PCD_` | Variables de entorno |

| Artefacto | Ruta o nombre |
| --- | --- |
| Instalador | `Portal Correo Desktop-Corporativo-<version>.exe` |
| Bootstrap de máquina | `%ProgramData%\PortalCorreoDesktop\bootstrap.json` |
| Configuración corporativa | `C:\PortalCorreoDesktop-Config\portal-correo-desktop.config.json` |
| Share de configuración | `\\<HOST>\PortalCorreoDesktop$\` |
| Share público | `\\<HOST>\PortalCorreoDesktop-Publico$\` |
| Temporales VNC | `%TEMP%\pcd_*.vnc` |
| `userData` | `%APPDATA%\portal-correo-desktop\` |

### 6.5 Ubicación en el host

Dos carpetas con permisos distintos, porque mezclarlas obligaría a dar lectura de los secretos a cualquiera que necesite descargar la aplicación:

```
C:\PortalCorreoDesktop-Config\        solo el grupo de operadores
   portal-correo-desktop.config.json

C:\PortalCorreoDesktop-Publico\       lectura para usuarios autenticados
   Portal Correo Desktop-Corporativo-<version>.exe
   updates\
```

**Ninguna de las dos debe ubicarse dentro del perfil del usuario, del Escritorio, de Documentos ni de OneDrive.** En organizaciones con Microsoft 365 esas carpetas suelen estar redirigidas a OneDrive (*Known Folder Move*), y el archivo de configuración se sincronizaría a la nube, filtrando las credenciales.

Los permisos de lectura se otorgan por SID (`*S-1-5-11`), no por nombre de grupo: en un Windows en español el grupo se llama distinto y `Domain Users` no resuelve.

## 7. Gate

### 7.1 Principio

Una sola operación decide: **¿puedo leer la configuración?** La lectura SMB prueba simultáneamente que hay red y que el usuario está autorizado. No hace falta un sondeo de puerto separado ni un chequeo de dominio.

### 7.2 Máquina de estados

```
        ┌──────────┐
        │ CHECKING │◀──────────────┐
        └────┬─────┘               │
      ok     │      falla          │ reintento
             ▼         ▼            │ (15 s / manual)
        ┌────────┐  ┌─────────┐     │
        │ READY  │  │ BLOCKED │─────┘
        └───┬────┘  └─────────┘
            │            ▲
   config   │            │ enlace perdido
   inválida ▼            │ (N fallos)
        ┌──────────┐     │
        │NO_CONFIG │     │
        └────┬─────┘     │
             └───────────┘
```

`BLOCKED` (sin red) y `NO_CONFIG` (red sí, configuración no) son pantallas distintas porque exigen acciones distintas del operador. No existe modo degradado: o hay configuración válida o hay bloqueo con causa.

### 7.3 Re-evaluación

- Al arrancar.
- Al recuperar el foco la ventana (consulta barata, con caché en memoria de 60 s).
- Periódicamente mientras está bloqueado (15 s, con retroceso exponencial hasta 2 min).
- Ante `N` fallos de red consecutivos en operaciones, vuelve a `BLOCKED`.

## 8. Flujos

### 8.1 Primer arranque en la red corporativa

1. Instalación sin red. El instalador no descarga nada.
2. Apertura → `CHECKING`.
3. Lee `%ProgramData%\PortalCorreoDesktop\bootstrap.json`.
4. Lee la configuración del share con la sesión de Windows: **cero toque del operador**.
5. Valida esquema → `READY`.

### 8.2 Equipo fuera de la red corporativa

`BLOCKED` con diagnóstico. El mensaje deja claro que no es un error de la app:

> "Esta aplicación solo funciona dentro de la red corporativa. Conectate a la red de Correo (cable o Wi-Fi corporativo) y reintentá."

Reintento manual y automático.

### 8.3 Pérdida de enlace durante la sesión

| Evento | Reacción |
| --- | --- |
| Operación remota falla por red | Banner "Sin red corporativa"; acciones remotas deshabilitadas |
| Fallo repetido | Vuelve a `BLOCKED` |
| Había una ficha cargada | Se marca **no vigente** o se limpia; nunca se muestra un dato viejo como actual |
| Se restablece | Reintento → `READY`, conservando solo estado no sensible |

Un timeout de SQL no siempre significa pérdida de red: el diagnóstico distingue DNS, ruta, timeout y permiso.

### 8.4 Equipo fuera del dominio dentro de la red

Una máquina no unida al dominio no puede autenticarse contra el share con la sesión de Windows. La app detecta el fallo de logon y ofrece **una vez** el ingreso de credenciales de red corporativas, que se guardan en el **Administrador de credenciales de Windows** (`cmdkey`) bajo un destino propio. SMB las usa automáticamente.

Queda en el equipo la cuenta del propio operador, no un secreto compartido. Es el patrón estándar y no rompe el invariante.

### 8.5 VNC bajo demanda

```
launchVnc → provider.getVncSecret() → memoria
          → escribe %TEMP%\pcd_<host>_<ts>.vnc con ACL del usuario actual
          → lanza vncviewer
          → borra el temporal apenas arranca el proceso
```

- Barrido de huérfanos `pcd_*.vnc` al iniciar y al cerrar.
- Si el secreto no está disponible, la asistencia **no se bloquea**: se ofrece MSRA, que no lo requiere.
- Riesgo residual declarado: durante milisegundos el archivo existe en disco. Se mitiga con ACL y borrado inmediato. Eliminarlo del todo requiere un visor que acepte la clave por entrada estándar, que `vncviewer.exe` no soporta.

### 8.6 Actualización

1. Consulta el feed mediante **`net.request` de Electron**, no `fetch` de Node: `fetch` ignora el proxy del sistema y usa su propio almacén de CA, por lo que falla en redes con inspección TLS corporativa.
2. Descarga a `%TEMP%`.
3. Verifica SHA-256 publicado y firma Authenticode.
4. Solo entonces ofrece instalar.
5. Si el feed falla por red, intenta `updateMirror` y lo registra en el log.

### 8.7 Migración desde la versión actual

Al primer arranque de la versión nueva, eliminar los secretos ya presentes en los equipos:

- `%APPDATA%\portal-correo-desktop\cmda.config.json`
- `cmda.config.json` junto al ejecutable
- `.env` empaquetado, si existiera

Hoy hay credenciales SQL en texto plano en cada equipo donde se instaló la versión anterior.

## 9. Modelo de credenciales SQL

| Modo | Fase | Cómo | Costo |
| --- | --- | --- | --- |
| `static-sql` | 1 | Usuario y clave en el archivo del share | Legible por el grupo de operadores; transición explícita |
| `session-sql` | 2 | El endpoint entrega credenciales por sesión tras autenticar al operador | Requiere IIS + Windows Auth |
| `integrated` | A evaluar | Identidad de Windows contra SQL | `mssql`/`tedious` no soporta SSPI; requiere `msnodesqlv8`, módulo nativo, y complica el empaquetado |

El cliente consume `authMode` y no conoce más. Cambiar de modo es editar el archivo del share, no publicar una release.

## 10. Distribución

| Canal | Rol |
| --- | --- |
| Repo público de releases | Feed de actualizaciones y link directo |
| Share interno / intranet | Descarga primaria del operador |

El mismo artefacto en ambos lados. El código fuente permanece en el repositorio privado; el repositorio público solo contiene binarios.

Verificación pendiente antes de declarar GitHub como canal válido:

- [x] TCP 443 a `github.com` desde la LAN corporativa: responde.
- [ ] TLS y proxy: `curl.exe` y `Invoke-WebRequest` con TLS 1.2.
- [x] AppLocker: sin reglas efectivas.
- [ ] Firma de código: definir si habrá certificado.

**La firma de código es el factor decisivo de adopción.** Sin firma, SmartScreen muestra "Windows protegió tu PC" y muchos operadores no completan la instalación.

## 11. Seguridad

### 11.1 Restricción del repositorio

`src/test/securityAudit.test.ts` falla si aparecen en archivos versionados el nombre real del host piloto, el dominio corporativo real o las IP privadas del rango corporativo. Por eso este documento y el código usan **placeholders** (`<HOST-PILOTO>`, `<dominio corporativo>`), y la ruta real vive solo en `bootstrap.json` no versionado.

### 11.2 Invariantes verificables

Cada uno con un test que falla si se viola:

1. El artefacto no contiene credenciales → escaneo de `release/win-unpacked/resources/app.asar`.
2. Ningún secreto se escribe en disco salvo el `.vnc` temporal → espía sobre `fs.writeFileSync`.
3. Ningún secreto aparece en logs → logger central con redacción de campos `password|secret|key|token`.
4. El gate no usa `USERDNSDOMAIN` → prueba con dominio simulado y sin red, que debe dar `BLOCKED`.
5. `embedded.config.json` no existe en ningún build → test de artefacto.
6. El actualizador verifica integridad antes de ejecutar → prueba con hash incorrecto.
7. `resources/bin/vncviewer.exe` está presente en el paquete → test de artefacto.

### 11.3 Redacción de logs

Un logger único que enmascara cualquier campo cuyo nombre coincida con `password|secret|key|token` antes de escribir. Un log con la clave SQL es tan grave como un instalador con la clave SQL.

## 12. Pruebas

| Nivel | Alcance |
| --- | --- |
| Contrato de proveedor | Una suite única que corre igual contra `UncConfigProvider` y `HttpConfigProvider` |
| Máquina de estados | `CHECKING → READY → BLOCKED → READY` con proveedor inyectado, sin red real |
| Esquema | Campos faltantes, tipos incorrectos y `authMode` desconocido → `BAD_CONFIG` |
| Artefacto | Escaneo del asar y del instalador buscando valores sembrados en un config de prueba |
| Regresión del gate | Escenario de dominio presente sin red: debe bloquear |
| Redacción | Valores sensibles no aparecen en la salida del logger |
| Suite existente | Los archivos de test actuales deben seguir pasando; el renombre de canales IPC los toca |
| E2E manual | Descargar, instalar fuera de red, ver bloqueo, entrar a la red, abrir, buscar terminal, VNC, cortar red |

## 13. Fases

### Fase 0 — Decisiones (sin código)

- DBA: ¿se habilita autenticación integrada o se mantiene usuario y clave?
- AD: crear el grupo `PortalCorreoDesktop-Operadores`.
- Seguridad: certificado de firma de código.
- Infraestructura: definir el servidor definitivo y la fecha de caducidad del piloto en esta PC.

### Fase 1 — Piloto en la LAN

Renombre completo · `ConfigProvider` con `UncConfigProvider` · gate real con estados · pantalla de bloqueo con diagnóstico · eliminación de `embedded.config.json` y `build-internal.cjs` · migración que borra secretos viejos · VNC bajo demanda desde el share · empaquetado de `resources/bin/vncviewer.exe` · logger con redacción · tests de invariantes.

### Fase 2 — IIS en 443 con Windows Authentication

`HttpConfigProvider` + `session-sql` + secreto VNC efímero. No toca la UI: se cambia la implementación del proveedor. Habilita además el trabajo fuera de la oficina si se revierte D5.

### Fase 3 — Broker de datos (opcional)

La aplicación deja de hablar con SQL. Permisos por operador y auditoría real.

## 14. Renombre

| Actual | Nuevo |
| --- | --- |
| `CMDA_DB_SERVER`, `CMDA_DB_NAME`, `CMDA_DB_USER`, `CMDA_DB_PASSWORD`, `CMDA_DB_PORT`, `CMDA_VNC_PASSWORD`, `CMDA_CORP_DOMAIN`, `CMDA_ACCESS_KEY`, `CMDA_UNC_CONFIG_PATH` | `PCD_DB_SERVER`, `PCD_DB_NAME`, `PCD_DB_USER`, `PCD_DB_PASSWORD`, `PCD_DB_PORT`, `PCD_VNC_PASSWORD`, `PCD_CORP_DOMAIN`, `PCD_UNC_CONFIG_PATH` |
| `CMDA_ENABLE_GPU`, `CMDA_COMPAT_MODE` | `PCD_ENABLE_GPU`, `PCD_COMPAT_MODE` |
| `cmda.config.json` / `.local.json` / `.example.json` | `portal-correo-desktop.config.json` / `.local.json` / `.example.json` |
| `__CMDA_RUNTIME_CONFIG__` | `__PCD_RUNTIME_CONFIG__` |
| Canales IPC `cmda:*` | `pcd:*` |
| Share `CMDA$`, carpeta `C:\CMDA-Config` | `PortalCorreoDesktop$`, `C:\PortalCorreoDesktop-Config` |
| Temporales `cmda_*.vnc` | `pcd_*.vnc` |

`CMDA_ACCESS_KEY` desaparece: el concepto de clave de activación no existe en el diseño nuevo.

## 15. Riesgos y deudas

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| La PC piloto se apaga o se reimagen | App inutilizable para todos | Fecha de caducidad del piloto; migración al servidor |
| Sin certificado de firma | SmartScreen frena la adopción | Decidir en Fase 0; el espejo interno no evita el aviso |
| El DBA no responde | Queda `static-sql` con secreto legible por el grupo | Deuda explícita; rotación periódica |
| `msnodesqlv8` si se elige `integrated` | Módulo nativo, empaquetado complejo | Evaluar antes de comprometerse |
| Renombre de IPC | Rompe pruebas existentes | Mecánico, en un solo commit |
| `USERDNSDOMAIN` como dato diagnóstico | Puede confundir el mensaje de bloqueo | Se usa solo como información secundaria |
| Sin alias DNS | Cambiar de host exige editar `bootstrap.json` en cada equipo | Aceptado; `bootstrap.json` evita publicar release |

## 16. Criterios de aceptación de la Fase 1

- [ ] Un operador descarga el `.exe` de un link, lo instala y no le pide nada a nadie.
- [ ] Fuera de la red corporativa, ve un bloqueo con causa accionable y opción de reintentar.
- [ ] Dentro de la red corporativa, abre y busca una terminal sin configuración manual.
- [ ] El asar no contiene credenciales (test verde).
- [ ] No queda ningún archivo de credenciales en el equipo del operador tras la migración.
- [ ] VNC funciona con la clave entregada bajo demanda y el temporal se elimina.
- [ ] `resources/bin/vncviewer.exe` está en el paquete.
- [ ] El actualizador rechaza un artefacto con hash incorrecto.
- [ ] La suite completa pasa.

## 17. Fuera de alcance

- Trabajo remoto por VPN (revertir D5 requiere Fase 2).
- Broker de datos con permisos por operador.
- App registration en Entra ID / Graph.
- Renombre de procedimientos almacenados.
- Rediseño de la interfaz de trabajo.
