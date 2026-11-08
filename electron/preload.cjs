const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSecurityStatus: () => ipcRenderer.invoke('pcd:security-status'),
  retrySecurity: () => ipcRenderer.invoke('pcd:security-retry'),
  isAdmin: () => ipcRenderer.invoke('pcd:is-admin'),
  getDiagnostics: () => ipcRenderer.invoke('pcd:diagnostics'),
  checkStatus: () => ipcRenderer.invoke('pcd:status'),
  searchTerminal: (query) => ipcRenderer.invoke('pcd:search-terminal', query),
  launchVnc: (target) => ipcRenderer.invoke('pcd:launch-vnc', target),
  launchMsra: (target) => ipcRenderer.invoke('pcd:launch-msra', target),
  probeRemote: (target) => ipcRenderer.invoke('pcd:probe-remote', target),
  launchRemoteSmart: (target) => ipcRenderer.invoke('pcd:launch-remote-smart', target),
  minimizeWindow: () => ipcRenderer.invoke('pcd:window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('pcd:window-maximize'),
  closeWindow: () => ipcRenderer.invoke('pcd:window-close'),
  hideToTray: () => ipcRenderer.invoke('pcd:window-hide-tray'),
  quitApp: () => ipcRenderer.invoke('pcd:quit-app'),
  openExternal: (url) => ipcRenderer.invoke('pcd:open-external', url),
  ping: (target, continuous) => ipcRenderer.send('pcd:ping-start', target, continuous),
  stopPing: () => ipcRenderer.invoke('pcd:ping-stop'),
  onPingData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('pcd:ping-data', listener);
    return () => ipcRenderer.removeListener('pcd:ping-data', listener);
  },
  onPingEnd: (callback) => {
    const listener = (_event, code) => callback(code);
    ipcRenderer.on('pcd:ping-end', listener);
    return () => ipcRenderer.removeListener('pcd:ping-end', listener);
  },
  startCommand: (payload) => ipcRenderer.send('pcd:cmd-start', payload),
  stopCommand: () => ipcRenderer.invoke('pcd:cmd-stop'),
  onCommandData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('pcd:cmd-data', listener);
    return () => ipcRenderer.removeListener('pcd:cmd-data', listener);
  },
  onCommandEnd: (callback) => {
    const listener = (_event, code) => callback(code);
    ipcRenderer.on('pcd:cmd-end', listener);
    return () => ipcRenderer.removeListener('pcd:cmd-end', listener);
  },
  onTriggerAutofocusSearch: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('pcd:trigger-autofocus-search', listener);
    return () => ipcRenderer.removeListener('pcd:trigger-autofocus-search', listener);
  },
  startSubnetScan: (payload) => ipcRenderer.send('pcd:subnet-scan-start', payload),
  abortSubnetScan: () => ipcRenderer.invoke('pcd:subnet-scan-abort'),
  onSubnetHostFound: (callback) => {
    const listener = (_event, host) => callback(host);
    ipcRenderer.on('pcd:subnet-host-found', listener);
    return () => ipcRenderer.removeListener('pcd:subnet-host-found', listener);
  },
  onSubnetProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('pcd:subnet-progress', listener);
    return () => ipcRenderer.removeListener('pcd:subnet-progress', listener);
  },
  onSubnetDone: (callback) => {
    const listener = (_event, summary) => callback(summary);
    ipcRenderer.on('pcd:subnet-done', listener);
    return () => ipcRenderer.removeListener('pcd:subnet-done', listener);
  },
  // In-App Updater channels
  checkForUpdates: () => ipcRenderer.invoke('pcd:check-updates'),
  startDownloadUpdate: (downloadUrl) => ipcRenderer.invoke('pcd:start-download-update', downloadUrl),
  onUpdateProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('pcd:update-progress', listener);
    return () => ipcRenderer.removeListener('pcd:update-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_event, filePath) => callback(filePath);
    ipcRenderer.on('pcd:update-downloaded', listener);
    return () => ipcRenderer.removeListener('pcd:update-downloaded', listener);
  },
  installUpdateNow: () => ipcRenderer.invoke('pcd:install-update-now'),
  // SQL connection channel
  testSqlConnection: () => ipcRenderer.invoke('pcd:test-sql-connection'),
  // Preferencias que aplica el proceso principal
  getUiPreferences: () => ipcRenderer.invoke('pcd:ui-preferences-get'),
  setUiPreferences: (patch) => ipcRenderer.invoke('pcd:ui-preferences-set', patch),
  setZoomFactor: (factor) => { try { webFrame.setZoomFactor(factor); } catch {} },
  getZoomFactor: () => { try { return webFrame.getZoomFactor(); } catch { return 1; } },
});
