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

*(Continuará en la Fase 2: Descompilación de HMDA v1/v1.1/v2.0)*
