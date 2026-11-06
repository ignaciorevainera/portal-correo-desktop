function createMonitorRemote({
  getTarget,
  launchRemoteSmart,
  resolveVncSecret,
  notifyMain,
  flashMain = () => {},
  logger = console,
}) {
  async function connect(webContents) {
    const target = getTarget && getTarget(webContents);
    if (!target) {
      return {
        success: false,
        methodUsed: 'none',
        message: 'Monitor no registrado.',
      };
    }

    try {
      const vncPassword = await resolveVncSecret();
      const result = await launchRemoteSmart(target, { vncPassword });
      notifyMain({ ...result, target });
      if (!result.success) flashMain();
      return result;
    } catch (err) {
      const result = {
        success: false,
        methodUsed: 'none',
        message: `Error al conectar remotamente: ${err.message}`,
      };
      notifyMain({ ...result, target });
      flashMain();
      logger.warn?.('Error de conexión remota del monitor', {
        target,
        error: err && err.message,
      });
      return result;
    }
  }

  return { connect };
}

module.exports = { createMonitorRemote };
