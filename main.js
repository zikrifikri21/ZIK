const { app, BrowserWindow, ipcMain, screen, Menu, session, desktopCapturer } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const lyrics = require('./lyrics');

const DEF = { size: 200, lyrics: true, context: true, offset: 0, drag: true, gravity: true, follow: true, wander: false, beat: true,
  water: { on: true, cup: 250, goal: 2000, every: 60, from: '08:00', to: '22:00', last: 0 }, waterLog: {} };
const file = () => path.join(app.getPath('userData'), 'settings.json');
let cfg, win;

function set(patch) {
  Object.assign(cfg, patch);
  try { fs.writeFileSync(file(), JSON.stringify(cfg)); } catch (e) { console.error('save settings', e); }
  win.webContents.send('settings', cfg);
}

const panel = (name) => { win.focus(); win.webContents.send('panel', name); };

function menu() {
  const chk = (label, k) => ({ label, type: 'checkbox', checked: cfg[k], click: () => set({ [k]: !cfg[k] }) });
  const off = cfg.offset;
  return Menu.buildFromTemplate([
    { label: `Ukuran… (${cfg.size}px)`, click: () => panel('size') },
    { label: 'Pengingat minum…', click: () => panel('water') },
    { type: 'separator' },
    chk('Tampilkan lirik', 'lyrics'),
    chk('Baris sebelum && sesudah', 'context'),
    { label: `Waktu lirik (${off > 0 ? '+' : ''}${off.toFixed(2)} dtk)`, submenu: [
      { label: 'Majukan 0,25 dtk', click: () => set({ offset: off + .25 }) },
      { label: 'Mundurkan 0,25 dtk', click: () => set({ offset: off - .25 }) },
      { label: 'Reset', click: () => set({ offset: 0 }) },
    ] },
    { type: 'separator' },
    chk('Gerak ikut irama lagu', 'beat'),
    chk('Bisa diangkat && dilempar', 'drag'),
    chk('Gravitasi (jatuh && memantul)', 'gravity'),
    chk('Mata ikut kursor', 'follow'),
    chk('Jalan-jalan sendiri', 'wander'),
    { type: 'separator' },
    { label: 'Keluar ZIK', role: 'quit' },
  ]);
}

app.whenReady().then(() => {
  try { cfg = { ...DEF, ...JSON.parse(fs.readFileSync(file(), 'utf8')) }; } catch { cfg = { ...DEF }; }

  // ponytail: one transparent click-through window over the primary display's work area; per-monitor windows if multi-screen matters
  const { workArea: a } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...a, transparent: true, frame: false, resizable: false, movable: false, alwaysOnTop: true,
    hasShadow: false, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });   // clicks pass through, mousemove still reaches the page
  // renderer's getDisplayMedia → system audio loopback (no picker); renderer drops the video track
  session.defaultSession.setDisplayMediaRequestHandler((_, cb) =>
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb({ video: s[0], audio: 'loopback' })));
  win.loadFile('index.html');

  ipcMain.handle('settings', () => cfg);
  ipcMain.handle('lyrics', (_, media) => lyrics.find(media));
  ipcMain.on('hover', (_, on) => win.setIgnoreMouseEvents(!on, { forward: true }));
  ipcMain.on('set', (_, p) => set(p));
  ipcMain.on('menu', () => menu().popup({ window: win }));

  if (process.platform !== 'win32') return;   // ponytail: Windows-only reader; macOS needs a nowplaying provider (MediaRemote / AppleScript)
  const ps1 = path.join(__dirname, 'media.ps1').replace('app.asar', 'app.asar.unpacked');
  const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], { windowsHide: true });
  let buf = '';
  ps.stdout.setEncoding('utf8').on('data', (d) => {
    const lines = (buf += d).split('\n'); buf = lines.pop();
    for (const l of lines) try { win.webContents.send('media', JSON.parse(l)); } catch {}
  });
  ps.stderr.on('data', (d) => console.error('[media.ps1]', String(d)));
  app.on('before-quit', () => ps.kill());
});

app.on('window-all-closed', () => app.quit());
