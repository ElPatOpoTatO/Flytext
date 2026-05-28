import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('win-minimize'),
  close: () => ipcRenderer.invoke('win-close'),
  togglePin: () => ipcRenderer.invoke('win-toggle-pin'),
  setWindowMode: (mode: string) => ipcRenderer.invoke('win-set-mode', mode),
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.invoke('win-set-ignore-mouse', ignore),

  // Position capture
  startCapture: () => ipcRenderer.invoke('capture-start'),
  onPositionCaptured: (cb: (pos: { x: number; y: number }) => void) => {
    ipcRenderer.on('position-captured', (_e, pos) => cb(pos))
    return () => ipcRenderer.removeAllListeners('position-captured')
  },
  onCaptureCancelled: (cb: () => void) => {
    ipcRenderer.on('capture-cancelled', cb)
    return () => ipcRenderer.removeAllListeners('capture-cancelled')
  },

  // Marker window
  showMarker: (pos: { x: number; y: number }) =>
    ipcRenderer.invoke('marker-show', pos),
  hideMarker: () => ipcRenderer.invoke('marker-hide'),

  // Keyboard injection
  typeChar: (char: string) => ipcRenderer.invoke('kbd-type-char', char),
  typeBackspace: () => ipcRenderer.invoke('kbd-backspace'),
  moveMouse: (pos: { x: number; y: number }) =>
    ipcRenderer.invoke('mouse-move', pos),
  clickMouse: () => ipcRenderer.invoke('mouse-click'),

  // Window position
  moveWindow: (x: number, y: number) => ipcRenderer.invoke('win-move', x, y),

  // Info
  getPlatform: () => process.platform,
})
