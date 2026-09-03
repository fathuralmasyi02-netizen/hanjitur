# 🌿 Hanjitur Organizer - Mobile Wedding Planner

Aplikasi mobile web wedding planner modern, estetik, dan *user-friendly* dengan gaya visual **Soft Sage Green Glassmorphism**, tipografi membulat ramah mata (**Font Quicksand**), serta sistem navigasi interaktif **Draggable Blossom Radial Menu** (lingkaran melayang transparan yang dapat dipindah dan mekar saat disentuh).

Dibuat murni dengan **HTML5, CSS3, dan JavaScript**, aplikasi ini sangat ringan, responsif, siap di-push ke **GitHub**, di-deploy langsung ke **Vercel**, serta terhubung langsung dua arah ke **Google Spreadsheet**.

---

## ✨ Fitur & Desain Terbaru

1. **Desain Soft Green Botanical Romance & Font Rounded**:
   - Palet warna: *Soft Sage Green* (`#528069`), *Pistachio* (`#EBF4EF`), dan *Warm Ivory* (`#F6FAF7`).
   - Font: **Quicksand** (Google Fonts) dengan sudut membulat tanpa garis tajam, sangat lembut dan nyaman di mata.
   - Bersih tanpa logo agresif/norak, mengutamakan keanggunan minimalis.
2. **Navigasi Lingkaran Melayang Transparan (Draggable Blossom Menu)**:
   - Tombol lingkaran kaca mengambang yang dapat **diseret (drag & drop)** ke posisi mana saja di layar smartphone/desktop.
   - Posisi terakhir tersimpan otomatis di perangkat.
   - Saat disentuh/diklik, lingkaran akan **mekar secara radial (*blossom animation*)** menampilkan 8 menu:
     - 🏠 Beranda
     - 💰 Keuangan & Anggaran
     - 📅 Timeline Persiapan
     - ⏱️ **Rundown Hari H** *(Modul Baru)*
     - 🏪 Vendor *(dengan Total Biaya & DP)*
     - 💌 Tamu Undangan *(dengan Jumlah Pax & WhatsApp)*
     - 📖 Knowledge & Files
     - ⚙️ Pengaturan
3. **Modul Baru: Rundown Hari H (Sheet 'Rundown Hari H')**:
   - Jadwal acara detail menit-demi-menit: Waktu Mulai & Selesai, Kegiatan, Penanggung Jawab (PIC), Lokasi, dan Catatan.
   - Sangat praktis digunakan oleh panitia dan pengantin saat hari H.
4. **Pembaruan Kolom Tamu & Vendor**:
   - **Tamu Undangan:** Dilengkapi kolom **`Jumlah Pax`**, serta penghitung total porsi catering pada bar statistik.
   - **Vendor:** Dilengkapi kolom **`Total Biaya`** dan **`Nominal DP`**, lengkap dengan perhitungan otomatis sisa tagihan.
5. **Autentikasi Khusus Pengantin**:
   - **Email:** `hanjitur@gmail.com`
   - **Password:** `hanjitur354`
6. **Integrasi Google Spreadsheet Dua Arah**:
   - Membaca dan menyimpan data transaksi, tamu, vendor, timeline, dan rundown langsung ke Spreadsheet via Google Apps Script.

---

## 📁 Struktur Berkas

```
hanjitur-organizer/
├── index.html              # Antarmuka mobile-first & modal dialog
├── style.css               # Tema soft sage green, font Quicksand & blossom menu
├── app.js                  # Logika drag & drop blossom, timer, & sinkronisasi
├── google-apps-script.js   # Script penghubung Google Spreadsheet (REST API)
├── vercel.json             # Konfigurasi deployment Vercel
└── README.md               # Panduan instalasi & penggunaan
```

---

## 🚀 Panduan Penggunaan & Sinkronisasi Spreadsheet

1. Buka Google Spreadsheet Anda yang memuat sheet:
   - `Dompet`, `Transaksi Keuangan`, `Anggaran`, `Knowledge`, `Isian Knowledge`, `Timeline`, `Rundown Hari H`, `Vendor`, `Files`, `Tamu Undangan`, `Master`.
2. Klik menu **Extensions** (Ekstensi) > **Apps Script**.
3. Tempelkan seluruh kode dari berkas [`google-apps-script.js`](./google-apps-script.js).
4. Klik **Deploy** > **New deployment** > Pilih **Web app**:
   - **Execute as**: `Me`
   - **Who has access**: **`Anyone`**
5. Klik **Deploy**, izinkan otorisasi, lalu salin **Web App URL**.
6. Buka aplikasi **Hanjitur Organizer** > Buka menu **Pengaturan** (ikon gear di pojok kanan atas atau via Blossom Menu) > Tempel URL > Klik **Simpan & Sinkron**.

---

## 🐙 Upload ke GitHub & Deploy ke Vercel

```bash
cd C:\Users\finan\.gemini\antigravity\scratch\hanjitur-organizer
git init
git add .
git commit -m "Update: Soft Sage Green theme, Quicksand font, Blossom Menu, Rundown Hari H"
git branch -M main
git remote add origin https://github.com/USERNAME/hanjitur-organizer.git
git push -u origin main
```

Lalu di [Vercel](https://vercel.com), klik **"Add New Project"** > pilih repositori `hanjitur-organizer` > klik **"Deploy"**.

---

© 2026 Hanjitur Organizer. 🌿 Ringan, Sejuk, dan Tertata Rapi.
