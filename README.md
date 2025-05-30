# Taskly - Chrome Extension untuk Analisis Screenshot dengan AI

Taskly adalah ekstensi Chrome yang memungkinkan pengguna untuk mengambil screenshot area tertentu dari halaman web dan mendapatkan analisis AI menggunakan Gemini. Ekstensi ini sangat berguna untuk menganalisis konten visual dengan cepat dan mendapatkan wawasan dalam bahasa Indonesia.

## Fitur Utama

- 📸 **Screenshot Area Selektif**: Pilih area spesifik dari halaman web untuk dianalisis
- 🤖 **Analisis AI dengan Gemini**: Dapatkan analisis cerdas dari screenshot yang diambil
- 💬 **Respons dalam Bahasa Indonesia**: Hasil analisis disajikan dalam bahasa Indonesia yang mudah dipahami
- 🎯 **Antarmuka yang Intuitif**: Pengalaman pengguna yang sederhana dan mudah digunakan
- ⚡ **Proses Cepat**: Analisis otomatis segera setelah screenshot diambil

## Cara Penggunaan

1. Klik ikon Taskly di toolbar Chrome
2. Pilih area yang ingin dianalisis dengan cara drag and drop
3. Tunggu beberapa saat untuk proses analisis
4. Hasil analisis akan ditampilkan dalam format:
   - Jawaban singkat
   - Penjelasan detail

## Demo

Lihat demo Taskly dalam aksi:
[![Taskly Demo](https://img.youtube.com/vi/iWs4Y11ogwQ/0.jpg)](https://youtu.be/iWs4Y11ogwQ)

## Instalasi

1. Clone repositori ini
2. Buka Chrome dan masuk ke `chrome://extensions/`
3. Aktifkan "Developer mode" di pojok kanan atas
4. Klik "Load unpacked" dan pilih folder proyek
5. Taskly siap digunakan!

## Teknologi yang Digunakan

- Chrome Extension API
- Gemini AI API
- JavaScript
- HTML/CSS

## Struktur Proyek

```
taskly/
├── manifest.json
├── background.js
├── content_script.js
├── popup.html
├── popup.js
```

## Pengembangan

Untuk mengembangkan Taskly lebih lanjut:

1. Pastikan Anda memiliki API key Gemini yang valid
2. Modifikasi `background.js` untuk menangani permintaan API
3. Sesuaikan UI di `content_script.js` sesuai kebutuhan
4. Test perubahan di Chrome dengan mode developer

## Kontribusi

Kontribusi selalu diterima! Silakan buat pull request atau buka issue untuk diskusi lebih lanjut.

## Lisensi

MIT License - lihat file [LICENSE](LICENSE) untuk detail lebih lanjut. 