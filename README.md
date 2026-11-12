# ZIK

Maskot bulu ber-AI yang tinggal di desktop — versi lanjut dari [ZIK](https://github.com/zikrifikri21/ZIK). Bisa diajak ngobrol dan
disuruh mengerjakan sesuatu di PC (membuka aplikasi, mengecek file, mengatur volume, dan lain-lain), bisa ganti karakter, dan tetap
menyanyikan lirik lagu yang sedang kamu putar, bergoyang mengikuti irama, bisa diangkat & dilempar, serta mengingatkanmu minum air.

## AI

Klik dua kali maskotnya (atau klik kanan → **Ngobrol dengan ZIK…**). Di bawah kotak pesan pilih **Penyedia** dan **Model** dari dropdown:

- **Ollama (lokal, gratis, bisa tanpa internet).** Belum terpasang? Klik **Pasang & jalankan Ollama** (Windows: installer resmi
  dari ollama.com dipasang otomatis; macOS: halaman unduhan dibuka). Lalu pilih model di **Unduh model** dan klik **Unduh**.
- **Online:** Groq, Google Gemini, OpenRouter, OpenAI, DeepSeek. Klik ↗ untuk membuat API key, tempel di kolom **API key**, dan daftar
  modelnya dimuat otomatis. Key disimpan di setelan aplikasi di PC ini dan hanya dikirim ke penyedia yang dipilih.

ZIK punya satu alat: menjalankan perintah shell (PowerShell di Windows). Setiap perintah ditampilkan dulu dan baru jalan setelah
kamu klik **Jalankan**; sakelar **Jalankan perintah tanpa tanya** mematikan konfirmasi itu — nyalakan hanya kalau kamu percaya modelnya.

## Karakter

Klik kanan → **Ganti karakter…**: pilih salah satu karakter bawaan, atau **Pakai gambar sendiri…** (PNG transparan paling pas, maks 1,5 MB).

## Pemakaian lain

Klik kanan maskot untuk pengaturan: ukuran, lirik, waktu lirik, gerak ikut irama, gravitasi, jalan-jalan sendiri, pengingat minum, pomodoro.
Usap kepalanya untuk membuatnya senang; lempar dia dan dia akan pusing.

> Lirik otomatis & gerak ikut irama saat ini baru tersedia di **Windows**.

## Pengembangan

Dibuat dengan [Tauri 2](https://tauri.app): tampilan & logika di `ui/`, bagian native (lagu yang diputar, audio sistem, posisi kursor,
koneksi ke Ollama, shell) di `src-tauri/`. Butuh [Rust](https://rustup.rs) dan, di Windows, Visual Studio Build Tools (C++).

```bash
npm install
npm start        # jalankan (mode pengembangan)
npm test         # cek pembersih judul + pencarian lirik + alur AI
npm run dist     # buat installer untuk OS saat ini → src-tauri/target/release/bundle/
```

Rilis baru: naikkan `version` di `src-tauri/tauri.conf.json`, lalu `git tag vX.Y.Z && git push --tags` — GitHub Actions membuat installer Windows & macOS.

Lirik dari [LRCLIB](https://lrclib.net). Ikon dari [Hugeicons](https://hugeicons.com) (MIT).
