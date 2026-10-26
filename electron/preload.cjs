const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSecurityStatus: () => ipcRenderer.invoke('cmda:security-status'),
  unlockSecurity: (configPath, corporateKey) =>
    ipcRenderer.invoke('cmda:security-unlock', configPath, corporateKey),
  checkStatus: () => ipcRenderer.invoke('cmda:status'),
  searchTerminal: (query) => ipcRenderer.invoke('cmda:search-terminal', query),
  launchVnc: (target) => ipcRenderer.invoke('cmda:launch-vnc', target),
  launchMsra: (target) => ipcRenderer.invoke('cmda:launch-msra', target),
  probeRemote: (target) => ipcRenderer.invoke('cmda:probe-remote', target),
  launchRemoteSmart: (target) => ipcRenderer.invoke('cmda:launch-remote-smart', target),
  minimizeWindow: () => ipcRenderer.invoke('cmda:window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('cmda:window-maximize'),
  closeWindow: () => ipcRenderer.invoke('cmda:window-close'),
  hideToTray: () => ipcRenderer.invoke('cmda:window-hide-tray'),
  openExternal: (url) => ipcRenderer.invoke('cmda:open-external', url),
  ping: (target, continuous) => ipcRenderer.send('cmda:ping-start', target, continuous),
  stopPing: () => ipcRenderer.invoke('cmda:ping-stop'),
  onPingData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('cmda:ping-data', listener);
    return () => ipcRenderer.removeListener('cmda:ping-data', listener);
  },
  onPingEnd: (callback) => {
    const listener = (_event, code) => callback(code);
    ipcRenderer.on('cmda:ping-end', listener);
    return () => ipcRenderer.removeListener('cmda:ping-end', listener);
  },
  onTriggerAutofocusSearch: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('cmda:trigger-autofocus-search', listener);
    return () => ipcRenderer.removeListener('cmda:trigger-autofocus-search', listener);
  },
  startSubnetScan: (targetIp) => ipcRenderer.send('cmda:subnet-scan-start', targetIp),
  abortSubnetScan: () => ipcRenderer.invoke('cmda:subnet-scan-abort'),
  onSubnetHostFound: (callback) => {
    const listener = (_event, host) => callback(host);
    ipcRenderer.on('cmda:subnet-host-found', listener);
    return () => ipcRenderer.removeListener('cmda:subnet-host-found', listener);
  },
  onSubnetProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('cmda:subnet-progress', listener);
    return () => ipcRenderer.removeListener('cmda:subnet-progress', listener);
  },
  onSubnetDone: (callback) => {
    const listener = (_event, summary) => callback(summary);
    ipcRenderer.on('cmda:subnet-done', listener);
    return () => ipcRenderer.removeListener('cmda:subnet-done', listener);
  },
  // In-App Updater channels
  checkForUpdates: () => ipcRenderer.invoke('cmda:check-updates'),
  startDownloadUpdate: (downloadUrl) => ipcRenderer.invoke('cmda:start-download-update', downloadUrl),
  onUpdateProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('cmda:update-progress', listener);
    return () => ipcRenderer.removeListener('cmda:update-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_event, filePath) => callback(filePath);
    ipcRenderer.on('cmda:update-downloaded', listener);
    return () => ipcRenderer.removeListener('cmda:update-downloaded', listener);
  },
  installUpdateNow: () => ipcRenderer.invoke('cmda:install-update-now'),
  // Corporate Config channels
  getCorporateConfig: () => ipcRenderer.invoke('cmda:get-corporate-config'),
  importConfigDialog: () => ipcRenderer.invoke('cmda:import-config-dialog'),
  importConfigContent: (content) => ipcRenderer.invoke('cmda:import-config-content', content),
  clearCorporateConfig: () => ipcRenderer.invoke('cmda:clear-corporate-config'),
  testSqlConnection: () => ipcRenderer.invoke('cmda:test-sql-connection'),
});
