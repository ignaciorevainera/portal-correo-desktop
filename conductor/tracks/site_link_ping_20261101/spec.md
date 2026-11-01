# Specification: Ping de Sitio (Router .250 / Servidor .231)

## Overview
Cuando un sitio reporta "sin internet", suele tratarse de una caída de vínculo. Los operadores pingean manualmente el router (`x.x.x.250`) y, en sucursales automatizadas, el servidor de transacciones (`x.x.x.231`). Esta feature automatiza el ping al router al consultar un equipo y agrega accesos manuales en `QuickActionsBar`.

## Functional Requirements
1. **Derivación de IPs:** a partir de la IP del equipo (`a.b.c.d`, IPv4 válida) se derivan `a.b.c.250` (router) y `a.b.c.231` (servidor). Si el equipo se consulta por hostname, se usa la IP resuelta (`terminal.ip`). Sin IP válida no se deriva nada.
2. **Ping automático al router:** al consultar un equipo se ejecuta primero el ping estándar (-4) al equipo y, **al finalizar**, el ping estándar (-4) al `.250`. **No** se ejecuta si la IP del equipo ya termina en `.250`.
3. **Misma consola con etiquetas:** la salida se muestra en la misma consola de ping (`LivePingConsole`). Cada línea del `.250` lleva el prefijo `[ROUTER .250]` y cada línea del `.231` el prefijo `[SERVIDOR .231]`, con un separador entre pings de la secuencia.
4. **Botones manuales en `QuickActionsBar`:** dos split buttons, **Router .250** y **Servidor .231**. Clic principal = ping estándar (-4); desplegable = continuo (-t) (y -4).
5. **.231 sin lógica extra:** se muestra el resultado tal cual (timeout incluido); no se oculta ni deshabilita según el tipo de sucursal.
6. **Ejecución:** un proceso a la vez. Un ping manual detiene lo que esté corriendo y lanza el suyo; "Detener" corta todo (incluida la cadena automática pendiente).
7. **Seguridad:** las IPs derivadas pasan por `sanitizeHostOrIp` y los canales IPC existentes; sin IPs ni secretos hardcodeados.

## Non-Functional Requirements
- UI sin congelamientos (streaming IPC existente), consistente con Shadcn/Tailwind y la densidad actual de la barra.
- Cobertura de tests según `workflow.md` (TDD).

## Acceptance Criteria
- Consultar `10.66.10.1` → ping a `10.66.10.1` y luego a `10.66.10.250` con prefijo `[ROUTER .250]`.
- Consultar `10.66.10.250` → un solo ping (sin duplicado).
- Botón Router .250 → `ping -n 4` con prefijo `[ROUTER .250]`; Servidor .231 → prefijo `[SERVIDOR .231]`; desplegable -t → `ping -t`; Detener funciona.
- Helper de derivación cubierto por tests unitarios (IP válida, inválida, terminada en .250).

## Out of Scope
- Alerta de "posible caída de vínculo".
- Ping automático al `.231`; detección de sucursal automatizada vía BD; pings paralelos; historial persistente.
