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
  const watchedSenders = new WeakSet();
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

  function watchSender(webContents) {
    if (
      typeof webContents.once !== 'function' ||
      watchedSenders.has(webContents)
    ) {
      return;
    }
    watchedSenders.add(webContents);
    try {
      webContents.once('destroyed', () => stopById(webContents.id));
    } catch (err) {
      logger?.warn?.('No se pudo registrar la limpieza del sender', {
        error: err && err.message,
      });
    }
  }

  function isDestroyed(webContents) {
    if (!webContents || typeof webContents.isDestroyed !== 'function') return false;
    try {
      return webContents.isDestroyed();
    } catch {
      return true;
    }
  }

  function send(webContents, channel, payload) {
    if (!canSend(webContents)) return;
    try {
      webContents.send(channel, payload);
    } catch (err) {
      logger?.warn?.('No se pudo enviar el evento de ping', {
        error: err && err.message,
      });
    }
  }

  // Detener no emite pcd:ping-end: el renderer que pidió el stop limpia su propio estado.
  function stopById(webContentsId) {
    const session = sessions.get(webContentsId);
    if (!session) return false;
    sessions.delete(webContentsId);
    const proc = session.proc;
    if (!proc || typeof proc.kill !== 'function') return true;
    try {
      proc.kill();
    } catch (err) {
      logger?.warn?.('No se pudo detener el ping', {
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

    if (isDestroyed(webContents)) {
      stopById(webContents.id);
      return null;
    }

    stopById(webContents.id);

    const sessionId = nextSessionId++;
    const session = { sessionId, proc: null };
    sessions.set(webContents.id, session);

    watchSender(webContents);

    const isCurrent = () =>
      sessions.get(webContents.id)?.sessionId === sessionId;

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
      // executePing (systemTools) sanitiza el target y emite error/end si es inválido.
      proc = executePing(
        target,
        // El ping estándar siempre es de 4 paquetes; el monitor usa continuous.
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
      logger?.warn?.('Error al iniciar ping', {
        error: err && err.message,
      });
      return null;
    }

    if (!proc || typeof proc.kill !== 'function') {
      if (isCurrent()) {
        sessions.delete(webContents.id);
        send(webContents, 'pcd:ping-data', 'No se pudo iniciar ping.\n');
        send(webContents, 'pcd:ping-end', 1);
      }
      return null;
    }

    session.proc = proc;

    if (!isCurrent()) {
      try {
        proc.kill();
      } catch {}
      return null;
    }

    return session;
  }

  function stopAll() {
    for (const [id, session] of sessions) {
      sessions.delete(id);
      const proc = session.proc;
      if (!proc || typeof proc.kill !== 'function') continue;
      try {
        proc.kill();
      } catch (err) {
        logger?.warn?.('No se pudo detener el ping', {
          error: err && err.message,
        });
      }
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
