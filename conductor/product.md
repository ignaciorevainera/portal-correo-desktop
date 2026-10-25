# Product Definition: Portal Correo Desktop

## Overview
**Portal Correo Desktop** es una aplicación de escritorio moderna desarrollada sobre Electron y Node.js para sustituir el aplicativo heredado de Visual Basic 6. Su objetivo principal es el **monitoreo, inventario técnico en tiempo real, diagnóstico y soporte remoto de estaciones de trabajo** en la infraestructura corporativa.

## Core Features
1. **Búsqueda e Inventario Técnico en Tiempo Real:**
   - Consulta instantánea y asíncrona de terminales por Hostname corto (ej. `PC-DEMO-001`) o dirección IP (ej. `192.0.2.101`).
   - Visualización de datos de hardware, sistema operativo, service pack/build, memoria RAM, dirección MAC, versión de antivirus, versión de navegador y usuarios de Active Directory asociados.
2. **Diagnóstico y Soporte Remoto Integrado:**
   - Conexión por VNC Viewer con generación limpia y segura de configuraciones temporales.
   - Lanzamiento de Asistencia Remota de Windows (MSRA / `offerRA`) sin bloqueos de interfaz.
   - Monitor de conectividad y Ping en vivo con estadísticas de latencia.
   - Historial y estado de tiempo de actividad (Uptime) de la estación.
3. **Gestión de Alertas y Operaciones de Terminal:**
   - Consulta de alertas activas asociadas a la terminal.
   - Carga de nuevas alertas y cierre documentado de incidencias.
   - Flujo de solicitud y seguimiento de reseteo de cuentas de terminal.
4. **Conectividad Robusta, Mantenible y Blindada (Zero-Secrets):**
   - Conexión directa a SQL Server corporativo mediante `mssql` / `tedious` con configuración externa (`cmda.config.json` / `.env` ignorado por Git).
   - Candado Dual Adaptativo (Security Gatekeeper) que exige pertenencia al dominio Active Directory corporativo o alcance de red/VPN interna + clave corporativa antes de habilitar el aplicativo.
   - Eliminación de dependencias de archivos compartidos `.udl` y componentes COM/ActiveX de 32 bits.
5. **Integración con Ecosistema KACE y Soporte Unificado:**
   - Servicio de Wake-on-LAN para encendido remoto de terminales mediante difusión de paquetes mágicos.
   - Sincronización forzada de inventario y políticas con el appliance Quest KACE (`runkbot 4 0`).
   - Matriz de interoperabilidad y mejoras unificadas basadas en ingeniería inversa de aplicativos legacy (HMDA v1/v1.1/v2.0, CMDA-2).
6. **Productividad Global y Escáner Visual de Subred:**
   - Invocación global inmediata mediante atajo de sistema (`Ctrl + Espacio`) que restaura la ventana desde segundo plano, analiza el portapapeles y auto-completa/dispara la búsqueda si contiene una IP o Hostname válido.
   - Escáner visual de subred asíncrono y no bloqueante que barre el segmento `/24` de la terminal activa, resolviendo hostnames por DNS inverso y desplegando los equipos en tiempo real en un panel deslizable (Drawer) con accesos de 1-clic a VNC y ficha técnica.

## Target Audience
Operadores de soporte técnico, administradores de sistemas y analistas de monitoreo e inventario de estaciones de trabajo.

## Quality Goals
- Interfaz moderna, reactiva y sin congelamientos (arquitectura asíncrona con IPC seguro).
- Consola compacta de alta densidad espacial con ventana sin marco nativo (`frame: false`) y controles de ventana integrados.
- Operación ágil en 1 clic para VNC Viewer, Asistencia MSRA y Ping continuo acoplado directamente en la vista principal con atajos (`F2`, `F3`, `F4`).
- Menú contextual personalizado de operador (clic derecho) con accesos directos, copiado de identificadores técnicos y enlace a Portal MDA (`https://mda.corporativo.internal/inventario-terminales`).
- Tiempos de respuesta de consulta inferiores a 500 ms en red local.
- Cero exposición de secretos, IPs o credenciales en el repositorio de código fuente.
- Compatibilidad nativa con entornos Windows corporativos.
