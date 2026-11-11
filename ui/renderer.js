// Hugeicons stroke-rounded (MIT, @hugeicons/core-free-icons 4.4.0), inlined so the app needs no icon runtime
const ICON = {
  heart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 8.69444C2 13.0348 7.58942 17.858 10.4107 19.9677C11.3601 20.6776 12.6399 20.6776 13.5893 19.9677C16.4106 17.858 22 13.0348 22 8.69444C22 5.82563 19.8947 3.5 17 3.5C15.5 3.5 14 4 12 6C10 4 8.5 3.5 7 3.5C4.10526 3.5 2 5.82563 2 8.69444Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  droplet: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 13.678C3.5 9.49387 7.08079 5.35907 9.59413 2.97222C10.9591 1.67593 13.0409 1.67593 14.4059 2.97222C16.9192 5.35907 20.5 9.49387 20.5 13.678C20.5 17.7804 17.2812 22 12 22C6.71878 22 3.5 17.7804 3.5 13.678Z" stroke="currentColor" stroke-width="1.5"/><path d="M16 14C16 16.2091 14.2091 18 12 18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18.9991 19L5 5.00098" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M19 5L5.00092 18.999" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4V20M20 12H4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12L4 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  note: '<svg class="zn" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 9.5C7 10.8807 5.88071 12 4.5 12C3.11929 12 2 10.8807 2 9.5C2 8.11929 3.11929 7 4.5 7C5.88071 7 7 8.11929 7 9.5ZM7 9.5V2C7.33333 2.5 7.6 4.6 10 5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><circle cx="10.5" cy="19.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M13 19.5L13 11C13 10.09 13 9.63502 13.2466 9.35248C13.4932 9.06993 13.9938 9.00163 14.9949 8.86504C18.0085 8.45385 20.2013 7.19797 21.3696 6.42937C21.6498 6.24509 21.7898 6.15295 21.8949 6.20961C22 6.26627 22 6.43179 22 6.76283V17.9259" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M13 13C17.8 13 21 10.6667 22 10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  resize: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 8L16 16" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M17 3.23663C17.7506 3.22596 20.2363 2.70959 20.7634 3.23663C21.2904 3.76367 20.774 6.24941 20.7634 7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M3.23663 17C3.22596 17.7506 2.70959 20.2363 3.23663 20.7634C3.76367 21.2904 6.24941 20.774 7 20.7634" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M14.998 9.00737L20.3838 3.62158" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M3.62598 20.3741L9.01172 14.9883" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M12 9.5V13L14 15M10 2H14M12 2V5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
  noLyrics: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17 17L21 21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M8 8L11 11M11 11L14 14M11 11L14 8M11 11L8 14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg>',
};

let cfg = await window.zik.settings();
const m = Mascot.create({ size: cfg.size, floor: 4, fps: 30, idleFps: 24, sleepAfter: 60000, gravity: cfg.gravity, draggable: cfg.drag, followPointer: cfg.follow,
  onTap: () => { if (thirsty) { const ml = cfg.water.cup; drink(ml); thanks(ml); } },   // tap after a reminder = I drank
  onPet: () => sulk(),   // petting while it's mad about water → sulky, not love
});
// "Maaciiw <heart> +250 ml" (icon in the middle of the bubble)
const thanks = (ml) => { m.say(`Maaciiw +${ml} ml`, 2200); const b = m.el.querySelector('.mb-bubble'); b.textContent = 'Maaciiw'; b.insertAdjacentHTML('beforeend', `<span class="hi">${ICON.heart}</span>`); b.append(`+${ml} ml`); };
// speech bubble with a leading icon (m.say sets plain text, then the svg is prepended)
const say = (icon, text, ms) => { m.say(text, ms); m.el.querySelector('.mb-bubble').insertAdjacentHTML('afterbegin', ICON[icon]); if (msg?.text === text) msg.icon = ICON[icon]; };
// bubble would be cut off by a screen edge → slide it beside the head. The tail is rebuilt from the bubble's size and the
// head's position (bubble-local px), so it points at the mascot whatever the text length or side; `d` transitions smoothly.
const bub = m.el.querySelector('.mb-bubble'), SVG = 'http://www.w3.org/2000/svg';
const tail = document.createElementNS(SVG, 'svg'), tailP = tail.appendChild(document.createElementNS(SVG, 'path'));
tail.setAttribute('class', 'tl');
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const pt = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
function placeBubble() {
  if (!tail.isConnected) bub.append(tail);   // m.say / thanks() replace the bubble's content
  const r = m.el.getBoundingClientRect(), cx = r.left + r.width / 2, w = bub.offsetWidth, h = bub.offsetHeight, half = w / 2;
  const side = cx + half > innerWidth - 8 ? -1 : cx - half < 8 ? 1 : 0, shift = side * (half + r.width * .12);
  bub.style.translate = shift ? `${shift}px 0` : '';
  const tx = half - shift, ty = h + r.height * .18;                      // head, in bubble coords
  const bx = clampN(tx, 20, w - 20), by = h - 2;              // tail root on the bottom edge, clear of the corners
  const dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy) || 1, L = Math.min(16, d);
  const px = bx + dx / d * L, py = by + dy / d * L, ax = (bx + px) / 2, ay = (by + py) / 2;
  const c = (x) => pt(((x + px) / 2 + ax) / 2, ((by + py) / 2 + ay) / 2);   // pull each side toward the axis → curved, tapered tail
  tailP.style.d = `path("M${pt(bx - 8, by)}Q${c(bx - 8)} ${pt(px, py)}Q${c(bx + 8)} ${pt(bx + 8, by)}Z")`;
}
// place before it pops in; while hiding off-screen (focus) the bubble is hidden by CSS and the line goes to the island instead
const say0 = m.say; m.say = (t, ms) => {
  const p = say0(t, ms); placeBubble();
  if (hid?.gone) { msg = { icon: '', text: t, until: performance.now() + Math.max(ms || 2600, 3000) }; setIsle(); }
  return p;
};
document.querySelectorAll('[data-i]').forEach((e) => e.insertAdjacentHTML('afterbegin', ICON[e.dataset.i]));
m.wander(cfg.wander);

// lyric stack lives inside the mascot element, so it follows drag / throw / wander
const zl = document.createElement('div'); zl.className = 'zl'; zl.innerHTML = '<div class="in"></div>';
const inner = zl.firstChild; m.el.appendChild(zl);
// focus-mode island (mascot is off-screen): shows the current line, pill width animates to the line's width
const isle = document.createElement('div'); isle.className = 'zi'; isle.innerHTML = '<span></span><div class="ls"></div>'; document.body.appendChild(isle);
const isleList = isle.lastChild;
// priority: hover/expanded → pomodoro timer; song just changed → title; else current lyric line; nothing to sing → timer
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
let isleHov = false, isleBig = false, msg = null;   // msg = { icon, text, until }: song title or a speech line while hiding
function setIsle(force) {
  const away = !!hid?.gone, s = isle.firstChild;
  m.el.classList.toggle('away', away);   // tick() keeps the stack on-screen, so hide it or it lingers at the edge
  isle.classList.toggle('on', away);
  if (!away) isleBig = false;
  isle.classList.toggle('big', isleBig);
  if (!away) return;
  const l = !zl.hidden && lines && lines[cur], n = cfg.pomo.length, clock = isleHov || isleBig;
  const [kind, icon, text] = !clock && msg && performance.now() < msg.until ? ['msg', msg.icon, msg.text]
    : !clock && l ? ['line', l.text ? '' : ICON.note.repeat(3), l.text]
    : ['time', ICON.timer, `Fokus ${mmss(cfg.focusUntil - Date.now())}${n > 1 ? ` · Sesi ${cfg.pomoIdx + 1}/${n}` : ''}`];
  const k = kind + icon.length + text + isleBig;
  if (s.dataset.k === k && !force) return;
  const anim = kind !== 'time' || s.dataset.kind !== 'time';   // the ticking clock itself doesn't re-animate
  s.dataset.k = k; s.dataset.kind = kind;
  s.innerHTML = icon; s.append(text);
  if (anim) { s.classList.remove('new'); void s.offsetWidth; s.classList.add('new'); }
  if (isleBig) {   // expanded card: timer on the left, sessions + actions on the right. Rebuilt only when sessions change
    const lk = JSON.stringify(cfg.pomo) + cfg.pomoIdx;   // (rebuilding every second would eat clicks on the buttons)
    if (isleList.dataset.k !== lk) {
      isleList.dataset.k = lk;
      isleList.innerHTML = `<div class="ex"><div class="tmr"><i class="ti">${ICON.timer}</i><b class="tm"></b><small>Fokus</small></div><div class="ss"><div class="sl${cfg.pomo.length > 2 ? ' more' : ''}">`
        + cfg.pomo.map((p, i) => `<p class="${i < cfg.pomoIdx ? 'done' : i === cfg.pomoIdx ? 'cur' : ''}"><b>Sesi ${i + 1}</b><span>${p.f} mnt fokus · ${p.r} mnt istirahat</span></p>`).join('')
        + `</div><div class="ac"><button type="button" data-a="set">Atur sesi…</button><button type="button" data-a="add" aria-label="Tambah sesi"${cfg.pomo.length >= MAX_SESS ? ' disabled' : ''}>${ICON.plus}</button></div></div></div>`;   // numbers only, safe as HTML
      const sl = isleList.querySelector('.sl'), c = sl.querySelector('.cur');   // start scrolled to the running session
      if (c) sl.scrollTop = c.offsetTop - sl.firstChild.offsetTop;
    }
    isleList.querySelector('.tm').textContent = mmss(cfg.focusUntil - Date.now());
  }
  isle.style.width = (isleBig ? isleList.offsetWidth : s.offsetWidth) + 'px';
  isle.style.height = isleBig ? isleList.offsetHeight + 'px' : '';
}
// drag: pointer capture + a 4px threshold so a plain click still counts as a click. begin() → { move(dx, dy), end(moved) }
function drag(handle, begin) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.button || e.target.closest('button, input')) return;
    const x0 = e.clientX, y0 = e.clientY, d = begin(); let moved = false;
    handle.setPointerCapture(e.pointerId);
    const mv = (ev) => { moved ||= Math.hypot(ev.clientX - x0, ev.clientY - y0) > 4; if (moved) d.move(ev.clientX - x0, ev.clientY - y0); };
    handle.addEventListener('pointermove', mv);
    handle.addEventListener('pointerup', () => { handle.removeEventListener('pointermove', mv); d.end?.(moved); }, { once: true });
  });
}
// island anchor = its top-center, so it grows evenly both ways; position is remembered
const placeIsle = (x, y) => { isle.style.left = clampN(x, 40, innerWidth - 40) + 'px'; isle.style.top = clampN(y, 0, innerHeight - 40) + 'px'; };
if (cfg.isle) placeIsle(...cfg.isle);
drag(isle, () => {
  const r = isle.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top;
  return {
    move: (dx, dy) => placeIsle(x + dx, y + dy),
    end: (moved) => {
      if (moved) return window.zik.set({ isle: [parseFloat(isle.style.left), parseFloat(isle.style.top)] });
      isleBig = !isleBig; setIsle(true);   // click: expand into the session list / collapse
    },
  };
});
isleList.addEventListener('click', (e) => {
  const a = e.target.closest('button')?.dataset.a;
  if (a === 'add') return cfg.pomo.length < MAX_SESS && window.zik.set({ pomo: [...cfg.pomo, { ...cfg.pomo.at(-1) }] });
  if (a !== 'set') return;
  const r = isle.getBoundingClientRect();
  isleBig = false; setIsle(true); window.zik.panel('pomo');   // opens beside the (off-screen) mascot → move it under the island
  panel.style.left = r.left + r.width / 2 - panel.offsetWidth / 2 + 'px'; panel.style.top = r.top + 2.4 * cfg.lyricSize + 10 + 'px'; fitPanel();
});

let pos = 0, at = 0, playing = false, key = '', lines = null, cur = -2, heard = false;
let panel = null, over = false, thirsty = false;   // thirsty = water reminder open
let big = false, tw = 0;   // rage mode (grown + red); running size-tween rAF id
const now = () => pos + (playing ? (performance.now() - at) / 1000 : 0) + cfg.offset;
const bpm = () => (heard && cfg.beat ? 0 : 100);   // real beats from audio, else the mascot's internal 100 bpm
// singing forces the 'sing' mood and drives the mouth with lyric vowels, which hid the angry face while nagging about water →
// no singing while a reminder is open; every sing call goes through here
const resing = () => m.sing(!!key && playing && !thirsty, { bpm: bpm() });

function apply(c) {
  const fall = c.gravity && !cfg.gravity, wand = c.wander !== cfg.wander;
  cfg = c;
  if (!tw) m.setSize(big ? Math.max(300, c.size) : c.size);   // skip while a grow/shrink tween runs
  m.gravity(c.gravity); m.draggable(c.drag); m.follow(c.follow);
  if (wand) m.wander(c.wander);
  if (fall) m.drop();
  resing();
  zl.hidden = !c.lyrics; zl.classList.toggle('solo', !c.context); document.documentElement.style.setProperty('--ls', c.lyricSize + 'px'); setIsle(true); cur = -2;
  if (c.focusUntil !== focusAt) focus(focusAt = c.focusUntil);
  if (c.restUntil !== restAt) rest(restAt = c.restUntil);
  if (panel?.id === 'pWater') renderWater();
  if (panel?.id === 'pPomo') renderPomo();
}

// sessions run in order: focus₁ → rest₁ → focus₂ → rest₂ … ; after the last rest the mascot says it's all done
const sess = () => cfg.pomo[cfg.pomoIdx] || cfg.pomo.at(-1);   // idx can outlive a session deleted mid-run
const startFocus = (i) => window.zik.set({ pomoIdx: i, focusUntil: Date.now() + cfg.pomo[i].f * 60000, restUntil: 0 });
let restAt = 0, restT = 0;
function rest(until) {
  clearTimeout(restT); const l = until - Date.now();
  if (l > 0) restT = setTimeout(() => {
    if (cfg.pomoIdx + 1 < cfg.pomo.length) return startFocus(cfg.pomoIdx + 1);
    window.zik.set({ restUntil: 0 }); m.wake(); m.jump(); say('timer', 'Semua sesi selesai! Hebat~', 6000);
  }, l);
}
function renderPomo() {
  const f = cfg.focusUntil - Date.now(), r = cfg.restUntil - Date.now(), n = cfg.pomo.length, of = n > 1 ? ` · ${cfg.pomoIdx + 1}/${n}` : '';
  $('pTime').textContent = mmss(f > 0 ? f : r > 0 ? r : cfg.pomo[0].f * 60000);
  $('pState').textContent = f > 0 ? 'Fokus' + of : r > 0 ? 'Istirahat' + of : 'Siap';
  $('pGoT').textContent = f > 0 || r > 0 ? 'Hentikan' : 'Mulai fokus';
}
const num = (t) => clampN(Math.round(+t.value) || +t.min, +t.min, +t.max);   // number input → clamped int
function renderSets() {
  $('pSets').replaceChildren(...cfg.pomo.map((p, i) => {
    const row = document.createElement('label');
    row.innerHTML = `<span>Sesi ${i + 1}</span><span><input type="number" min="1" max="180" aria-label="Fokus sesi ${i + 1} (menit)" value="${p.f}"> /
      <input type="number" min="1" max="60" aria-label="Istirahat sesi ${i + 1} (menit)" value="${p.r}"> mnt${cfg.pomo.length > 1 ? `<button class="x" type="button" aria-label="Hapus sesi ${i + 1}">${ICON.close}</button>` : ''}</span>`;
    const [fi, ri] = row.querySelectorAll('input'), x = row.querySelector('button');
    fi.onchange = ri.onchange = () => window.zik.set({ pomo: cfg.pomo.map((q, j) => (j === i ? { f: num(fi), r: num(ri) } : q)) });
    if (x) x.onclick = (e) => { e.preventDefault(); window.zik.set({ pomo: cfg.pomo.filter((_, j) => j !== i) }); renderSets(); };
    return row;
  }));
  $('pAdd').hidden = cfg.pomo.length >= MAX_SESS;
  fitPanel();   // rows added/removed → keep the panel on-screen
}
const MAX_SESS = 5;
function fitPanel() {
  if (!panel) return;
  panel.style.left = clampN(panel.offsetLeft, 8, innerWidth - panel.offsetWidth - 8) + 'px';
  panel.style.top = clampN(panel.offsetTop, 8, innerHeight - panel.offsetHeight - 8) + 'px';
}

// pomodoro: focus = mascot slips off the nearest screen edge (CSS `translate`, separate from mascot.js's `transform`);
// time's up (or stopped) = peeks half its body back in, howls, then comes out
let focusAt = 0, focusT = 0, hid = null;   // hid = { right, cx, w } while hiding
const slide = (dx, ms) => { m.el.style.transition = `translate ${ms}ms cubic-bezier(.5,0,.3,1)`; m.el.style.translate = dx ? `${dx}px 0` : ''; };
function focus(until) {
  clearTimeout(focusT);
  const left = until - Date.now();
  if (left > 0) {
    focusT = setTimeout(() => window.zik.set({ focusUntil: 0, restUntil: Date.now() + sess().r * 60000 }), left);
    if (hid) return;
    const r = m.el.getBoundingClientRect(), h = hid = { right: r.left + r.width / 2 > innerWidth / 2, cx: r.left + r.width / 2, w: r.width };
    const n = cfg.pomo.length;
    m.wander(false); m.wake(); m.lookDir(h.right ? 1 : -1, 0); m.say(`${n > 1 ? `Sesi ${cfg.pomoIdx + 1}/${n}: ` : ''}fokus ${sess().f} mnt. Aku sembunyi dulu~`, 2200);
    setTimeout(() => { if (hid !== h) return; h.gone = true; slide(h.right ? innerWidth - h.cx + h.w / 2 + 20 : -(h.cx + h.w / 2 + 20), 700); setIsle(true); }, 1900);
  } else if (hid) {
    const h = hid; hid = null; setIsle();
    m.wake();   // wake before peeking in, not after — it dozed off while hidden
    slide(h.right ? innerWidth - h.cx : -h.cx, 900);
    setTimeout(() => { if (hid) return; m.mood('happy', 2500); m.lookDir(h.right ? -1 : 1, 0); m.say('awwoooo', 2500); }, 900);
    setTimeout(() => { if (hid) return; slide(0, 700); m.wander(cfg.wander); }, 3600);
  }
}

function show(L) {
  lines = L; cur = -2; setIsle();
  inner.replaceChildren(...(L || []).map((l) => {
    const p = document.createElement('p'), s = document.createElement('span');
    if (l.text) s.textContent = l.text; else s.innerHTML = ICON.note.repeat(3);   // instrumental break: three bouncing notes
    p.append(s); return p;
  }));
}

setInterval(function tick() {   // 10×/s is plenty for line changes; per-frame layout reads cost CPU
  if (panel?.id === 'pPomo') renderPomo();   // live countdown
  setIsle();   // clock / title expiry; no-op when nothing changed
  placeBubble();   // follows drag / wander / peek
  const r = m.el.getBoundingClientRect(), cx = r.left + r.width / 2;   // keep the 340px stack on-screen near edges
  zl.style.marginLeft = -170 + Math.min(0, innerWidth - 8 - (cx + 170)) + Math.max(0, 8 - (cx - 170)) + 'px';
  if (!lines || !lines.length || zl.hidden) return;
  const t = now(); let i = -1;
  while (i + 1 < lines.length && lines[i + 1].t <= t) i++;
  if (i === cur) return;
  cur = i; setIsle();
  const c = Math.max(i, 0), ps = inner.children;
  for (let j = 0; j < ps.length; j++) ps[j].className = j === i ? 'on' : (Math.abs(j - c) === 1 || (i < 0 && j === 0)) ? 'near' : '';
  const p = ps[c];
  inner.style.transform = `translateY(${zl.clientHeight / 2 - p.offsetTop - p.offsetHeight / 2}px)`;
}, 100);

window.zik.onSettings(apply);
apply(cfg);

window.zik.onMedia(async (s) => {
  const was = playing;
  pos = s.pos || 0; at = performance.now(); playing = !!s.playing;
  if (key && was !== playing) resing();   // music on = awake + singing, lyrics or not

  const k = s.title ? `${s.title}|${s.artist}` : '';
  if (k === key) return;
  key = k; show(null); m.lyrics(null); m.sing(false);
  if (!k) return m.mood('sleepy');
  m.mood('surprised'); say('note', s.title, 2500);
  msg = { icon: ICON.note, text: s.artist ? `${s.title} — ${s.artist}` : s.title, until: performance.now() + 4000 }; setIsle();   // island (focus mode)
  const lrc = await window.zik.lyrics(s);
  if (k !== key) return;                       // song changed while fetching
  resing();
  if (!lrc) return say('noLyrics', 'Liriknya nggak ketemu', 3000);
  const L = Mascot.parseLRC(lrc);
  show(L); m.lyrics(L, now);                   // m.lyrics still drives mouth vowel shapes
});

// tempo + energy from what the speakers play: src-tauri analyses WASAPI loopback and sends [loudness, beat]
// (~15 Hz, plus right away on a beat; beat = hop strength from song energy, 0 = none). No events (macOS) → internal tempo.
window.zik.onAudio(([r, beat]) => {
  if (!heard) { heard = true; console.info('ZIK: audio loopback on'); resing(); }
  if (!playing || !cfg.beat) return;
  m.level(Math.min(1, r * 5));
  if (beat) m.beat(beat);
});

// ---------- panels: squircle cards beside the mascot (size, water). Esc / close button / click outside closes ----------
const $ = (id) => document.getElementById(id);
function openPanel(el) {
  closePanel(); panel = el; el.hidden = false;
  const r = m.el.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  const left = r.left - w - 12 >= 8 ? r.left - w - 12 : r.right + 12;
  el.style.left = Math.max(8, Math.min(innerWidth - w - 8, left)) + 'px';
  el.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2)) + 'px';
  window.zik.hover(over = true);
}
function closePanel() { if (!panel) return; panel.hidden = true; panel = null; window.zik.hover(over = false); }
document.querySelectorAll('.zp .x').forEach((b) => (b.onclick = closePanel));
// panels can be dragged by their header
document.querySelectorAll('.zp header').forEach((hd) => drag(hd, () => {
  const p = hd.parentElement, l = p.offsetLeft, t = p.offsetTop;
  return { move: (dx, dy) => { p.style.left = clampN(l + dx, 8, innerWidth - p.offsetWidth - 8) + 'px'; p.style.top = clampN(t + dy, 8, innerHeight - p.offsetHeight - 8) + 'px'; } };
}));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
addEventListener('pointerdown', (e) => { if (panel && !panel.contains(e.target) && !m.el.contains(e.target)) closePanel(); });
addEventListener('blur', closePanel);
window.zik.onPanel((name) => {
  if (name === 'size') { $('rng').value = cfg.size; $('rngOut').value = cfg.size + ' px'; $('rngL').value = cfg.lyricSize; $('rngLOut').value = cfg.lyricSize + ' px'; }
  if (name === 'water') renderWater();
  if (name === 'pomo') { renderPomo(); renderSets(); }
  openPanel($({ size: 'pSize', water: 'pWater', pomo: 'pPomo' }[name]));
});

// pomodoro panel
$('pGo').onclick = () => (cfg.focusUntil > Date.now() || cfg.restUntil > Date.now() ? window.zik.set({ focusUntil: 0, restUntil: 0 }) : startFocus(0));
$('pAdd').onclick = () => { if (cfg.pomo.length < MAX_SESS) window.zik.set({ pomo: [...cfg.pomo, { ...cfg.pomo.at(-1) }] }); renderSets(); };

// size: live preview while dragging, saved on release
$('rng').oninput = (e) => { m.setSize(+e.target.value); $('rngOut').value = e.target.value + ' px'; };
$('rng').onchange = (e) => window.zik.set({ size: +e.target.value });
$('rngL').oninput = (e) => { document.documentElement.style.setProperty('--ls', e.target.value + 'px'); $('rngLOut').value = e.target.value + ' px'; setIsle(); };
$('rngL').onchange = (e) => window.zik.set({ lyricSize: +e.target.value });

// water reminder
// offered glass: slides out from behind the mascot toward the screen center; tapping it (= tapping the mascot) drinks
const glass = document.createElement('div'); glass.className = 'zg'; glass.hidden = true;
glass.innerHTML = /* glass-svg */ `<svg viewBox="0 0 60 80" aria-label="Gelas air">
  <defs><clipPath id="zg-c"><path d="M9 7H51L45.5 72Q45 77 40 77H20Q15 77 14.5 72Z"/></clipPath>
  <linearGradient id="zg-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#2f7fe0"/></linearGradient></defs>
  <g clip-path="url(#zg-c)"><rect width="60" height="80" fill="#eef6ff" opacity=".75"/>
    <g class="lv"><path class="wv" d="M0 26Q7.5 22 15 26T30 26T45 26T60 26T75 26T90 26T105 26T120 26V80H0Z" fill="url(#zg-w)"/></g>
    <rect x="15" y="12" width="4.5" height="54" rx="2.25" fill="#fff" opacity=".7"/></g>
  <path d="M9 7H51L45.5 72Q45 77 40 77H20Q15 77 14.5 72Z" fill="none" stroke="#a9c9ee" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M8 7H52" stroke="#a9c9ee" stroke-width="3.5" stroke-linecap="round"/></svg>` /* /glass-svg */;
m.el.appendChild(glass);
function offerGlass() {
  const r = m.el.getBoundingClientRect(), left = r.left + r.width / 2 > innerWidth / 2;
  glass.className = 'zg ' + (left ? 'l' : 'r'); glass.hidden = false;
  m.lookDir(left ? -1 : 1, .5);
  clearTimeout(angryT); nag(10000);
}
// ignored → angry, nags again with the gap growing 3s each time (10s, 13s, 16s…) until the glass is taken
// petted while thirsty: overrides the 'love' mascot.js just set (same frame, so it never shows), glances away, grumbles,
// then goes back to being angry — the pet doesn't count as drinking
const SULKS = ['Hmph! Minum dulu baru boleh elus.', 'Jangan rayu aku, minum dulu!', 'Dielus juga nggak bikin kamu terhidrasi, tau!'];
let sulkT = 0;
function sulk() {
  if (!thirsty) return;
  m.mood('sulky', 2600); m.lookDir(Math.random() < .5 ? -1 : 1, .25);
  say('droplet', SULKS[Math.floor(Math.random() * SULKS.length)], 2400);
  clearTimeout(sulkT); sulkT = setTimeout(() => thirsty && m.mood('angry', 3600000), 2600);
}
const NAGS = ['Hei, minum dulu!', 'Ayo diminum airnya!', 'Masih belum minum juga?', 'Minum dulu, jangan sampai dehidrasi!'];
function nag(ms, n = 0) {
  angryT = setTimeout(() => {
    if (!thirsty) return;
    m.mood('angry', 3600000); m.shake(); say('droplet', NAGS[n], 3000);
    if (n + 1 < NAGS.length) nag(ms + 3000, n + 1);
    else angryT = setTimeout(() => thirsty && rage(true), 3000);   // 4 nags ignored → grows to 300px and turns red
  }, ms);
}
function tweenSize(to, ms = 800) {
  cancelAnimationFrame(tw); const from = m.el.offsetWidth, t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms); m.setSize(Math.round(from + (to - from) * (1 - (1 - k) ** 3))); tw = k < 1 ? requestAnimationFrame(step) : 0; };
  tw = requestAnimationFrame(step);
}
function rage(on) {
  big = on; m.el.classList.toggle('red', on);
  tweenSize(on ? Math.max(300, cfg.size) : cfg.size);
  if (on) { m.shake(); m.jump(); }
}
let angryT = 0;
function takeGlass() {
  if (glass.hidden || glass.classList.contains('drink')) return;
  clearTimeout(angryT); m.mood('happy', 1500);   // also ends the angry face
  if (big) rage(false);
  glass.classList.add('drink');
  setTimeout(() => { glass.hidden = true; glass.classList.remove('drink'); }, 1300);
}
const day = (d = new Date()) => d.toLocaleDateString('sv');   // YYYY-MM-DD, local time
const drunk = () => cfg.waterLog[day()] || 0;
let remindAt = Date.now();
function drink(ml) {
  const k = day(); thirsty = false; remindAt = Date.now();
  if (ml > 0) takeGlass();
  setTimeout(resing, 1500);   // back to singing after the happy "thanks" face
  window.zik.set({ waterLog: { ...cfg.waterLog, [k]: Math.max(0, (cfg.waterLog[k] || 0) + ml) }, water: { ...cfg.water, last: Date.now() } });
}
function renderWater() {
  const w = cfg.water, n = drunk(), p = Math.min(1, n / w.goal);
  $('wNow').textContent = n.toLocaleString('id'); $('wGoal').textContent = w.goal.toLocaleString('id');
  $('wPct').textContent = Math.round(p * 100) + '%'; $('wBar').style.width = p * 100 + '%';
  $('wPlusT').textContent = `${w.cup} ml`; $('wMinus').setAttribute('aria-label', `Kurangi ${w.cup} ml`);
  $('wWeek').replaceChildren(...Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const v = cfg.waterLog[day(d)] || 0, c = document.createElement('div');
    c.title = `${v.toLocaleString('id')} ml`; if (i === 6) c.className = 'today';
    c.innerHTML = `<i style="height:${Math.max(4, Math.min(100, v / w.goal * 100))}%"></i><span>${d.toLocaleDateString('id', { weekday: 'short' }).slice(0, 3)}</span>`;
    return c;
  }));
  for (const [id, k] of FIELDS) if (document.activeElement !== $(id)) $(id).value = w[k];
  $('fOn').checked = w.on;
}
const FIELDS = [['fCup', 'cup'], ['fGoal', 'goal'], ['fEvery', 'every'], ['fFrom', 'from'], ['fTo', 'to']];
const saveW = (k, v) => window.zik.set({ water: { ...cfg.water, [k]: v } });
for (const [id, k] of FIELDS) $(id).onchange = (e) => {
  const t = e.target;
  saveW(k, t.type === 'number' ? num(t) : t.value || cfg.water[k]);
};
$('fOn').onchange = (e) => saveW('on', e.target.checked);
$('wPlus').onclick = () => drink(cfg.water.cup);
$('wMinus').onclick = () => drink(-cfg.water.cup);

setInterval(() => {
  const w = cfg.water, hm = new Date().toTimeString().slice(0, 5);
  if (thirsty || hid || !w.on || hm < w.from || hm >= w.to || drunk() >= w.goal) return;   // glass still offered → let the nag/rage run, don't restart it
  if (Date.now() - Math.max(w.last || 0, remindAt) < w.every * 60000) return;
  remindAt = Date.now(); thirsty = true; resing();   // stop singing so the nag/angry faces show
  m.wake(); m.mood('happy', 3000); m.jump(); offerGlass();
  say('droplet', `Waktunya minum! Ketuk gelasnya kalau sudah (${(w.goal - drunk()).toLocaleString('id')} ml lagi)`, 7000);
}, 5000);

// window is click-through except over the mascot or an open panel (main toggles setIgnoreMouseEvents)
addEventListener('pointermove', (e) => {
  const h = isle.contains(e.target);   // hovering the island swaps in the pomodoro clock; leaving collapses it
  if (h !== isleHov) { isleHov = h; if (!h) isleBig = false; setIsle(); }
  if (panel) return;
  const o = m.el.contains(e.target) || h;   // capture the mouse over the island too, so it can be clicked and dragged
  if (o !== over) window.zik.hover(over = o);
});
addEventListener('contextmenu', (e) => { e.preventDefault(); window.zik.menu(); });
