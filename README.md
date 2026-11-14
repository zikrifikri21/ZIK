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

ZIK punya satu alat utama: menjalankan perintah shell (PowerShell di Windows). Setiap perintah ditampilkan dulu dan baru jalan setelah
kamu klik **Jalankan**; sakelar **Jalankan perintah tanpa tanya** mematikan konfirmasi itu — nyalakan hanya kalau kamu percaya modelnya.
Alat lainnya: kontrol musik (jeda/putar, berikutnya, sebelumnya) dan, kalau WhatsApp tertaut, alat WhatsApp (lihat di bawah).

### Perintah suara

Klik ikon mikrofon di kotak obrolan, atau tekan pintasan **Ctrl + Alt + Z** (bisa diganti di panel obrolan): ucapkan perintahnya, mis.
"zik download file terakhir dari grup A". ZIK merekam sampai kamu berhenti bicara, lalu mengenalinya dengan **Whisper** lewat API key **Groq**
(gratis) atau **OpenAI** yang sudah kamu isi di panel obrolan (suara dikirim ke penyedia itu). Whisper mengerti bahasa Indonesia.

Tanpa key itu ZIK memakai pengenal ucapan Windows sebagai cadangan, tapi pengenal itu tidak mendukung bahasa Indonesia dan sering gagal.
Kalau tetap dipakai: nyalakan **Pengaturan Windows → Privasi & keamanan → Ucapan → Pengenalan ucapan online**.

**Kata kunci "zik" / "zikri"** (seperti "ok Google"): nyalakan **Dengarkan kata kunci "zik"** di panel obrolan. Mikrofon lalu terbuka terus;
ucapkan "Zik, …perintah…", atau "Zikri" saja lalu perintahnya setelah ZIK menjawab. Saat ini aktif, **semua ucapan (dan suara speaker) di dekat
PC dikirim ke penyedia Whisper** untuk dicek, paling banyak satu permintaan tiap 4 detik, jadi kuota gratis Groq (2000/hari) bisa habis.

**Jawaban dibacakan:** jawaban untuk perintah suara selalu dibacakan; sakelar **Bacakan semua jawaban** membuatnya berlaku juga untuk ketikan.
Memakai suara Windows bila bahasa itu terpasang, kalau tidak suara Google Translate (tak resmi, butuh internet).

## WhatsApp

Klik kanan → **WhatsApp…** → **Hubungkan**, lalu pindai kode QR (HP: WhatsApp → Perangkat tertaut → Tautkan perangkat). Setelah itu AI
bisa membaca dan membacakan pesan teks yang masuk ("zik, bacakan pesan dari A"), mencari grup/kontak, melihat dan mengunduh file yang masuk ("download file terakhir dari A" → `~/Downloads/ZIK-WhatsApp`), serta
mengirim pesan dan file. **Pengiriman selalu minta izin dulu**, bahkan saat "Jalankan perintah tanpa tanya" menyala.

Bagian ini adalah wa-mcp (proyek terpisah di PC-mu) yang dikompilasi menjadi satu `zik-wa.exe` di dalam installer (folder `wa/`,
Baileys + Bun); sesinya terpisah dari wa-mcp, jadi ZIK terdaftar sebagai perangkat tertaut sendiri. WhatsApp tidak punya API "ambil pesan
lama": hanya file yang masuk saat ZIK terhubung (plus riwayat yang disinkronkan saat login) yang bisa diunduh. Library-nya tidak resmi;
jangan dipakai untuk kirim massal.

## Kompres gambar ke WebP

Pilih satu atau banyak gambar di Explorer atau desktop, lalu **Shift + klik** (pintasan bawaan; ganti atau matikan di klik kanan →
**Kompres gambar ke WebP…**). ZIK membuat `nama.webp` di sebelah gambarnya; yang asli tidak diubah dan file `.webp` yang sudah ada tidak
ditimpa. Kualitas bisa diatur, dan **Asli ke Recycle Bin** menghapus gambar asli (hanya bila hasilnya memang lebih kecil). Tanpa pintasan:
tombol **Pilih gambar…** membuka pemilih file. Format yang dibaca: PNG, JPG, BMP, GIF (frame pertama), AVIF.

## Karakter

Klik kanan → **Ganti karakter…**: pilih salah satu karakter bawaan, atau **Pakai gambar sendiri…** (PNG transparan paling pas, maks 1,5 MB).

## Pemakaian lain

Klik kanan maskot untuk pengaturan: ukuran, lirik, waktu lirik, gerak ikut irama, gravitasi, jalan-jalan sendiri, pengingat minum, pomodoro.
Usap kepalanya untuk membuatnya senang; lempar dia dan dia akan pusing.

**Gerakan menyanyi:** gerakan tangan mengikuti makna baris lirik ("call me" → menelepon, "cinta" → jari love, "dance" → berputar, "menangis" → tangan di dada); baris tanpa kata kunci hanya ikut ketukan, dan di bagian lagu yang keras tangan ikut ramai. Gerakannya antara lain jari love Korea, tangan menelepon, peace, tepuk tangan, tangan naik, tinju, hati di atas kepala, hingga berputar 3D (wajah menggeser ke samping lalu hilang di belakang dan muncul lagi). Kata lirik tertentu ("aku", "kamu", "cinta"...) tetap menimpanya sesaat. Tangannya berbulu dan mengikuti warna karakter.

**Musik:** arahkan kursor ke maskot saat ada lagu, lalu pakai tombol ⏮ ⏯ ⏭ di kakinya (atau klik kanan → **Musik**).

**Lirik terlalu cepat / lambat:** satu lagu di LRCLIB bisa punya beberapa versi LRC yang waktunya berbeda; ZIK memilih yang durasinya cocok
dan yang paling banyak disepakati. Kalau masih meleset, klik kanan → **Waktu lirik** (±0,25 / ±1 dtk); koreksinya diingat **per lagu**.
Mulut hanya membentuk vokal saat ada baris lirik yang sedang dinyanyikan; saat musik saja, maskot hanya bergoyang.

> Lirik otomatis & gerak ikut irama saat ini baru tersedia di **Windows**.

## Pengembangan

Dibuat dengan [Tauri 2](https://tauri.app): tampilan & logika di `ui/`, bagian native (lagu yang diputar, audio sistem, posisi kursor,
koneksi ke Ollama, shell, pintasan global, suara) di `src-tauri/`, dan layanan WhatsApp di `wa/`. Butuh [Rust](https://rustup.rs),
[Bun](https://bun.sh) (mengompilasi `wa/rpc.js` jadi `zik-wa`; otomatis lewat `node wa/build.mjs` saat `npm start` / `npm run dist`) dan, di
Windows, Visual Studio Build Tools (C++). Installer jadi sekitar 31 MB karena runtime Bun ikut di dalamnya.

```bash
npm install
npm start        # jalankan (mode pengembangan)
npm test         # cek pembersih judul + pilihan lirik + alur AI + WebP (Rust: cd src-tauri && cargo test)
npm run dist     # buat installer untuk OS saat ini → src-tauri/target/release/bundle/
```

Rilis baru: naikkan `version` di `src-tauri/tauri.conf.json`, lalu `git tag vX.Y.Z && git push --tags` — GitHub Actions membuat installer Windows & macOS.

Lirik dari [LRCLIB](https://lrclib.net). Ikon dari [Hugeicons](https://hugeicons.com) (MIT).
