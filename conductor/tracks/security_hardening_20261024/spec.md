# Specification: Blindaje de Seguridad, Sanitización Zero-Secrets y Control de Acceso Corporativo (Gatekeeper)

## 1. Overview
Este Track implementa una arquitectura de **Zero-Secrets en Repositorio** y **Control de Acceso Corporativo (Security Gatekeeper)** para **new CMDA**. Su objetivo es garantizar que ninguna persona que clone o descargue el repositorio de GitHub (ni el ejecutable compilado) pueda obtener credenciales SQL, contraseñas VNC, direcciones IP internas, sufijos de dominio Active Directory o nombres de equipos/operadores reales. Al mismo tiempo, permite que los desarrolladores trabajen sin fricción mediante configuraciones locales ignoradas por Git, y que los operadores dentro de la red corporativa (LAN o VPN) utilicen la aplicación conectándola al archivo de configuración corporativo (`cmda.config.json`) protegido por clave y validado contra el entorno de red/dominio de la empresa.

## 2. Functional Requirements

### 2.1 Sanitización Total de Código Fuente, Binarios y Mocks (Zero-Secrets)
- **Eliminación de Credenciales Hardcodeadas:**
  - En `electron/dbService.cjs`: Eliminar todas las constantes por defecto de servidor, base de datos, usuario y contraseña. El servicio SQL deberá recibir su configuración exclusivamente desde el gestor de configuración segura (`configManager.cjs`) o variables de entorno locales (`.env`).
  - En `electron/systemTools.cjs`: Eliminar cualquier hash VNC hardcodeado. `buildVncConfigFile` recibirá el parámetro de contraseña desde la configuración segura en tiempo de ejecución.
  - En `electron/dnsResolver.cjs`: Eliminar el sufijo de dominio hardcodeado y leerlo dinámicamente desde la configuración corporativa activa (`corporateDomain`).
- **Remoción de Archivos `.vnc` Sensibles:**
  - Eliminar del control de versiones `resources/bin/admin_2.vnc` y `resources/bin/options.vnc`. Agregar `*.vnc`, `.env*`, y `cmda.config*.json` (excepto plantillas `.example`) a `.gitignore`.
- **Mocks y Documentación 100% Sintéticos:**
  - Reemplazar en `src/services/terminalService.ts`, archivos de test (`*.test.ts`, `*.test.tsx`) y documentación bajo `conductor/` todos los hostnames reales, IPs privadas reales, MACs y legajos/usuarios de Active Directory por identificadores sintéticos reservados para documentación (RFC 5737: `192.0.2.10`, `198.51.100.25`, hostnames `PC-DEMO-001`, `WS-TEST-002`, usuarios `operador.demo`).

### 2.2 Gestor de Configuración Corporativa Externa (`electron/configManager.cjs`)
- **Fuentes de Configuración Jerárquicas (Fuera del Repositorio):**
  1. Variables de entorno locales (`.env` en desarrollo local, ignorado por Git).
  2. Archivo de configuración persistido y cifrado localmente en `%APPDATA%/new-cmda/cmda.secure.dat` (usando DPAPI de Windows vía `safeStorage` de Electron o AES-256-GCM derivado de la Clave Corporativa).
  3. Archivo de configuración externo `cmda.config.json` alojado en una ruta compartida de red interna (UNC Share) o importado por el operador en el primer inicio.
- **Plantilla de Ejemplo Segura:** Incluir en el repositorio únicamente `cmda.config.example.json` y `.env.example` con valores placeholder ficticios para guiar a los desarrolladores.

### 2.3 Candado Dual Adaptativo (Security Gatekeeper en Main y Renderer)
- **Verificación de Entorno Corporativo (`electron/securityGate.cjs`):**
  - Al iniciar el aplicativo (o al intentar desbloquearlo), el proceso Main verificará:
    1. **Provisión y Clave Corporativa:** Que exista una configuración válida desbloqueada mediante la Clave de Acceso Corporativa (o cargada desde el recurso UNC de la red interna).
    2. **Validación de Red/Dominio (Candado Dual):**
       - Comprobar si el equipo pertenece al dominio Active Directory configurado (`process.env.USERDNSDOMAIN` / `process.env.USERDOMAIN`) **O** si existe conectividad TCP/DNS real en vivo hacia el servidor corporativo configurado (permitiendo operar por VPN autorizada).
       - **Excepción fuera de la empresa:** Si el aplicativo se ejecuta fuera del dominio y sin alcance de red/VPN al servidor central, el Gatekeeper deniega el acceso (`authorized: false`) e impide cualquier consulta (incluso bloqueando el modo Mock en producción).
- **Pantalla de Bloqueo y Activación Corporativa (`src/components/SecurityLockScreen.tsx`):**
  - Si el Gatekeeper indica que el aplicativo no está configurado o no se encuentra en la red/dominio corporativo:
    - La interfaz principal (`App.tsx`) no se renderiza ni carga datos.
    - Se muestra una pantalla de seguridad que permite:
      - Ingresar la **Clave de Activación Corporativa** y la ruta del archivo `cmda.config.json` en la red interna (o seleccionar el archivo).
      - Ver el estado de diagnóstico del candado (Estado de Configuración, Dominio Detectado, Alcance de Red/VPN Corporativa) sin revelar IPs ni datos internos si no está configurado.

### 2.4 Purga Criptográfica del Historial de Git
- Reescribir el historial del repositorio Git para erradicar cualquier rastro de contraseñas, IPs reales, nombres de servidores y archivos `.vnc` en los commits anteriores, dejando una línea base limpia lista para `git push --force` al repositorio privado de GitHub.

## 3. Non-Functional Requirements
- **Cero Fugas en Bundle Compilado:** Al inspeccionar el código empaquetado (`dist/`) con búsqueda de texto plano, no debe existir ninguna aparición de las IPs reales, contraseñas previas ni sufijos de dominio reales.
- **Almacenamiento Local Cifrado:** Las credenciales cargadas desde el archivo de red o ingresadas en la activación no deben guardarse en `localStorage` del navegador, sino únicamente en el proceso Main protegidas mediante cifrado AES-256-GCM / DPAPI (`electron.safeStorage`).
- **Tests Unitarios:** Cobertura >80% en Vitest para `configManager.cjs`, `securityGate.cjs`, `SecurityLockScreen.tsx` y los servicios sanitizados.

## 4. Acceptance Criteria
- [ ] Una búsqueda exhaustiva en todo el árbol de archivos y en el historial de commits de Git (`git log -S`) confirma 0 coincidencias de credenciales SQL, hash VNC, IPs corporativas reales, dominio real y hostnames reales.
- [ ] Si un usuario externo descarga el repositorio o el `.exe` fuera de la red de la empresa y sin VPN, la aplicación muestra únicamente la pantalla de bloqueo (`SecurityLockScreen`) y no permite ver ni consultar ninguna terminal (tampoco datos Mock).
- [ ] Un empleado dentro de la red corporativa (o con VPN activa) puede vincular el archivo `cmda.config.json` de la red interna e ingresar la Clave Corporativa por única vez, quedando habilitado para operar con normalidad.
- [ ] Un desarrollador puede trabajar localmente creando su archivo `.env` o `cmda.config.json` (ignorado por Git) y ejecutar toda la suite de tests (`npm test`) con datos 100% sintéticos.

## 5. Out of Scope
- Implementación de un servidor de autenticación OAuth2/OIDC nuevo en la infraestructura de la empresa (se utiliza validación nativa de Dominio AD + alcance TCP/DNS + clave/configuración en red interna).
