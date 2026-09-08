# Studio Color QC Android — Riset Menyeluruh & Ledger Sumber

**Tanggal:** 8 September 2026  
**Repo:** `Luciansvon/AI-COLOR-COMPARE`  
**Jumlah sumber unik tercatat:** 149  
**Status:** Riset/arsitektur saja. Tidak ada perubahan repo.

## 1. Tujuan

Dokumen ini menggabungkan seluruh putaran riset sejak ide awal port Studio Color QC ke Android sampai audit lanjutan: build, Tauri, WebView, kamera, RAW/DNG, storage, SQLite, lifecycle, UI touch, performa, thermal, keamanan, distribusi, color science, pencahayaan, metamerisme, gloss, kayu/furnitur, dan pengujian perangkat.

## 2. Cara membaca kekuatan bukti

- **RESMI**: dokumentasi platform/vendor resmi. Menjadi dasar keputusan engineering.
- **STANDAR**: ISO/CIE/ASTM/IES. Menjadi dasar colorimetry/SOP.
- **PAPER**: penelitian peer-reviewed/preprint relevan. Menjadi dasar hipotesis dan metode validasi.
- **REPO**: bukti langsung dari kode Studio Color QC atau dependency candidate.
- **ISSUE**: laporan bug nyata. Dipakai untuk test case, bukan dianggap berlaku universal.
- **KOMUNITAS**: pengalaman praktis. Dipakai untuk menemukan pola/edge case, tidak mengalahkan sumber resmi.

## 3. Kesimpulan utama

1. **Android layak**, tetapi APK tidak boleh dianggap alat ukur absolut di semua HP. Mode presisi harus berbasis **device qualification + calibration + repeatability test**.
2. **Tauri tetap layak dipertahankan untuk UI/shared Rust**, tetapi kamera, storage URI, lifecycle kritis, dan full-resolution image processing harus menggunakan adapter native Android.
3. **React/WebView menjadi UI**, bukan mesin numeric QC. Full-resolution pixel pipeline di Canvas sekarang terlalu berisiko untuk memory, WebView variation, dan IPC.
4. **CameraX stable 1.6.2** adalah baseline produksi per 26 Agustus 2026. API AE/AWB locking baru di `FocusMeteringAction.setLockingMode()` berada di 1.7 alpha, sehingga baseline stable perlu Camera2Interop/native request control + verifikasi `CaptureResult`.
5. **RAW/DNG tidak otomatis akurat**. Pipeline butuh metadata sensor, black/white level, CFA, lens shading, WB, transform/matrix, demosaic, dan calibration.
6. **Color QC furnitur lebih dipengaruhi sistem capture** daripada sekadar rumus ΔE: spektrum lampu, geometry, gloss, arah serat, ROI, sensor, dan usia physical master harus masuk SOP.
7. **Visual preview bukan evidence utama** karena Night Light, P3/HDR, accessibility transform, dan display OEM. Evidence utama adalah nilai yang dihitung pipeline tervalidasi.
8. **Android v0.1 sebaiknya tidak menyelesaikan universal CR2/CR3 import**. Fokus dulu capture HP controlled JPEG + DNG jika supported, lalu RAW DSLR decoder dibuat spike terpisah.

## 4. Arsitektur rekomendasi

```text
                STUDIO COLOR QC
                      │
            SHARED RUST QC CORE
                      │
       ┌──────────────┼──────────────┐
       │              │              │
 Color Science   Image/RAW Core    SQLite
 Lab / ΔE00      calibration       sessions
 RGB/evidence    ROI/texture       migrations
       │              │              │
       └──────────────┼──────────────┘
                      │
              Platform Adapters
              ┌───────┴────────┐
              │                │
          Windows           Android
                            │
                     Kotlin/CameraX
                     Camera2Interop
                     ContentResolver
                     SAF / MediaStore
                            │
                   Qualified Capture
```

### Prinsip data

```text
FULL RES IMAGE / RAW
        │
        ├── tetap native/Rust
        │
        ├── QC numeric
        │
        └── export
             
WEBVIEW hanya menerima:
thumbnail + ROI overlay + histogram + angka + status
```

## 5. Tingkatan perangkat

| Level | Syarat minimum | Kegunaan |
|---|---|---|
| **QC Pro** | sensor/lensa tersertifikasi, RAW/manual bila tersedia, calibration, repeatability lolos | keputusan QC terkontrol |
| **QC Controlled** | JPEG terkontrol, AE/AWB/lensa konsisten, calibration lolos | relative comparison |
| **Viewer Only** | capability/calibration tidak lolos | lihat history/report, bukan pengukuran |

## 6. Risk register

| Prioritas | Area | Risiko | Mitigasi / gate |
|---|---|---|---|
| P0 | Build | Toolchain JDK/Gradle/AGP/NDK tidak kompatibel | Pin toolchain; CI clean build; dokumentasi versi |
| P0 | Build | Native .so tidak kompatibel 16 KB page size | NDK r28+; audit ELF semua ABI |
| P0 | Build | APK debug jalan, release gagal/R8/signing | Test signed release APK pada device |
| P0 | Build | Keystore hilang sehingga update in-place putus | Backup keystore offline + recovery procedure |
| P0 | Platform | Target API 36 edge-to-edge menutup UI | Native insets + UI adaptive test |
| P0 | Platform | Process death menghapus sesi QC belum disimpan | Persist session transactional ke SQLite |
| P0 | Platform | WebView renderer mati/blank | Recovery path; engine tidak bergantung WebView |
| P0 | Storage | content:// diperlakukan sebagai filesystem path | Native ContentResolver/SAF adapter |
| P0 | Storage | Export 0-byte/silent failure provider cloud | Write+fsync/close+read-back verify hash/size |
| P0 | Storage | Uninstall menghapus DB internal | Manual backup/export sebelum uninstall; migration tests |
| P0 | Camera | Device mengiklankan capability yang tidak benar/quirk | Runtime qualification + physical test |
| P0 | Camera | Logical camera berpindah physical sensor saat zoom | Lock camera/zoom/focal; log active physical ID |
| P0 | Camera | AWB/AE belum settle saat capture | Tunggu CONVERGED lalu lock; verify CaptureResult |
| P0 | Camera | HDR/Night/Retouch/OEM extension mengubah warna | Disable extensions untuk QC |
| P0 | Camera | Tonemap/NR/edge processing JPEG berbeda antar device | Controlled request + record result; label processed JPEG |
| P0 | Camera | Digital stabilization warp/crop ROI | Disable digital stabilization; OIS policy konsisten |
| P0 | Camera | 50 Hz flicker lampu studio mengubah brightness/banding | 50 Hz anti-banding atau manual shutter tervalidasi |
| P0 | Camera | RAW tersedia tetapi pipeline metadata tidak benar | Black/white level, CFA, lens shading, WB, matrices, demosaic |
| P0 | Color | Sensor antar HP punya spectral sensitivity berbeda | Kalibrasi per device/camera/lens |
| P0 | Color | Lighting/SPD berbeda menghasilkan metamerism | Session reference + lamp qualification; catat fixture/settings |
| P0 | Color | Sudut/jarak mengubah hasil | Fixture/guide geometry; distance/angle acceptance gate |
| P0 | Color | Gloss/specular kayu mencemari ROI | Controlled geometry, multi-ROI, optional polarization R&D |
| P0 | Color | Satu threshold ΔE dipakai untuk semua material | Threshold per material/product dan SOP studio |
| P0 | Color | Master panel menua/UV/coating berubah | Master version, date, condition, periodic revalidation |
| P0 | Architecture | Full-res pixel processing di WebView Canvas | Pindah numeric pipeline ke Rust/native |
| P0 | Architecture | Full image dikirim bolak-balik Tauri IPC | Native buffers/file descriptor; kirim result+thumbnail saja |
| P0 | Memory | Full RGBA + canvas + base64 menggandakan RAM | ROI-native, downsample preview, release buffers cepat |
| P0 | Memory | Batch 50/200MB zipSync menyebabkan OOM | Streaming native ZIP; limit mobile kecil dulu |
| P0 | UI | Mouse event/wheel tidak cocok touch | Pointer Events + pinch + touch handles |
| P1 | UI | Font 200%, cutout, gesture nav merusak layout | Adaptive responsive and accessibility tests |
| P1 | Display | Night Light/P3/HDR membuat preview visual misleading | Display diagnostics; numeric evidence authoritative |
| P1 | Database | Migration schema merusak history operator | Versioned migrations + fixture upgrade tests |
| P1 | Database | Power loss saat save keputusan | Transaction; WAL policy; integrity checks; durability tests |
| P1 | Performance | Main thread I/O/analysis menyebabkan ANR | Worker/coroutine/Rust thread; StrictMode/profile |
| P1 | Performance | Thermal throttling pada sesi panjang | Thermal status; cooldown/block precision QC |
| P1 | Camera | Orientation/EXIF salah sehingga ROI meleset | Normalize orientation sebelum coordinate mapping |
| P1 | Camera | Lens shading/vignetting membuat ROI tepi bias | Lens shading correction/central ROI constraints |
| P1 | Camera | Flash/ambient tidak stabil | Jangan mengandalkan phone flash MVP; controlled studio light |
| P1 | Testing | Emulator lolos tetapi kamera fisik gagal | Real-device matrix + Camera ITS-inspired tests |
| P1 | Testing | Hanya satu merek HP diuji | Pixel/Samsung/Xiaomi/Oppo/Vivo/Infinix matrix |
| P1 | Security | CSP null memperluas WebView attack surface | Strict CSP + minimal Tauri capability |
| P1 | Security | URI/file input berbahaya/oversize/corrupt | Validate MIME/magic/size; decoder fuzz/error handling |
| P1 | Privacy | Auto Backup mengirim QC DB ke cloud tanpa sengaja | Exclude QC DB; explicit operator backup |
| P2 | Distribution | Play Store policy berubah | Pilot sideload/App Distribution; Play later |
| P2 | RAW import | Universal CR2/CR3 decoder memperbesar scope | Android v0.1 fokus phone DNG/JPEG; decoder spike terpisah |
| P2 | R&D | Cross-device universal color mapping overfit | Prioritaskan certified-device + calibration, bukan AI magic |
| P2 | R&D | Cross-polarization menambah hardware complexity | Eksperimen setelah baseline geometry stabil |

## 7. Perubahan rekomendasi sepanjang riset

### Putaran 1 — “Tauri Android build”
Awalnya jalur terlihat sederhana: pertahankan React/Rust/Tauri lalu build APK. Audit repo menunjukkan entry point, APPDATA, NSIS, bridge dan workflow masih Windows-specific.

### Putaran 2 — Kamera HP langsung
Pilihan produk berubah ke kamera HP langsung. Ditemukan kebutuhan native CameraX/Camera2, RAW/DNG capability detection, dan larangan memakai aplikasi kamera OEM sebagai sumber QC.

### Putaran 3 — Fragmentasi Android
Rilis CameraX sendiri memuat banyak quirk per-device. Maka muncul konsep **Device Qualification** dan bukan “semua Android setara”.

### Putaran 4 — Storage, WebView, memory
Issue Tauri menunjukkan `content://`, picker, provider cloud, 0-byte export, lifecycle WebView. Audit repo menemukan full-res Canvas/base64/zipSync. Arsitektur digeser: image heavy lifting keluar dari WebView.

### Putaran 5 — Color science
Paper smartphone colorimetry dan RAW mapping menunjukkan sensor/illumination/device variation nyata. Calibration per-device dan same-session reference dinaikkan dari fitur tambahan menjadi requirement inti.

### Putaran 6 — Material furnitur
Standar CIE/ASTM dan paper kayu menunjukkan geometry, gloss, texture, metamerism, SPD lampu, dan aging master dapat menggeser hasil. Threshold ΔE universal ditolak.

### Putaran 7 — Detail Camera2
Ditemukan logical camera dapat berganti physical sensor; stabilization/crop, AWB convergence, tonemap/noise reduction, 50 Hz flicker, lens shading, dan CaptureResult harus dicatat/divalidasi.

### Putaran 8 — Koreksi rekomendasi
Diverifikasi bahwa AE/AWB lock via `FocusMeteringAction.setLockingMode()` baru ada pada CameraX 1.7 alpha. Baseline produksi tetap CameraX 1.6.2, dengan Camera2Interop/native controls untuk lock presisi.

### Putaran 9 — Produksi & durability
Ditambahkan signing, API 36, 16 KB page, migrations, backup/uninstall, crash/process death, CSP/capabilities, real-device tests, dan distribution pilot.

## 8. Acceptance gates sebelum disebut “Studio QC Android”

- G0: clean reproducible signed release build.
- G1: arm64 + seluruh native library lolos 16 KB page validation.
- G2: install/update/uninstall/restore behavior terdokumentasi.
- G3: session survive rotate, call, background, process death, low-memory relaunch.
- G4: native import/export `content://` lolos local storage + Documents + cloud-provider tests dan read-back verification.
- G5: touch ROI/pinch/handles lolos phone portrait/landscape/tablet + font 200%.
- G6: memory profile tidak OOM pada target MP camera.
- G7: camera qualification menghasilkan capability report yang dapat diaudit.
- G8: capture metadata menunjukkan physical camera/lens/zoom/AE/AWB/ISO/shutter sesuai SOP.
- G9: repeated capture master tetap dalam repeatability band yang ditetapkan dari data pilot.
- G10: calibration card/reference test lolos per-device.
- G11: master vs sample result stabil antar sesi dalam studio controlled lighting.
- G12: Windows vs Android parity diuji pada input digital yang identik.
- G13: thermal soak test sesi studio panjang lolos.
- G14: operator pilot membuktikan workflow tidak membuat keputusan otomatis dan tidak menyesatkan.

## 9. Hal yang belum boleh dianggap benar sebelum tes fisik

- Nilai threshold ΔE PASS/FAIL untuk tiap finishing kayu.
- Model HP mana yang layak diberi label QC Pro.
- Seberapa besar bias HP Infinix/Samsung/Pixel pada setup lampu studio nyata.
- Apakah DNG tiap target device benar-benar memberi pipeline yang stabil dan metadata cukup.
- Apakah OIS lebih baik OFF atau ON pada rig studio tertentu.
- Apakah cross-polarization perlu untuk finish glossy/semi-gloss.
- Seberapa sering physical master harus direvalidasi.
- Apakah custom color card kayu/finishing studio lebih berguna daripada ColorChecker umum.

## 10. Ledger seluruh sumber

> Catatan: issue dan komunitas adalah **sinyal edge-case**, bukan bukti bahwa semua perangkat mengalami bug tersebut. Keputusan utama harus menang di sumber RESMI/STANDAR/PAPER + pengujian fisik Studio Color QC.

| # | Kelompok | Kekuatan | Sumber | URL | Dipakai untuk |
|---:|---|---|---|---|---|
| 1 | Bukti repo | REPO | Repo Studio Color QC | https://github.com/Luciansvon/AI-COLOR-COMPARE | Basis project yang diaudit |
| 2 | Bukti repo | REPO | AGENT.md | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/AGENT.md | Aturan non-destruktif, human PASS/FAIL, approval plan |
| 3 | Bukti repo | REPO | package.json | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/package.json | Versi React/Tauri dan script build |
| 4 | Bukti repo | REPO | Cargo.toml | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src-tauri/Cargo.toml | Dependensi Rust, rusqlite, image codecs |
| 5 | Bukti repo | REPO | main.rs | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src-tauri/src/main.rs | Windows-specific APPDATA dan entry point |
| 6 | Bukti repo | REPO | RAW loader | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src-tauri/src/raw_engine/loader.rs | Fallback embedded JPEG pada RAW |
| 7 | Bukti repo | REPO | tauri.conf.json | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src-tauri/tauri.conf.json | Window desktop, NSIS, CSP null |
| 8 | Bukti repo | REPO | Tauri capability default | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src-tauri/capabilities/default.json | Capability saat ini desktop/core only |
| 9 | Bukti repo | REPO | tauriBridge.ts | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src/services/tauriBridge.ts | Bridge masih berasumsi desktop |
| 10 | Bukti repo | REPO | batchExport.ts | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src/services/batchExport.ts | Batch 50/200MB, ZIP dan base64 di JS |
| 11 | Bukti repo | REPO | InteractiveImageViewer.tsx | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src/components/qc/InteractiveImageViewer.tsx | UI mouse/wheel/drag-drop |
| 12 | Bukti repo | REPO | canvasColorExtractor.ts | https://github.com/Luciansvon/AI-COLOR-COMPARE/blob/main/src/utils/canvasColorExtractor.ts | Canvas/getImageData sebagai pixel pipeline |
| 13 | Bukti repo | REPO | GitHub workflows | https://github.com/Luciansvon/AI-COLOR-COMPARE/tree/main/.github/workflows | CI/release masih Windows-centric |
| 14 | Tauri resmi | RESMI | Tauri WebView Versions | https://tauri.app/reference/webview-versions/ | Android memakai system WebView, tidak dibundel |
| 15 | Tauri resmi | RESMI | Tauri Prerequisites | https://v2.tauri.app/start/prerequisites/ | JDK/Android Studio/SDK/NDK setup |
| 16 | Tauri resmi | RESMI | Tauri Mobile Plugin Development | https://v2.tauri.app/develop/plugins/develop-mobile/ | Plugin Kotlin/Java native dan 16 KB |
| 17 | Tauri resmi | RESMI | Tauri Android Signing | https://v2.tauri.app/distribute/sign/android/ | Signing APK/AAB |
| 18 | Tauri resmi | RESMI | Tauri Google Play Distribution | https://v2.tauri.app/distribute/google-play/ | AAB/Play release |
| 19 | Tauri resmi | RESMI | Tauri Capabilities | https://v2.tauri.app/security/capabilities/ | Least privilege command/plugin capability |
| 20 | Tauri resmi | RESMI | Tauri CSP | https://v2.tauri.app/security/csp/ | CSP perlu dikonfigurasi, bukan null |
| 21 | Tauri resmi | RESMI | Tauri IPC ArrayBuffer | https://v2.tauri.app/develop/calling-rust/ | IPC FE-Rust dan data binary |
| 22 | Tauri resmi | RESMI | Tauri Android Init | https://v2.tauri.app/start/create-project/ | Baseline mobile project generation |
| 23 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Dialog returns content:// #2749 | https://github.com/tauri-apps/plugins-workspace/issues/2749 | URI Android tidak sama dengan path desktop |
| 24 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Folder picker Android #14587 | https://github.com/tauri-apps/tauri/issues/14587 | ACTION_OPEN_DOCUMENT_TREE URI semantics |
| 25 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Save result 0-byte #3356 | https://github.com/tauri-apps/plugins-workspace/issues/3356 | Risiko export terlihat sukses tapi 0 byte |
| 26 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Google Drive write silent fail #3109 | https://github.com/tauri-apps/plugins-workspace/issues/3109 | Provider cloud dapat gagal tanpa error |
| 27 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Picker filename mismatch #3029 | https://github.com/tauri-apps/plugins-workspace/issues/3029 | Nama berkas dari provider tidak konsisten |
| 28 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Dialog first call unresolved #3366 | https://github.com/tauri-apps/plugins-workspace/issues/3366 | Promise dialog Android dapat macet |
| 29 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Fire OS selector crash #2745 | https://github.com/tauri-apps/plugins-workspace/issues/2745 | Fragmentasi Android/Fire OS |
| 30 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Dialog filters Android #2826 | https://github.com/tauri-apps/plugins-workspace/issues/2826 | Filter picker tidak konsisten |
| 31 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Activity callback Android #1741 | https://github.com/tauri-apps/plugins-workspace/issues/1741 | Callback result native dapat tidak terpanggil |
| 32 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Blank WebView relaunch #15671 | https://github.com/tauri-apps/tauri/issues/15671 | Lifecycle Tauri/WebView setelah task removal |
| 33 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Java/Gradle compatibility #15385 | https://github.com/tauri-apps/tauri/issues/15385 | Build APK gagal karena JDK/Gradle mismatch |
| 34 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Large binary IPC #13405 | https://github.com/tauri-apps/tauri/issues/13405 | Payload image besar buruk untuk IPC |
| 35 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Android ArrayBuffer invoke #10573 | https://github.com/tauri-apps/tauri/issues/10573 | Riwayat bug buffer binary Android |
| 36 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Android safe-area #14240 | https://github.com/tauri-apps/tauri/issues/14240 | Insets WebView dapat salah |
| 37 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Tauri Android modal raster community | https://www.reddit.com/r/tauri/comments/1uckic8/android_webview_textinputbutton_inside_fixed/ | Contoh rendering WebView Android |
| 38 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Tauri WebView performance community | https://www.reddit.com/r/tauri/comments/1rim086/tauri_webview_performance_versus_chrome_on_android/ | Pengalaman performa WebView mobile |
| 39 | Tauri issue/komunitas | ISSUE/KOMUNITAS | Tauri mobile DX community | https://www.reddit.com/r/tauri/comments/1maezph/tauri_is_unsuitable_for_mobile/ | Pengalaman debugging mobile, bukti anekdotal |
| 40 | Android platform | RESMI | 16 KB page sizes | https://developer.android.com/guide/practices/page-sizes | Native library compatibility |
| 41 | Android platform | RESMI | Google Play target API requirements | https://support.google.com/googleplay/android-developer/answer/11926878 | Target API 36 sejak 31 Agustus 2026 |
| 42 | Android platform | RESMI | Android 16 behavior changes | https://developer.android.com/about/versions/16/behavior-changes-16 | Edge-to-edge, predictive back, large-screen behavior |
| 43 | Android platform | RESMI | Android 16 summary | https://developer.android.com/about/versions/16/summary | Platform baseline |
| 44 | Android platform | RESMI | Android 15 behavior changes | https://developer.android.com/about/versions/15/behavior-changes-15 | Perubahan edge-to-edge sebelumnya |
| 45 | Android platform | RESMI | Edge-to-edge Views | https://developer.android.com/develop/ui/views/layout/edge-to-edge | Insets untuk View/WebView |
| 46 | Android platform | RESMI | System bars | https://developer.android.com/develop/ui/compose/system/system-bars | Perilaku system bars |
| 47 | Android platform | RESMI | WindowInsets | https://developer.android.com/develop/ui/compose/system/insets | Safe drawing areas |
| 48 | Android platform | RESMI | Accessibility app guidance | https://developer.android.com/guide/topics/ui/accessibility/apps.html | Touch target sekitar 48dp |
| 49 | Android platform | RESMI | Android 14 features/font scaling | https://developer.android.com/about/versions/14/features | Font scaling non-linear hingga 200% |
| 50 | Android platform | RESMI | Activity lifecycle | https://developer.android.com/guide/components/activities/activity-lifecycle.html | Process death/recreation |
| 51 | Android platform | RESMI | WebView renderer termination | https://developer.android.com/develop/ui/views/layout/webapps/handle-termination | Recovery renderer WebView |
| 52 | Android platform | RESMI | WebView memory management | https://developer.android.com/develop/ui/views/layout/webapps/manage-webview-memory | WebView memory pressure |
| 53 | Android platform | RESMI | Storage Access Framework | https://developer.android.com/guide/topics/providers/document-provider | content:// dan document providers |
| 54 | Android platform | RESMI | Photo Picker | https://developer.android.com/training/data-storage/shared/photo-picker | Import gambar dengan permission minimal |
| 55 | Android platform | RESMI | FileProvider | https://developer.android.com/reference/androidx/core/content/FileProvider.html | Share file content:// aman |
| 56 | Android platform | RESMI | App-specific storage | https://developer.android.com/training/data-storage/app-specific | Data internal hilang saat uninstall |
| 57 | Android platform | RESMI | Android storage overview | https://developer.android.com/training/data-storage | Jangan hardcode path |
| 58 | Android platform | RESMI | Storage use cases | https://developer.android.com/training/data-storage/use-cases | Internal storage privacy/encryption |
| 59 | Android platform | RESMI | Play photo/video permissions policy | https://support.google.com/googleplay/android-developer/answer/16558241 | Hindari permission galeri luas |
| 60 | Android platform | RESMI | Design for Safety | https://developer.android.com/quality/privacy-and-security | Least privilege/privacy |
| 61 | Android platform | RESMI | Auto Backup | https://developer.android.com/identity/data/autobackup | Backup default dan exclusion rules |
| 62 | Android platform | RESMI | Backup security best practices | https://developer.android.com/privacy-and-security/risks/backup-best-practices | Batasi data QC cloud backup |
| 63 | Android platform | RESMI | App signing | https://developer.android.com/studio/publish/app-signing | Keystore dan update identity |
| 64 | Android platform | RESMI | App versioning | https://developer.android.com/studio/publish/versioning | versionCode/versionName |
| 65 | Android platform | RESMI | StrictMode | https://developer.android.com/reference/android/os/StrictMode.html | Deteksi I/O main thread |
| 66 | Android platform | RESMI | Native memory profiling | https://developer.android.com/topic/performance/memory/guide/native-memory | Profil Rust/C/C++ |
| 67 | Android platform | RESMI | Bitmap memory | https://developer.android.com/topic/performance/vitals/bitmap-memory-usage | Bitmap full-res mahal RAM |
| 68 | Android platform | RESMI | Load large bitmaps | https://developer.android.com/topic/performance/graphics/load-bitmap | Downsampling |
| 69 | Android platform | RESMI | Background work overview | https://developer.android.com/develop/background-work | Pilih API background sesuai lifecycle |
| 70 | Android platform | RESMI | WorkManager persistent work | https://developer.android.com/develop/background-work/background-tasks/persistent | Jangan pakai untuk pekerjaan foreground biasa |
| 71 | Android platform | RESMI | Foreground services | https://developer.android.com/develop/background-work/services | Batasan dan notification |
| 72 | Android platform | RESMI | Room migration | https://developer.android.com/training/data-storage/room/migrating-db-versions | Testing migration DB |
| 73 | Android platform | RESMI | Room DB testing | https://developer.android.com/training/data-storage/room/testing-db | Test migration/DAO |
| 74 | Android platform | RESMI | SQLite to Room | https://developer.android.com/training/data-storage/room/sqlite-room-migration | Alternatif jika adapter Kotlin mengambil DB |
| 75 | Android platform | RESMI | Room releases | https://developer.android.com/jetpack/androidx/releases/room | Versi/driver SQLite |
| 76 | Android platform | RESMI | Firebase Test Lab | https://firebase.google.com/docs/test-lab | Real/virtual device regression |
| 77 | Android platform | RESMI | Firebase App Distribution | https://firebase.google.com/docs/app-distribution | Distribusi APK pilot |
| 78 | Database | RESMI/ISSUE | SQLite corruption guide | https://www.sqlite.org/howtocorrupt.html | Durability/corruption cases |
| 79 | Database | RESMI/ISSUE | SQLite PRAGMA | https://www.sqlite.org/pragma.html | journal_mode/synchronous/integrity_check |
| 80 | Database | RESMI/ISSUE | SQLite Powersafe Overwrite | https://www.sqlite.org/psow.html | Storage durability assumption |
| 81 | Database | RESMI/ISSUE | rusqlite Android savepoint issue #1177 | https://github.com/rusqlite/rusqlite/issues/1177 | Motivasi regression test, bukan bukti bug saat ini |
| 82 | Kamera Android | RESMI | CameraX release notes | https://developer.android.com/jetpack/androidx/releases/camera | Stable 1.6.2, alpha 1.7; device quirks |
| 83 | Kamera Android | RESMI | CameraX overview | https://developer.android.com/media/camera/camerax | Lifecycle camera abstraction |
| 84 | Kamera Android | RESMI | CameraX lab-tested devices | https://developer.android.com/media/camera/camerax/devices | Daftar perangkat diuji Google |
| 85 | Kamera Android | RESMI | CameraX Image Analysis | https://developer.android.com/media/camera/camerax/analyze | YUV/RGBA/backpressure |
| 86 | Kamera Android | RESMI | CameraX Extensions | https://developer.android.com/media/camera/camerax/extensions-api | HDR/Night/Bokeh vendor extension |
| 87 | Kamera Android | RESMI | FocusMeteringAction | https://developer.android.com/reference/androidx/camera/core/FocusMeteringAction | AF/AE/AWB region; lock API 1.7 alpha |
| 88 | Kamera Android | RESMI | CameraCharacteristics | https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics | Hardware level/capability/RAW/manual |
| 89 | Kamera Android | RESMI | CaptureRequest | https://developer.android.com/reference/android/hardware/camera2/CaptureRequest | AE/AWB/AF/tonemap/noise/stabilization requests |
| 90 | Kamera Android | RESMI | CaptureResult | https://developer.android.com/reference/android/hardware/camera2/CaptureResult | Verifikasi setting aktual/3A/flicker/physical ID |
| 91 | Kamera Android | RESMI | TotalCaptureResult | https://developer.android.com/reference/android/hardware/camera2/TotalCaptureResult.html | Metadata capture lengkap |
| 92 | Kamera Android | RESMI | Camera2 package summary | https://developer.android.com/reference/android/hardware/camera2/package-summary | Color space default YUV/RGB/JPEG |
| 93 | Kamera Android | RESMI | DngCreator | https://developer.android.com/reference/android/hardware/camera2/DngCreator | Membuat DNG dari RAW_SENSOR + metadata |
| 94 | Kamera Android | RESMI | Android NDK Camera | https://developer.android.com/ndk/reference/group/camera | Camera metadata native, scene flicker |
| 95 | Kamera Android | RESMI | Multi-camera API | https://developer.android.com/media/camera/camera2/multi-camera | Logical/physical camera |
| 96 | Kamera Android | RESMI | Camera ITS tests | https://source.android.com/docs/compatibility/cts/camera-its-tests | Fungsional/correctness camera API |
| 97 | Kamera Android | RESMI | Camera HAL testing | https://source.android.com/docs/compatibility/cts/camera-hal | CTS/ITS camera |
| 98 | Kamera Android | RESMI | Camera orientation | https://developer.android.com/media/camera/camerax/orientation-rotation | Rotation/orientation correctness |
| 99 | Kamera Android | RESMI | Camera background restrictions | https://developer.android.com/about/versions/14/changes/fgs-types-required | Camera foreground-service restrictions |
| 100 | Kamera Android | RESMI | CameraX ImageCapture | https://developer.android.com/reference/androidx/camera/core/ImageCapture | Capture mode/output behavior |
| 101 | Kamera Android | RESMI | Camera2 color space profiles | https://developer.android.com/reference/android/hardware/camera2/params/ColorSpaceProfiles | Supported output color spaces |
| 102 | Kamera Android | RESMI | LensShadingMap | https://developer.android.com/reference/android/hardware/camera2/params/LensShadingMap | Per-channel shading correction metadata |
| 103 | Kamera Android | RESMI | ColorSpace Named | https://developer.android.com/reference/android/graphics/ColorSpace.Named | sRGB/P3 definitions Android |
| 104 | Display/Web | RESMI | Android wide color gamut | https://developer.android.com/training/wide-color-gamut | P3/wide-gamut display differences |
| 105 | Display/Web | RESMI | Android Night Light | https://source.android.com/docs/core/display/night-light | System display color transform |
| 106 | Display/Web | RESMI | Android accessibility color correction | https://support.google.com/accessibility/android/answer/11183305 | Grayscale/color correction user setting |
| 107 | Display/Web | RESMI | Canvas 2D context | https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext | Canvas color space behavior |
| 108 | Display/Web | RESMI | ImageData.colorSpace | https://developer.mozilla.org/en-US/docs/Web/API/ImageData/colorSpace | Browser support and color space |
| 109 | Display/Web | RESMI | Canvas getImageData | https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData | Pixel extraction pipeline |
| 110 | Standar warna/pencahayaan | STANDAR | ISO/CIE 11664-6:2022 CIEDE2000 | https://www.iso.org/standard/82662.html | ΔE00 formula standard |
| 111 | Standar warna/pencahayaan | STANDAR | ISO/CIE 11664-2:2022 illuminants | https://www.iso.org/standard/77215.html | Standard illuminants |
| 112 | Standar warna/pencahayaan | STANDAR | CIE D65 dataset | https://www.cie.co.at/datatable/cie-standard-illuminant-d65 | D65 SPD reference |
| 113 | Standar warna/pencahayaan | STANDAR | CIE Colorimetry 4th Edition | https://www.cie.co.at/publications/colorimetry-4th-edition | Colorimetry foundation |
| 114 | Standar warna/pencahayaan | STANDAR | CIE 176:2006 Geometry | https://www.cie.co.at/publications/geometric-tolerances-colour-measurements | Measurement geometry reproducibility |
| 115 | Standar warna/pencahayaan | STANDAR | ISO/CIE 23603:2024 Daylight simulators | https://www.cie.co.at/publications/standard-method-assessing-spectral-quality-daylight-simulators-visual-appraisal-and-1 | Spectral quality daylight simulator |
| 116 | Standar warna/pencahayaan | STANDAR | CIE PS 002:2025 Colour Quality Metrics | https://www.cie.co.at/publications/cie-ps-0022025-cie-position-statement-colour-quality-metrics-2nd-edition | Rf vs legacy Ra/CRI |
| 117 | Standar warna/pencahayaan | STANDAR | CIE 224:2017 Colour Fidelity Index | https://www.cie.co.at/publications/colour-fidelity-index-accurate-scientific-use | Scientific color fidelity metric |
| 118 | Standar warna/pencahayaan | STANDAR | CIE typical LED SPD dataset | https://cie.co.at/datatable/relative-spectral-power-distributions-illuminants-representing-typical-led-lamps | Contoh SPD LED |
| 119 | Standar warna/pencahayaan | STANDAR | ANSI/IES TM-30-24 | https://store.ies.org/product/technical-memorandum-ies-method-for-evaluating-light-source-color-rendition/ | Fidelity/gamut/hue shifts lamp |
| 120 | Standar warna/pencahayaan | STANDAR | ASTM D2244-25 | https://store.astm.org/d2244-25.html | Color difference/tolerance commercial |
| 121 | Standar warna/pencahayaan | STANDAR | ASTM D1729-22 | https://store.astm.org/d1729-22.html | Visual appraisal under controlled light |
| 122 | Standar warna/pencahayaan | STANDAR | ASTM D523-25 | https://store.astm.org/standards/d523 | Specular gloss |
| 123 | Standar warna/pencahayaan | STANDAR | ASTM D4086-18(2023) | https://store.astm.org/d4086-18r23.html | Metamerism index |
| 124 | Paper smartphone/color | PAPER | Nixon et al. 2020 device-independent smartphone colorimetry | https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0230561 | Per-device calibration, ambient correction, raw |
| 125 | Paper smartphone/color | PAPER | Fyfe/Reid et al. 2025 RGB correction and gamut limits | https://link.springer.com/article/10.1007/s00216-025-06021-9 | Repeatability, lighting, angle, gamut limitation |
| 126 | Paper smartphone/color | PAPER | Smartphone spectral sensitivity measurement 2021 | https://www.mdpi.com/1424-8220/21/15/4985 | Sensor spectral sensitivity differs |
| 127 | Paper smartphone/color | PAPER | Semi-Supervised Raw-to-Raw Mapping 2021 | https://arxiv.org/abs/2106.13883 | RAW color spaces differ antar sensor |
| 128 | Paper smartphone/color | PAPER | Improved Mapping Between Illuminations and Sensors for RAW Images 2025 | https://arxiv.org/abs/2508.14730 | Sensor+illumination RAW mapping |
| 129 | Paper smartphone/color | PAPER | Advances in Smartphone-Based Colorimetry and Fluorimetry 2025 | https://chemistry-europe.onlinelibrary.wiley.com/doi/10.1002/cplu.202500135 | Review variability/accuracy/color models |
| 130 | Paper smartphone/color | PAPER | HueDx smartphone color calibration 2024 | https://pmc.ncbi.nlm.nih.gov/articles/PMC11451979/ | Smartphone color correction example |
| 131 | Paper smartphone/color | PAPER | SMP-CC smartphone color correction 2024 | https://pubmed.ncbi.nlm.nih.gov/38692108/ | Mobile color correction method |
| 132 | Kayu/material | PAPER | Wood weathering color change | https://www.sciencedirect.com/science/article/pii/S235271022033597X | UV/weathering mengubah CIELAB kayu |
| 133 | Kayu/material | PAPER | Indoor light effects on wood/coating 2024 | https://www.mdpi.com/2076-3417/14/3/1226 | Cahaya indoor mengubah warna |
| 134 | Kayu/material | PAPER | Seven-year light exposure wood/wax | https://www.mdpi.com/2079-6412/12/11/1689 | Master/coating berubah seiring waktu |
| 135 | Kayu/material | PAPER | Wood coating photodegradation review 2026 | https://www.mdpi.com/2073-4360/18/9/1090 | Penuaan coating/UV |
| 136 | Kayu/material | PAPER | Wood inhomogeneous color measurement | https://link.springer.com/article/10.1007/s00107-021-01704-3 | Kayu heterogen, perlu repeated measurements |
| 137 | Kayu/material | PAPER | Polarization/specular separation | https://arxiv.org/abs/2103.11652 | Cross-polarization sebagai R&D refleksi |
| 138 | RAW decoder ecosystem | REPO | LibRaw releases | https://github.com/LibRaw/LibRaw/releases | Decoder RAW mature lintas kamera |
| 139 | RAW decoder ecosystem | REPO | LibRaw downloads | https://www.libraw.org/download | Current release notes/license |
| 140 | RAW decoder ecosystem | REPO | rawloader | https://github.com/pedrocr/rawloader | Rust RAW decoder candidate |
| 141 | RAW decoder ecosystem | REPO | rawloader docs | https://docs.rs/crate/rawloader/latest | Format/API candidate |
| 142 | RAW decoder ecosystem | REPO | dnglab/rawler org | https://github.com/dnglab | Rust DNG/RAW tooling |
| 143 | RAW decoder ecosystem | REPO | RawSpeed | https://github.com/darktable-org/rawspeed | RAW parser/decoder ecosystem |
| 144 | RAW decoder ecosystem | REPO | AndroidLibRaw | https://github.com/dburckh/AndroidLibRaw | LibRaw Android + 16K claims |
| 145 | RAW decoder ecosystem | REPO | LibRaw Android sample | https://github.com/TSGames/Libraw-Android | Historical NDK integration example |
| 146 | RAW decoder ecosystem | REPO | zenraw | https://github.com/imazen/zenraw | Exploratory Rust wrapper only |
| 147 | Komunitas | KOMUNITAS | Androiddev CameraX/OEM discussions | https://www.reddit.com/r/androiddev/search/?q=CameraX%20OEM%20camera&restrict_sr=1 | Anekdot fragmentasi OEM, bukan sumber keputusan utama |
| 148 | Komunitas | KOMUNITAS | Androiddev Camera2 RAW discussions | https://www.reddit.com/r/androiddev/search/?q=Camera2%20RAW&restrict_sr=1 | Anekdot manual/RAW device behavior |
| 149 | Komunitas | KOMUNITAS | Tauri Android discussions | https://www.reddit.com/r/tauri/search/?q=android&restrict_sr=1 | Anekdot mobile Tauri |

**Total sumber unik di ledger: 149.**

## 11. Prioritas implementasi setelah plan disetujui

1. Buat `ANDROID_ARCHITECTURE_AND_RISK.md` dari dokumen ini di repo.
2. Pisahkan `src-tauri` menjadi shared library + desktop/mobile entry.
3. Ubah core dari path-centric menjadi buffer/descriptor-centric.
4. Buat Android native adapter untuk CameraX + Camera2Interop + ContentResolver.
5. Pindahkan numeric ROI/correction dari Canvas ke Rust/native.
6. Buat qualification + capture metadata ledger.
7. Baru setelah itu build APK pilot.

---
Dokumen ini sengaja tidak mengubah repository. Sesuai `AGENT.md`, implementasi baru dilakukan setelah plan disetujui Bima.
