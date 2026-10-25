const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSecurityStatus: () => ipcRenderer.invoke('cmda:security-status'),
  unlockSecurity: (configPath, corporateKey) =>
    ipcRenderer.invoke('cmda:security-unlock', configPath, corporateKey),
  checkStatus: () => ipcRenderer.invoke('cmda:status'),
  searchTerminal: (query) => ipcRenderer.invoke('cmda:search-terminal', query),
  launchVnc: (target) => ipcRenderer.invoke('cmda:launch-vnc', target),
  launchMsra: (target) => ipcRenderer.invoke('cmda:launch-msra', target),
  ping: (target) => ipcRenderer.send('cmda:ping-start', target),
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
});
