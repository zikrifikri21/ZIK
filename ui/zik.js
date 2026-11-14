// Bridge between the UI and Tauri: the same window.zik API the old Electron preload exposed.
// Settings live in localStorage (the app's own WebView profile); native bits come from src-tauri as events.
(() => {
  const T = window.__TAURI__, win = T.window.getCurrentWindow(), { listen } = T.event;
  const DEF = { size: 200, lyrics: true, context: true, offset: 0, offsets: {}, webp: { quality: 80, del: false }, keys: { webp: 'Shift+Klik', voice: 'Ctrl+Alt+Z' }, voiceLang: 'id-ID', wake: false, speak: false, drag: true, gravity: true, follow: true, wander: false, beat: true, hands: true, handLyrics: true, lyricSize: 16, char: 'ninuy', charImg: '', aiProvider: 'ollama', aiModel: '', aiKeys: {}, aiAuto: false, focusUntil: 0, restUntil: 0, pomo: [{ f: 25, r: 5 }], pomoIdx: 0, isle: null,
    water: { on: true, cup: 250, goal: 2000, every: 60, from: '08:00', to: '22:00', last: 0 }, waterLog: {} };
  const KEY = 'zik.settings';
  let cfg;
  try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { cfg = { ...DEF }; }
  if (!Array.isArray(cfg.pomo) || !cfg.pomo.length) cfg.pomo = DEF.pomo;   // older builds stored { focus, rest }
  cfg.pomo = cfg.pomo.slice(0, 5);   // max 5 sessions
  cfg.keys = { ...DEF.keys, ...cfg.keys }; cfg.webp = { ...DEF.webp, ...cfg.webp };   // older builds lack the newer fields

  // API keys: OS keychain (src-tauri/secret.rs). Legacy keys found in localStorage move there once.
  // ponytail: if the keychain is unavailable, keys fall back to localStorage as before.
  let plain = false;
  const vault = (async () => {
    try {
      const keys = { ...JSON.parse(await T.core.invoke('secret_get')), ...cfg.aiKeys };
      if (Object.keys(cfg.aiKeys).length) await T.core.invoke('secret_set', { json: JSON.stringify(keys) });
      cfg.aiKeys = keys; save();
    } catch (e) { plain = true; console.error('keychain', e); }
  })();
  function save() {
    const { aiKeys, ...rest } = cfg;
    try { localStorage.setItem(KEY, JSON.stringify(plain ? cfg : rest)); } catch (e) { console.error('save settings', e); }
  }

  const onSettings = [], onPanel = [];
  const media = (action) => T.core.invoke('media_ctl', { action });   // toggle | next | prev, on the player the lyrics follow
  function set(patch) {
    Object.assign(cfg, patch);
    if (patch.aiKeys && !plain) T.core.invoke('secret_set', { json: JSON.stringify(cfg.aiKeys) }).catch((e) => { plain = true; console.error('keychain', e); save(); });
    save();
    onSettings.forEach((fn) => fn({ ...cfg }));   // fresh copy: the renderer diffs old vs new
  }
  const panel = (name) => { win.setFocus(); onPanel.forEach((fn) => fn(name)); };

  // click-through window: while ignoring the mouse the page gets no events, so src-tauri streams the cursor
  // position and we replay it as pointermove on whatever element sits under it (mascot hit-test, eye follow)
  let ignoring = true;
  listen('cursor', ({ payload: [x, y] }) => {
    if (!ignoring) return;
    const t = document.elementFromPoint(x, y) || document.documentElement;
    t.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
  });

  // the right-click menu is drawn by renderer.js (squircle like the panels; a native popup can't be styled): this builds the items
  let menuUI = () => {};
  function menu(x, y) {
    const chk = (text, k) => ({ text, checked: cfg[k], action: () => set({ [k]: !cfg[k] }) });
    // lyric timing is remembered per song (window.zik.song = the playing song's key, set by renderer.js); no song = the global value
    const sk = window.zik.song, sep = { item: 'Separator' }, off = (sk ? cfg.offsets[sk] : cfg.offset) || 0, fl = cfg.focusUntil - Date.now();
    const nudge = (d) => () => set(sk ? { offsets: Object.fromEntries(Object.entries({ ...cfg.offsets, [sk]: d === null ? 0 : off + d }).slice(-300)) } : { offset: d === null ? 0 : off + d });   // ponytail: 300 songs remembered
    menuUI([
      ...(sk ? [{ media: true }, sep] : []),   // prev / play-pause / next, only while a song is loaded
      { text: 'Ngobrol dengan ZIK…', action: () => panel('chat') },
      { text: 'Bicara dengan ZIK (mikrofon)', action: () => panel('voice') },
      { text: 'Ganti karakter…', action: () => panel('char') },
      sep,
      { text: 'Kompres gambar ke WebP…', action: () => panel('webp') },
      { text: 'WhatsApp…', action: () => panel('wa') },
      sep,
      { text: 'Ukuran maskot & lirik…', action: () => panel('size') },
      { text: 'Pengingat minum…', action: () => panel('water') },
      { text: fl > 0 ? `Pomodoro… (sisa ${Math.ceil(fl / 60000)} mnt)` : 'Pomodoro…', action: () => panel('pomo') },
      sep,
      { text: 'Lirik', items: [   // satu pilihan: panel di atas maskot, tulisan tangan di samping, atau mati
        { text: (cfg.lyrics && !cfg.handLyrics ? '● ' : '○ ') + 'Panel di atas maskot', action: () => set({ lyrics: true, handLyrics: false }) },
        { text: (cfg.lyrics && cfg.handLyrics ? '● ' : '○ ') + 'Tulisan tangan', action: () => set({ lyrics: true, handLyrics: true }) },
        { text: (!cfg.lyrics ? '● ' : '○ ') + 'Mati', action: () => set({ lyrics: false }) },
      ] },
      chk('Baris sebelum dan sesudah', 'context'),
      { text: `Waktu lirik${sk ? ' lagu ini' : ''} (${off > 0 ? '+' : ''}${off.toFixed(2)} dtk)`, items: [   // + = lirik muncul lebih awal
        { text: 'Majukan 1 dtk', action: nudge(1) },
        { text: 'Majukan 0,25 dtk', action: nudge(.25) },
        { text: 'Mundurkan 0,25 dtk', action: nudge(-.25) },
        { text: 'Mundurkan 1 dtk', action: nudge(-1) },
        { text: 'Reset', action: nudge(null) },
      ] },
      sep,
      chk('Gerak ikut irama lagu', 'beat'),
      chk('Tangan memperagakan lirik', 'hands'),
      chk('Bisa diangkat dan dilempar', 'drag'),
      chk('Gravitasi (jatuh dan memantul)', 'gravity'),
      chk('Mata ikut kursor', 'follow'),
      chk('Jalan-jalan sendiri', 'wander'),
      sep,
      { text: 'Keluar ZIK', action: () => win.close() },
    ], x, y);
  }

  window.zik = {
    settings: async () => (await vault, { ...cfg }),
    set,
    onSettings: (fn) => onSettings.push(fn),
    onPanel: (fn) => onPanel.push(fn),
    onMedia: (fn) => listen('media', (e) => fn(e.payload)),
    onAudio: (fn) => listen('audio', (e) => fn(e.payload)),
    onTempo: (fn) => listen('tempo', (e) => fn(e.payload)),
    onKey: (fn) => listen('key', (e) => fn(e.payload)),
    // lrclib through src-tauri: no CORS, and the CSP needs no extra host
    lyrics: (m) => window.lyricsFind(m, (url) => T.core.invoke('http_get', { url, headers: { 'User-Agent': 'zik-mascot/1.0' } })),
    media,
    onMenu: (fn) => (menuUI = fn),
    onWa: (fn) => listen('wa', (e) => fn(e.payload)),
    onTrigger: (fn) => listen('trigger', (e) => fn(e.payload)),   // { id, hwnd } from a global shortcut (keys.rs)
    triggers: () => T.core.invoke('set_triggers', { list: Object.entries(cfg.keys) }),
    song: '',
    hover: (on) => { ignoring = !on; win.setIgnoreCursorEvents(!on); },
    menu,
    panel,
  };
})();
