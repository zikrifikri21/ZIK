// Any image → WebP, one or many. Decoding and encoding are done by the WebView's own Chromium (canvas → image/webp), so the
// app ships no codec. The file bytes travel through src-tauri (read_file / write_new_file); the result goes next to the
// original as <name>.webp and never overwrites anything.
const IMG = /\.(png|jpe?g|jfif|bmp|gif|avif)$/i;   // what the WebView can decode (an animated gif keeps its first frame)
const outName = (p) => p.replace(/\.[^.\\/]+$/, '.webp');
const base = (p) => p.split(/[\\/]/).pop();
const kb = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

async function toWebp(bytes, quality) {
  const bmp = await createImageBitmap(new Blob([bytes]));   // honours EXIF rotation
  const k = Math.min(1, 16383 / Math.max(bmp.width, bmp.height));   // WebP's size limit
  const cv = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close();
  const blob = await cv.convertToBlob({ type: 'image/webp', quality });
  if (blob.type !== 'image/webp') throw new Error('WebView ini tidak bisa membuat WebP');   // ponytail: macOS WebKit falls back to PNG
  return new Uint8Array(await blob.arrayBuffer());
}

/** io = { read(path) → bytes, write(path, bytes) (rejects 'exists'), trash(path) }; → { ok, skipped, failed[], before, after } */
async function convert(paths, { quality = 80, del = false }, io, progress = () => {}) {
  const r = { ok: 0, skipped: 0, failed: [], before: 0, after: 0 };
  for (const [i, p] of paths.entries()) {
    progress(i, paths.length);
    try {
      const src = new Uint8Array(await io.read(p)), webp = await toWebp(src, quality / 100);
      await io.write(outName(p), webp);
      r.ok++; r.before += src.length; r.after += webp.length;
      if (del && webp.length < src.length) await io.trash(p);   // only when it actually got smaller
    } catch (e) {
      if (String(e) === 'exists') r.skipped++; else r.failed.push(`${base(p)}: ${e?.message || e}`);
    }
  }
  return r;
}

/** One line for the mascot's bubble. */
function summary(r) {
  const parts = [];
  if (r.ok) parts.push(`${r.ok} gambar → WebP, ${kb(r.before)} → ${kb(r.after)} (hemat ${Math.max(0, Math.round((1 - r.after / r.before) * 100))}%)`);
  if (r.skipped) parts.push(`${r.skipped} sudah ada .webp-nya`);
  if (r.failed.length) parts.push(`${r.failed.length} gagal`);
  return parts.join(' · ') || 'Tidak ada yang diproses';
}

// PowerShell: what is selected in the window `hwnd` (Explorer) or, failing that, on the desktop → JSON array of paths
const selectionScript = (hwnd) => `$fg = ${Number(hwnd) || 0}
$sh = New-Object -ComObject Shell.Application
$items = @()
foreach ($w in $sh.Windows()) { if ([int64]$w.HWND -eq $fg) { try { $items = @($w.Document.SelectedItems() | ForEach-Object { $_.Path }) } catch {}; break } }
if (-not $items.Count) { try { $hw = 0; $d = $sh.Windows().FindWindowSW([ref]0, [ref]'', 8, [ref]$hw, 1); $items = @($d.Document.SelectedItems() | ForEach-Object { $_.Path }) } catch {} }
ConvertTo-Json -InputObject @($items) -Compress`;
// PowerShell: multi-select file dialog (the "Pilih gambar…" button) → JSON array of paths
const pickScript = `Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Multiselect = $true; $d.Title = 'Pilih gambar untuk dikompres ke WebP'
$d.Filter = 'Gambar|*.png;*.jpg;*.jpeg;*.jfif;*.bmp;*.gif;*.avif|Semua file|*.*'
$f = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true }
$items = if ($d.ShowDialog($f) -eq 'OK') { @($d.FileNames) } else { @() }
ConvertTo-Json -InputObject @($items) -Compress`;
const trashScript = (p) => `Add-Type -AssemblyName Microsoft.VisualBasic
[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${p.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;

if (typeof module === 'object') {   // Node: self-check (npm test); the canvas part only runs in the WebView
  module.exports = { IMG, outName, convert, summary, selectionScript };
  if (require.main === module) {
    const a = require('assert');
    a.strictEqual(outName('C:\\x\\foto.baru.PNG'), 'C:\\x\\foto.baru.webp');
    a.ok(IMG.test('a.JPG') && IMG.test('b.avif') && !IMG.test('c.webp') && !IMG.test('d.pdf'));
    a.strictEqual(summary({ ok: 3, skipped: 1, failed: ['x'], before: 3e6, after: 1e6 }), '3 gambar → WebP, 3.0 MB → 1.0 MB (hemat 67%) · 1 sudah ada .webp-nya · 1 gagal');
    a.strictEqual(summary({ ok: 0, skipped: 0, failed: [], before: 0, after: 0 }), 'Tidak ada yang diproses');
    a.ok(selectionScript('12; evil').startsWith('$fg = 0\n'));   // the hwnd is coerced to a number, never pasted as text
    // convert(): the canvas step is stubbed by running only the paths that fail before it
    (async () => {
      const io = { read: async () => { throw new Error('boom'); }, write: async () => {}, trash: async () => {} };
      const r = await convert(['C:\\a.png', 'D:\\b.jpg'], {}, io);
      a.deepStrictEqual([r.ok, r.failed.length], [0, 2]);
      a.ok(r.failed[0].startsWith('a.png: boom'));
      console.log('ok: webp.js');
    })();
  }
} else Object.assign(window, { WebP: { IMG, outName, convert, summary, selectionScript, pickScript, trashScript } });
