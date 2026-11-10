// Find synced (.lrc) lyrics on lrclib.net for an OS now-playing entry. YouTube titles are messy, so clean first.
const JUNK = /\s*[([【][^)\]】]*(official|lyric|video|audio|mv|m\/v|visualizer|hd|4k|live|explicit|remaster)[^)\]】]*[)\]】]/gi;

function clean(title = '', artist = '') {
  artist = artist.replace(/\s*-\s*Topic$|VEVO$|\s*Official$/i, '').trim();
  let t = title.replace(JUNK, '').replace(/\s*(ft|feat)\.?\s.*$/i, '').replace(/\s*\|.*$/, '').trim();
  const dash = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);   // "Artist - Title" → the channel name is often not the artist
  if (dash) { artist = dash[1].trim(); t = dash[2].trim(); }
  return { title: t, artist };
}

async function find({ title, artist, dur }) {
  const c = clean(title, artist);
  const api = (path, q) => fetch(`https://lrclib.net/api/${path}?` + new URLSearchParams(q),
    { headers: { 'User-Agent': 'zik-mascot/0.1' } }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const hit = await api('get', { track_name: c.title, artist_name: c.artist, ...(dur > 0 && { duration: Math.round(dur) }) });
  if (hit?.syncedLyrics) return hit.syncedLyrics;
  // ponytail: first synced search result, closest-duration ranking if wrong songs show up
  const list = (await api('search', { q: `${c.artist} ${c.title}`.trim() })) || [];
  return list.find(r => r.syncedLyrics && (!dur || Math.abs(r.duration - dur) < 8))?.syncedLyrics
      || list.find(r => r.syncedLyrics)?.syncedLyrics || null;
}

module.exports = { clean, find };

if (require.main === module) {   // self-check: node lyrics.js
  const a = require('assert');
  a.deepStrictEqual(clean('Apricot Princess', 'Rex Orange County - Topic'), { title: 'Apricot Princess', artist: 'Rex Orange County' });
  a.deepStrictEqual(clean('Tulus - Hati-Hati di Jalan (Official Music Video)', 'TULUS'), { title: 'Hati-Hati di Jalan', artist: 'Tulus' });
  a.deepStrictEqual(clean('Coldplay - Yellow [Official Video] | HD', 'Coldplay'), { title: 'Yellow', artist: 'Coldplay' });
  find({ title: 'Apricot Princess', artist: 'Rex Orange County - Topic', dur: 0 })
    .then(l => { a.ok(l && l.includes('['), 'no lyrics from lrclib'); console.log('ok:', l.split('\n')[0]); });
}
