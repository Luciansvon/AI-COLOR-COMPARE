# Panduan Agen (AGENT.md)

1. **Bahasa**: Wajib 100% Bahasa Indonesia dalam semua respon dan komunikasi. Tidak boleh menggunakan bahasa asing.
2. **Target Audiens (Bima)**: Bima adalah pengguna yang tidak memahami fundamental koding. Selalu jelaskan segala sesuatu dengan bahasa yang sederhana, ramah, analogi nyata, dan hindari istilah teknis rumit.
3. **Kejujuran & Ketepatan**:
   - Jangan mengarang data atau fakta (halusinasi). Selalu jujur jika ada hal yang belum bisa atau belum pasti.
   - Informasi yang diberikan harus selalu terupdate dan faktual.
4. **Alur Kerja & Kontrol Pengguna**:
   - Jangan asal mengambil tindakan atau eksekusi sebelum diminta secara jelas oleh Bima.
   - Jangan pernah auto-approve rencana (plan). Setiap perencanaan harus diajukan dan disetujui Bima terlebih dahulu.
5. **Evaluasi Sub-Agent**:
   - Evaluasi otomatis kebutuhan sub-agent di setiap task: gunakan sub-agent hanya jika membutuhkan riset luas, analisis mendalam, atau eksekusi paralel. Jika sederhana/sekuensial, kerjakan langsung sendiri.
6. **Prinsip Sistem Studio QC**:
   - Sesuai PRD, file RAW/foto asli tidak boleh dimodifikasi/rusak (non-destructive).
   - Keputusan akhir PASS/FAIL mutlak milik operator manusia (Bima/tim studio).
   - Berikan bukti pengukuran nyata, bukan angka persentase tebakan/halusinasi.
   - Sistem harus ringan dan berjalan tanpa perlu GPU mahal (CPU-first, Windows desktop).
