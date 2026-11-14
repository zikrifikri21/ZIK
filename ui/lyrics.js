// Find synced (.lrc) lyrics on lrclib.net for an OS now-playing entry. YouTube titles are messy, so clean first.
// lrclib holds several uploads of the same song whose timings differ by seconds to minutes (another cut, another intro),
// so we gather every synced candidate and pick one that fits the playing track instead of taking the first hit.
const JUNK = /\s*[([【][^)\]】]*(official|lyric|video|audio|mv|m\/v|visualizer|hd|4k|live|explicit|remaster)[^)\]】]*[)\]】]/gi;

function clean(title = '', artist = '') {
  artist = artist.replace(/\s*-\s*Topic$|VEVO$|\s*Official$/i, '').trim();
  let t = title.replace(JUNK, '').replace(/\s*(ft|feat)\.?\s.*$/i, '').replace(/\s*\|.*$/, '').trim();
  const dash = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);   // "Artist - Title" → the channel name is often not the artist
  if (dash) { artist = dash[1].trim(); t = dash[2].trim(); }
  // "Best Part, a Visual" / "Song - Official Lyric Video" → the song; "A & B" / "A, B" / "A x B" → A, but not "and": Tones and I (lrclib lists the main artist)
  t = t.replace(/\s*[,\-–—:]\s*(an?\s+)?(official\s+)?(visual(izer)?|lyrics?(\s+video)?|music\s+video|video|audio)\s*$/i, '').trim() || t;
  artist = artist.split(/\s*(?:&|,|\sx\s|\sfeat\.?\s|\sft\.?\s)\s*/i)[0].trim() || artist;
  return { title: t, artist };
}

const stamps = (lrc) => [...lrc.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)].map((m) => +m[1] * 60 + +m[2]);

/** cands: [{ lrc, duration }] (all synced) → the lrc that best fits a track of `dur` seconds (0 = unknown). */
function pick(cands, dur) {
  if (!cands.length) return null;
  const info = cands.map((x) => { const t = stamps(x.lrc); return { ...x, first: t[0] ?? 0, last: t.at(-1) ?? 0, d: dur > 0 && x.duration > 0 ? Math.abs(x.duration - dur) : 0 }; });
  const near = Math.min(...info.map((x) => x.d));
  const same = info.filter((x) => x.d <= near + 2);                                   // same recording as the one playing
  const fits = same.filter((x) => !(dur > 0 && x.last > dur + 5));                    // lines past the end = a longer cut
  const pool = fits.length ? fits : same;
  // uploads of one cut agree on when the first line comes; the odd one out is usually shifted
  const votes = (x) => pool.filter((y) => Math.abs(y.first - x.first) < 1.5).length;
  return pool.reduce((a, b) => (votes(b) > votes(a) || (votes(b) === votes(a) && b.d < a.d) ? b : a)).lrc;
}

/** get(url) → Promise<text>. In the app it goes through src-tauri (no CORS); Node falls back to fetch. */
async function find({ title, artist, dur }, get = (u) => fetch(u, { headers: { 'User-Agent': 'zik-mascot/1.0' } }).then((r) => (r.ok ? r.text() : ''))) {
  const c = clean(title, artist);
  const api = (path, q) => get(`https://lrclib.net/api/${path}?` + new URLSearchParams(q)).then((t) => JSON.parse(t)).catch(() => null);
  const [hit, byName, byQuery] = await Promise.all([
    api('get', { track_name: c.title, artist_name: c.artist, ...(dur > 0 && { duration: Math.round(dur) }) }),
    api('search', { track_name: c.title, artist_name: c.artist }),
    api('search', { q: `${c.artist} ${c.title}`.trim() }),
  ]);
  const seen = new Set(), cands = [];
  for (const r of [hit, ...(byName || []), ...(byQuery || [])]) {
    if (!r?.syncedLyrics || seen.has(r.id)) continue;
    seen.add(r.id); cands.push({ lrc: r.syncedLyrics, duration: r.duration });
  }
  return pick(cands, dur);
}

if (typeof module === 'object') {   // Node: self-check (npm test); browser: global for zik.js
  module.exports = { clean, find, pick };
  if (require.main === module) {
    const a = require('assert');
    a.deepStrictEqual(clean('Apricot Princess', 'Rex Orange County - Topic'), { title: 'Apricot Princess', artist: 'Rex Orange County' });
    a.deepStrictEqual(clean('Tulus - Hati-Hati di Jalan (Official Music Video)', 'TULUS'), { title: 'Hati-Hati di Jalan', artist: 'Tulus' });
    a.deepStrictEqual(clean('Coldplay - Yellow [Official Video] | HD', 'Coldplay'), { title: 'Yellow', artist: 'Coldplay' });
    a.deepStrictEqual(clean('Daniel Caesar & H.E.R. - Best Part, a Visual', 'DanielCaesarVEVO'), { title: 'Best Part', artist: 'Daniel Caesar' });
    a.deepStrictEqual(clean('Tones and I - Dance Monkey', 'x'), { title: 'Dance Monkey', artist: 'Tones and I' });
    // candidate choice: same song, uploads shifted against each other (Tulus: first line at 13 s vs 31 s)
    const L = (first, last = 240) => `[${Math.floor(first / 60)}:${(first % 60).toFixed(2).padStart(5, '0')}] a\n[${Math.floor(last / 60)}:${(last % 60).toFixed(2).padStart(5, '0')}] b`;
    const c = (first, duration, last) => ({ lrc: L(first, last), duration });
    a.strictEqual(pick([c(31, 261), c(13, 261), c(13.2, 261), c(13.3, 261)], 261), L(13));                 // most uploads agree → not the odd one
    a.strictEqual(pick([c(40, 200), c(13, 261), c(31, 262)], 261), L(13));                                  // 200 s cut dropped; tie on votes → closest length
    a.strictEqual(pick([c(13, 300, 290), c(20, 261, 255)], 261), L(20, 255));                              // 300 s version: far from 261 s
    a.strictEqual(pick([c(5, 261, 300), c(9, 261, 250)], 261), L(9, 250));                                  // lines running past the end = longer cut
    a.strictEqual(pick([c(7, 0), c(7.1, 0), c(30, 0)], 0), L(7));                                           // no duration known: consensus only
    a.strictEqual(pick([], 100), null);
    // find(): three lrclib calls, duplicates (same id) collapse, the winner is returned
    const urls = [], reply = { id: 1, syncedLyrics: L(13), duration: 261 };
    find({ title: 'Hati-Hati di Jalan', artist: 'Tulus', dur: 261 }, async (u) => {
      urls.push(u); return JSON.stringify(u.includes('/get?') ? reply : [reply, { id: 2, syncedLyrics: L(31), duration: 261 }, { id: 3, plainLyrics: 'x' }]);
    }).then((l) => { a.strictEqual(l, L(13)); a.strictEqual(urls.length, 3); });
    find({ title: 'Apricot Princess', artist: 'Rex Orange County - Topic', dur: 0 })   // live check
      .then((l) => { a.ok(l && l.includes('['), 'no lyrics from lrclib'); console.log('ok:', l.split('\n')[0]); });
  }
} else window.lyricsFind = find;
