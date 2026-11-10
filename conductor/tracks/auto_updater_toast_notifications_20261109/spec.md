# Especificación Técnica (`spec.md`)
## Track: `auto_updater_toast_notifications_20261109`
### Nombre: Detección Automática de Actualizaciones en Background con Notificaciones Toast Interactivas (Sonner)

### 1. Resumen Ejecutivo (Overview)
Implementar un hook y controlador desacoplado (`useAutoUpdateNotifier` / `autoUpdateService`) en la capa de Renderer (React 19) que ejecute una comprobación no bloqueante de nuevas versiones tras el arranque del aplicativo (con un retardo de 4 segundos tras superar el Security Gate corporativo para preservar el arranque instantáneo y no saturar el cold start).

Si se detecta una versión superior en el feed de actualizaciones (GitHub Releases / corporate update feed), se despliega un Toast informativo enriquecido con `sonner` que ofrece al operador las opciones de **"Descargar"** o **"Ahora no"**. Al confirmar la descarga, esta se ejecuta en segundo plano con reporte de progreso y validación criptográfica SHA-256. Una vez lista, un segundo Toast interactivo consulta si desea **"Instalar y reiniciar"** de inmediato o dejar la actualización preparada para el próximo cierre/arranque.

---

### 2. Requerimientos Funcionales

#### 2.1 Verificación Asíncrona Diferida en el Arranque
- Al montarse `App.tsx` y confirmarse el estado `READY` del Security Gate, se programa un `setTimeout` diferido de 4 segundos.
- Se invoca `checkAppUpdates()` de manera transparente sin congelar la ventana ni interferir con la búsqueda de terminales.
- En caso de error de red o timeout, se descarta silenciosamente sin interrumpir la operación del analista de soporte.

#### 2.2 Política de Descarte ("Ahora no")
- Si el usuario hace clic en el botón *"Ahora no"*, se guarda una clave en memoria de sesión (`sessionStorage.setItem("pcd_dismissed_update_" + targetVersion, "true")`).
- La notificación se descarta de la pantalla y no volverá a mostrarse durante la sesión activa en curso.

#### 2.3 Toast Inicial de Nueva Versión
- Disparado mediante la API interactiva de `sonner`:
  - **Título:** `Nueva versión vX.Y.Z disponible`.
  - **Descripción:** Novedades breves de la versión o invitación a actualizar.
  - **Botón Primario (`action`):** *"Descargar"* (inicia la descarga en background).
  - **Botón Secundario (`cancel`):** *"Ahora no"* (silencia en la sesión).
  - **Comportamiento:** Persistente hasta interacción o tiempo prolongado con botón de cierre (dismiss).

#### 2.4 Descarga en Segundo Plano y Feedback
- Al presionar *"Descargar"*, se enlaza al pipeline nativo ya existente (`startDownloadUpdate`).
- Se muestra un toast de proceso (*"Descargando actualización (X%)... Podés seguir usando el aplicativo"*) con actualización periódica de porcentaje.

#### 2.5 Verificación de Integridad y Toast Final de Instalación
- Una vez finalizada la descarga y validado su hash criptográfico SHA-256 en el proceso Main, se emite el evento correspondiente.
- Se despliega un Toast de éxito con confirmación:
  - **Título:** `Actualización lista para instalar`.
  - **Descripción:** `Se descargó vX.Y.Z. ¿Deseas reiniciar la aplicación ahora para aplicar los cambios?`.
  - **Botón Primario (`action`):** *"Instalar y reiniciar"* (invoca `installUpdateNow()`, ejecuta el instalador y cierra limpiamente la app).
  - **Botón Secundario (`cancel`):** *"Más tarde / Ahora no"* (el binario queda listo en el directorio temporal para la próxima vez que se inicie la app).

#### 2.6 Gestión de Errores
- Si la descarga se interrumpe o la firma SHA-256 no coincide, se muestra un `toast.error`: *"No se pudo descargar la actualización. Podés reintentar desde Ajustes (F10)"*.

---

### 3. Criterios de Aceptación
1. **Detección sin bloqueo:** El chequeo ocurre a los 4s del arranque sin añadir latencia perceptible al inicio ni a las consultas SQL.
2. **Interactividad:** El toast inicial muestra claramente las dos opciones (*"Descargar"* y *"Ahora no"*).
3. **Respeto a la decisión:** Presionar *"Ahora no"* oculta el toast y no vuelve a insistir en esa sesión.
4. **Descarga transparente:** El usuario puede continuar utilizando la consola, el escáner y las herramientas remotas mientras la descarga ocurre en background.
5. **Reinicio seguro:** Presionar *"Instalar y reiniciar"* lanza el instalador validado y finaliza el proceso de Electron.
6. **Calidad y Cobertura:** Tests unitarios en Vitest para la lógica del hook/servicio con cobertura superior al 85% y sin regresiones en la suite E2E.

---

### 4. Fuera de Alcance (Out of Scope)
- Actualizaciones forzosas sin confirmación del operador.
- Re-empaquetado o cambio del servidor de distribución (se utiliza la infraestructura existente).
