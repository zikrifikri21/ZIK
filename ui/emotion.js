// Offline lyric emotion: a small Indonesian + English word list, scored per line. No model, ~0 ms per song.
// Indonesian stems match inside a word (me-nangis, ke-sedih-an, men-cinta-i); English words match whole (+s/ed/ing),
// so "sad" doesn't fire on "sadar". A line with no hit carries the previous line's mood once (same phrase), else ''.
const LEX = {
  sad: ['sedih', 'tangis', 'nangis', 'air mata', 'rindu', 'luka', 'sakit', 'hilang', 'pergi', 'sepi', 'sendiri', 'perih',
    'kecewa', 'pisah', 'lara', 'duka', 'patah', 'hancur', 'sesal', 'pilu', 'merana', 'terluka', 'lupakan', 'melupakan', 'kangen',
    'nglalek', 'medot', 'sambat', 'mesakno', 'welasno', 'ambyar', 'kelangan', 'nelongso', 'lungo', 'ninggal', 'ditinggal',   // Jawa
    'tanpamu', 'tanpa kamu', 'tak lagi', 'takkan'],
  love: ['cinta', 'sayang', 'kasih', 'peluk', 'cium', 'kekasih', 'jatuh hati', 'dekap', 'mesra', 'sayangku', 'hatiku', 'menaruh hati', 'rasa ini', 'tresn', 'atiku', 'atimu', 'kangmas', 'cah ayu'],
  happy: ['bahagia', 'senang', 'gembira', 'tawa', 'ceria', 'indah', 'mentari', 'joget', 'menari', 'tersenyum', 'senyum', 'riang', 'bersorak', 'sahabat', 'teman'],
  angry: ['marah', 'benci', 'bohong', 'dusta', 'khianat', 'sialan', 'persetan', 'murka', 'dendam', 'ngapusi', 'mblenjani', 'goroh'],
  fear: ['takut', 'ngeri', 'seram', 'gentar', 'gemetar', 'mimpi buruk', 'hantu', 'menjerit', 'ketakutan'],
  disgust: ['jijik', 'muak', 'mual', 'busuk', 'jorok', 'najis', 'eneg', 'menjijikkan'],
  anxiety: ['cemas', 'gelisah', 'resah', 'khawatir', 'was-was', 'panik', 'gugup', 'bimbang', 'ragu', 'risau', 'stres', 'overthinking', 'keliru', 'tak tahu', 'tak pasti', 'tak ada yang pasti', 'akankah', 'bingung'],
  envy: ['iri hati', 'iri pada', 'iri sama', 'iri dengan', 'dengki', 'cemburu', 'sirik', 'wedokan liyo', 'wong liyo', 'lanangan liyo', 'dengan dirinya', 'bersamanya', 'milikinya'],   // bukan 'iri' saja: ada di "sendiri"
  ennui: ['bosan', 'jenuh', 'malas', 'males', 'hampa', 'lelah', 'letih', 'capek', 'terserah'],
  embarrassed: ['malu', 'tersipu', 'salah tingkah', 'salting', 'canggung', 'merona', 'grogi'],
};
// whole words (+s/ed/ing): English, plus short Javanese words that would match inside others (isin ⊂ disini)
const EN = {
  sad: ['sad', 'cry', 'cried', 'tear', 'alone', 'lonely', 'goodbye', 'miss', 'hurt', 'pain', 'broken', 'lost', 'gone', 'sorrow', 'die', 'leave', 'left', "wasn't meant", 'not meant', 'no longer', 'without you', 'never again', 'broke up', 'break up', 'eluh', 'lilo', 'tatu', 'loro ati'],
  love: ['love', 'darling', 'baby', 'kiss', 'heart', 'honey', 'forever', 'hold', 'sweetheart', 'lover', 'all i need', 'need you', 'best i ever had', 'next to me'],
  happy: ['happy', 'smile', 'laugh', 'dance', 'sunshine', 'shine', 'fun', 'party', 'joy', 'celebrate', 'alive', 'bright', 'friend', 'seneng', 'bungah', 'goyang'],
  angry: ['hate', 'angry', 'liar', 'fight', 'burn', 'rage', 'mad', 'damn', 'enemy', 'nesu', 'muring'],
  fear: ['fear', 'afraid', 'scared', 'scary', 'terrified', 'frighten', 'monster', 'nightmare', 'shiver', 'tremble', 'horror', 'ghost', 'scream', 'wedi'],
  disgust: ['gross', 'disgust', 'disgusting', 'sick of', 'ew', 'eww', 'nasty', 'rotten', 'filth', 'filthy', 'vomit', 'puke', 'yuck', "can't stand"],
  anxiety: ['anxious', 'anxiety', 'worry', 'worried', 'nervous', 'panic', 'stress', 'stressed', 'pressure', 'insecure', 'overthink', 'restless', 'what if', "can't sleep", 'think too much', 'overthinking'],
  envy: ['jealous', 'jealousy', 'envy', 'envious', 'wish i was', 'wish i had', 'want what', 'comparison', 'compare', 'wanna be you', 'want to be you', 'should be'],
  ennui: ['bored', 'boring', 'whatever', 'tired', 'lazy', 'same old', 'kesel', 'bosen', 'nothing to do', 'yawn'],
  embarrassed: ['shy', 'embarrass', 'blush', 'awkward', 'ashamed', 'shame', 'cringe', 'isin'],
};
const RX = Object.fromEntries(Object.keys(LEX).map((k) => [k, new RegExp(
  `\\b\\w*(?:${LEX[k].join('|')})|\\b(?:${EN[k].join('|')})(?:s|es|ed|d|ing)?\\b`, 'g')]));

// penyangkal tepat sebelum kata emosi membatalkan kata itu: "lupa amarahku", "tak bahagia", "not afraid" → bukan marah/senang/takut
const NEG = /\b(lupa|tak|tidak|bukan|ra|ora|ndak|gak|nggak|enggak|jangan|not|no|never|don't|dont|ain't|isn't)\s+([\w']+)/g;
const hit = (w) => Object.values(RX).some((rx) => w.match(rx));
function score(text) {
  const t = String(text).toLowerCase().replace(NEG, (m, n, w) => (hit(w) ? n : m)), s = {};
  for (const k in RX) s[k] = (t.match(RX[k]) || []).length;
  return s;
}
// seri → emosi spesifik (marah..malu) mengalahkan yang umum (sedih/cinta/senang; antar-umum: yang pertama): "medot tresnoku demi wedokan liyo" = iri, bukan sedih
const GENERIC = ['sad', 'love', 'happy'];
const best = (s, min = 1) => { let b = ''; for (const k in s) if (s[k] >= min && (s[k] > (s[b] || 0) || (s[k] === s[b] && !GENERIC.includes(k)))) b = k; return b; };

// lines: [{ t, text }] (Mascot.parseLRC) → sets line.mood ('' | sad | love | happy | angry), returns the song mood (Inside Out 1+2: happy=joy, sad, angry, fear, disgust, anxiety, envy, ennui, embarrassed; + love)
function tag(lines) {
  const per = lines.map((l) => score(l.text)), all = {};
  per.forEach((s) => { for (const k in s) all[k] = (all[k] || 0) + s[k]; });
  const song = best(all, 3);
  // no song-wide fallback: a love song tagged every line 'love' and the face never changed (Best Friend test)
  lines.forEach((l, i) => { l.mood = best(per[i]) || (i && best(per[i - 1]) ? lines[i - 1].mood : ''); });
  return song;
}

if (typeof module === 'object') {   // Node: self-check (npm test); browser: global for renderer.js
  module.exports = { score, tag };
  if (require.main === module) {
    const a = require('assert'), m = (text) => { const L = [{ text }]; tag(L); return L[0].mood; };
    a.strictEqual(m('Aku menangis sendiri'), 'sad');
    a.strictEqual(m('Kau kekasihku, aku mencintaimu'), 'love');
    a.strictEqual(m('I just wanna dance and laugh'), 'happy');
    a.strictEqual(m('Kamu adalah bukti'), '');
    a.strictEqual(m('Aku sadar'), '');   // "sad" is English-only, whole word
    const L = [{ text: 'rindu' }, { text: 'sepi' }, { text: 'kau pergi' }, { text: 'hari ini' }];
    L.push({ text: 'esok lusa' });
    a.strictEqual(tag(L), 'sad'); a.strictEqual(L[3].mood, 'sad'); a.strictEqual(L[4].mood, '');
    a.strictEqual(m("But no, it wasn't meant to be"), 'sad');
    a.strictEqual(m('Aku takut gelap'), 'fear');
    a.strictEqual(m('Muak dengan semua ini'), 'disgust');
    a.strictEqual(m("I'm so nervous, what if I fail"), 'anxiety');
    a.strictEqual(m('Aku cemburu melihatmu dengannya'), 'envy');
    a.strictEqual(m('Bosan, terserah lah'), 'ennui');
    a.strictEqual(m('Aku malu, salah tingkah'), 'embarrassed');
    a.strictEqual(m('Aku sendiri'), 'sad');   // 'iri' di dalam "sendiri" tidak dianggap iri
    a.strictEqual(m('Kaupuji, lupa amarahku'), '');
    a.strictEqual(m("I'm not afraid"), '');
    a.strictEqual(m('Tak bisa lagi bahagia, never again'), 'sad');   // seri sedih/senang → sedih (yang pertama)
    a.strictEqual(m('Cara lemahkan hatiku'), 'love');
    a.strictEqual(m('Keliru ataukah bukan? Tak tahu'), 'anxiety');
    a.strictEqual(m('Ra bakal luntur tresnoku'), 'love');
    a.strictEqual(m('Kowe medot tresnoku demi wedokan liyo'), 'envy');   // seri sedih/cinta/iri → iri
    a.strictEqual(m('Meh sambat kalih sinten'), 'sad');
    a.strictEqual(m('Sak tenane ra ngapusi isih tresno sliramu'), 'love');   // ra = tidak (Jawa)
    a.strictEqual(m('Aku ning kene, disini'), '');   // isin bukan di dalam "disini"
    console.log('ok: emotion');
  }
} else window.songMood = tag;
