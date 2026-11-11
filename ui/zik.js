// Bridge between the UI and Tauri: the same window.zik API the old Electron preload exposed.
// Settings live in localStorage (the app's own WebView profile); native bits come from src-tauri as events.
(() => {
  const T = window.__TAURI__, win = T.window.getCurrentWindow(), { listen } = T.event;
  const DEF = { size: 200, lyrics: true, context: true, offset: 0, drag: true, gravity: true, follow: true, wander: false, beat: true, lyricSize: 16, focusUntil: 0, restUntil: 0, pomo: [{ f: 25, r: 5 }], pomoIdx: 0, isle: null,
    water: { on: true, cup: 250, goal: 2000, every: 60, from: '08:00', to: '22:00', last: 0 }, waterLog: {} };
  const KEY = 'zik.settings';
  let cfg;
  try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { cfg = { ...DEF }; }
  if (!Array.isArray(cfg.pomo) || !cfg.pomo.length) cfg.pomo = DEF.pomo;   // older builds stored { focus, rest }
  cfg.pomo = cfg.pomo.slice(0, 5);   // max 5 sessions

  const onSettings = [], onPanel = [];
  function set(patch) {
    Object.assign(cfg, patch);
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { console.error('save settings', e); }
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

  async function menu() {
    const chk = (text, k) => ({ text, checked: cfg[k], action: () => set({ [k]: !cfg[k] }) });
    const sep = { item: 'Separator' }, off = cfg.offset, fl = cfg.focusUntil - Date.now();
    const m = await T.menu.Menu.new({ items: [
      { text: 'Ukuran maskot & lirik…', action: () => panel('size') },
      { text: 'Pengingat minum…', action: () => panel('water') },
      { text: fl > 0 ? `Pomodoro… (sisa ${Math.ceil(fl / 60000)} mnt)` : 'Pomodoro…', action: () => panel('pomo') },
      sep,
      chk('Tampilkan lirik', 'lyrics'),
      chk('Baris sebelum dan sesudah', 'context'),
      { text: `Waktu lirik (${off > 0 ? '+' : ''}${off.toFixed(2)} dtk)`, items: [
        { text: 'Majukan 0,25 dtk', action: () => set({ offset: off + .25 }) },
        { text: 'Mundurkan 0,25 dtk', action: () => set({ offset: off - .25 }) },
        { text: 'Reset', action: () => set({ offset: 0 }) },
      ] },
      sep,
      chk('Gerak ikut irama lagu', 'beat'),
      chk('Bisa diangkat dan dilempar', 'drag'),
      chk('Gravitasi (jatuh dan memantul)', 'gravity'),
      chk('Mata ikut kursor', 'follow'),
      chk('Jalan-jalan sendiri', 'wander'),
      sep,
      { text: 'Keluar ZIK', action: () => win.close() },
    ] });
    await m.popup();
  }

  window.zik = {
    settings: async () => ({ ...cfg }),
    set,
    onSettings: (fn) => onSettings.push(fn),
    onPanel: (fn) => onPanel.push(fn),
    onMedia: (fn) => listen('media', (e) => fn(e.payload)),
    onAudio: (fn) => listen('audio', (e) => fn(e.payload)),
    lyrics: (media) => window.lyricsFind(media),
    hover: (on) => { ignoring = !on; win.setIgnoreCursorEvents(!on); },
    menu,
    panel,
  };
})();
