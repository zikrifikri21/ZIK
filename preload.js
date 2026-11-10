const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zik', {
  onMedia: (fn) => ipcRenderer.on('media', (_, m) => fn(m)),
  onSettings: (fn) => ipcRenderer.on('settings', (_, c) => fn(c)),
  settings: () => ipcRenderer.invoke('settings'),
  lyrics: (media) => ipcRenderer.invoke('lyrics', media),
  hover: (on) => ipcRenderer.send('hover', on),
  menu: () => ipcRenderer.send('menu'),
  onPanel: (fn) => ipcRenderer.on('panel', (_, name) => fn(name)),
  set: (patch) => ipcRenderer.send('set', patch),
});
