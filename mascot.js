/*!
 * Mascot "Bulu" — maskot bulu biru (SVG + JS, tanpa dependensi)
 *
 *   const m = Mascot.create({ size: 220 });
 *   m.mood('happy');            // neutral happy sad angry surprised sleepy sleep love wink
 *   m.jump(); m.spin(); m.shake(); m.wiggle();
 *   m.say('Halo!', 2500);       // gelembung bicara
 *   m.moveTo(300, 500);         // melompat-lompat ke titik (koordinat layar, posisi kaki)
 *   m.look(x, y);               // mata melihat ke titik layar
 *   m.sleep(); m.wake();
 *   m.sing(true, { bpm: 100 }); // mode menyanyi: goyang, mulut terbuka, not musik (m.sing(false) berhenti)
 *   m.level(0..1); m.beat();    // isi dari audio: bukaan mulut dan hentakan irama (pakai { bpm: 0 } agar tak ada irama internal)
 *   m.vowel('a'|'i'|'u'|'e'|'o', ms); m.vowels('aiueo');   // bentuk mulut vokal (otomatis dari lirik saat menyanyi)
 *   m.lyric('teks');            // tampilkan satu baris lirik ('' = sembunyikan)
 *   m.lyrics(Mascot.parseLRC(lrc), () => detikSaatIni);   // lirik tersinkron (format .lrc)
 *   m.gravity(true);            // lepas setelah diseret = jatuh, memantul, bisa dilempar
 *   m.drop();                   // jatuhkan ke lantai
 *   m.wander(true);             // jalan-jalan acak
 *   m.destroy();
 *
 *   m.dizzy(ms);                // pusing: mata spiral, bintang mengorbit, oleng, mulut bergelombang (otomatis saat dilempar kencang)
 *   usap kepala bolak-balik (tanpa klik) = love
 *
 * Opsi: size, container (elemen/selector), floating (true = melayang di layar, false = ikut
 * alur halaman), x, y (posisi kaki awal), followPointer, idle, draggable, shadow, gravity, floor (jarak lantai dari bawah layar, px), sleepAfter (ms),
 * tapLines (array kalimat), onTap(m).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Mascot = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- geometri (satuan viewBox 400 x 380) ----
  const CX = 200, CY = 190, RX = 160, RY = 138;   // badan
  const EY = 222, EDX = 58, ER = 40, ERX = 25, LR = 53;   // mata oval tegak (ER = setengah tinggi, ERX = setengah lebar, LR = area kelopak)
  const FEET = 336, VH = 380, TAU = Math.PI * 2, RW = 130, RH = 150;   // RW/RH = kotak bulu penutup tiap mata
  const NS = 'http://www.w3.org/2000/svg';
  const G = 2600;                                  // gravitasi px/s^2 (untuk size 220)

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const n2 = (n) => Math.round(n * 100) / 100;
  const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const spr = (x, k, c) => ({ x, v: 0, t: x, k, c });
  const stepSpr = (s, dt) => { s.v += (s.k * (s.t - s.x) - s.c * s.v) * dt; s.x += s.v * dt; };

  // ---- ekspresi: tL/tR kelopak atas, bL/bR kelopak bawah (senyum mata), tilt miring alis ----
  const BASE = { tL: 0, tR: 0, bL: 0, bR: 0, tilt: 0, iris: 1, pupil: 1, love: 0, mA: 0, mC: .6, mO: 0, mW: 1, blush: 0, zzz: 0, arc: 1, dizzy: 0, pain: 0 };
  const MOODS = {
    neutral: {},
    happy: { bL: .5, bR: .5, pupil: 1.05, mA: 1, mC: 1, mO: .2, blush: .5 },
    sad: { tL: .2, tR: .2, tilt: .5, pupil: 1.15, mA: 1, mC: -.9, mW: .8 },
    angry: { tL: .22, tR: .22, tilt: -.55, pupil: .92, mA: 1, mC: -.5, mW: .9 },
    surprised: { pupil: 1.18, mA: 1, mC: 0, mO: .9, mW: .5 },
    sleepy: { tL: .55, tR: .55, tilt: .12 },
    sleep: { tL: 1, tR: 1, mA: .8, mC: .3, mO: .12, mW: .7, zzz: 1 },
    love: { bL: .35, bR: .35, love: 1, mA: 1, mC: 1, mO: .3, blush: .9 },
    sing: { tL: 1, tR: 1, arc: -1, mA: 1, mC: .5, mO: .4, mW: 1.15, blush: .6 },
    hurt: { tL: 1, tR: 1, pain: 1, mA: 1, mC: -.7, mO: .35, mW: 1.15 },   // terpantul: mata > <, meringis
    refresh: { tL: 1, tR: 1, arc: 1, mA: 1, mC: .2, mW: .7 },               // geleng-geleng sadar dari pusing
    dizzy: { dizzy: 1, mA: 1, mC: 0, mO: 0, mW: 1.1 },
    wink: { tR: 1, bL: .4, mA: 1, mC: 1, mO: .2, blush: .4, arc: -1 },
  };

  const VOWELS = {
    a: { w: 1.05, o: 1.25, r: .55, c: .35 },    // A: lebar & terbuka tinggi
    i: { w: 1.3, o: .22, r: .1, c: .6 },      // I: melebar tipis
    u: { w: .42, o: .42, r: 1, c: 0 },         // U: bibir mengerucut, bulat kecil
    e: { w: 1.15, o: .5, r: .25, c: .2 },     // E: setengah terbuka, melebar
    o: { w: .82, o: 1.15, r: 1, c: 0 },        // O: bulat terbuka
  };
  // pusing: spiral Archimedes (3 putaran, satuan lingkaran r=1 → diskalakan ke oval mata) + bintang 5 sudut
  const SPIRAL = (() => { let d = ''; for (let a = 0; a <= TAU * 3; a += .2) { const r = a / (TAU * 3); d += (d ? 'L' : 'M') + n2(Math.cos(a) * r) + ' ' + n2(Math.sin(a) * r); } return d; })();
  const STAR = Array.from({ length: 10 }, (_, j) => { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 8 : 19; return (j ? 'L' : 'M') + n2(Math.cos(a) * r) + ' ' + n2(Math.sin(a) * r); }).join('') + 'Z';
  const vowelsOf = (t) => { const v = String(t).toLowerCase().match(/[aiueo]/g); return v && v.length ? v : ['a', 'i', 'u', 'e', 'o']; };

  const CSS = '.mascot-bulu{position:fixed;left:0;top:0;z-index:2147483000;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;cursor:grab;will-change:transform}' +
    '.mascot-bulu.inline{position:relative;display:inline-block}.mascot-bulu.grabbing{cursor:grabbing}' +
    '.mascot-bulu svg{display:block;width:100%;height:100%;overflow:visible}' +
    '.mb-bubble{position:absolute;left:50%;bottom:88%;transform:translate(-50%,6px) scale(.8);transform-origin:50% 100%;opacity:0;transition:opacity .18s,transform .22s cubic-bezier(.3,1.6,.5,1);' +
    'background:#fff;color:#12306b;font:600 14px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:8px 12px;border-radius:14px;box-shadow:0 4px 16px rgba(20,60,140,.2);width:max-content;max-width:220px;text-align:center;pointer-events:none}' +
    '.mb-bubble:after{content:"";position:absolute;left:50%;top:100%;margin-left:-7px;border:7px solid transparent;border-top-color:#fff}' +
    '.mb-bubble.show{opacity:1;transform:translate(-50%,-2px) scale(1)}' +
    '.mb-lyric{position:absolute;left:50%;bottom:93%;transform:translate(-50%,6px) scale(.92);opacity:0;transition:opacity .2s,transform .25s cubic-bezier(.3,1.5,.5,1);background:rgba(16,28,60,.92);color:#fff;font:700 16px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:9px 14px;border-radius:16px;width:max-content;max-width:min(300px,80vw);text-align:center;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.2)}' +
    '.mb-lyric:after{content:"";position:absolute;left:50%;top:100%;margin-left:-7px;border:7px solid transparent;border-top-color:rgba(16,28,60,.92)}' +
    '.mb-lyric.show{opacity:1;transform:translate(-50%,-2px) scale(1)}.mb-lyric.swap{animation:mbswap .22s}@keyframes mbswap{from{opacity:.3;transform:translate(-50%,4px) scale(.93)}}' +
    '.mascot-bulu.saying .mb-lyric{opacity:0}';
  let cssDone = false, uidN = 0;


  // ---- tekstur bulu: ribuan helai runcing berkelompok, digambar sekali ke canvas ----
  let furCache = null;
  function furImage() {
    if (furCache) return furCache;
    const K = 2.5, cv = document.createElement('canvas'); cv.width = 400 * K; cv.height = VH * K;
    let c = cv.getContext('2d'); c.scale(K, K);
    const cvE = document.createElement('canvas'); cvE.width = cv.width; cvE.height = cv.height;
    const cM = c, cE = cvE.getContext('2d'); cE.scale(K, K);
    const r = rnd(7);
    const noise = (x, y) => Math.sin(x * .021 + 1.3) * Math.cos(y * .018) * .6 + Math.sin((x + y) * .013 + 2) * .4;
    const shade = (x, y) => clamp(.5 - ((x - CX) / RX * .4 + (y - CY) / RY * .6) * .55, 0, 1);   // cahaya dari kiri atas
    const hsl = (x, y, dl, a) => `hsla(${207 + r() * 6},${90 + r() * 8}%,${clamp(40 + 26 * shade(x, y) + dl + (r() - .5) * 8, 16, 84)}%,${a})`;
    const inside = () => { const a = r() * TAU, d = Math.sqrt(r()) * .97; return [CX + RX * d * Math.cos(a), CY + RY * d * Math.sin(a)]; };
    const dirAt = (x, y) => { const vx = x - CX, vy = y - CY + 30, l = Math.hypot(vx, vy) || 1; return Math.atan2(vy / l + .3, vx / l) + noise(x, y) * .55; };
    const fit = (x, y, ang, len, maxD) => { for (let i = 0; i < 4; i++) { if (Math.hypot((x + Math.cos(ang) * len - CX) / RX, (y + Math.sin(ang) * len - CY) / RY) <= maxD) break; len *= .65; } return len; };
    function hair(x, y, ang, len, w, bend, dl, al) {
      const ca = Math.cos(ang), sa = Math.sin(ang), ex = x + ca * len, ey = y + sa * len;
      const mx = x + ca * len * .5 - sa * bend, my = y + sa * len * .5 + ca * bend, px = -sa * w / 2, py = ca * w / 2;
      const g = c.createLinearGradient(x, y, ex, ey);
      g.addColorStop(0, hsl(x, y, dl - 7, 0)); g.addColorStop(.35, hsl(x + ca * len * .35, y + sa * len * .35, dl - 3, al)); g.addColorStop(1, hsl(ex, ey, dl + 7, al * .75));
      c.fillStyle = g; c.beginPath(); c.moveTo(x + px, y + py);
      c.quadraticCurveTo(mx + px * .6, my + py * .6, ex, ey); c.quadraticCurveTo(mx - px * .6, my - py * .6, x - px, y - py); c.fill();
    }
    const edge = (rho0, rho1) => { const a = r() * TAU, d = rho0 + r() * (rho1 - rho0), x = CX + RX * d * Math.cos(a), y = CY + RY * d * Math.sin(a); return [x, y, dirAt(x, y)]; };
    const clumps = (n, per, lenA, lenB, wA, wB, dl, al, bias) => {
      for (let i = 0; i < n; i++) {
        let o = inside(); if (bias) { let t = 0; while (shade(o[0], o[1]) < .4 && t++ < 6) o = inside(); }
        const a0 = dirAt(o[0], o[1]), Lc = lenA + r() * (lenB - lenA), bend = (r() - .5) * 24;
        for (let k = 0; k < per; k++) {
          const off = (r() - .5) * 9, ang = a0 + (r() - .5) * .11, x = o[0] - Math.sin(a0) * off, y = o[1] + Math.cos(a0) * off;
          hair(x, y, ang, fit(x, y, ang, Lc * (.8 + r() * .3), 1.02), wA + r() * (wB - wA), bend, dl, al);
        }
      }
    };
    const bg = c.createRadialGradient(195, 150, 10, 200, 190, 190);
    bg.addColorStop(0, '#4aa3f5'); bg.addColorStop(1, '#1b6dd2');
    c.fillStyle = bg; c.beginPath(); c.ellipse(CX, CY, RX * .95, RY * .95, 0, 0, TAU); c.fill();
    c = cE;
    for (let i = 0; i < 1700; i++) { const e = edge(.88, .99); hair(e[0], e[1], e[2] + (r() - .5) * .7, fit(e[0], e[1], e[2], 12 + r() * 14, 1.13), 1.6 + r() * .8, (r() - .5) * 16, -2, 1); }
    c = cM;
    for (let i = 0; i < 3200; i++) { const p = inside(), a = dirAt(p[0], p[1]); hair(p[0], p[1], a, fit(p[0], p[1], a, 26 + r() * 20, 1), 2.4 + r() * .9, (r() - .5) * 18, -6, 1); }
    clumps(700, 8, 20, 38, 1.6, 2.6, 0, 1, false);
    clumps(520, 7, 16, 28, 1.4, 2.2, 8, .9, true);
    for (let i = 0; i < 600; i++) { const p = inside(), a = dirAt(p[0], p[1]); hair(p[0], p[1], a + (r() - .5) * .3, fit(p[0], p[1], a, 12 + r() * 8, 1.02), 1.2, (r() - .5) * 6, 12, .5); }
    c = cE;
    for (let i = 0; i < 260; i++) { const e = edge(.85, 1), a = e[2] + (r() - .5) * 1.1; hair(e[0], e[1], a, fit(e[0], e[1], a, 18 + r() * 20, 1.2), 1.1 + r() * .5, (r() - .5) * 10, 4, .55); }
    c = cM;
    return (furCache = { fur: cv.toDataURL('image/png'), edge: cvE.toDataURL('image/png') });
  }

  function create(options) {
    const o = Object.assign({ size: 220, container: null, floating: true, x: null, y: null, followPointer: true, idle: true,
      draggable: true, shadow: true, gravity: true, floor: 24, sleepAfter: 0, tapLines: null, onTap: null }, options || {});
    if (!cssDone) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); cssDone = true; }
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) o.idle = false;

    const U = 'mb' + (++uidN);
    const host = typeof o.container === 'string' ? document.querySelector(o.container) : (o.container || document.body);
    const wrap = document.createElement('div');
    wrap.className = 'mascot-bulu' + (o.floating ? '' : ' inline');
    wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', 'Maskot');

    // ---------- SVG ----------
    const INK = '#0c0c10';   // hitam doff
    const CRX = ERX + 9, CRY = ER + 9;   // rongga (cekungan) tempat mata tertanam
    const ell = (x, y, rx, ry) => `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
    const eyeSvg = (i, cx) =>
      // tepi kanan-bawah rongga menangkap cahaya (cekungan terlihat ditekan ke dalam)
      `<ellipse cx="${cx + 2.5}" cy="${EY + 3.5}" rx="${CRX}" ry="${CRY}" fill="#bfe0ff" opacity=".6" filter="url(#${U}-b2)"/>` +
      `<ellipse cx="${cx}" cy="${EY}" rx="${CRX}" ry="${CRY}" fill="url(#${U}-fp)"/>` +
      `<g class="eye" clip-path="url(#${U}-c${i})">` +
      `<g class="ir"><ellipse class="ic" cx="${cx}" cy="${EY}" rx="${ERX}" ry="${ER}" fill="url(#${U}-cl)" filter="url(#${U}-b1)"/>` +
      `<g clip-path="url(#${U}-ie${i})">` +
      `<ellipse cx="${cx - ERX * .28}" cy="${EY - ER * .42}" rx="${ERX * .55}" ry="${ER * .3}" fill="#fff" opacity=".09" filter="url(#${U}-b3)"/>` +
      `<ellipse cx="${cx + ERX * .1}" cy="${EY + ER * .8}" rx="${ERX * .7}" ry="${ER * .2}" fill="#6a97ff" opacity=".22" filter="url(#${U}-b3)"/></g>` +
      `<path class="ht" d="M0 9C-20-4-13-20 0-9C13-20 20-4 0 9Z" fill="#ff5c8a" opacity="0"/></g>` +
      `<path class="lt" fill="url(#${U}-fp)"/><ellipse class="lb" fill="url(#${U}-fp)" opacity="0"/></g>` +
      // dasar rongga sedikit lebih gelap + bayangan dalam di tepi kiri-atas
      `<g clip-path="url(#${U}-c${i})"><ellipse cx="${cx}" cy="${EY}" rx="${CRX}" ry="${CRY}" fill="#0b3c96" opacity=".16"/>` +
      `<path fill="#0a3585" opacity=".62" fill-rule="evenodd" filter="url(#${U}-b4)" d="M-60 -60H460V440H-60Z${ell(cx + 3, EY + 4, CRX, CRY)}"/></g>` +
      `<path class="ar" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" opacity="0"/>` +
      `<g clip-path="url(#${U}-c${i})"><g class="sp" opacity="0"><ellipse cx="${cx}" cy="${EY}" rx="${ERX + 2}" ry="${ER + 2}" fill="#fff"/>` +
      `<path class="spp" d="${SPIRAL}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g></g>`;

    wrap.innerHTML =
      `<svg viewBox="0 0 400 ${VH}" xmlns="http://www.w3.org/2000/svg"><defs>` +
      `<pattern id="${U}-fp" patternUnits="userSpaceOnUse" width="400" height="${VH}"><image class="fpi" width="400" height="${VH}"/></pattern>` +
      `<filter id="${U}-b6" x="-40%" y="-60%" width="180%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>` +
      `<filter id="${U}-b1"><feGaussianBlur stdDeviation=".9"/></filter>` +
      `<filter id="${U}-b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>` +
      `<filter id="${U}-b4" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.5"/></filter>` +
      `<filter id="${U}-b3" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>` +
      `<radialGradient id="${U}-cl" cx=".38" cy=".28" r=".85"><stop offset="0" stop-color="#32323b"/><stop offset=".5" stop-color="#17171c"/><stop offset="1" stop-color="#060609"/></radialGradient>` +
      `<clipPath id="${U}-ie0"><ellipse class="ie" cx="${CX - EDX}" cy="${EY}" rx="${ERX}" ry="${ER}"/></clipPath><clipPath id="${U}-ie1"><ellipse class="ie" cx="${CX + EDX}" cy="${EY}" rx="${ERX}" ry="${ER}"/></clipPath>` +
      `<clipPath id="${U}-c0"><ellipse cx="${CX - EDX}" cy="${EY}" rx="${ERX + 9}" ry="${ER + 9}"/></clipPath><clipPath id="${U}-c1"><ellipse cx="${CX + EDX}" cy="${EY}" rx="${ERX + 9}" ry="${ER + 9}"/></clipPath><clipPath id="${U}-mc"><path class="mc"/></clipPath></defs>` +
      (o.shadow ? `<ellipse class="sh" cx="200" cy="343" rx="118" ry="13" fill="#0a2a66" opacity=".22" filter="url(#${U}-b6)"/>` : '') +
      `<g class="body">` +
      `<path class="f0" fill="#2f86e6"/><path class="f1" fill="#4aa4fa"/><path class="f2" fill="#7cc4ff"/><image class="fedge" x="0" y="0" width="400" height="${VH}"/><image class="fimg" x="0" y="0" width="400" height="${VH}"/>` +
      `<ellipse class="ch" cx="100" cy="274" rx="20" ry="11" fill="#ff8fc7" opacity="0" filter="url(#${U}-b6)"/><ellipse class="ch" cx="300" cy="274" rx="20" ry="11" fill="#ff8fc7" opacity="0" filter="url(#${U}-b6)"/>` +
      eyeSvg(0, CX - EDX) + eyeSvg(1, CX + EDX) +
      `<path class="mo" fill="${INK}" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0"/><ellipse class="tg" fill="#ff6f91" clip-path="url(#${U}-mc)" opacity="0"/>` +
      `<g class="st" opacity="0">${('<path d="' + STAR + '" fill="#ffd23f" stroke="#e8a600" stroke-width="2" stroke-linejoin="round"/>').repeat(5)}</g>` +
      `</g><g class="nt"></g><g class="zz" fill="#7aa8ff" font-family="system-ui,sans-serif" font-weight="800" opacity="0"><text x="292" y="110" font-size="28">z</text><text x="316" y="84" font-size="22">z</text><text x="334" y="62" font-size="16">z</text></g></svg>` +
      '<div class="mb-bubble"></div><div class="mb-lyric"></div>';
    host.appendChild(wrap);

    const $ = (s, p) => (p || wrap).querySelector(s);
    const svg = $('svg'), bodyG = $('.body'), shadow = $('.sh'), bubble = $('.mb-bubble'), zz = $('.zz'), mouth = $('.mo'), tongue = $('.tg'), mclip = $('.mc'), lyr = $('.mb-lyric'), ntG = $('.nt'), fedge = $('.fedge');
    const P = [$('.f0'), $('.f1'), $('.f2')];
    const cheeks = wrap.querySelectorAll('.ch'), starG = $('.st'), stars = [...starG.children];
    const eyes = [0, 1].map((i) => {
      const g = wrap.querySelectorAll('.eye')[i];
      return { cx: CX + (i ? EDX : -EDX), side: i ? 1 : -1, ic: $('.ic', g), pp: $('.pp', g), ir: $('.ir', g), ht: $('.ht', g),
        ie: wrap.querySelectorAll('.ie')[i], lt: $('.lt', g), lb: $('.lb', g), ar: wrap.querySelectorAll('.ar')[i],
        sp: wrap.querySelectorAll('.sp')[i], spp: wrap.querySelectorAll('.spp')[i] };
    });

    // ---------- bulu ----------
    const r = rnd(11), FM = 220, fr = [];
    for (let j = 0; j < FM; j++) {
      const a = (j / FM) * TAU + (r() - .5) * .03, len = .05 + r() * r() * .15;
      fr.push({ a, len, curl: (r() - .5) * .1, ph: r() * TAU, w: .008 + r() * .007 + len * .03, c: j % 3, th: 0, om: 0,
        k: 70 + r() * 70, d: 3 + r() * 3, sens: .6 + len * 4 * (.7 + r() * .6), phi: (r() - .5) * 1.2,
        bx: CX + RX * .97 * Math.cos(a), by: CY + RY * .97 * Math.sin(a) });
    }
    const fi = furImage();
    $('.fimg').setAttribute('href', fi.fur); $('.fedge').setAttribute('href', fi.edge); $('.fpi').setAttribute('href', fi.fur); 

    // ---------- status ----------
    const cur = Object.assign({}, BASE), tgt = Object.assign({}, BASE);
    const S = { t: 0, offX: 0, offY: 0, jy: 0, jv: 0, hopCool: 0,
      sy: spr(1, 320, 12), rot: spr(0, 140, 12), lx: spr(0, 200, 22), ly: spr(0, 200, 22),
      ax: 0, ay: 0, hpx: 0, hpy: 0, hvx: 0, hvy: 0, hinit: false, ex: spr(0, 100, 6), ey: spr(0, 100, 6),
      vow: { w: 1, o: .5, r: .5, c: .45 }, vseq: ['a', 'i', 'u', 'e', 'o'], vi: 0, vt: 0, vhold: 0, vforce: 'a',
      singing: false, bpm: 100, beatPh: 0, beatN: 0, swayDir: 1, lvl: 0, extLvl: 0, extT: -99, prevBase: 'neutral', notes: [], lyr: null,
      vx: 0, vy: 0, falling: false, onGround: false, windup: 0, pendH: 0, lookTX: 0, lookTY: 0, lastPtr: -99, lastAct: performance.now(), nextGlance: 1, nextBlink: 1.5, blinkT: -1, blinkN: 0,
      pivot: FEET, energy: 0, wig: 0, shk: 0, spin: -1, move: null, drag: null, grabbed: false, asleep: false, wanderOn: false, nextWander: 0, tmpUntil: 0, actT: 0,
      base: 'neutral', moodTimer: 0, talkUntil: 0, bubbleTimer: 0, bubbleRes: null, last: performance.now() };

    const W = () => o.size, H = () => o.size * VH / 400, U_ = () => o.size / 220;
    const feet = () => { const b = wrap.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + FEET / VH * b.height }; };
    function size(px) {
      const f0 = o.floating ? feet() : null;
      o.size = px; wrap.style.width = px + 'px'; wrap.style.height = H() + 'px';
      if (f0) { const f1 = feet(); S.offX += f0.x - f1.x; S.offY += f0.y - f1.y; }
    }
    wrap.style.width = o.size + 'px'; wrap.style.height = H() + 'px';
    if (o.floating) {
      const fx = o.x != null ? o.x : innerWidth - W() / 2 - 24, fy = o.y != null ? o.y : innerHeight - 24;
      S.offX = fx - W() / 2; S.offY = fy - FEET / VH * H();
    }
    const groundY = () => innerHeight - o.floor - FEET / VH * H();   // offY saat kaki menyentuh lantai
    S.onGround = o.floating && Math.abs(S.offY - groundY()) < 6;
    const keep = () => { if (!o.floating) return; if (S.onGround) S.offY = groundY(); const f = feet(); S.offX += clamp(f.x, W() / 2, innerWidth - W() / 2) - f.x; S.offY += clamp(f.y, H() * .6, innerHeight) - f.y; };

    // ---------- API gerak ----------
    function setMood(name, ms) {
      const m = Object.assign({}, BASE, MOODS[name] || MOODS.neutral);
      Object.assign(tgt, m);
      clearTimeout(S.moodTimer);
      S.tmpUntil = ms ? performance.now() + ms : 0;   // emosi sementara aktif → otak idle menahan diri
      if (ms) S.moodTimer = setTimeout(() => setMood(S.base), ms); else { S.base = name; S.asleep = name === 'sleep'; }
    }
    function jump(h) {   // jongkok sebentar, lalu meloncat
      if (S.jy < 0 || S.windup > 0 || S.falling) return;
      S.windup = .07; S.pendH = h || 70;
    }
    function drop() { if (!o.floating) return; api.stop(); S.falling = true; S.onGround = false; S.vx = S.vy = 0; }
    const bump = () => { S.lastAct = performance.now(); };

    // ---------- menyanyi, not musik, lirik ----------
    const NOTE_COL = ['#ff4f9a', '#3f7dff', '#ffa800', '#16c79a'];
    for (let i = 0; i < 7; i++) {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '44'); t.setAttribute('font-weight', '700'); t.setAttribute('opacity', '0');
      ntG.appendChild(t); S.notes.push({ el: t, life: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, ph: 0 });
    }
    function spawnNote() {
      const n = S.notes.find((q) => q.life <= 0); if (!n) return;
      const side = Math.random() < .5 ? -1 : 1;
      Object.assign(n, { life: 1.6, x: 200 + side * (150 + Math.random() * 40), y: 110 + Math.random() * 70, vx: side * (8 + Math.random() * 18), vy: -(45 + Math.random() * 30), rot: side * (8 + Math.random() * 14), ph: Math.random() * 6 });
      n.el.textContent = '♪♫♬'[Math.floor(Math.random() * 3)]; n.el.setAttribute('fill', NOTE_COL[Math.floor(Math.random() * 4)]);
    }
    function onBeat(k) {
      S.swayDir = -S.swayDir; S.sy.x = 1 - .09 * k; S.sy.v = 0;
      if (S.jy >= 0 && !S.move && !S.falling && !(S.drag && S.drag.moved) && S.windup <= 0 && !S.asleep) S.jv = -Math.sqrt(2 * G * U_() * 7 * k * U_());
      if ((S.beatN++ & 1) === 0 || k > 1.2) spawnNote();
    }
    function sing(on, op) {
      if (on === false) { if (S.singing) { S.singing = false; setMood(S.prevBase); } return; }
      if (S.asleep) wake();
      if (!S.singing) S.prevBase = S.base;
      S.singing = true; S.beatPh = 0; if (op && op.bpm != null) S.bpm = op.bpm;
      setMood('sing');
    }
    function lyric(text) {
      if (!text) { S.vseq = vowelsOf(''); S.vi = 0; lyr.classList.remove('show'); return; }
      S.vseq = vowelsOf(text); S.vi = 0;
      lyr.textContent = text; lyr.classList.remove('swap'); void lyr.offsetWidth; lyr.classList.add('show', 'swap');
    }
    function vowel(ch, ms) { S.vforce = String(ch).toLowerCase(); S.vhold = (ms || 600) / 1000; }   // tahan satu vokal (a i u e o)
    function vowels(seq) { S.vseq = vowelsOf(Array.isArray(seq) ? seq.join('') : seq); S.vi = 0; }
    function lyrics(lines, getTime) { S.lyr = lines ? { lines, get: getTime || (() => 0), i: -2 } : null; if (!lines) lyric(''); }
    function say(text, ms) {
      clearTimeout(S.bubbleTimer); bubble.textContent = text; bubble.classList.add('show'); wrap.classList.add('saying');
      ms = ms || 2600; S.talkUntil = performance.now() + Math.min(ms, text.length * 70 + 300);
      return new Promise((res) => { S.bubbleTimer = setTimeout(() => { bubble.classList.remove('show'); wrap.classList.remove('saying'); res(); }, ms); });
    }
    function moveTo(x, y, op) {
      bump(); if (S.asleep) wake();
      const f = feet(); let tx = x, ty = y;
      if (o.floating) { tx = clamp(x, W() / 2, innerWidth - W() / 2); ty = clamp(y, H() * .6, innerHeight); }
      return new Promise((res) => {
        if (S.move) S.move.res();
        S.falling = false; S.vx = S.vy = 0;
        S.move = { tx: S.offX + tx - f.x, ty: S.offY + ty - f.y, speed: ((op && op.speed) || 300) * U_(), res };
      });
    }
    // otak idle (wander): pilih aktivitas acak berbobot, jarak pendek, kecepatan & emosi bervariasi
    function idleAct() {
      const pause = (a, b) => { S.nextWander = S.t + a + Math.random() * (b - a); };
      const later = (ms, fn) => { clearTimeout(S.actT); S.actT = setTimeout(fn, ms); };
      const glance = (x, y) => { S.lookTX = x; S.lookTY = y; S.lastPtr = performance.now(); };
      const r = Math.random(), f = feet();
      if (r < .45) {   // jalan: condong ke sisi yang lebih lega; lari kecil = senang, jalan santai = netral
        const roomL = f.x - W() / 2, roomR = innerWidth - W() / 2 - f.x;
        const dir = Math.random() < (roomR + 1) / (roomL + roomR + 2) ? 1 : -1, fast = Math.random() < .3;
        if (fast) setMood('happy', 2600);
        moveTo(f.x + dir * (80 + Math.random() * 300), o.floating && o.gravity ? innerHeight - o.floor : f.y, { speed: fast ? 480 : 150 + Math.random() * 130 })
          .then(() => { const q = Math.random(); if (q < .3) glance(-dir * .9, -.1); else if (q < .5) setMood('happy', 1400); });
        pause(2.5, 6);
      } else if (r < .6) {   // lihat-lihat: lirik kiri, kanan, lalu penasaran
        glance(-.9, 0); later(700, () => { glance(.9, -.1); later(700, () => { glance(0, -.3); setMood('surprised', 700); }); });
        pause(3, 5);
      } else if (r < .72) {   // ekspresi singkat
        const e = [['happy', () => { S.wig = 1; }], ['wink', null], ['love', null], ['surprised', () => jump(35)]][Math.floor(Math.random() * 4)];
        setMood(e[0], 1800); if (e[1]) e[1]();
        pause(3, 6);
      } else if (r < .8) {   // menguap
        setMood('sleepy', 2200); vowel('o', 1100);
        pause(4, 7);
      } else if (r < .87) {   // girang
        setMood('happy', 1500); if (Math.random() < .5) { jump(90); S.spin = 0; } else jump(70);
        pause(3, 6);
      } else pause(4, 9);   // diam, istirahat
    }
    function wake() { if (!S.asleep) return; setMood('neutral'); setMood('surprised', 700); jump(40); }
    function look(x, y) {
      const b = svg.getBoundingClientRect(), dx = x - (b.left + b.width / 2), dy = y - (b.top + b.height * EY / VH);
      const d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / (b.width * .9));
      S.lookTX = dx / d * m; S.lookTY = dy / d * m; S.lastPtr = performance.now();
    }

    // ---------- input ----------
    const onMove = (e) => { if (o.followPointer && !S.asleep) look(e.clientX, e.clientY); };
    const onDown = (e) => {
      if (!o.draggable) return; bump();
      wrap.setPointerCapture(e.pointerId);
      S.drag = { sx: e.clientX, sy: e.clientY, ox: S.offX, oy: S.offY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false, vx: 0, vy: 0 };
    };
    const onDrag = (e) => {
      const d = S.drag; if (!d) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; S.grabbed = true; S.falling = false; S.onGround = false; S.vx = S.vy = 0; if (S.move) { S.move.res(); S.move = null; } wrap.classList.add('grabbing'); if (S.asleep) wake(); setMood('surprised', 100000); }
      if (!d.moved) return;
      const now = performance.now(), dt = Math.max(1, now - d.lt) / 1000;
      d.vx = lerp(d.vx, (e.clientX - d.lx) / dt, .3); d.vy = lerp(d.vy, (e.clientY - d.ly) / dt, .3); d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
      S.offX = d.ox + dx; S.offY = d.oy + dy; if (o.floating) { const f = feet(); S.offX += clamp(f.x, 0, innerWidth) - f.x; S.offY += clamp(f.y, H() * .6, innerHeight) - f.y; }
      S.rot.t = clamp(d.vx * .03, -30, 30);
    };
    const onUp = () => {
      const d = S.drag; if (!d) return; S.drag = null; bump(); wrap.classList.remove('grabbing');
      if (d.moved) {
        S.grabbed = false; S.rot.t = 0;
        if (o.floating && o.gravity) {   // lepas = jatuh / terlempar
          const still = performance.now() - d.lt > 80;
          S.falling = true; S.vx = still ? 0 : clamp(d.vx, -2000, 2000) * .8; S.vy = still ? 0 : clamp(d.vy, -2000, 2000) * .8;
          S.thrown = Math.hypot(S.vx, S.vy) > 900 * U_();   // ponytail: fixed speed threshold, tune if light tosses make it dizzy
        } else { clearTimeout(S.moodTimer); setMood(S.base); S.jv = -300 * U_(); }
      }
      else tap();
    };
    function tap() {
      if (S.asleep) return wake();
      jump(50); setMood('happy', 1400);
      if (o.tapLines && o.tapLines.length) say(o.tapLines[Math.floor(Math.random() * o.tapLines.length)]);
      if (o.onTap) o.onTap(api);
    }
    function dizzy(ms) {
      ms = ms || 3500; setMood('dizzy', ms + 200); bump(); clearTimeout(S.dizzyT);
      S.dizzyT = setTimeout(() => {   // sadar: geleng-geleng 2x dengan mata terpejam, lalu senyum
        setMood('refresh', 1200); S.shk = 1;
        S.dizzyT = setTimeout(() => { S.shk = 1; S.dizzyT = setTimeout(() => setMood('happy', 1200), 600); }, 550);
      }, ms);
    }
    const onPet = (e) => {
      if (e.buttons || S.drag || S.asleep || S.falling) return;
      const b = wrap.getBoundingClientRect(), y = (e.clientY - b.top) / b.height, p = S.pet || (S.pet = { x: e.clientX, dir: 0, n: 0, t: 0 });
      if (y > .5) { p.n = 0; return; }
      const dx = e.clientX - p.x; if (Math.abs(dx) < 4) return;
      const dir = Math.sign(dx), t = performance.now(); p.x = e.clientX;
      if (dir !== p.dir) { p.n = t - p.t < 600 ? p.n + 1 : 1; p.dir = dir; p.t = t; }
      if (p.n >= 4) { p.n = 0; bump(); setMood('love', 2600); S.sy.x = .9; S.sy.v = 0; if (o.onPet) o.onPet(api); }   // 4 usapan bolak-balik
    };
    wrap.addEventListener('pointermove', onPet);
    window.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerdown', onDown); wrap.addEventListener('pointermove', onDrag);
    wrap.addEventListener('pointerup', onUp); wrap.addEventListener('pointercancel', onUp);
    const onResize = () => keep(); window.addEventListener('resize', onResize);

    // ---------- loop ----------
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.033, (now - S.last) / 1000); S.last = now; if (dt <= 0) return;
      S.t += dt;
      const U2 = U_(), tt = S.t;

      // ekspresi (halus)
      const k = 1 - Math.exp(-dt * 12);
      for (const key in cur) cur[key] += (tgt[key] - cur[key]) * k;

      // kedip
      if (o.idle && !S.asleep && S.blinkT < 0 && tt > S.nextBlink) S.blinkT = 0;
      let blink = 0;
      if (S.blinkT >= 0) {
        S.blinkT += dt; blink = S.blinkT < .08 ? S.blinkT / .08 : 1 - (S.blinkT - .08) / .14;
        if (S.blinkT > .22) { S.blinkT = -1; blink = 0; S.nextBlink = tt + (Math.random() < .2 ? .25 : 2.2 + Math.random() * 3.3); }
      }

      // melirik acak & tidur otomatis
      if (o.idle && !S.asleep && !S.move && now - S.lastPtr > 2500 && tt > S.nextGlance) {
        const c = Math.random() < .3; S.lookTX = c ? 0 : Math.random() * 1.6 - .8; S.lookTY = c ? 0 : Math.random() - .5; S.nextGlance = tt + 1.2 + Math.random() * 2.3;
      }
      if (S.asleep) { S.lookTX = 0; S.lookTY = 0; }
      if (o.sleepAfter && !S.singing && !S.asleep && !S.move && now - S.lastAct > o.sleepAfter) setMood('sleep');
      if (S.wanderOn && !S.move && !S.drag && !S.asleep && !S.falling && !S.grabbed && tt > S.nextWander && now > S.tmpUntil) idleAct();

      // jalan melompat
      let lean = 0;
      if (S.move) {
        const m = S.move, dx = m.tx - S.offX, dy = m.ty - S.offY, dist = Math.hypot(dx, dy);
        if (dist < 2 && S.jy >= 0) { S.move = null; S.onGround = o.floating && Math.abs(S.offY - groundY()) < 6; m.res(); }
        else if (dist >= 2) {
          S.hopCool -= dt;
          if (S.jy >= 0 && S.hopCool <= 0 && S.windup <= 0) { S.windup = .07; S.pendH = 24 + Math.min(26, dist / U2 * .05); S.hopCool = .05; }
          if (S.jy < 0) { const st = Math.min(dist, m.speed * dt); S.offX += dx / dist * st; S.offY += dy / dist * st; }
          S.lookTX = clamp(dx / dist * 1.2, -1, 1); S.lookTY = 0; lean = clamp(dx / dist, -1, 1) * 7; S.lastPtr = now;
        }
      }

      // bernyanyi: irama internal (atau dari m.beat / m.level), goyang, mulut
      if (S.singing) {
        if (S.bpm > 0) { S.beatPh += dt * S.bpm / 60; if (S.beatPh >= 1) { S.beatPh -= 1; onBeat(1); } }
        const tl = now - S.extT < 250 ? S.extLvl : (.35 + .65 * Math.abs(Math.sin(Math.PI * S.beatPh * 2))) * (.65 + .35 * Math.sin(tt * 1.3 + 1)) * ((S.beatN & 7) === 7 ? .25 : 1);
        S.lvl += (tl - S.lvl) * Math.min(1, dt * 18);
        if (!S.move) lean = S.swayDir * 7;
      }

      // bentuk mulut vokal: berganti tiap suku kata (2x ketukan), atau ditahan lewat m.vowel()
      if (S.vhold > 0) S.vhold -= dt;
      if (S.singing && S.vhold <= 0 && (S.vt += dt * (S.bpm > 0 ? S.bpm * 2 / 60 : 3.5)) >= 1) { S.vt -= 1; S.vi = (S.vi + 1) % S.vseq.length; }
      const Vw = VOWELS[S.vhold > 0 ? S.vforce : S.vseq[S.vi % S.vseq.length]] || VOWELS.a, kv = Math.min(1, dt * 20);
      for (const key of ['w', 'o', 'r', 'c']) S.vow[key] += (Vw[key] - S.vow[key]) * kv;
      if (!S.singing) S.lvl += ((S.vhold > 0 ? .9 : 0) - S.lvl) * Math.min(1, dt * 12);

      // jatuh bebas / terlempar (setelah dilepas)
      if (S.falling) {
        const gy = groundY(), fpx = FEET / VH * H();
        S.vy += 2600 * U2 * dt; S.offX += S.vx * dt; S.offY += S.vy * dt;
        const wall = S.offX < 0 || S.offX > innerWidth - W();
        if (wall && Math.abs(S.vx) > 300 * U2) setMood('hurt', 900);
        if (S.offX < 0) { S.offX = 0; S.vx = Math.abs(S.vx) * .55; } else if (S.offX > innerWidth - W()) { S.offX = innerWidth - W(); S.vx = -Math.abs(S.vx) * .55; }
        if (S.offY < H() * .6 - fpx) { S.offY = H() * .6 - fpx; S.vy = Math.abs(S.vy) * .4; }
        if (S.offY >= gy) {
          S.offY = gy;
          if (S.vy > 260 * U2) { setMood('hurt', 900); S.sy.x = 1 - clamp(S.vy / (2600 * U2), .1, .32); S.sy.v = 0; S.vy *= -.36; S.vx *= .82; }
          else { S.vy = 0; S.vx *= Math.max(0, 1 - 6 * dt); if (Math.abs(S.vx) < 25) { S.vx = 0; S.falling = false; S.onGround = true; clearTimeout(S.moodTimer); if (S.thrown) { S.thrown = false; dizzy(); } else setMood(S.base); } }
        }
        lean = clamp(S.vx * .012, -25, 25);
      }

      // fisika lompat (naik lebih ringan, turun lebih cepat)
      if (S.windup > 0 && (S.windup -= dt) <= 0) { S.jv = -Math.sqrt(2 * G * U2 * S.pendH * U2); S.sy.x = 1.16; S.sy.v = 0; }
      if (S.jy < 0 || S.jv < 0) {
        S.jv += G * U2 * (S.jv < 0 ? 1 : 1.6) * dt; S.jy += S.jv * dt;
        if (S.jy >= 0) { const imp = S.jv; S.jy = 0; S.jv = 0; if (imp > 150) { S.sy.x = 1 - clamp(imp / (3200 * U2), .06, .22); S.sy.v = 0; } }
      }

      // pegas
      const breath = o.idle ? .012 * Math.sin(tt * 2.2) : 0;
      S.sy.t = 1 + breath + (S.jy < 0 ? clamp(-S.jv / (4000 * U2), -.05, .12) : 0);
      if (S.falling) S.sy.t += clamp(Math.abs(S.vy) / (5000 * U2), 0, .1);
      if (S.windup > 0) S.sy.t = .78;
      if (S.grabbed) S.sy.t = 1.08;
      S.lx.t = S.lookTX; S.ly.t = S.lookTY;
      stepSpr(S.sy, dt); stepSpr(S.rot, dt); stepSpr(S.lx, dt); stepSpr(S.ly, dt);
      S.rot.t = S.drag && S.drag.moved ? S.rot.t : lean;

      S.wig = Math.max(0, S.wig - dt * .9); S.shk = Math.max(0, S.shk - dt * 2);
      let spinA = 0;
      if (S.spin >= 0) { S.spin += dt / .75; const u = Math.min(1, S.spin); spinA = (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) * 360; if (S.spin >= 1) S.spin = -1; }
      const sy = S.sy.x, sx = 1 + (1 - sy) * .85 + Math.sin(tt * 28) * .07 * S.wig;
      const rot = S.rot.x + spinA + Math.sin(tt * 4.5) * 11 * cur.dizzy + Math.sin(tt * 32) * 12 * S.shk * S.shk + Math.sin(tt * 28 + 1) * 5 * S.wig;
      const pivTarget = S.grabbed ? 70 : (S.spin >= 0 ? 190 : FEET);
      S.pivot += (pivTarget - S.pivot) * (1 - Math.exp(-dt * 14));
      S.energy += (Math.min(1, Math.abs(S.jv) / (900 * U2) + S.wig + S.shk + (S.move || S.falling ? .5 : 0)) - S.energy) * Math.min(1, dt * 6);

      const jy = S.jy * 400 / o.size;
      bodyG.setAttribute('transform', `translate(0 ${n2(jy)}) translate(200 ${n2(S.pivot)}) rotate(${n2(rot)}) scale(${n2(sx * 1000) / 1000} ${n2(sy * 1000) / 1000}) translate(-200 ${n2(-S.pivot)})`);
      wrap.style.transform = `translate3d(${n2(S.offX)}px,${n2(S.offY)}px,0)`;
      if (shadow) { const gh = S.falling ? Math.max(0, groundY() - S.offY) * 400 / o.size : 0, hgt = Math.max(0, -jy) + gh; shadow.setAttribute('transform', `translate(0 ${n2(gh)}) translate(200 343) scale(${n2(1 / (1 + hgt / 200))} 1) translate(-200 -343)`); shadow.setAttribute('opacity', n2(.22 / (1 + hgt / 120))); }

      // fisika rambut: gaya inersia dari gerak badan (lompat, geser, goyang, gepeng) membuat helai berayun tuing-tuing
      const px_ = S.offX, py_ = S.offY + S.jy;
      if (!S.hinit) { S.hpx = px_; S.hpy = py_; S.hinit = true; }
      const vx_ = (px_ - S.hpx) / dt, vy_ = (py_ - S.hpy) / dt;
      S.ax += (clamp((vx_ - S.hvx) / dt, -8000, 8000) - S.ax) * Math.min(1, dt * 25);
      S.ay += (clamp((vy_ - S.hvy) / dt, -8000, 8000) - S.ay) * Math.min(1, dt * 25);
      S.hpx = px_; S.hpy = py_; S.hvx = vx_; S.hvy = vy_;
      const Us = o.size / 400, nrm = 1 / (2600 * U2);
      const sydd = S.sy.k * (S.sy.t - S.sy.x) - S.sy.c * S.sy.v;
      const alp = (S.rot.k * (S.rot.t - S.rot.x) - S.rot.c * S.rot.v) * Math.PI / 180, sxdd = -.85 * sydd;
      const fd = ['', '', ''];
      const pt = (an, rad) => `${n2(CX + RX * rad * Math.cos(an))} ${n2(CY + RY * rad * Math.sin(an))}`;
      for (let j = 0; j < FM; j++) {
        const q = fr[j], rx_ = q.bx - 200, ry_ = q.by - FEET, ty = q.by - S.pivot;
        const Dx = -(S.ax + (sxdd * rx_ - alp * ty) * Us) * nrm, Dy = -(S.ay + (sydd * ry_ + alp * rx_) * Us) * nrm;
        q.om += (110 * q.sens * (Dx * Math.sin(q.phi - q.a) + Dy * Math.cos(q.a - q.phi)) - q.k * q.th - q.d * q.om) * dt;
        q.th = clamp(q.th + q.om * dt, -1.1, 1.1);
        const sw = Math.sin(tt * 2 + q.ph) * .02 * (1 + S.energy), dn = q.th * q.len * 1.8 + q.len * .9 * Math.cos(q.a);   // dn: ayunan + rambut jatuh karena gravitasi
        const a2 = q.a + q.curl + sw + dn, ac = q.a + q.curl * .5 + sw * .5 + dn * .5, cr = .99 + q.len * .45;
        fd[q.c] += `M${pt(q.a - q.w, .93)}Q${pt(ac - q.w * .5, cr)} ${pt(a2, 1 + q.len)}Q${pt(ac + q.w * .5, cr)} ${pt(q.a + q.w, .93)}Z`;
      }
      P.forEach((p, i) => p.setAttribute('d', fd[i]));
      // lapisan bulu tepi tertinggal sedikit dari badan (pegas), jadi siluet ikut bergoyang
      S.ex.t = clamp(-S.ax * nrm * 5, -6, 6); S.ey.t = clamp(-S.ay * nrm * 4 - sydd * .08, -6, 6);
      stepSpr(S.ex, dt); stepSpr(S.ey, dt);
      fedge.setAttribute('transform', `translate(${n2(S.ex.x)} ${n2(S.ey.x)})`);

      // not musik & lirik tersinkron
      S.notes.forEach((n) => {
        if (n.life <= 0) return;
        n.life -= dt; n.x += n.vx * dt; n.y += n.vy * dt;
        n.el.setAttribute('transform', `translate(${n2(n.x)} ${n2(n.y)}) rotate(${n2(n.rot + Math.sin(tt * 4 + n.ph) * 10)})`);
        n.el.setAttribute('opacity', n.life <= 0 ? 0 : n2(clamp(Math.min(n.life / .6, (1.6 - n.life) / .15), 0, 1)));
      });
      if (S.lyr) {
        const L = S.lyr.lines, t = S.lyr.get();
        if (isFinite(t)) {
          let i = S.lyr.i; if (i < 0 || L[i].t > t) i = -1;
          while (i + 1 < L.length && L[i + 1].t <= t) i++;
          if (i !== S.lyr.i) { S.lyr.i = i; lyric(i >= 0 ? L[i].text : ''); }
        }
      }

      // mata
      const lx = S.lx.x, ly = S.ly.x, mx = 6, ox = lx * mx, oy = ly * mx * .7;
      const heartS = 1.15 + .08 * Math.sin(tt * 8);
      eyes.forEach((e, i) => {
        const top = Math.max(i ? cur.tR : cur.tL, blink), bot = i ? cur.bR : cur.bL, cx = e.cx;
        const slope = e.side * cur.tilt * Math.min(1, top * 5);
        const ey = EY - LR + top * (2 * LR + LR * Math.abs(slope) + 3);
        e.lt.setAttribute('d', `M${cx - 110} ${EY - 130}H${cx + 110}V${n2(ey + 110 * slope)}L${cx - 110} ${n2(ey - 110 * slope)}Z`);
        e.lb.setAttribute('cx', cx); e.lb.setAttribute('cy', n2(EY + 2.25 * LR - bot * 1.4 * LR)); e.lb.setAttribute('rx', 1.6 * LR); e.lb.setAttribute('ry', 1.25 * LR);
        e.lb.setAttribute('opacity', bot > .02 ? 1 : 0);
        e.ir.setAttribute('transform', `translate(${n2(ox)} ${n2(oy)})`);
        e.ic.setAttribute('rx', n2(ERX * cur.pupil)); e.ic.setAttribute('ry', n2(ER * cur.pupil));
        e.ie.setAttribute('rx', n2(ERX * cur.pupil)); e.ie.setAttribute('ry', n2(ER * cur.pupil));
        e.ht.setAttribute('transform', `translate(${cx} ${EY}) scale(${n2(heartS * .85)})`); e.ht.setAttribute('opacity', n2(cur.love));
        const aA = clamp((top - .85) / .15, 0, 1);
        e.ar.setAttribute('opacity', n2(aA));
        if (aA > 0) e.ar.setAttribute('d', cur.pain > .5
          ? `M${cx + e.side * 12} ${EY - 10}L${cx - e.side * 12} ${EY + 4}L${cx + e.side * 12} ${EY + 18}`   // > <, ujung menunjuk ke hidung
          : `M${cx - ER * .6} ${n2(EY + 3 - cur.arc * 5)}Q${cx} ${n2(EY + 3 + cur.arc * 12)} ${cx + ER * .6} ${n2(EY + 3 - cur.arc * 5)}`);
      });
      const dz = clamp((cur.dizzy - .3) / .7, 0, 1);
      eyes.forEach((e, i) => {
        e.sp.setAttribute('opacity', n2(dz));
        if (dz > 0) e.spp.setAttribute('transform', `translate(${e.cx} ${EY}) scale(${ERX * .9} ${ER * .9}) rotate(${n2((i ? -1 : 1) * tt * 420)})`);
      });
      starG.setAttribute('opacity', n2(dz));
      if (dz > 0) stars.forEach((st, j) => {   // orbit di atas kepala; bintang di belakang lebih kecil & redup
        const a = tt * 3 + j * TAU / 5, depth = Math.sin(a);
        st.setAttribute('transform', `translate(${n2(200 + Math.cos(a) * 105)} ${n2(34 + depth * 18)}) rotate(${n2(tt * 200 + j * 40)}) scale(${n2(.75 + depth * .25)})`);
        st.setAttribute('opacity', 1);
      });
      cheeks.forEach((c) => c.setAttribute('opacity', n2(cur.blush)));

      // mulut
      const talking = now < S.talkUntil;
      let mA = cur.mA, mC = cur.mC, mO = cur.mO;
      if (talking) { mA = 1; mC = .4; mO = .15 + .5 * Math.abs(Math.sin(tt * 13) * Math.sin(tt * 5.3 + 1)); }
      const vp = !talking && (S.singing || S.vhold > 0);
      if (vp) { mA = 1; mC = S.vow.c; mO = S.vow.o * (.35 + .65 * S.lvl); }
      const w = vp ? 20 * S.vow.w : 20 * cur.mW * (1 + .25 * mO), y0 = 292, hh = vp ? 21 : 16;
      let md;
      if (vp && mO > .02) {   // bentuk bulat/lonjong untuk vokal
        const rr = S.vow.r, yT = y0 + mC * 16 - rr * hh * .25 * mO, yB = y0 + mC * 16 + mO * hh * (1 + .5 * rr);
        const cT = (yT - .25 * y0) / .75, cB = (yB - .25 * y0) / .75, dx = 2 * w * .3 * (1 - rr);
        md = `M${n2(200 - w)} ${y0}C${n2(200 - w + dx)} ${n2(cT)} ${n2(200 + w - dx)} ${n2(cT)} ${n2(200 + w)} ${y0}C${n2(200 + w - dx)} ${n2(cB)} ${n2(200 - w + dx)} ${n2(cB)} ${n2(200 - w)} ${y0}Z`;
      } else {
        md = `M${n2(200 - w)} ${y0}Q200 ${n2(y0 + mC * 32)} ${n2(200 + w)} ${y0}`;
        if (mO > .02) md += `Q200 ${n2(y0 + mC * 32 + mO * 2 * hh)} ${n2(200 - w)} ${y0}Z`;
      }
      if (dz > .5) {   // mulut bergelombang (woozy)
        md = ''; mO = 0; mA = 1;
        for (let x = -24; x <= 24; x += 3) md += (md ? 'L' : 'M') + n2(200 + x) + ' ' + n2(y0 + 4 + Math.sin(x / 24 * TAU * 1.5 + tt * 7) * 4.5);
      }
      mouth.setAttribute('d', md); mouth.setAttribute('opacity', n2(mA));
      mouth.setAttribute('fill', mO > .08 ? INK : 'none');
      mclip.setAttribute('d', md);
      const tg = clamp((mO - .2) * 5, 0, 1); tongue.setAttribute('opacity', n2(tg * mA));
      if (tg > 0) { tongue.setAttribute('cx', 200); tongue.setAttribute('cy', n2(y0 + mC * 16 + mO * hh * .85)); tongue.setAttribute('rx', n2(w * .55)); tongue.setAttribute('ry', n2(Math.max(.1, mO * hh * .55))); }
      zz.setAttribute('opacity', n2(cur.zzz * (.6 + .4 * Math.sin(tt * 2)))); zz.setAttribute('transform', `translate(0 ${n2(Math.sin(tt * 1.5) * 4)})`);
    }
    let raf = 0;
    size(o.size); setMood('neutral'); Object.assign(cur, tgt);
    raf = requestAnimationFrame(frame);

    const api = {
      el: wrap, svg,
      mood: setMood, blink() { S.blinkT = 0; }, look, lookDir(nx, ny) { S.lookTX = clamp(nx, -1, 1); S.lookTY = clamp(ny, -1, 1); S.lastPtr = performance.now(); },
      jump, spin() { jump(90); S.spin = 0; }, shake() { S.shk = 1; }, wiggle() { S.wig = 1; }, squish() { S.sy.x = .7; S.sy.v = 0; },
      say, moveTo, stop() { if (S.move) { S.move.res(); S.move = null; } },
      moveToEl(e) { const b = e.getBoundingClientRect(); return moveTo(b.left + b.width / 2, b.top); },
      wander(on) { S.wanderOn = on !== false; S.nextWander = S.t + .3; if (!S.wanderOn && S.move) api.stop(); },
      vowel, vowels, sing, beat(k) { S.beatPh = 0; onBeat(k == null ? 1 : k); }, level(v) { S.extLvl = clamp(v, 0, 1); S.extT = performance.now(); }, lyric, lyrics,
      gravity(on) { o.gravity = on !== false; if (!o.gravity) S.falling = false; }, drop,
      sleep() { setMood('sleep'); }, wake, dizzy,
      setSize: size, follow(on) { o.followPointer = on !== false; }, draggable(on) { o.draggable = on !== false; },
      show() { wrap.style.display = ''; }, hide() { wrap.style.display = 'none'; },
      destroy() { cancelAnimationFrame(raf); clearTimeout(S.moodTimer); clearTimeout(S.dizzyT); clearTimeout(S.actT); clearTimeout(S.bubbleTimer); window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', onResize); wrap.remove(); },
    };
    return api;
  }

  // "[mm:ss.xx] teks" (format .lrc) -> [{ t: detik, text }]
  function parseLRC(str) {
    const out = [];
    String(str).split(/\r?\n/).forEach((l) => {
      const tags = l.match(/\[\d+:\d+(?:[.:]\d+)?\]/g); if (!tags) return;
      const text = l.replace(/\[[^\]]*\]/g, '').trim();
      tags.forEach((t) => { const m = t.match(/(\d+):(\d+)(?:[.:](\d+))?/); out.push({ t: +m[1] * 60 + +m[2] + (m[3] ? +('0.' + m[3]) : 0), text }); });
    });
    return out.sort((a, b) => a.t - b.t);
  }

  return { create, parseLRC, moods: Object.keys(MOODS) };
}));
