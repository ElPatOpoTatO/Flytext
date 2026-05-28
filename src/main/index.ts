import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  shell,
} from 'electron'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ── Keyboard injection ────────────────────────────────────────────────────────

function escapeShellChar(char: string): string {
  return char.replace(/'/g, "'\\''")
}

function escapeSendKeys(char: string): string {
  const map: Record<string, string> = {
    '+': '{+}', '^': '{^}', '%': '{%}', '~': '{~}',
    '(': '{(}', ')': '{)}', '[': '{[}', ']': '{]}',
    '{': '{{}', '}': '{}}',
  }
  return map[char] ?? char
}

async function injectChar(char: string): Promise<void> {
  if (process.platform === 'linux') {
    await execAsync(`xdotool type --delay 0 --clearmodifiers -- '${escapeShellChar(char)}'`)
  } else if (process.platform === 'win32') {
    const escaped = escapeSendKeys(char)
    await execAsync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')"`,
    )
  }
}

async function injectBackspace(): Promise<void> {
  if (process.platform === 'linux') {
    await execAsync('xdotool key --clearmodifiers BackSpace')
  } else if (process.platform === 'win32') {
    await execAsync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')"`,
    )
  }
}

async function injectCombo(sendKeys: string): Promise<void> {
  // Validate to only allow safe SendKeys characters before executing
  if (!/^[+^%\{\}\[\]\(\)a-zA-Z0-9:]+$/.test(sendKeys)) return
  if (process.platform === 'win32') {
    await execAsync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeys}')"`,
    )
  } else if (process.platform === 'linux') {
    // Basic xdotool fallback — modifier keys are not fully mapped here
    await execAsync(`xdotool key --clearmodifiers -- '${sendKeys}'`)
  }
}

async function moveMouse(x: number, y: number): Promise<void> {
  if (process.platform === 'linux') {
    await execAsync(`xdotool mousemove ${x} ${y}`)
  } else if (process.platform === 'win32') {
    await execAsync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`,
    )
  }
}

async function clickMouse(): Promise<void> {
  if (process.platform === 'linux') {
    await execAsync('xdotool click 1')
  } else if (process.platform === 'win32') {
    await execAsync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);' -Name 'Win32' -Namespace 'P'; [P.Win32]::mouse_event(2, 0, 0, 0, 0); [P.Win32]::mouse_event(4, 0, 0, 0, 0)"`,
    )
  }
}

// ── Windows ───────────────────────────────────────────────────────────────────

let mainWin: BrowserWindow | null = null
let markerWin: BrowserWindow | null = null
let captureWin: BrowserWindow | null = null

// In electron-vite: dev URL is set via ELECTRON_RENDERER_URL env var
const RENDERER_URL = process.env['ELECTRON_RENDERER_URL']

function getRendererFile(name: string) {
  return join(__dirname, '../renderer', name)
}

function createMainWindow() {
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize

  mainWin = new BrowserWindow({
    width: 460,
    height: 600,
    x: Math.round(sw / 2 - 230),
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWin.setIgnoreMouseEvents(true, { forward: true })

  if (RENDERER_URL) {
    mainWin.loadURL(RENDERER_URL)
  } else {
    mainWin.loadFile(getRendererFile('index.html'))
  }

  mainWin.on('closed', () => { mainWin = null })
}

function createMarkerWindow(pos: { x: number; y: number }) {
  if (markerWin && !markerWin.isDestroyed()) markerWin.close()

  markerWin = new BrowserWindow({
    width: 80,
    height: 80,
    x: Math.round(pos.x - 40),
    y: Math.round(pos.y - 40),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: { contextIsolation: true },
  })

  markerWin.setIgnoreMouseEvents(true)

  if (RENDERER_URL) {
    markerWin.loadURL(`${RENDERER_URL}/marker.html`)
  } else {
    markerWin.loadFile(getRendererFile('marker.html'))
  }

  markerWin.on('closed', () => { markerWin = null })
}

function createCaptureWindow() {
  if (captureWin && !captureWin.isDestroyed()) captureWin.close()

  const { width: sw, height: sh } = screen.getPrimaryDisplay().bounds

  captureWin = new BrowserWindow({
    width: sw,
    height: sh,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  })

  const captureJS = `
    const {ipcRenderer} = require('electron');
    document.addEventListener('mousedown', () => ipcRenderer.send('cursor-position-request'));
    document.addEventListener('keydown', (e) => { if(e.key==='Escape') ipcRenderer.send('capture-escape'); });
  `
  const html = encodeURIComponent(
    `<!DOCTYPE html><html><head><style>*{cursor:crosshair!important;margin:0;padding:0;}body{background:rgba(0,0,0,0.01);width:100vw;height:100vh;}</style></head><body><script>${captureJS}</script></body></html>`,
  )
  captureWin.loadURL(`data:text/html;charset=utf-8,${html}`)
  captureWin.focus()

  captureWin.on('closed', () => { captureWin = null })
}

// ── IPC ───────────────────────────────────────────────────────────────────────

ipcMain.handle('win-minimize', () => mainWin?.minimize())
ipcMain.handle('win-close', () => mainWin?.close())

ipcMain.handle('win-toggle-pin', () => {
  if (!mainWin) return false
  const current = mainWin.isAlwaysOnTop()
  mainWin.setAlwaysOnTop(!current)
  return !current
})

ipcMain.handle('win-set-mode', (_e, mode: string) => {
  if (!mainWin) return
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize
  if (mode === 'expanded') {
    mainWin.setSize(460, 600)
    mainWin.setPosition(Math.round(sw / 2 - 230), 0)
  } else if (mode === 'collapsed') {
    // Only resize — let the pill stay wherever the user dragged it
    mainWin.setSize(260, 44)
  } else if (mode === 'ghost') {
    mainWin.setSize(200, 6)
    mainWin.setPosition(Math.round(sw / 2 - 100), 0)
  }
})

ipcMain.handle('win-move', (_e, x: number, y: number) => {
  mainWin?.setPosition(Math.round(x), Math.round(y))
})

ipcMain.handle('win-set-ignore-mouse', (_e, ignore: boolean) => {
  mainWin?.setIgnoreMouseEvents(ignore, { forward: true })
})

ipcMain.handle('capture-start', () => {
  createCaptureWindow()
})

ipcMain.on('cursor-position-request', (event) => {
  const point = screen.getCursorScreenPoint()
  if (captureWin && !captureWin.isDestroyed()) captureWin.close()
  mainWin?.webContents.send('position-captured', point)
  event.returnValue = null
})

ipcMain.on('capture-escape', () => {
  if (captureWin && !captureWin.isDestroyed()) captureWin.close()
  mainWin?.webContents.send('capture-cancelled')
})

ipcMain.handle('marker-show', (_e, pos: { x: number; y: number }) => {
  createMarkerWindow(pos)
})

ipcMain.handle('marker-hide', () => {
  if (markerWin && !markerWin.isDestroyed()) markerWin.close()
})

ipcMain.handle('kbd-type-char', async (_e, char: string) => {
  try { await injectChar(char) } catch (err) {
    console.error('[flytext] inject char error', err)
  }
})

ipcMain.handle('kbd-backspace', async () => {
  try { await injectBackspace() } catch (err) {
    console.error('[flytext] backspace error', err)
  }
})

ipcMain.handle('mouse-move', async (_e, pos: { x: number; y: number }) => {
  try { await moveMouse(pos.x, pos.y) } catch (err) {
    console.error('[flytext] mouse move error', err)
  }
})

ipcMain.handle('mouse-click', async () => {
  try { await clickMouse() } catch (err) {
    console.error('[flytext] mouse click error', err)
  }
})

ipcMain.handle('kbd-press-combo', async (_e, sendKeys: string) => {
  try { await injectCombo(sendKeys) } catch (err) {
    console.error('[flytext] combo error', err)
  }
})

ipcMain.handle('win-unpin', () => {
  mainWin?.setAlwaysOnTop(false)
})

ipcMain.handle('win-set-transparency', (_e, _on: boolean) => {
  if (!mainWin) return
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize
  mainWin.setSize(460, 600)
  mainWin.setPosition(Math.round(sw / 2 - 230), 0)
})

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createMainWindow()
  app.on('activate', () => { if (!mainWin) createMainWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})
