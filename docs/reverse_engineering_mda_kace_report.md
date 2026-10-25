# Informe Técnico: Ingeniería Inversa y Auditoría de Aplicativos MDA (CMDA-2, HMDA v1/v1.1/v2.0 y KACE)

**Fecha:** 25 de Octubre de 2026  
**Autor:** Antigravity (Pair Programming Assistant)  
**Proyecto:** Portal Correo Desktop (`new-CMDA`)  
**Track:** `reverse_eng_mda_kace_20261025`

---

## 1. Fase 1: Análisis Diferencial de Binarios y Estructura Legacy (CMDA-2 vs CMDA Original)

### 1.1 Comparativa de Hashes y Verificación de Binarios PE
Se realizó la verificación de integridad criptográfica y metadatos de los ejecutables `CMDA.exe`:
- **CMDA Original (`C:\Cmda\CMDA.exe`):**
  - **SHA-256:** `3705118A423B1B95405FE1CEBAE5439260FC97C7278D64B44F1C0D159E904123`
  - **Tamaño:** 266,240 bytes
  - **Timestamp original:** 26/09/2018 15:32:31
- **CMDA-2 (`C:\MDA\CMDA-2\CMDA.exe` y `C:\MDA\CMDA-2\CMDA\CMDA.exe`):**
  - **SHA-256:** `3705118A423B1B95405FE1CEBAE5439260FC97C7278D64B44F1C0D159E904123`
  - **Tamaño:** 266,240 bytes
  - **Timestamp de copia:** 23/05/2025 16:02:21

> [!NOTE]
> **Conclusión del Binario Principal:** El ejecutable `CMDA.exe` de `CMDA-2` es **100% idéntico a nivel de bytes** al original de `C:\Cmda`. No hubo recompilación del código fuente de VB6. La versión interna es **CMDA - V.1.0.23**.
> 
> Sin embargo, el entorno `CMDA-2` presenta **diferencias operativas críticas en archivos auxiliares y utilitarios**.

---

### 1.2 Diferencias en Archivos Auxiliares y Entorno de Operación

| Componente | Original (`C:\Cmda`) | CMDA-2 (`C:\MDA\CMDA-2`) | Análisis y Diferencia Técnica |
| :--- | :--- | :--- | :--- |
| `uptime.exe` | *Inexistente* | **Presente** (45,672 bytes, SHA-256 `F81CB...`) | Binario nativo C/C++ que utiliza `NETAPI32.dll` (`NetRemoteTOD`). Consulta la hora remota del servidor/terminal para deducir el tiempo de arranque. |
| `MIke_uptime.exe` | **Presente** (73,728 bytes) | **Presente** (73,728 bytes, SHA-256 `C9911...`) | Interfaz gráfica VB6 (`Frm_cmd_uptime`, `Fmr_upTime`) con botón de captura (`cmd_caputarImagen`), timers (`Timer_buscaResultado_Uptime`) y visor de historial para operadores ("Gerencia Soporte Cliente T.I.C.O."). |
| `options.vnc` | 1,164 bytes (Configuración completa UltraVNC) | 39 bytes (Mínima: `[connection] index=A A=192.0.2.133`) | En `C:\Cmda` define compresión (6), calidad (6), encoding Tight (5), 8-bit color deshabilitado, y display 100%. En `CMDA-2` solo contiene la última IP recordada. |
| `admin_2.vnc` | `HOST=192.0.2.1`, `Port=5901`, `Password=[REDACTED_VNC_HASH]` | `HOST=198.51.100.1`, `Port=5901`, `Password=[REDACTED_VNC_HASH]` | Mismo hash de clave VNC cifrada (DES reversible estándar de VNC). Apuntan a subredes corporativas distintas. |
| `Errores.Err` | 1.2 MB (Último log: 01/10/2026) | 5.6 MB (Último log: 13/10/2026) | Registro acumulado de fallos en producción. |
| `tarjeta.cdr` / `tipo.cdr` | *Inexistente* | **Presente** (115 KB / 25 KB) | Archivos de diseño vectorial de CorelDraw con plantillas gráficas de credenciales/tarjetas técnicas. |

---

### 1.3 Procedimientos Almacenados y Fallas Reveladas en `Errores.Err`
El log `Errores.Err` revela el uso constante del error COM `-2147286789` (`STG_E_INVALIDHEADER`):
> *"El archivo no es un archivo compuesto válido."*

Esto ocurría cuando el motor OLE DB de VB6 intentaba resolver el archivo de enlace de datos `.udl` compartido por red o dañado por permisos NTFS.

#### Procedimientos invocados registrados en el log:
1. `CMD_Registra_TIEMPO_DE_uso_DE_Aplicacion`:
   - Parámetros: `@UserNT`, `@terminal`, `@numeroDePreceso`
   - Función: Auditoría de apertura y tiempo de sesión del operador de mesa de ayuda.
2. `CMD_Registra_uso_DE_Aplicacion`:
   - Parámetros: `@UserNT`, `@terminal`, `@numeroDePreceso`
3. `CMDA_Trae_Info_DE_PC_PARAmesa`:
   - Parámetros: `@terminal`
   - Función: Búsqueda central de datos de inventario técnico por IP o Hostname.

---

## 2. Fase 2: Descompilación e Ingeniería Inversa de HMDA (v1, v1.1 y v2.0 - .NET / C#)

### 2.1 Arquitectura de Ensamblados y Comparativa de Versiones
Se analizaron los tres paquetes de HMDA mediante inspección de metadatos y reflexión en 32 bits:
- **HMDA v1.0 y v1.1 (`C:\MDA\HMDA` y `C:\MDA\HMDA1.1`):**
  - Ejecutables idénticos en SHA-256 (`4,034,560 bytes`, fecha 10/08/2023).
  - Target: .NET Framework 4.7.2 (compilado como `MSIL` / AnyCPU).
  - Dependencias: Azure.Core 1.30, Microsoft.Identity.Client 4.53, Microsoft.Graph 4.x.
- **HMDA v2.0 (`C:\MDA\HMDA2.0`):**
  - Ejecutable actualizado (`4,070,912 bytes`, fecha 25/08/2023).
  - Target: .NET Framework 4.7.2 (compilado específicamente para `x86` / 32 bits).
  - Dependencias actualizadas: Azure.Core 1.34, Microsoft.Identity.Client 4.55, Microsoft.Kiota.Abstractions 1.3.1, ZstdNet.
  - Incorpora cadena de conexión local: `<add name="DefaultConnection" connectionString="Data Source = |SQL/CE|" />`.

---

### 2.2 Integración con Microsoft 365, Azure AD y Microsoft Graph
HMDA implementa un cliente nativo moderno de autenticación corporativa con Azure Active Directory:
- **Client ID de Azure AD:** `904430ee-6e1b-4112-97a3-d58eeeebc536`
- **Redirect URI:** `https://login.microsoftonline.com/common/oauth2/nativeclient`
- **Flujo de Autenticación:** Utiliza `Microsoft.Identity.Client` (MSAL) con `AcquireTokenSilentParameterBuilder` e interactivo con soporte de WebView2 embebido.
- **Llamadas a Microsoft Graph API:**
  - `MeRequestBuilder` (`GET /me`): Obtiene perfil del operador, foto, nombre de usuario y correo corporativo.
  - `SendMailRequestBuilder` (`POST /me/sendMail`): Envío directo y asíncrono de correos con formato HTML enriquecido a través de la API Graph sin depender de cliente Outlook local instalado ni de protocolos SMTP inseguros.
- **Sistema de Plantillas de Correo:**
  - Estructurado en clase `Listas.correo`:
    - Variables de configuración: `correo_inicio`, `correo_final`, `correo_asunto`, `correo_cc`, `firma`.
    - Resuelve automáticamente destinatarios y contactos usando `traerContacto(contacto, op)` y plantillas de saludo/despedida dinámicas.

---

### 2.3 Capa de Datos y Persistencia (MySQL & SQL Server CE)
HMDA no se limita a consultas locales; se conecta a un servidor MySQL corporativo mediante `MySql.Data.dll`.

#### Tablas y Consultas Principales Extraídas:
1. **Padrón de Sucursales y Sitios Postales (`hmda_sas`):**
   - Consulta: `SELECT * FROM hmda_sas WHERE NIS = @nis`
   - Datos provistos: `NIS`, `DENOMINACION`, `CPA_SUCURSAL`, `TIPO`, `CATEGORIA`, `PARTIDO`, `PROVINCIA`, `TITULAR`, `DIRECCION`, `TELEFONO`, `HORARIO`.
2. **Jerarquía Zonal y Referentes (`hmda_zonal`):**
   - Consulta: `SELECT * FROM hmda_zonal WHERE REGION = @region AND ZONA = @zona`
   - Datos provistos: `JEFE`, `SUC_BASE`, `TELEFONO`, `CELULAR`, `DIRECCION`, `CPA`, `MAIL`.
3. **Muro de Comunicados y Alertas en Vivo (`alerta_comunicados`):**
   - Consulta: `SELECT id, urgente, titulo AS Titulo, contenido AS Descripcion, link AS Link, tipo FROM alerta_comunicados ORDER BY urgente DESC`
   - Registro de lectura: `SELECT * FROM alerta_alertavistas WHERE tipo = @tipo AND id_alerta = @id AND usuario = @user`
   - Confirmación: `UPDATE alerta_alertavistas SET estado=1 WHERE id_alerta = @id`
4. **Catálogo de Respuestas y Plantillas de Soporte (`plantillas_titulos`):**
   - Permite a los analistas guardar respuestas predeterminadas por usuario y equipo para agilizar la resolución de incidencias.
5. **Auditoría de Uptime Remoto:**
   - Registra peticiones en `hmda_uptime_peticiones(nom_pc, usuario, estado)`.
   - Consulta WMI remota: `SELECT LastBootUpTime FROM Win32_OperatingSystem` apuntando a `\\{0}\root\cimv2`.

---

### 2.4 Experiencia de Usuario, Herramientas y Notificaciones Toast
1. **Botones de Operador Totalmente Configurables:**
   - La aplicación incluye 3 accesos directos personalizables en su interfaz:
     - `bt_edit1_nombre`, `bt_edit1_color`, `bt_edit1_Fcolor`, `bt_edit1_enlace`, `bt_edit1_nomreal` (repetido para `edit2` y `edit3`).
   - Permite a cada operador enlazar sistemas corporativos externos (ej. Webmail, SOTI MobiControl, Service Manager, Portal MDA).
2. **Monitoreo de Portapapeles (Clipboard Spy):**
   - Registra listeners nativos de Windows (`SetClipboardViewer`, `ChangeClipboardChain`).
   - Si el operador copia una IP o un NIS en cualquier ventana del sistema operativo, HMDA lo detecta instantáneamente y ofrece autocompletar la búsqueda.
3. **Escaner de Rango IP Multihilo (`HMDA.scanIP`):**
   - Permite escanear subredes divididas en 5 rangos paralelos (`star1..star5`, `end1..end5`) disparando hilos de ping simultáneos.
4. **Notificaciones Nativas de Windows (Toast):**
   - Mediante `Microsoft.Toolkit.Uwp.Notifications.ToastNotificationManagerCompat` y `ToastContentBuilder`:
     - Alerta visual emergente en la bandeja del sistema con botones interactivos (`AddButton`), duración configurable y soporte de avatar/icono corporativo (`ToastGenericAppLogoCrop`).
5. **Reportería en Excel sin Dependencia de Office:**
   - Generación de libros `.xlsx` mediante `SpreadsheetLight.dll` y `DocumentFormat.OpenXml.dll`, permitiendo exportar listados de terminales o sucursales con doble clic.

---

## 3. Fase 3: Análisis de Binarios de KACE Systems Management y Mecanismos de Integración

### 3.1 Binario Wake-on-LAN Corporativo (`kwol.exe`)
- **Arquitectura:** Binario compilado en Go (`kwol.go`).
- **Sintaxis de Invocación:**
  ```cmd
  kwol.exe <mac-address1>[,<mac-address2>,...<mac-addressN>]
  ```
- **Parámetros y Comportamiento:**
  - Acepta una lista de direcciones MAC separadas por coma sin espacios (formatos aceptados: `XX:XX:XX:XX:XX:XX` o `XX-XX-XX-XX-XX-XX`).
  - Flag `-v`: Muestra la versión del utilitario.
  - Flag `-h`: Muestra la ayuda de uso.
  - **Mecanismo de Envío:** Por cada dirección MAC recibida, genera un paquete mágico Wake-on-LAN estándar (6 bytes `0xFF` seguidos de 16 repeticiones de la dirección MAC de 6 bytes = 102 bytes en total) y lo transmite vía broadcast UDP (puerto 9) a través de **todas las interfaces de red locales activas** para garantizar la cobertura de subred sin necesidad de adivinar el adaptador LAN principal.

---

### 3.2 Agente de Tareas y Sincronización Forzada (`runkbot.exe`)
- **Arquitectura:** Binario nativo C/C++ del motor de ejecución de bots de Quest KACE.
- **Sintaxis de Invocación:**
  ```cmd
  runkbot.exe <kbotid> <kbot_version> [-noLogUpload] [-launchtype=type] [-event=eventtype]
  ```
- **Códigos de Ejecución Estándar Identificados:**
  - `runkbot.exe 4 0`: **Actualización forzada de inventario (Inventory Update)**. Escanea hardware, software instalado, parches de seguridad y envía el payload XML al servidor KACE de inmediato.
  - `runkbot.exe 3 0`: **Actualización de caché de scripts y tareas (Kbots Cache Update)**. Sincroniza scripts y políticas pendientes asignadas al host.
  - `runkbot.exe 1 0`: **Comprobación de configuración del agente**. Valida certificados y conectividad con el appliance.
  - `runkbot.exe 6 0`: **Detección y ciclo de parches (Patching Task)**.

---

### 3.3 Auditoría de Telemetría y Logs (`Inventory.log` y utilidades)
- **`Inventory.log`:**
  - Muestra el ciclo secuencial del escaneo local:
    - Escaneo de etiquetas SWIDTAG.
    - Extracción de registros de ejecutables (`exe records`).
    - Catálogo de aplicaciones de usuario (`program records`, `AppV records`, `MuiCache records`).
    - Marcador final: `Software Inventory: Done`.
- **Integración con HMDA y Soporte:**
  - HMDA incorpora un toggle `habilitarBotonKaceToolStripMenuItem` que habilita un botón "KACE" en la cabecera.
  - Cuando el operador consulta una estación, el botón KACE abre directamente la ficha de la terminal en la consola web de KACE o ejecuta el diagnóstico del agente de terminal.

---

## 4. Fase 4: Matriz de Paridad Exhaustiva y Roadmap para Portal Correo Desktop

### 4.1 Matriz Comparativa de Capacidades Técnicas

| Capacidad / Feature | CMDA Original (VB6) | CMDA-2 (VB6 + Auxiliares) | HMDA v1/v1.1/v2.0 (.NET) | Quest KACE Agent | Portal Correo Desktop (`new-CMDA`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Runtime & Base Tecnológica** | VB6 (COM / 32-bit) | VB6 (COM / 32-bit) | .NET 4.7.2 (WinForms) | Go + C/C++ Nativo | **Electron 34 + Node 24 + React 19** |
| **Diseño y Estilo UI** | Windows Clásico (Tabbed) | Windows Clásico (Tabbed) | WinForms Flat con Colores | En segundo plano / CLI | **Tailwind CSS v4 + Shadcn UI (Radix)** |
| **Búsqueda e Inventario de PC** | SQL Server (Vía UDL) | SQL Server (Vía UDL) | WMI + MySQL (`hmda_sas`) | Agente KACE (`Inventory.exe`) | **SQL Server Corporativo Seguro (tedious)** |
| **Control Remoto VNC** | UltraVNC (`vncviewer.exe`) | UltraVNC (`vncviewer.exe`) | No integrado directamente | No | **UltraVNC Seguro (sin archivos en disco)** |
| **Asistencia Remota MSRA** | No integrado | No integrado | No integrado | No | **Lanzador 1-Clic (`offerRA`) sin bloqueos** |
| **Monitor de Ping en Vivo** | Inexistente | Inexistente | Timer ICMP WinForms | No | **Ping Reactivo en Vivo (`ping -t`, buffer)** |
| **Wake-on-LAN (WOL)** | Inexistente | Inexistente | Inexistente | `kwol.exe` (Go multired) | **Integración vía `kaceBridge` / UDP nativo** |
| **Sincronización de Inventario** | Inexistente | Inexistente | Inexistente | `runkbot.exe 4 0` | **Trigger de actualización KACE en 1-clic** |
| **Botones de Operador Dinámicos** | Inexistente | Inexistente | 3 botones personalizables | No | **Configuración modular en perfil operador** |
| **Notificaciones Nativas** | Inexistente | Inexistente | Windows Toast (UWP) | `KUserAlert.exe` | **Notificaciones Electron / Toast nativo** |
| **Exportación a Excel** | Inexistente | Inexistente | `SpreadsheetLight` (.xlsx) | Reportes XML servidor | **Exportación directa XLSX (`xlsx` o IPC)** |
| **M365 / Microsoft Graph** | Inexistente | Inexistente | MSAL + Graph `/me/sendMail` | No | **En roadmap de autenticación M365** |
| **Seguridad de Credenciales** | Inseguro (Claves en UDL) | Inseguro (Claves en UDL) | Parcial (Config local XML) | Certificados KACE | **Zero-Secrets (Cifrado AES-256-GCM + Gate)** |

---

### 4.2 Oportunidades Clave de Mejora Identificadas para `new-CMDA`

1. **Botón Wake-on-LAN (WOL) en Ficha de Terminal:**
   - La estación consultada incluye dirección MAC en la tarjeta de Hardware.
   - Con el bridge de KACE (`kwol.exe`) o socket UDP nativo de Node.js `dgram`, podemos habilitar un botón **"Encender Estación (WOL)"** junto a VNC y MSRA.
2. **Acción Rápida "Sincronizar Inventario KACE":**
   - Botón en la consola para ejecutar `runkbot.exe 4 0` remotamente o en terminales para forzar la actualización de inventario sin esperar el ciclo programado.
3. **Barra de Enlaces Rápidos de Operador (Quick Launch):**
   - Adoptar el patrón de HMDA (`bt_edit1..3`) permitiendo que cada operador configure hasta 4 accesos directos (ej. Portal MDA, SOTI MobiControl, Service Manager, Webmail) con colores e iconos personalizados.
4. **Notificaciones de Alertas en Tiempo Real:**
   - Replicar la funcionalidad de `alerta_comunicados` de HMDA mediante el sistema de notificaciones de Electron cuando se publique una alerta urgente de red o infraestructura.
5. **Exportación de Ficha a Excel:**
   - Botón en la cabecera para descargar los datos técnicos y el historial de Uptime en un archivo `.xlsx` estructurado.
