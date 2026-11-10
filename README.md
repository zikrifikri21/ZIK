# ZIK

Maskot bulu biru yang tinggal di desktop: menyanyikan lirik lagu yang sedang kamu putar (YouTube di browser, Spotify, dll.),
bergoyang mengikuti irama, bisa diangkat & dilempar, dan mengingatkanmu minum air.

## Unduh

Ambil installer terbaru di halaman [Releases](https://github.com/zikrifikri21/ZIK/releases):

- **Windows:** `ZIK_x.y.z_x64-setup.exe` (±5 MB, memakai WebView2 bawaan Windows)
- **macOS:** `ZIK_x.y.z_universal.dmg` (Apple Silicon & Intel)

Installer belum ditandatangani (unsigned):
- Windows SmartScreen: klik **More info → Run anyway**.
- macOS: setelah menyalin ke Applications, jalankan `xattr -cr /Applications/ZIK.app` sekali, lalu buka seperti biasa.

> Lirik otomatis & gerak ikut irama saat ini baru tersedia di **Windows**. Di macOS maskot dan pengingat minum sudah jalan.

## Pemakaian

Klik kanan maskot untuk pengaturan: ukuran, lirik, waktu lirik, gerak ikut irama, gravitasi, jalan-jalan sendiri, pengingat minum.
Usap kepalanya untuk membuatnya senang; lempar dia dan dia akan pusing.

## Pengembangan

Dibuat dengan [Tauri 2](https://tauri.app): tampilan & logika di `ui/`, bagian native (lagu yang diputar, audio sistem,
posisi kursor) di `src-tauri/`. Butuh [Rust](https://rustup.rs) dan, di Windows, Visual Studio Build Tools (C++).

```bash
npm install
npm start        # jalankan (mode pengembangan)
npm test         # cek pembersih judul + pencarian lirik
npm run dist     # buat installer untuk OS saat ini → src-tauri/target/release/bundle/
```

Rilis baru: naikkan `version` di `src-tauri/tauri.conf.json`, lalu `git tag vX.Y.Z && git push --tags` — GitHub Actions membuat installer Windows & macOS.

Lirik dari [LRCLIB](https://lrclib.net). Ikon dari [Hugeicons](https://hugeicons.com) (MIT).
