const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('monitorAPI', {
  getContext: () => ipcRenderer.invoke('pcd:monitor-context'),
  startPing: () => ipcRenderer.send('pcd:monitor-ping-start'),
  stopPing: () => ipcRenderer.invoke('pcd:monitor-ping-stop'),
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
  setPinned: (pinned) =>
    ipcRenderer.invoke('pcd:monitor-set-pinned', Boolean(pinned)),
  close: () => ipcRenderer.invoke('pcd:monitor-close'),
  copyText: (text) => ipcRenderer.invoke('pcd:monitor-copy', text),
  connectRemote: () => ipcRenderer.invoke('pcd:monitor-connect-remote'),
});
