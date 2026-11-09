function createMonitorRemote({
  getTarget,
  launchRemoteSmart,
  resolveVncSecret,
  notifyMain,
  flashMain = () => {},
  isMainMinimized = () => false,
  logger = console,
}) {
  const pending = new Map();

  function errorMessage(err) {
    return err instanceof Error ? err.message : String(err);
  }

  function safeNotify(payload) {
    try {
      notifyMain(payload);
    } catch (err) {
      logger?.warn?.('No se pudo notificar el resultado remoto', {
        error: errorMessage(err),
      });
    }
  }

  function safeFlash() {
    try {
      flashMain();
    } catch (err) {
      logger?.warn?.('No se pudo hacer flash de la ventana principal', {
        error: errorMessage(err),
      });
    }
  }

  async function runConnect(webContents) {
    let target;
    try {
      target = getTarget && getTarget(webContents);
    } catch (err) {
      const message = errorMessage(err);
      logger?.warn?.('No se pudo resolver el target del monitor', {
        error: message,
      });
      return {
        success: false,
        methodUsed: 'none',
        message: `Error al conectar remotamente: ${message}`,
      };
    }

    if (!target) {
      logger?.warn?.('Monitor no registrado para conexión remota');
      return {
        success: false,
        methodUsed: 'none',
        message: 'Monitor no registrado.',
      };
    }

    let result;
    try {
      const vncPassword = await resolveVncSecret();
      const raw = await launchRemoteSmart(target, { vncPassword });
      result =
        raw && typeof raw === 'object'
          ? raw
          : {
              success: false,
              methodUsed: 'none',
              message: 'Respuesta inválida del lanzador remoto.',
            };
    } catch (err) {
      const message = errorMessage(err);
      result = {
        success: false,
        methodUsed: 'none',
        message: `Error al conectar remotamente: ${message}`,
      };
      logger?.warn?.('Error de conexión remota del monitor', {
        target,
        error: message,
      });
    }

    safeNotify({ ...result, target });

    let minimized = false;
    try {
      minimized = Boolean(isMainMinimized());
    } catch {
      minimized = false;
    }
    if (!result.success || minimized) safeFlash();

    return result;
  }

  function connect(webContents) {
    const key = webContents && webContents.id;
    if (pending.has(key)) return pending.get(key);

    const promise = runConnect(webContents)
      .catch((err) => {
        const message = errorMessage(err);
        logger?.warn?.('Error inesperado de conexión remota', {
          error: message,
        });
        return {
          success: false,
          methodUsed: 'none',
          message: `Error al conectar remotamente: ${message}`,
        };
      })
      .finally(() => {
        pending.delete(key);
      });

    pending.set(key, promise);
    return promise;
  }

  return { connect };
}

module.exports = { createMonitorRemote };
