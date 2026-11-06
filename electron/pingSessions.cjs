/**
 * Sesiones de ping aisladas por renderer.
 *
 * Cada `webContents` puede tener una sola sesión activa. Iniciar una nueva
 * detiene solo la anterior de ese renderer; los eventos se envían únicamente
 * a él. Así la consola principal y cada monitor flotante no se interrumpen.
 */

function createPingSessions({ executePing, logger = console } = {}) {
  if (typeof executePing !== 'function') {
    throw new Error('createPingSessions requiere executePing');
  }

  const sessions = new Map();
  let nextSessionId = 1;

  function canSend(webContents) {
    if (!webContents || typeof webContents.send !== 'function') return false;
    if (typeof webContents.isDestroyed !== 'function') return true;
    try {
      return !webContents.isDestroyed();
    } catch {
      return false;
    }
  }

  function send(webContents, channel, payload) {
    if (!canSend(webContents)) return;
    webContents.send(channel, payload);
  }

  function stopById(webContentsId) {
    const session = sessions.get(webContentsId);
    if (!session) return false;
    sessions.delete(webContentsId);
    try {
      session.proc.kill();
    } catch (err) {
      logger.warn?.('No se pudo detener el ping', {
        error: err && err.message,
      });
    }
    return true;
  }

  function stop(webContents) {
    if (!webContents || typeof webContents.id !== 'number') return false;
    return stopById(webContents.id);
  }

  function start(webContents, target, continuous = false) {
    if (!webContents || typeof webContents.id !== 'number') {
      throw new Error('webContents inválido');
    }

    stopById(webContents.id);

    const sessionId = nextSessionId++;
    const session = {
      sessionId,
      proc: null,
      target,
      continuous: Boolean(continuous),
    };
    sessions.set(webContents.id, session);

    const isCurrent = () => sessions.get(webContents.id) === session;

    const onData = (data) => {
      if (!isCurrent()) return;
      send(webContents, 'pcd:ping-data', data);
    };

    const onDone = (code) => {
      if (!isCurrent()) return;
      sessions.delete(webContents.id);
      send(webContents, 'pcd:ping-end', code);
    };

    let proc = null;
    try {
      proc = executePing(
        target,
        continuous ? { continuous: true } : 4,
        onData,
        onDone,
      );
    } catch (err) {
      if (isCurrent()) {
        sessions.delete(webContents.id);
        send(
          webContents,
          'pcd:ping-data',
          `Error al iniciar ping: ${err.message}\n`,
        );
        send(webContents, 'pcd:ping-end', 1);
      }
      logger.warn?.('Error al iniciar ping', {
        error: err && err.message,
      });
      return null;
    }

    if (!proc) {
      if (isCurrent()) sessions.delete(webContents.id);
      return null;
    }

    session.proc = proc;
    return session;
  }

  function stopAll() {
    for (const [id, session] of sessions) {
      try {
        session.proc.kill();
      } catch (err) {
        logger.warn?.('No se pudo detener el ping', {
          error: err && err.message,
        });
      }
      sessions.delete(id);
    }
  }

  function has(webContents) {
    return Boolean(webContents && sessions.has(webContents.id));
  }

  function count() {
    return sessions.size;
  }

  return { start, stop, stopById, stopAll, has, count };
}

module.exports = { createPingSessions };
