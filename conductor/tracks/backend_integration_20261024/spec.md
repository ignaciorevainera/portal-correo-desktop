# Specification: Integración Backend SQL Server y Herramientas de Sistema (VNC/MSRA/Ping)

## 1. Overview
Integración completa del backend en el proceso Main de Electron para **new CMDA**. Conecta la consola unificada en tiempo real contra el servidor SQL corporativo configurado externamente usando `mssql`/`tedious`, incorpora un modo híbrido con fallback al repositorio Mock cuando corresponde, e integra la ejecución nativa de `vncviewer.exe`, `msra.exe` y `ping.exe`.

## 2. Functional Requirements

### 2.1 Conectividad SQL Server Híbrida & Resolución Dual
- **Conexión Directa:** Pool de conexión asíncrono con `mssql` hacia el servidor SQL configurado en `configManager.cjs`.
- **Resolución IP a Hostname:** Si el término de búsqueda es una dirección IPv4 (ej. `192.0.2.101`), consultar `Fecha_Relevada_PCs` para resolver el nombre `pc` antes de invocar `CMDA_Trae_Info_DE_PC_PARAmesa_T`.
- **Stored Procedures Integrados:**
  - `CMDA_Trae_Info_DE_PC_PARAmesa_T` (`@pc`)
  - `Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T` (`@pc`)
  - `cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T` (`@terminal`)
  - `CMDA_Trae_historial_De_REset_DE_UNA_PC_T` (`@pc`)
  - `Cmda_trae_historial_UptimeXterminal_T` (`@terminal`)
- **Fallback Automático (Modo Híbrido):** Si el servidor SQL no es alcanzable en entorno de pruebas, el servicio informa el estado `mode: 'mock'`.

### 2.2 Empaquetado Autónomo y Orquestación de Binarios (`resources/bin/`)
- **Binarios Locales:** Incluir `vncviewer.exe` en `resources/bin/` (excluyendo archivos `.vnc` con credenciales del repositorio).
- **VNC Launcher (`cmda:launch-vnc`):** Generar archivo de configuración `.vnc` temporal apuntando al `HOST=<ip>` de la terminal activa y lanzar `resources/bin/vncviewer.exe /config <temp_vnc_path>` vía `child_process.spawn`.
- **MSRA Launcher (`cmda:launch-msra`):** Ejecutar `cmd.exe /c start "" msra.exe /offerRA <ip>` sin bloquear el hilo principal.
- **Native Ping (`cmda:ping`):** Ejecutar `ping.exe -n 4 <ip>` devolviendo las líneas reales de respuesta ICMP del sistema operativo hacia `LivePingConsole`.

## 3. Non-Functional Requirements
- **Seguridad Electron:** Mantener `contextIsolation: true` y `nodeIntegration: false`, validando todos los argumentos de IP/Hostname con expresiones regulares estrictas antes de invocar procesos del sistema.
- **Tolerancia a Fallos:** Timeout de conexión SQL de 4 segundos para evitar esperas prolongadas.
- **Cobertura de Tests:** Pruebas unitarias en Vitest para los adaptadores SQL, validadores de seguridad de comandos y servicios híbridos.
