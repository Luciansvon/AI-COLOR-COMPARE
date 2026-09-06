// Pembangkit Sampel Foto Kayu Studio Realistis untuk Pengujian Offline di Rumah

/**
 * Menghasilkan Data URL gambar simulasi kayu dengan corak serat realistis
 */
export function generateWoodTextureImage(
  baseHex: string,
  grainHex: string,
  options: {
    width?: number;
    height?: number;
    brightnessOffset?: number; // -50 to +50
    warmthOffset?: number;     // -50 to +50
    hasHighlight?: boolean;
    noiseAmount?: number;
    isChairComposition?: boolean;
  } = {}
): string {
  const width = options.width || 800;
  const height = options.height || 600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Studio Gradasi Halus
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#1c202a');
  bgGrad.addColorStop(1, '#0e1117');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Jika komposisi foto produk (kursi/furnitur dengan rangka kayu dan dudukan kain)
  if (options.isChairComposition) {
    // 1. Gambar Meja / Lantai Studio
    ctx.fillStyle = '#161922';
    ctx.fillRect(50, 480, width - 100, 80);

    // 2. Gambar Rangka Kayu Belakang (Frame)
    drawWoodPart(ctx, 220, 100, 60, 380, baseHex, grainHex, options);
    drawWoodPart(ctx, 520, 100, 60, 380, baseHex, grainHex, options);
    drawWoodPart(ctx, 220, 80, 360, 60, baseHex, grainHex, options);

    // 3. Sandaran Tangan Kayu (Armrest)
    drawWoodPart(ctx, 160, 260, 100, 40, baseHex, grainHex, options);
    drawWoodPart(ctx, 540, 260, 100, 40, baseHex, grainHex, options);

    // 4. Kaki Kayu Depan
    drawWoodPart(ctx, 240, 350, 45, 170, baseHex, grainHex, options);
    drawWoodPart(ctx, 515, 350, 45, 170, baseHex, grainHex, options);

    // 5. Dudukan Kain / Fabric Seat (Area NO-MASTER / Guardrail)
    const seatGrad = ctx.createLinearGradient(200, 300, 600, 380);
    seatGrad.addColorStop(0, '#5a6273');
    seatGrad.addColorStop(1, '#444b58');
    ctx.fillStyle = seatGrad;
    ctx.beginPath();
    ctx.roundRect(210, 300, 380, 85, [15, 15, 8, 8]);
    ctx.fill();

    // Pola tenunan kain
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 215; x < 585; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 305);
      ctx.lineTo(x, 380);
      ctx.stroke();
    }
  } else {
    // Gambar Papan Master Fisik Tunggal (Master Panel)
    drawWoodPart(ctx, 150, 80, width - 300, height - 160, baseHex, grainHex, options);

    // Label fisik terukir di sudut master
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText('STUDIO MASTER REF: WN-04', 180, height - 110);
    ctx.font = '400 12px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('FINISHING: DARK SATIN | CALIBRATED REF', 180, height - 90);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function drawWoodPart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseHex: string,
  grainHex: string,
  options: {
    brightnessOffset?: number;
    warmthOffset?: number;
    hasHighlight?: boolean;
  }
) {
  ctx.save();
  ctx.translate(x, y);

  // Efek bayangan halus
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  // Warna dasar kayu
  ctx.fillStyle = adjustColor(baseHex, options.brightnessOffset || 0, options.warmthOffset || 0);
  ctx.fillRect(0, 0, w, h);

  ctx.shadowColor = 'transparent';

  // Gambar alur urat serat kayu (Grain lines)
  ctx.strokeStyle = adjustColor(grainHex, options.brightnessOffset || 0, options.warmthOffset || 0);
  ctx.lineWidth = 1.2;

  const linesCount = Math.floor(w / 7);
  for (let i = 0; i < linesCount; i++) {
    const startX = i * 7 + (Math.random() * 3 - 1.5);
    ctx.beginPath();
    ctx.moveTo(startX, 0);

    const cp1x = startX + Math.sin(i * 0.5) * 6;
    const cp1y = h * 0.35;
    const cp2x = startX - Math.cos(i * 0.7) * 5;
    const cp2y = h * 0.7;
    const endX = startX + Math.sin(i * 0.3) * 4;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, h);
    ctx.globalAlpha = 0.35 + Math.random() * 0.25;
    ctx.stroke();
  }

  // Refleksi / Pantulan kilau lampu studio jika diaktifkan
  if (options.hasHighlight) {
    const hlGrad = ctx.createLinearGradient(0, 0, w, 0);
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hlGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
    hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hlGrad;
    ctx.fillRect(0, 0, w, h);
  }

  // Border bevel tipis
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(0, 0, w, h);

  ctx.restore();
}

function adjustColor(hex: string, brightnessDelta: number, warmthDelta: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // Sesuaikan kecerahan
  r = Math.max(0, Math.min(255, r + brightnessDelta * 1.5));
  g = Math.max(0, Math.min(255, g + brightnessDelta * 1.5));
  b = Math.max(0, Math.min(255, b + brightnessDelta * 1.5));

  // Sesuaikan kehangatan (warmth: +merah/+kuning, -biru)
  r = Math.max(0, Math.min(255, r + warmthDelta * 1.2));
  g = Math.max(0, Math.min(255, g + warmthDelta * 0.6));
  b = Math.max(0, Math.min(255, b - warmthDelta * 1.0));

  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
