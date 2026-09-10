<#
.SYNOPSIS
    Skrip penandatangan digital Authenticode dan pembersih blokir SmartScreen Windows
    untuk biner dan installer Studio Color QC.
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$TargetPattern = "release-artifacts\*.exe"
)

$certName = "Studio QC Workstation"
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue | 
        Where-Object { $_.Subject -like "*$certName*" } | 
        Select-Object -First 1

if (-not $cert) {
    Write-Host "[INFO] Membuat sertifikat code signing lokal '$certName'..." -ForegroundColor Cyan
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(5)
}

$files = Get-ChildItem -Path $TargetPattern -File -ErrorAction SilentlyContinue
if (-not $files) {
    Write-Host "[WARN] Tidak ada berkas yang cocok dengan pola: $TargetPattern" -ForegroundColor Yellow
    exit 0
}

foreach ($f in $files) {
    Write-Host "[SIGN] Menandatangani berkas: $($f.FullName)..." -ForegroundColor Green
    try {
        Set-AuthenticodeSignature -FilePath $f.FullName -Certificate $cert -HashAlgorithm SHA256 | Out-Null
    } catch {
        Write-Host "  [ERR] Gagal menandatangani: $_" -ForegroundColor Red
    }

    # Buka blokir dari internet dan hapus stream SmartScreen jika ada
    try {
        Unblock-File -Path $f.FullName -ErrorAction SilentlyContinue
        Remove-Item -Path $f.FullName -Stream "SmartScreen" -ErrorAction SilentlyContinue
        Remove-Item -Path $f.FullName -Stream "Zone.Identifier" -ErrorAction SilentlyContinue
        Write-Host "  [OK] Tanda blokir SmartScreen & internet berhasil dibersihkan." -ForegroundColor Gray
    } catch {
        # abaikan jika stream tidak ada
    }
}

Write-Host "[SELESAI] Penandatanganan dan unblock selesai." -ForegroundColor Green
