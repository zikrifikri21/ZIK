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
 *   m.hands(true); m.handLyrics(true);   // tangan yang memperagakan kata lirik; lirik tulisan tangan kata per kata di samping kepala
 *   m.tempo(0.5);               // periode ketukan dalam detik (ayunan badan); m.beat() menyelaraskan fasenya
 *   m.singMood('sad');          // wajah saat menyanyi: happy love sad angry (otomatis dari line.mood di m.lyrics)
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
 * Opsi: fps (batas frame, default 60), idleFps (batas saat tenang, 0 = sama dengan fps), size, container (elemen/selector), floating (true = melayang di layar, false = ikut
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
  // antisipasi (seperti lip-sync animasi): mulut & tulisan dimajukan LEAD; ekspresi mulai MOOD_LEAD sebelum baris, karena
  // wajah butuh ~.25 dtk (telinga ~.45) untuk berubah — kalau mulai tepat di awal baris, terlihat telat
  const LEAD = .1, MOOD_LEAD = .25;
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
    sulky: { tL: .45, tR: .45, tilt: -.35, pupil: .9, mA: 1, mC: -.25, mW: .55, blush: .35 },   // jutek: setengah merem, manyun, sedikit merona
    surprised: { pupil: 1.18, mA: 1, mC: 0, mO: .9, mW: .5 },
    sleepy: { tL: .55, tR: .55, tilt: .12 },
    sleep: { tL: 1, tR: 1, mA: .8, mC: .3, mO: .12, mW: .7, zzz: 1 },
    love: { bL: .35, bR: .35, love: 1, mA: 1, mC: 1, mO: .3, blush: .9 },
    sing: { tL: 1, tR: 1, arc: -1, mA: 1, mC: .5, mO: .4, mW: 1.15, blush: .6 },
    hurt: { tL: 1, tR: 1, pain: 1, mA: 1, mC: -.7, mO: .35, mW: 1.15 },   // terpantul: mata > <, meringis
    refresh: { tL: 1, tR: 1, arc: 1, mA: 1, mC: .2, mW: .7 },               // geleng-geleng sadar dari pusing
    dizzy: { dizzy: 1, mA: 1, mC: 0, mO: 0, mW: 1.1 },
    wink: { tR: 1, bL: .4, mA: 1, mC: 1, mO: .2, blush: .4, arc: -1 },
    // Inside Out 2: emosi tambahan. Alis/kelopak bisa beda kiri-kanan (jijik, iri)
    fear: { tL: 0, tR: 0, tilt: .6, pupil: .7, mA: 1, mC: -.5, mO: .55, mW: .6 },          // mata melotot, pupil mengecil, mulut "o"
    disgust: { tL: .5, tR: .15, bL: .35, tilt: -.3, pupil: .95, mA: 1, mC: -.7, mW: .7 },  // satu mata menyipit, bibir mencibir
    anxiety: { tL: 0, tR: 0, tilt: .55, pupil: .8, mA: 1, mC: -.35, mO: .08, mW: 1.15 },   // melotot, meringis lebar
    envy: { tL: .5, tR: .35, tilt: -.25, pupil: .95, mA: 1, mC: -.25, mW: .65 },            // melirik setengah merem, manyun
    ennui: { tL: .62, tR: .62, tilt: .1, pupil: 1, mA: 1, mC: -.1, mW: .55 },               // kelopak berat, datar
    embarrassed: { bL: .4, bR: .4, tilt: .35, pupil: 1.1, mA: 1, mC: .35, mW: .55, blush: 1.4 },   // merona, senyum kecil kikuk
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
  // satu vokal per suku kata: "Kamu adalah bukti" → a u a a a u i. Diftong (ai au oi ei) = satu suku kata; ou/oo/ee (Inggris) → u/u/i
  // Baris Inggris (ada kata umum the/you/my/...): e bisu di akhir kata dibuang (phone → o, made → a), my/I → a, -y → i, ea → i
  const DIPH = { ou: 'u', oo: 'u', ee: 'i', ea: 'i' }, EN = /\b(the|you|your|i|i'm|me|my|and|is|it|to|be|don't|can't|we|oh|baby)\b/;
  const sylOf = (t, en) => t.split(/[^a-z']+/).flatMap((w) => {
    if (en) w = w.replace(/^(.*[aiueo].*[^aiueo])e([sd]?)$/, '$1$2').replace(/^([^aiueo]+)y$/, '$1ai').replace(/([^aiueo])y$/, '$1i').replace(/^i(?='|$)/, 'ai');
    return (w.match(/[aiueo]+/g) || []).flatMap((g) => g.match(en ? /ai|au|oi|ei|ou|oo|ee|ea|[aiueo]/g : /ai|au|oi|ei|[aiueo]/g));
  }).map((s) => DIPH[s] || s[0]);
  const syllables = (t) => { t = String(t).toLowerCase(); return sylOf(t, EN.test(t)); };
  // kata per baris: { text, lw (huruf kecil tanpa tanda baca), start (indeks suku kata pertama), n (jumlah suku kata),
  // c (kelompok tulisan tangan), nl (mulai baris ke-2 kelompok) }. Kelompok = maks 2 baris (±32 huruf), ditulis bergantian:
  // putus di tanda baca supaya frasa utuh, sisa pendek (< 9 huruf, mis. "night") ikut kelompok sebelumnya. Kelompok > 18 huruf
  // dibelah 2 baris seimbang (baris terpanjang sependek mungkin), lebih suka tepat setelah tanda baca
  const PUNCT = /[,.!?;:)]$/, lenOf = (a) => a.reduce((t, w) => t + w.length + 1, -1);
  function wordsOf(text) {
    const lt = String(text).toLowerCase(), en = EN.test(lt), ws = String(text).split(/\s+/).filter(Boolean), chunks = [];
    let cur = [];
    ws.forEach((w, i) => {
      if (cur.length && (lenOf([...cur, w]) > 32 || (PUNCT.test(cur.at(-1)) && lenOf(cur) >= 12)) && lenOf(ws.slice(i)) > 8) { chunks.push(cur); cur = []; }
      cur.push(w);
    });
    chunks.push(cur);
    let k = 0;
    return chunks.flatMap((ch, c) => {
      let sp = -1, best = 1e9;
      if (lenOf(ch) > 18) for (let j = 1; j < ch.length; j++) {
        const sc = Math.max(lenOf(ch.slice(0, j)), lenOf(ch.slice(j))) - (PUNCT.test(ch[j - 1]) ? 5 : 0);
        if (sc < best) { best = sc; sp = j; }
      }
      return ch.map((w, j) => {
        const n = sylOf(w.toLowerCase(), en).length, r = { text: w, lw: w.toLowerCase().replace(/[^a-z']/g, ''), start: k, n, c, nl: j === sp };
        k += n; return r;
      });
    });
  }
  // gerakan tangan per kata: [kiri, kanan] = [x, y, sudut jari (derajat), pose] di viewBox 400x380, null = tangan itu istirahat.
  // gaze = arah lirik mata, smirk = senyum miring, wag/hz = goyang sudut, rub = gosok (menangis), shake = geleng kepala
  const mir = (h) => h && [400 - h[0], h[1], 180 - h[2], h[3]];
  const GEST = {
    self: { R: [330, 305, -152, 'point'], gaze: [.45, .55] },
    you: { R: [388, 212, -12, 'point'], gaze: [1, .05], smirk: 1, alt: { R: [238, 322, -50, 'poke'], gaze: [0, .1], smirk: 1 } },   // alt = ke depan
    we: { L: mir([330, 305, -152, 'point']), R: [330, 305, -152, 'point'], gaze: [0, .6] },
    no: { R: [362, 196, -90, 'point'], wag: 22, hz: 2.6, shake: 1 },
    one: { R: [362, 168, -90, 'point'], gaze: [.55, -.8] },
    wait: { R: [378, 206, -82, 'open'], gaze: [.6, 0] },
    wave: { R: [382, 148, -76, 'open'], wag: 24, hz: 2.8, smirk: .6 },
    love: { L: [58, 262, -96, 'open'], R: mir([58, 262, -96, 'open']), smirk: .3 },
    cry: { L: [118, 236, -58, 'fist'], R: mir([118, 236, -58, 'fist']), rub: 1 },
    think: { R: [252, 334, -122, 'point'], gaze: [-.5, -.75], smirk: -.6 },
    up: { L: [40, 104, -112, 'open'], R: mir([40, 104, -112, 'open']), gaze: [0, -1] },
    yes: { R: [372, 214, -60, 'fist'], wag: 10, hz: 3.2, smirk: .5 },
    come: { R: [384, 236, -30, 'open'], wag: 28, hz: 2.2, gaze: [.8, 0] },
    there: { R: [396, 168, -36, 'point'], gaze: [1, -.5] },
    down: { L: [30, 330, 96, 'point'], R: mir([30, 330, 96, 'point']), gaze: [0, 1] },
    big: { L: [6, 196, -150, 'open'], R: mir([6, 196, -150, 'open']), smirk: .4 },
    small: { L: [150, 262, -30, 'point'], R: mir([150, 262, -30, 'point']), gaze: [0, .4] },
    shh: { R: [232, 256, -100, 'point'], smirk: .3 },
    look: { L: [120, 222, -40, 'open'], R: mir([120, 222, -40, 'open']), gaze: [1, -.2] },
    hug: { L: [254, 300, -164, 'open'], R: mir([254, 300, -164, 'open']), smirk: .3, gaze: [0, .5] },
    why: { L: [12, 246, -40, 'open'], R: mir([12, 246, -40, 'open']), wag: 8, hz: 1.5, gaze: [0, -.6] },
    go: { R: [400, 236, 0, 'point'], gaze: [1, 0] },
    heart: { L: [180, 300, -45, 'open'], R: mir([180, 300, -45, 'open']), smirk: .3 },
    sleep: { L: [112, 246, -120, 'open'], R: mir([112, 246, -120, 'open']), gaze: [0, .8] },
    dance: { L: [30, 150, -110, 'fist'], R: mir([30, 150, -110, 'fist']), wag: 18, hz: 3 },
    talk: { L: [58, 300, -60, 'open'], R: mir([58, 300, -60, 'open']), wag: 12, hz: 2.4 },
  };
  // gerakan badan saat bernyanyi: (fase ayunan, amplitudo) → [miring°, geser x, geser y, wajah x (menoleh), wajah y (+ = menunduk)].
  // Ketukan jatuh di sin(p) = ±1. nod = angguk tajam tepat di ketukan.
  const S2 = Math.sin, nod = (p, k) => k * Math.pow(Math.abs(S2(p)), 6);
  const MOVES = {
    sway: (p, a) => [S2(p) * a, 0, 0, S2(p) * 8, 0],   // pindah berat badan kiri-kanan, kepala ikut
    step: (p, a) => [S2(p) * a * .5, S2(p) * 12, -Math.abs(Math.cos(p)) * 9, S2(p) * 10, 0],   // langkah ke samping sambil melompat kecil
    bounce: (p, a) => [S2(p / 2) * a * .4, 0, -Math.abs(Math.cos(p)) * 11, 0, nod(p, 6)],   // memantul, kepala mengangguk di ketukan
    groove: (p, a) => [S2(p) * a * .8, S2(p) * 7, S2(2 * p) * 5, S2(p) * 12, S2(2 * p) * 3],   // angka 8
    rock: (p, a) => [S2(2 * p) * a * .35, 0, -Math.abs(S2(2 * p)) * 6, 0, nod(2 * p, 9)],   // angguk cepat (headbang ringan)
    slow: (p, a) => [S2(p / 2) * a * 1.2, S2(p / 2) * 4, 0, S2(p / 2) * 10, 4],   // ayunan pelan 2 ketukan
    look: (p, a) => [S2(p) * a * .3, 0, 0, Math.tanh(3 * S2(p)) * 20, -2],   // menoleh kiri-kanan, berhenti di ketukan
    nod: (p, a) => [S2(p / 2) * a * .3, 0, -Math.abs(Math.cos(p)) * 2, S2(p / 2) * 6, nod(p, 13)],   // mengangguk ikut ketukan
    bow: (p, a) => [S2(p / 2) * a * .5, 0, 4, S2(p / 2) * 6, 14],   // menunduk, ayun pelan
    shiver: (p, a) => [S2(p / 2) * a * .3 + S2(p * 11) * 1.6, S2(p * 13) * 1.5, 2, S2(p * 7) * 2, -3],   // gemetar, sedikit meringkuk
    recoil: (p, a) => [-5 + S2(p / 2) * a * .3, -6, 0, -16, -4],   // badan & muka menjauh
    slump: (p, a) => [S2(p / 2) * a * .35, 0, 7 - Math.abs(Math.cos(p / 2)) * 2, S2(p / 2) * 6, 12],   // merosot, kepala tertunduk
    shy: (p, a) => [S2(p / 2) * a * .5, S2(p / 2) * 3, 3, -10 + S2(p / 2) * 3, 9],   // goyang kecil, muka berpaling & menunduk
  };
  const DANCE = { happy: ['sway', 'step', 'bounce', 'groove', 'look', 'nod'], love: ['sway', 'groove', 'slow', 'look'], sad: ['slow', 'sway', 'bow'],
    angry: ['rock', 'bounce', 'step', 'nod'], fear: ['shiver'], anxiety: ['shiver', 'rock', 'look'], disgust: ['recoil', 'slow'], envy: ['slow', 'sway', 'look'],
    ennui: ['slump', 'bow'], embarrassed: ['shy', 'slow', 'bow'] };
  // musik cepat (≥ ~130 bpm, mis. dangdut koplo): lirik sedih pun dijogetkan ("joget ambyar"), wajah tetap sedih
  const DANCE_FAST = { sad: ['sway', 'bounce', 'nod'], love: ['groove', 'step', 'sway', 'look'], envy: ['sway', 'step', 'look'], ennui: ['sway', 'nod'], embarrassed: ['shy', 'sway'], disgust: ['recoil', 'sway'] };
  const GEST_RX = [
    ['self', /^(i|i'm|im|i'll|i've|i'd|me|my|mine|myself|aku|ku|saya|daku|gue|gua|kulo|awakku)$/],
    ['you', /^(you|you're|youre|you'll|your|yours|u|kamu|kau|engkau|dirimu|dikau|lo|lu|mu|kowe|sliramu|awakmu|panjenengan|sampeyan)$/],
    ['we', /^(we|we're|us|our|ours|kita|kami)$/],
    ['no', /^(no|not|never|nope|tidak|tak|nggak|gak|enggak|jangan|bukan|ora|ojo|dudu)$/],   // bukan can't/don't/won't: itu bukan penolakan
    ['one', /^(one|first|number|satu|pertama|nomor)$/],
    ['wait', /^(wait|stop|tunggu|berhenti|enteni|ngenteni)$/],
    ['wave', /^(hello|hi|hey|bye|goodbye|halo|hai|dadah|selamat)$/],
    ['heart', /^(hearts?|jantung)$/],   // bentuk hati di dada
    ['love', /^(lov|cinta|sayang|kasih|hati|tresn|atiku|atimu)/],
    ['cry', /^(cry|crying|cried|tears?|nangis|menangis|tangis|tangisan)$/],
    ['think', /^(think|thinking|thought|know|wonder|maybe|pikir|mikir|berpikir|tahu|tau|mungkin|ingat|ngerti|eling|mikir)$/],
    ['up', /^(up|high|sky|fly|flying|stars?|langit|tinggi|terbang|bintang|atas|naik)$/],
    ['yes', /^(yes|yeah|yea|yep|okay|ok|sure|ya|iya|yoi|oke|betul|benar|setuju)$/],
    ['come', /^(come|coming|here|closer|sini|kemari|datang|datanglah|mendekat|mrene|rene|teko)$/],
    ['there', /^(there|away|far|sana|situ|jauh|mrono|adoh)$/],
    ['down', /^(down|low|fall|falling|fell|ground|floor|bawah|turun|jatuh|tanah)$/],
    ['big', /^(big|huge|all|everything|world|everybody|everyone|whole|besar|semua|segalanya|dunia|banyak|sangat|banget)$/],
    ['small', /^(little|small|tiny|bit|kecil|sedikit|dikit)$/],
    ['shh', /^(secret|quiet|silent|shh|whisper|rahasia|diam|sst|bisik)$/],
    ['look', /^(look|see|saw|watch|eyes?|lihat|liat|melihat|tatap|mata)$/],
    ['hug', /^(hold|hug|hugs|embrace|together|peluk|dekap|bersama|genggam)$/],
    ['why', /^(why|kenapa|mengapa|kenopo|ngopo)$/],
    ['go', /^(go|gone|leave|left|run|running|pergi|lari|tinggalkan|berlalu|lungo|minggat|ninggal)$/],
    ['sleep', /^(sleep|dream|dreams|dreaming|night|tidur|mimpi|malam)$/],
    ['dance', /^(dance|dancing|party|jump|jumping|joget|menari|lompat|pesta|goyang|jogetan)$/],
  ];
  // gestur kata per baris: paling banyak 2, kata bermakna didahulukan dari kata ganti (aku/kamu/kita), berjarak >= 3 kata, supaya
  // tangan tidak gonta-ganti di tiap kata. → indeks kata yang boleh memicu gestur
  const PRON = ['self', 'you', 'we'];
  const gestPlan = (W) => {
    const NEG = /^(can't|cant|cannot|don't|dont|won't|wont|ain't|aint|never|not|tidak|tak|nggak|gak|jangan)$/;   // "can't wait" bukan "tunggu"
    const gs = W.map((w, i) => ({ i, g: w.n ? gestOf(w.lw) : '' })).filter((x) => x.g && !(x.g !== 'no' && x.i > 0 && NEG.test(W[x.i - 1].text.toLowerCase()))), pick = [];
    for (const x of [...gs.filter((x) => !PRON.includes(x.g)), ...gs.filter((x) => PRON.includes(x.g))])
      if (pick.length < 2 && !pick.some((q) => Math.abs(q.i - x.i) < 3)) pick.push(x);
    return pick.map((x) => x.i);
  };
  const gestOf = (lw) => (GEST_RX.find(([, rx]) => rx.test(lw)) || [])[0] || '';
  // tangan istirahat per emosi (kiri; kanan = cermin)
  const FIDGET = ['wave', 'think', 'look', 'yes', 'dance', 'shh'];
  const REST = { idle: [40, 326, 70, 'fist'], happy: [24, 292, -70, 'fist'], love: [30, 282, -64, 'open'], sad: [46, 336, 64, 'fist'], angry: [28, 232, -84, 'fist'],
    fear: [112, 240, -64, 'open'], anxiety: [168, 304, -18, 'fist'], embarrassed: [176, 300, -14, 'point'],   // tutup wajah / remas tangan / telunjuk diketuk-ketuk
    disgust: { L: [40, 326, 70, 'fist'], R: [380, 226, -70, 'open'] },   // satu tangan mendorong "ih"
    envy: { L: [262, 312, -8, 'fist'], R: mir([262, 312, -8, 'fist']) },   // bersedekap
    ennui: { L: [46, 340, 70, 'fist'], R: [268, 312, -118, 'fist'] } };   // dagu ditopang
  // koreografi saat bernyanyi: tiap rutinitas = (fase ayunan p, waktu tt) → [tangan kiri, tangan kanan?] ([x, y, sudut, pose]; kanan kosong = cermin
  // kiri). Fase p dikunci ke ketukan (sin(p) = ±1 tepat di ketukan, bt = 1 di ketukan). Dipilih menurut emosi lirik; kata lirik
  // (GEST) tetap menimpanya sesaat. spin = badan berputar 360° tiap 4 ketukan.
  const bt = (p) => Math.abs(S2(p)), up = (v) => Math.max(0, v);
  const CHORE = {
    kheart: (p) => [[84 + S2(p) * 6, 150 - bt(p) * 14, -62, 'kheart']],                                       // jari love Korea di samping kepala
    heartTop: (p) => [[146, 62 - bt(p) * 6, -26, 'open']],                                                    // dua tangan membentuk hati di atas kepala
    phone: (p) => [[46, 306, 70, 'fist'], [338, 196 - bt(p) * 6, 172 + S2(p) * 6, 'phone']],                  // satu tangan menelepon di telinga
    shaka: (p) => [[72, 238 - bt(p) * 8, -24 + S2(p) * 22, 'phone']],                                         // "hang loose", dua tangan
    armsUp: (p) => [[58 + S2(p) * 16, 118 - bt(p) * 10, -100 + S2(p) * 16, 'open'], [342 + S2(p) * 16, 118 - bt(p) * 10, -80 + S2(p) * 16, 'open']],   // tangan naik, melambai
    clap: (p) => { const o = 6 + 44 * (1 - bt(p)); return [[172 - o, 314, 0, 'open']]; },                      // tepuk tangan, bertemu di ketukan
    peace: (p) => [[46, 306, 70, 'fist'], [338, 170 - bt(p) * 8, -66 + S2(p) * 8, 'peace']],                  // salam dua jari
    pump: (p) => [[40, 304 - 170 * up(S2(p)), -90, 'fist'], [360, 304 - 170 * up(-S2(p)), -90, 'fist']],      // tinju naik bergantian
    disco: (p) => { const u = (S2(p / 2) + 1) / 2; return [[46, 306, 70, 'fist'], [352 - 92 * u, 112 + 188 * u, -55 + 190 * u, 'point']]; },   // telunjuk menyapu ala disko
    twirl: (p) => [[34, 236, -8 + S2(p) * 14, 'open']],                                                       // tangan terentang, badan berputar
    slowWave: (p) => [[60 + S2(p / 2) * 18, 138, -105 + S2(p / 2) * 14, 'open'], [340 + S2(p / 2) * 18, 138, -75 + S2(p / 2) * 14, 'open']],   // ayun pelan di atas kepala
    chest: (p) => [[160, 300 + S2(p / 2) * 4, -14, 'fist']],                                                  // tangan di dada
    hug: (p) => [[262, 312 + S2(p / 2) * 3, -8, 'fist']],                                                     // memeluk diri sendiri
    rockFist: (p) => [[56, 250 - 40 * bt(p), -82, 'fist']],                                                   // tinju mengentak
  };
  // Rutinitas dipilih dari MAKNA baris lirik (kata kunci), bukan acak: "call me" → menelepon, "love" → jari love, "dance" → berputar...
  // Baris tanpa kata kunci: bagian lagu yang keras (reff) → gerakan ramai sesuai emosi (CH_LOUD), bagian tenang → tangan istirahat
  // yang hanya ikut ketukan. Urutan = prioritas.
  const CH_RX = [
    ['peace', /\b(best friends?|bestie|sahabat)\b/],   // sebelum kata sayang: "best friend, baby" tetap gerakan yang sama sepanjang reff
    ['phone', /\b(call(s|ed|ing)?|phone|telephone|dial|hotline|telepon|telpon|nelpon|menelepon|hubungi)\b/],
    ['twirl', /\b(danc(e|ing|er)|spin(ning)?|twirl|party|joget|berjoget|menari|berdansa|dansa|pesta|goyang|putar|berputar)\b/],
    ['kheart', /\b(lov(e|es|ed|ing|er)|cinta|mencinta\w*|sayang|kasih|rindu|kangen|miss(ing)?|baby|babe|darling|honey|kiss|cium|sweet|manis|cantik|beautiful|pretty)\b/],
    ['hug', /\b(alone|lonely|lonesome|sendiri|sendirian|sepi|kesepian|cold|dingin|hold|peluk)\b/],
    ['chest', /\b(cry(ing)?|cried|tears?|hurt(s|ing)?|pain|break(s|ing)?|broke|broken|sorry|goodbye|nangis|menangis|sakit|luka|patah|maaf|pergi|hilang|lost|gone|late|terlambat)\b/],   // patah hati menang atas "heart"
    ['heartTop', /\b(heart|hearts|jantung|hatiku|hatimu|forever|selamanya|marry|menikah)\b/],
    ['rockFist', /\b(fight(ing)?|strong(er)?|power|fire|burn(ing)?|hate|angry|mad|never|lawan|kuat|api|bakar|benci|marah)\b/],
    ['armsUp', /\b(fly(ing)?|sky|high(er)?|free(dom)?|alive|shine|sun|light|sing(ing)?|shout|yeah|woo+|whoa|great|amazing|awesome|hebat|keren|terbang|langit|tinggi|bebas|hidup|bersinar|matahari|cahaya|nyanyi|bernyanyi|teriak)\b/],
    ['peace', /\b(peace|friends?|smil(e|ing)|happy|fun|okay|alright|damai|teman|sahabat|senyum|tersenyum|bahagia|senang|asik|asyik)\b/],
    ['clap', /\b(clap|applause|everybody|together|celebrate|tepuk|semua|bersama|rayakan)\b/],
  ];
  const lineChore = (t) => { t = String(t || '').toLowerCase(); return (CH_RX.find(([, rx]) => rx.test(t)) || [''])[0]; };
  const CH_LOUD = { happy: ['armsUp', 'clap', 'pump'], love: ['slowWave', 'armsUp'], sad: ['slowWave'], angry: ['pump', 'rockFist'] };
  // satu tangan berbulu, jari menunjuk ke +x: manset, 4 jari (open), telunjuk (point), telapak, jempol; pose baru: phone (jempol + kelingking,
  // "telepon"), kheart (jempol & telunjuk menyilang = jari love Korea), peace (V). Warna = gradien biru bulu badan (var --hfd), jadi ikut filter
  // karakter lain; helai runcing di tepinya (spikes) memberi kesan berbulu, garis tepi tipis menjaga bentuk jari tetap jelas
  const spikes = (cx, cy, rx, ry, n, len, a0, a1, seed) => {   // gumpalan bulat kecil di tepi (bukan segitiga runcing): tepi berbulu yang lembut
    const r = rnd(seed), f = (v) => Math.round(v * 10) / 10; let d = '';
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i + r() * .6) / n, c = len * (.38 + r() * .2);
      const x = cx + (rx + len * .1) * Math.cos(a), y = cy + (ry + len * .1) * Math.sin(a);
      d += `M${f(x - c)} ${f(y)}a${f(c)} ${f(c)} 0 1 0 ${f(2 * c)} 0a${f(c)} ${f(c)} 0 1 0 ${f(-2 * c)} 0Z`;
    }
    return `<path class="hr" d="${d}"/>`;
  };
  const tip = (x, y, w, h, seed) => spikes(x, y, w, h, 5, 5, -1.5, 1.5, seed);   // helai di ujung jari
  const HAND = '<g class="mb-hand" data-p="fist"><rect x="-36" y="-12" width="16" height="24" rx="6"/>' + spikes(-29, 0, 9, 12, 10, 6, 1.6, 4.7, 11) +
    '<g class="hp-open">' + [-40, -14, 12, 38].map((a, i) => `<g transform="rotate(${a})"><rect x="10" y="-6.5" width="32" height="13" rx="6.5"/>${tip(37, 0, 5, 6.5, 20 + i)}</g>`).join('') + '</g>' +
    '<g class="hp-point"><rect x="8" y="-16" width="36" height="13" rx="6.5"/>' + tip(39, -9.5, 5, 6.5, 31) + '</g>' +
    '<g class="hp-v">' + [-17, 17].map((a, i) => `<g transform="rotate(${a})"><rect x="8" y="-6" width="38" height="12" rx="6"/>${tip(41, 0, 5, 6, 60 + i)}</g>`).join('') + '</g>' +
    '<ellipse rx="22" ry="19"/>' + spikes(0, 0, 22, 19, 22, 6, .9, 5.4, 41) +
    '<g class="cf"><circle cx="15" cy="-9" r="7"/><circle cx="19" cy="0" r="7"/><circle cx="15" cy="9" r="7"/></g>' +
    '<g class="pt"><rect x="0" y="-6" width="34" height="12" rx="6" transform="rotate(-58)"/><g transform="rotate(-58)">' + tip(29, 0, 5, 6, 70) + '</g></g>' +
    '<g class="pk"><rect x="0" y="-5" width="28" height="10" rx="5" transform="rotate(52)"/></g>' +
    '<g class="kt"><rect x="4" y="2" width="34" height="11" rx="5.5" transform="rotate(-26 4 2)"/></g>' +
    '<g class="ki"><rect x="4" y="-13" width="34" height="11" rx="5.5" transform="rotate(26 4 -13)"/></g>' +
    '<path class="kh" transform="translate(42 -7) scale(.6)" d="M0 9C-20-4-13-20 0-9C13-20 20-4 0 9Z"/>' +
    '<g class="hp-poke"><rect x="4" y="-8.5" width="22" height="17" rx="8.5"/><circle cx="25" r="12.5"/><path class="nail" d="M29 -6.5a7 7 0 0 1 0 13"/></g>' +
    '<ellipse class="to" cx="-2" cy="-19" rx="7.5" ry="11" transform="rotate(-55 -2 -19)"/><ellipse class="tp" cx="6" cy="5" rx="11" ry="7"/></g>';
  const vowelsOf = (t) => { const v = syllables(t); return v.length ? v : ['a', 'i', 'u', 'e', 'o']; };
  // wajah saat menyanyi, ditimpakan ke mood 'sing' sesuai emosi baris lirik (m.singMood)
  const SING = {
    happy: { tL: 0, tR: 0, bL: .45, bR: .45, arc: 1 },   // mata terbuka tersenyum (mood 'sing' asli memejam)
    love: { tL: 0, tR: 0, bL: .35, bR: .35, arc: 1, love: 1, blush: 1, mC: .8 },
    sad: { tL: .4, tR: .4, arc: 1, tilt: .5, pupil: 1.15, mC: -.35, blush: .2, fy: 6 },   // fy = menunduk, fx = menoleh
    angry: { tL: .3, tR: .3, arc: 1, tilt: -.55, mC: -.45, blush: 0 },
    fear: { ...MOODS.fear, arc: 1, blush: 0, look: [0, -.2], dart: 1, fy: -4 },   // look = arah mata, dart = melirik ke sana-sini, sk = senyum miring
    disgust: { ...MOODS.disgust, arc: 1, blush: 0, look: [-.6, .1], sk: -.8, fx: -8 },
    anxiety: { ...MOODS.anxiety, arc: 1, blush: .1, look: [0, 0], dart: 1 },
    envy: { ...MOODS.envy, arc: 1, blush: 0, look: [.95, .1], sk: .6, fx: 8 },
    ennui: { ...MOODS.ennui, arc: 1, blush: 0, look: [-.3, .5], fy: 6 },
    embarrassed: { ...MOODS.embarrassed, arc: 1, look: [-.6, .6], fy: 5 },
  };

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
    '.mascot-bulu.saying .mb-lyric{opacity:0}' +
    '.mb-hand rect,.mb-hand ellipse,.mb-hand circle{fill:var(--hf,var(--hfd,#fff));stroke:var(--hk,#1f5fb8);stroke-width:1.9;stroke-linejoin:round}' +
    '.mb-hand path.hr{fill:var(--hf,var(--hfd,#fff));stroke:none}.mb-hand .kh{fill:#ff5c8a;stroke:#d63a6c;stroke-width:1.6}' +
    '.mb-hand .hp-open,.mb-hand .hp-point,.mb-hand .hp-poke,.mb-hand .hp-v,.mb-hand .tp,.mb-hand .pt,.mb-hand .pk,.mb-hand .cf,.mb-hand .kt,.mb-hand .ki,.mb-hand .kh,' +
    '.mb-hand[data-p=point] .to,.mb-hand[data-p=phone] .to,.mb-hand[data-p=kheart] .to{display:none}.mb-hand .nail{fill:none;stroke:var(--hk,#1f5fb8);stroke-width:2;stroke-linecap:round}' +
    '.mb-hand[data-p=poke] .hp-poke,.mb-hand[data-p=open] .hp-open,.mb-hand[data-p=point] .hp-point,.mb-hand[data-p=point] .tp,.mb-hand[data-p=peace] .hp-v,' +
    '.mb-hand[data-p=phone] .pt,.mb-hand[data-p=phone] .pk,.mb-hand[data-p=phone] .cf,.mb-hand[data-p=kheart] .kt,.mb-hand[data-p=kheart] .ki,.mb-hand[data-p=kheart] .kh{display:inline}' +
    '.mb-hw{position:absolute;left:114%;top:50%;transform:translateY(-50%);width:max-content;white-space:nowrap;font:400 26px/1.1 "Ink Free","Segoe Print","Comic Sans MS",cursive;color:#fff;' +
    'text-shadow:0 0 2px #000,0 0 5px rgba(0,0,0,.7);pointer-events:none;opacity:0;transition:opacity .3s}' +
    '.mb-hw>div{display:flex;gap:0 .3em}.mb-hw.ink{color:#15151c;text-shadow:0 0 2px #fff,0 0 5px rgba(255,255,255,.8)}.mb-hw.left{left:auto;right:104%}.mb-hw.show{opacity:1}' +
    '.mb-hw span{display:inline-block;animation:mbhw var(--d,.35s) ease-out both}@keyframes mbhw{from{clip-path:inset(-20% 100% -20% 0)}to{clip-path:inset(-20% 0 -20% 0)}}';
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
      draggable: true, shadow: true, gravity: true, floor: 24, sleepAfter: 0, tapLines: null, onTap: null, fps: 60, idleFps: 0 }, options || {});
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
    // tepi lembut lewat gradien radial, bukan filter blur (filter dirender ulang tiap frame karena badan bergerak = boros CPU)
    const soft = (id, c) => `<radialGradient id="${U}-${id}">` + [[0, 1], [.5, .8], [.8, .3], [1, 0]].map(([of, a]) => `<stop offset="${of}" stop-color="${c}" stop-opacity="${a}"/>`).join('') + '</radialGradient>';
    const eyeSvg = (i, cx) =>
      // tepi kanan-bawah rongga menangkap cahaya (cekungan terlihat ditekan ke dalam)
      `<ellipse class="sk" cx="${cx + 2.5}" cy="${EY + 3.5}" rx="${CRX}" ry="${CRY}" fill="#bfe0ff" opacity=".6"/>` +
      `<ellipse class="sk" cx="${cx}" cy="${EY}" rx="${CRX}" ry="${CRY}" fill="url(#${U}-fp)"/>` +
      `<g class="eye" style="transform-origin:${cx}px ${EY}px" clip-path="url(#${U}-c${i})">` +
      `<g class="ir"><ellipse class="ic" cx="${cx}" cy="${EY}" rx="${ERX}" ry="${ER}" fill="url(#${U}-cl)"/>` +
      `<g clip-path="url(#${U}-ie${i})">` +
      `<ellipse cx="${cx - ERX * .28}" cy="${EY - ER * .42}" rx="${ERX * .55 + 6}" ry="${ER * .3 + 6}" fill="url(#${U}-gw)" opacity=".09"/>` +
      `<ellipse cx="${cx + ERX * .1}" cy="${EY + ER * .8}" rx="${ERX * .7 + 6}" ry="${ER * .2 + 6}" fill="url(#${U}-gb)" opacity=".22"/></g>` +
      `<path class="ht" d="M0 9C-20-4-13-20 0-9C13-20 20-4 0 9Z" fill="#ff5c8a" opacity="0"/></g>` +
      `<path class="lt" fill="url(#${U}-fp)"/><ellipse class="lb" fill="url(#${U}-fp)" opacity="0"/></g>` +
      // dasar rongga sedikit lebih gelap + bayangan dalam di tepi kiri-atas
      `<g class="sk" clip-path="url(#${U}-c${i})"><ellipse cx="${cx}" cy="${EY}" rx="${CRX}" ry="${CRY}" fill="#0b3c96" opacity=".16"/>` +
      `<ellipse cx="${cx}" cy="${EY}" rx="${CRX}" ry="${CRY}" fill="url(#${U}-gi)"/></g>` +
      `<path class="ar" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" opacity="0"/>` +
      `<g clip-path="url(#${U}-c${i})"><g class="sp" opacity="0"><ellipse cx="${cx}" cy="${EY}" rx="${ERX + 2}" ry="${ER + 2}" fill="#fff"/>` +
      `<path class="spp" d="${SPIRAL}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g></g>`;

    wrap.innerHTML =
      `<svg viewBox="0 0 400 ${VH}" xmlns="http://www.w3.org/2000/svg"><defs>` +
      `<pattern id="${U}-fp" patternUnits="userSpaceOnUse" width="400" height="${VH}"><image class="fpi" width="400" height="${VH}"/></pattern>` +
      `<linearGradient id="${U}-hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78bdff"/><stop offset=".55" stop-color="#4399f2"/><stop offset="1" stop-color="#2a7bdc"/></linearGradient>` + soft('gs', '#0a2a66') + soft('gc', '#ff8fc7') + soft('gw', '#fff') + soft('gb', '#6a97ff') +
      `<radialGradient id="${U}-gi" cx=".56" cy=".58" r=".62"><stop offset=".72" stop-color="#0a3585" stop-opacity="0"/><stop offset=".9" stop-color="#0a3585" stop-opacity=".45"/><stop offset="1" stop-color="#0a3585" stop-opacity=".62"/></radialGradient>` +
      `<radialGradient id="${U}-cl" cx=".38" cy=".28" r=".85"><stop offset="0" stop-color="#32323b"/><stop offset=".5" stop-color="#17171c"/><stop offset="1" stop-color="#060609"/></radialGradient>` +
      `<clipPath id="${U}-ie0"><ellipse class="ie" cx="${CX - EDX}" cy="${EY}" rx="${ERX}" ry="${ER}"/></clipPath><clipPath id="${U}-ie1"><ellipse class="ie" cx="${CX + EDX}" cy="${EY}" rx="${ERX}" ry="${ER}"/></clipPath>` +
      `<clipPath id="${U}-c0"><ellipse cx="${CX - EDX}" cy="${EY}" rx="${ERX + 9}" ry="${ER + 9}"/></clipPath><clipPath id="${U}-c1"><ellipse cx="${CX + EDX}" cy="${EY}" rx="${ERX + 9}" ry="${ER + 9}"/></clipPath><clipPath id="${U}-mc"><path class="mc"/></clipPath></defs>` +
      (o.shadow ? `<ellipse class="sh" cx="200" cy="343" rx="130" ry="25" fill="url(#${U}-gs)" opacity=".22"/>` : '') +
      `<g class="body">` +
      `<path class="f0" fill="#2f86e6"/><path class="f1" fill="#4aa4fa"/><path class="f2" fill="#7cc4ff"/><image class="fedge" x="0" y="0" width="400" height="${VH}"/><image class="fimg" x="0" y="0" width="400" height="${VH}"/>` +
      `<g class="face"><ellipse class="ch" cx="100" cy="274" rx="29" ry="20" fill="url(#${U}-gc)" opacity="0"/><ellipse class="ch" cx="300" cy="274" rx="29" ry="20" fill="url(#${U}-gc)" opacity="0"/>` +
      eyeSvg(0, CX - EDX) + eyeSvg(1, CX + EDX) +
      `<path class="mo" fill="${INK}" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0"/><ellipse class="tg" fill="#ff6f91" clip-path="url(#${U}-mc)" opacity="0"/></g>` +
      `<g class="st" opacity="0">${('<path d="' + STAR + '" fill="#ffd23f" stroke="#e8a600" stroke-width="2" stroke-linejoin="round"/>').repeat(5)}</g>` +
      `</g><g class="hands" opacity="0" style="--hfd:url(#${U}-hf)">${HAND}${HAND}</g><g class="nt"></g><g class="zz" fill="#7aa8ff" font-family="system-ui,sans-serif" font-weight="800" opacity="0"><text x="292" y="110" font-size="28">z</text><text x="316" y="84" font-size="22">z</text><text x="334" y="62" font-size="16">z</text></g></svg>` +
      '<div class="mb-bubble"></div><div class="mb-lyric"></div><div class="mb-hw"></div>';
    host.appendChild(wrap);

    const $ = (s, p) => (p || wrap).querySelector(s);
    const svg = $('svg'), bodyG = $('.body'), faceG = $('.face'), shadow = $('.sh'), bubble = $('.mb-bubble'), zz = $('.zz'), mouth = $('.mo'), tongue = $('.tg'), mclip = $('.mc'), lyr = $('.mb-lyric'), hw = $('.mb-hw'), handsG = $('.hands'), hands = [...handsG.children].map((el) => ({ el, x: 200, y: 300, a: 0, p: 'fist', pop: 0 })), ntG = $('.nt'), fedge = $('.fedge');
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
      singing: false, bpm: 100, beatPh: 0, beatN: 0, bper: .6, swayPh: 0, swayAmp: 3, dm: 'sway', dmP: 'sway', dmA: 1, en: .5, dance: [0, 0, 0, 0, 0], fx: 0, fy: 0, talk: null, nextFidget: 6, nextDart: 0, dartX: 0, flav: 'happy', lflav: '', dflav: '', words: [], wi: -1, hwN: 0, hwC: -1, gest: { name: '', until: 0 }, ch: '', chFix: false, lineCh: '', gOk: [], hv: 1, hs: 0, handA: 0, hb: 0, smk: 0, handsOn: true, hwOn: true, timed: false, hum: 1, venv: 1, lt0: 0, lt1: 0, lvl: 0, extLvl: 0, extT: -99, prevBase: 'neutral', notes: [], lyr: null,
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
      const m = Object.assign({}, BASE, MOODS[name] || MOODS.neutral, name === 'sing' && SING[S.flav]);
      Object.assign(tgt, m);
      wrap.dataset.mood = name === 'sing' ? S.flav : name;   // CSS hook (telinga karakter, dll.): sing → emosi lirik
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
      // tempo = jarak antar-ketukan (rata-rata bergerak; ketukan yang terlewat dibagi dua), lalu fase ayunan dikunci:
      // tiap ketukan jatuh di titik ayunan terjauh (kiri, kanan, kiri, ...) — seperti orang memindah berat badan
      // tempo (S.bper) datang dari m.tempo() (autokorelasi di src-tauri); ketukan di sini hanya menggeser fase, pelan,
      // supaya ketukan sinkopasi yang ikut terdeteksi tidak membuat ayunan tersentak
      const P = S.bper < .5 ? Math.PI / 2 : Math.PI, tgtPh = Math.PI / 2 + Math.round((S.swayPh - Math.PI / 2) / P) * P;   // setengah tempo: ketukan juga di titik tengah
      S.swayPh += (tgtPh - S.swayPh) * .3; S.swayAmp = Math.max(S.swayAmp, 5 + 5 * Math.min(k, 1));
      S.sy.x = 1 - .09 * k; S.sy.v = 0; S.hb = 1;
      if (S.jy >= 0 && !S.move && !S.falling && !(S.drag && S.drag.moved) && S.windup <= 0 && !S.asleep) S.jv = -Math.sqrt(2 * G * U_() * 7 * k * U_());
      const ms = (S.bper < .46 && DANCE_FAST[S.flav]) || DANCE[S.flav] || DANCE.happy;
      if ((S.beatN & 15) === 0 || !ms.includes(S.dm)) {   // ganti gerakan tiap 4 bar (16 ketukan) atau saat emosi berubah
        const n = ms.filter((x) => x !== S.dm), nx = n[Math.floor(Math.random() * n.length)] || ms[0];
        if (nx !== S.dm) { S.dmP = S.dm; S.dm = nx; S.dmA = 0; }
      }
      if (!S.chFix) {
        const cs = S.en > .55 ? CH_LOUD[S.flav] || [] : [];   // S.en = energi lagu (lambat): keras = reff
        if (S.lineCh) S.ch = S.lineCh;                         // makna baris lirik menang
        else if (!cs.length) S.ch = '';
        else if ((S.beatN & 7) === 0 || !cs.includes(S.ch)) { const n = cs.filter((x) => x !== S.ch); S.ch = n[Math.floor(Math.random() * n.length)] || cs[0]; }
      }
      if (S.ch === 'twirl' && (S.beatN & 3) === 0 && S.spin < 0 && !S.move && !S.falling) { S.spin = 0; S.jv = Math.min(S.jv, -Math.sqrt(2 * G * U_() * 11 * U_())); }
      if ((S.beatN++ & 1) === 0 || k > 1.2) spawnNote();
    }
    function sing(on, op) {
      if (on === false) { if (S.singing) { S.singing = false; setMood(S.prevBase); } return; }
      if (S.asleep) wake();
      if (!S.singing) S.prevBase = S.base;
      S.singing = true; S.beatPh = 0; if (op && op.bpm != null) S.bpm = op.bpm; if (S.bpm > 0) S.bper = 60 / S.bpm;
      setMood('sing');
    }
    function lyric(text) {
      S.timed = syllables(text || '').length > 0; S.lineCh = lineChore(text); if (!S.chFix && S.lineCh) S.ch = S.lineCh;
      S.gOk = S.lineCh || !text ? [] : gestPlan(wordsOf(text));   // baris yang punya rutinitas sendiri tidak diselingi gestur kata
      S.words = text ? wordsOf(text) : []; S.wi = -1; S.hwN = 0; S.hwC = -1; hw.classList.remove('show');
      if (!text) { S.vseq = vowelsOf(''); S.vi = 0; lyr.classList.remove('show'); return; }
      S.vseq = vowelsOf(text); S.vi = 0;
      lyr.textContent = text; lyr.classList.remove('swap'); void lyr.offsetWidth; lyr.classList.add('show', 'swap');
    }
    function vowel(ch, ms) { S.vforce = String(ch).toLowerCase(); S.vhold = (ms || 600) / 1000; }   // tahan satu vokal (a i u e o)
    function vowels(seq) { S.vseq = vowelsOf(Array.isArray(seq) ? seq.join('') : seq); S.vi = 0; }
    function lyrics(lines, getTime) { S.lyr = lines ? { lines, get: getTime || (() => 0), i: -2 } : null; if (!lines) { lyric(''); singMood(''); } }
    // kata yang sedang dinyanyikan (vi = indeks suku kata; 1e9 = baris selesai) → gerakan tangan + tulisan tangan
    function words(vi, sylDur, now) {
      const W = S.words; let k = -1;
      for (let j = 0; j < W.length; j++) if (W[j].n && W[j].start <= vi) k = j;
      if (k !== S.wi) {
        S.wi = k; const g = k >= 0 && S.gOk.includes(k) && gestOf(W[k].lw);
        if (g) setGest(g, now + Math.max(1400, W[k].n * sylDur * 1000 + 700));
      }
      if (!S.hwOn) return;
      let added = false;
      while (S.hwN < W.length && W[S.hwN].start <= vi && (W[S.hwN].n || W[S.hwN].start < vi || vi === 1e9 || S.hwN + 1 === W.length || W[S.hwN + 1].start <= vi)) {
        const w = W[S.hwN++];
        if (w.c !== S.hwC) {   // kelompok baru: hapus, dan pilih sisi yang masih muat di layar
          S.hwC = w.c; hw.textContent = ''; S.hwL = null;
          const r = wrap.getBoundingClientRect(); hw.classList.toggle('left', r.right + o.size * .2 + 150 > innerWidth);
        }
        const sp = document.createElement('span'); sp.textContent = w.text;
        sp.style.transform = `rotate(${n2((Math.random() - .5) * 8)}deg) translateY(${n2((Math.random() - .5) * 6)}px)`;
        sp.style.setProperty('--d', n2(clamp(Math.max(1, w.n) * sylDur * .5, .12, .35)) + 's');
        if (!S.hwL || w.nl) S.hwL = hw.appendChild(document.createElement('div'));   // baris 1 / 2
        S.hwL.appendChild(sp); added = true;
      }
      if (added) {   // baris terpanjang kelompok > 16 huruf → huruf mengecil
        let len = 0, cur = 0;
        for (const x of W) if (x.c === S.hwC) { cur = x.nl ? 0 : cur; cur += x.text.length + 1; len = Math.max(len, cur); }
        hw.style.fontSize = n2(Math.max(15, o.size * .14 * Math.min(1, 17 / len))) + 'px'; hw.classList.add('show');
      }
    }
    // tangan: target dari gerakan aktif (atau pose istirahat sesuai emosi), dihaluskan; ikut transform badan
    function drawHands(bodyT, dt, tt, now) {
      const talking = !S.singing && (now < S.talkUntil || S.vhold > 0);
      if (talking && S.talk) {   // bicara: kata di gelembung (≈70 ms/huruf, sama dengan say) → gerakan
        const t = now - S.talk.t0, ws = S.talk.ws; let j = -1;
        while (j + 1 < ws.length && ws[j + 1].at <= t) j++;
        if (j !== S.talk.k) { S.talk.k = j; const gn = j >= 0 && gestOf(ws[j].lw); if (gn) setGest(gn, now + 900); }
      } else if (!S.singing && now > S.gest.until && tt > S.nextFidget) {   // diam: sesekali iseng bergerak
        setGest(FIDGET[Math.floor(Math.random() * FIDGET.length)], now + 1400); S.nextFidget = tt + 8 + Math.random() * 10;
      }
      S.handA += ((S.handsOn && !S.asleep ? 1 : 0) - S.handA) * Math.min(1, dt * 6);
      const hvis = S.hv < 1 ? Math.max(0, S.hv) ** .5 : 1;
      handsG.setAttribute('opacity', n2(S.handA * hvis));
      if (S.handA < .01) return;
      handsG.setAttribute('transform', bodyT);
      S.hb = Math.max(0, S.hb - dt * 5);
      const g = (now < S.gest.until && S.gest.g) || (talking && GEST.talk), rest = S.singing ? REST[S.flav] || REST.happy : REST.idle, k = Math.min(1, dt * 14);
      const cp = !g && S.singing && S.ch && CHORE[S.ch] ? CHORE[S.ch](S.swayPh, tt) : null;
      hands.forEach((h, i) => {
        const own = g && (i ? g.R : g.L);
        let [x, y, a, p] = own || (cp ? (i ? cp[1] || mir(cp[0]) : cp[0]) : Array.isArray(rest) ? (i ? mir(rest) : rest) : i ? rest.R : rest.L);
        if (!own && !S.singing) y += Math.sin(tt * 2.2 + i) * 3;   // diam: ikut bernapas
        if (!own && S.singing && !cp) {   // istirahat: senang = tangan naik-turun bergantian tiap ketukan, marah = gemetar, sedih = diam
          if (S.flav === 'happy' || S.flav === 'love') y -= 16 * S.hb * (((S.beatN + i) & 1) ? 1 : .35);
          if (S.flav === 'angry' || S.flav === 'fear') x += Math.sin(tt * 31 + i) * 2.5;
          if (S.flav === 'embarrassed') x += (i ? 5 : -5) * (1 + Math.sin(tt * 8));
          if (S.flav === 'anxiety') { x += Math.sin(tt * 9 + i * 3) * 5; a += Math.sin(tt * 7) * 10; }   // meremas tangan
        }
        if (own && g.wag) a += Math.sin(tt * TAU * g.hz) * g.wag;
        if (own && g.rub) x += Math.sin(tt * 12 + i * 3) * 6;
        if (S.hv < 1) x = 200 + (x - 200) * Math.max(.05, S.hv);   // tangan ikut berayun melingkar saat badan berputar
        h.x += (x - h.x) * k; h.y += (y - h.y) * k;
        h.a += ((((a - h.a) % 360) + 540) % 360 - 180) * k;   // sudut terdekat
        if (p !== h.p) { h.p = p; h.el.setAttribute('data-p', p); }
        h.pop = Math.max(0, h.pop - dt * 4);
        const s = 1.05 * (1 + .18 * h.pop) * (p === 'poke' ? 1.15 : 1), flip = Math.cos(h.a * Math.PI / 180) < 0 ? -1 : 1;   // jempol tetap di atas
        h.el.setAttribute('transform', `translate(${n2(h.x)} ${n2(h.y)}) rotate(${n2(h.a)}) scale(${n2(s)} ${n2(s * flip)})`);
      });
    }
    // gerakan aktif: varian (alt, mis. menunjuk ke depan) dan gerakan satu tangan acak kiri/kanan (dicerminkan)
    function setGest(name, until) {
      let g = GEST[name]; if (g.alt && Math.random() < .6) g = g.alt;
      if (!g.L && Math.random() < .5) g = { ...g, L: mir(g.R), R: null, gaze: g.gaze && [-g.gaze[0], g.gaze[1]] };
      S.gest = { name, until, g }; hands.forEach((h) => (h.pop = 1));
    }
    function singMood(f, asDefault) {   // emosi lirik (lihat SING). asDefault = for lines without a mood (e.g. from the song's key)
      if (asDefault) S.dflav = f; else S.lflav = f;
      f = SING[S.lflav] ? S.lflav : SING[S.dflav] ? S.dflav : 'happy'; if (f === S.flav) return;
      S.flav = f; if (S.base === 'sing' && performance.now() > S.tmpUntil) setMood('sing');   // mood sementara aktif → diterapkan saat ia habis
    }
    function say(text, ms) {
      clearTimeout(S.bubbleTimer); bubble.textContent = text; bubble.classList.add('show'); wrap.classList.add('saying');
      ms = ms || 2600; S.talkUntil = performance.now() + Math.min(ms, text.length * 70 + 300);
      let at = 0; S.talk = { t0: performance.now(), k: -1, ws: wordsOf(text).map((w) => ((w.at = at), (at += (w.text.length + 1) * 70), w)) };
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
    function wake() { bump(); /* bump first: else the idle timer is still expired and it dozes off next frame */ if (!S.asleep) return; setMood('neutral'); setMood('surprised', 700); jump(40); }
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
      // batas fps (hemat CPU): penuh saat ada gerak besar, idleFps saat tenang (bernapas, bergoyang pelan)
      const busy = S.move || S.falling || S.drag || S.jy < 0 || S.windup > 0 || S.spin >= 0 || S.shk > 0 || S.wig > 0;
      if (now - S.last < 1000 / (busy || !o.idleFps ? o.fps : o.idleFps) - 2) return;
      const dt = Math.min(.05, (now - S.last) / 1000); S.last = now; if (dt <= 0) return;
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
      if (o.sleepAfter && !S.singing && !S.asleep && !S.move && now > S.tmpUntil && now - S.lastAct > o.sleepAfter) setMood('sleep');   // a timed mood (e.g. angry) keeps it awake
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
        S.lvl += (tl * S.venv - S.lvl) * Math.min(1, dt * 18);
        S.swayPh += dt * Math.PI / (S.bper < .5 ? S.bper * 2 : S.bper);   // >120 bpm → one swing per 2 beats
        S.swayAmp += (3 - S.swayAmp) * Math.min(1, dt * .4);   // tanpa ketukan → ayunan mengecil pelan
        S.en += (S.lvl - S.en) * Math.min(1, dt * .6);   // energi lambat: bagian keras/reff → gerakan lebih besar
        S.dmA = Math.min(1, S.dmA + dt / (S.bper * 2));   // crossfade antar gerakan selama 2 ketukan
        const a = S.swayAmp * (.6 + .8 * S.en), A = MOVES[S.dmP](S.swayPh, a), B = MOVES[S.dm](S.swayPh, a);
        S.dance = A.map((v, i) => v + (B[i] - v) * S.dmA);
        if (!S.move) lean = S.dance[0];
      } else S.dance = [0, 0, 0, 0, 0];

      // bentuk mulut vokal. Baris lirik bertimer: suku kata disebar dari awal baris (tempo ~ setengah ketukan per suku kata,
      // dipadatkan bila baris berikut lebih cepat), mulut menutup sebentar di antara suku kata, vokal terakhir ditahan.
      // Tanpa timer: berganti tiap setengah ketukan. m.vowel() menahan satu vokal.
      if (S.vhold > 0) S.vhold -= dt;
      S.venv = 1;
      const lt = S.lyr && S.timed && S.lyr.i >= 0 ? S.lyr.get() + LEAD : NaN;
      let vsing = false;   // mulut hanya berbentuk vokal saat ada baris lirik yang sedang dinyanyikan; musik saja = mulut tertutup, badan saja yang goyang
      if (S.singing && S.vhold <= 0 && isFinite(lt)) {
        // suku kata memenuhi durasi baris (penyanyi jarang selesai jauh sebelum baris berikut), maks .75 dtk/suku kata
        // untuk jeda instrumental; suku kata terakhir ditahan 2× lebih lama → kata terakhir tidak muncul terlalu cepat
        const n = S.vseq.length, span = clamp(S.lt1 - S.lt0 - .3, .3, n * .75);
        const u = Math.max(0, (lt - S.lt0) / span) * (n + 1), f = u <= n - 1 ? u : n - 1 + (u - n + 1) / 2;
        S.vi = Math.min(n - 1, Math.floor(f)); if (f < n) S.venv = .3 + .7 * Math.sqrt(Math.sin(Math.PI * (f % 1)));
        words(f >= n ? 1e9 : S.vi, span / n, now);
        vsing = f < n;   // suku kata terakhir sudah selesai (jeda panjang sampai baris berikut) → mulut menutup
      }
      S.hum += ((S.singing && S.vhold <= 0 && !vsing ? 1 : 0) - S.hum) * Math.min(1, dt * 10);
      if (!(S.singing && isFinite(lt)) && hw.classList.contains('show')) hw.classList.remove('show');
      // gerakan aktif juga mengatur wajah: arah mata, senyum miring, geleng
      const gx = now < S.gest.until && S.gest.g;
      const fl = S.singing && S.base === 'sing' && SING[S.flav];
      if (gx && gx.gaze && S.handA > .5) { S.lookTX = gx.gaze[0]; S.lookTY = gx.gaze[1]; S.lastPtr = now; }
      else if (fl && fl.look) {   // takut/cemas: mata melirik cepat ke sana-sini; iri: melirik ke samping; malu: menunduk
        if (fl.dart && tt > S.nextDart) { S.dartX = Math.random() * 2 - 1; S.nextDart = tt + .3 + Math.random() * .5; }
        S.lookTX = fl.dart ? S.dartX : fl.look[0]; S.lookTY = fl.look[1]; S.lastPtr = now;
      }
      if (gx && gx.shake && S.handA > .5) lean += Math.sin(tt * 15) * 4;
      S.smk += (((gx && gx.smirk) || (fl && fl.sk) || 0) - S.smk) * Math.min(1, dt * 8);
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
      const rot = S.rot.x + Math.sin(tt * 4.5) * 11 * cur.dizzy + Math.sin(tt * 32) * 12 * S.shk * S.shk + Math.sin(tt * 28 + 1) * 5 * S.wig;
      // putaran 3D (sumbu tegak): badan bulat tetap, wajah bergeser ke samping, menyempit lalu hilang di belakang dan muncul dari sisi lain
      const th = spinA * Math.PI / 180, tcs = S.spin >= 0 ? Math.cos(th) : 1, tsn = S.spin >= 0 ? Math.sin(th) : 0;
      S.hv = tcs; S.hs = tsn;
      const pivTarget = S.grabbed ? 70 : FEET;
      S.pivot += (pivTarget - S.pivot) * (1 - Math.exp(-dt * 14));
      S.energy += (Math.min(1, Math.abs(S.jv) / (900 * U2) + S.wig + S.shk + (S.move || S.falling ? .5 : 0)) - S.energy) * Math.min(1, dt * 6);

      const jy = S.jy * 400 / o.size;
      const [, dX, dY, dFx, dFy] = S.move || S.falling ? [0, 0, 0, 0, 0] : S.dance;
      // wajah: menoleh (geser + sedikit menyempit) / menunduk; dari gerakan tari + pose emosi + sedikit ikut arah mata
      const tfx = dFx + ((fl && fl.fx) || 0) + S.lx.x * 7, tfy = dFy + ((fl && fl.fy) || 0) + S.ly.x * 5, kf = Math.min(1, dt * 12);
      S.fx += (tfx - S.fx) * kf; S.fy += (tfy - S.fy) * kf;
      faceG.setAttribute('transform', `translate(${n2(S.fx + tsn * 128)} ${n2(S.fy)}) translate(200 ${EY}) scale(${n2(Math.max(.001, (1 - Math.abs(S.fx) * .004) * (S.spin >= 0 ? Math.max(0, tcs) : 1)))} 1) translate(-200 ${-EY})`);
      faceG.setAttribute('opacity', tcs > .06 ? 1 : 0);
      const bodyT = `translate(${n2(dX)} ${n2(jy + dY)}) translate(200 ${n2(S.pivot)}) rotate(${n2(rot)}) scale(${n2(sx * 1000) / 1000} ${n2(sy * 1000) / 1000}) translate(-200 ${n2(-S.pivot)})`;
      bodyG.setAttribute('transform', bodyT);
      drawHands(bodyT, dt, tt, now);
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
        const L = S.lyr.lines, t = S.lyr.get() + LEAD;
        if (isFinite(t)) {
          let i = S.lyr.i; if (i < 0 || L[i].t > t) i = -1;
          while (i + 1 < L.length && L[i + 1].t <= t) i++;
          if (i !== S.lyr.i) {
            S.lyr.i = i; lyric(i >= 0 ? L[i].text : ''); if (S.moodI !== i) singMood(i >= 0 && L[i].mood); S.moodI = i;
            S.lt0 = i >= 0 ? L[i].t : 0; S.lt1 = L[i + 1] ? L[i + 1].t : S.lt0 + 5;
          }
          const nx = L[S.lyr.i + 1];
          if (nx && nx.t - t < MOOD_LEAD && S.moodI !== S.lyr.i + 1) { S.moodI = S.lyr.i + 1; singMood(nx.mood); }
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
      const vp = !talking && ((S.singing && S.hum < .98) || S.vhold > 0);
      if (vp) { mA = 1; mC = S.vow.c; mO = S.vow.o * (.35 + .65 * S.lvl) * (S.vhold > 0 ? 1 : 1 - S.hum); }
      else if (S.singing && !talking) mO = 0;   // bersenandung / instrumental: senyum tertutup, bukan mulut menganga (mood 'sing')
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
      const mT = Math.abs(S.smk) > .02 ? `rotate(${n2(S.smk * 10)} 200 ${y0}) translate(${n2(S.smk * 4)} 0)` : '';   // senyum miring
      mouth.setAttribute('transform', mT); tongue.setAttribute('transform', mT);
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
      jump, spin() { jump(90); S.spin = 0; }, choreo(name) { S.ch = name || ''; S.chFix = !!name; },   // choreo('kheart'): pakai satu rutinitas terus (uji); kosong = otomatis lagi
       shake() { S.shk = 1; }, wiggle() { S.wig = 1; }, squish() { S.sy.x = .7; S.sy.v = 0; },
      say, moveTo, stop() { if (S.move) { S.move.res(); S.move = null; } },
      moveToEl(e) { const b = e.getBoundingClientRect(); return moveTo(b.left + b.width / 2, b.top); },
      wander(on) { S.wanderOn = on !== false; S.nextWander = S.t + .3; if (!S.wanderOn && S.move) api.stop(); },
      get _state() { return S; },   // debug (DevTools): read-only peek at the animation state
      hands(on) { S.handsOn = on !== false; }, handLyrics(on) { S.hwOn = on !== false; if (!S.hwOn) hw.classList.remove('show'); },
      tempo(sec) { if (sec > .3 && sec < 1.2) S.bper += (sec - S.bper) * .5; },   // periode ketukan (dtk), dari analisis audio
      vowel, vowels, sing, singMood, beat(k) { S.beatPh = 0; onBeat(k == null ? 1 : k); }, level(v) { S.extLvl = clamp(v, 0, 1); S.extT = performance.now(); }, lyric, lyrics,
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

  return { create, parseLRC, syllables, wordsOf, gestOf, lineChore, gestPlan, moods: Object.keys(MOODS) };
}));
