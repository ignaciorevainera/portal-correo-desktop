# Specification: Corrección y Diagnóstico Inteligente de Conectividad Remota (MSRA, VNC y DNS en Vivo)

## 1. Overview
Solucionar el error de permisos (`spawn msra.exe EACCES`) al lanzar Asistencia Remota de Windows desde Electron, replicando el método de invocación vía shell (`cmd.exe /c start "" msra.exe /offerRA <target>`). Adicionalmente, incorporar sondeo previo de puertos TCP (`5901`/`5900` para VNC y `3389` para MSRA/RDP) y resolución DNS en vivo usando el sufijo de dominio corporativo configurado externamente para que el operador pueda conectarse a cualquier terminal activa en la red aunque no figure en la base SQL histórica o haya cambiado de dirección IP.

## 2. Functional Requirements
1. **Lanzamiento Seguro de MSRA (`launchMsra`)**:
   - Invocar `cmd.exe /c start "" msra.exe /offerRA <host>` para respetar el atributo `uiAccess="true"` del manifiesto de Windows sin arrojar `EACCES`.
   - Capturar cualquier evento `error` del subproceso para evitar excepciones no controladas (`Uncaught Exception`) en el proceso principal de Electron.
2. **Sondeo Inteligente de Puertos y Lanzamiento VNC (`launchVnc` & `probeRemotePorts`)**:
   - Antes de abrir `vncviewer.exe`, verificar con un timeout breve (1.2s) si el puerto `5901` o `5900` están abiertos en el host destino.
   - Si `5901` está abierto, usar `5901`; si `5901` está cerrado pero `5900` responde, generar el archivo `.vnc` con `Port=5900`.
   - Pasar el argumento `/config <ruta_vnc>`.
   - Si ambos puertos (`5901` y `5900`) rechazan la conexión o dan timeout, devolver un diagnóstico claro indicando si el puerto `3389` (MSRA/RDP) está abierto en el equipo para sugerir al operador usar **MSRA** en su lugar.
3. **Resolución DNS en Vivo y Fallback de Red (`resolveNetworkTarget`)**:
   - Si una terminal buscada (ej. `PC-DEMO-308` o `192.0.2.231`) no existe en SQL Server ni en Mock, o si su IP registrada en SQL difiere de la IP actual en DNS (`dns.lookup` con sufijo de dominio corporativo e inverso `dns.reverse`), construir/actualizar la ficha operativa con la IP en vivo resuelta por la red.
4. **Feedback Visual en la Consola React**:
   - Mostrar banners de estado claros (éxito al lanzar herramienta o advertencia diagnóstica cuando un equipo tiene VNC apagado pero MSRA disponible).
