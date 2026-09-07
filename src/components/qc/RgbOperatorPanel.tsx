import { MeasuredEvidence, UnifiedMaterialReport } from '../../types';
import { analyzeRgbBalance } from '../../color_science/rgb_analysis';

interface Props {
  measured: MeasuredEvidence;
  fusion?: UnifiedMaterialReport;
  hasConflict?: boolean;
}

export function RgbOperatorPanel({ measured, fusion, hasConflict }: Props) {
  const analysis = analyzeRgbBalance(measured);
  const clipped = measured.clippingWarning?.highlightClipped || measured.clippingWarning?.shadowClipped;
  const action = clipped ? analysis.cameraAction : hasConflict
    ? 'Saran global ditahan karena kondisi antararea belum aman. Periksa lampu, pantulan, dan tiap area sebelum menggeser White Balance kamera.'
    : fusion && !fusion.isGrainMatching
    ? 'Arah warna tetap terlihat di atas. Samakan sudut dan area foto serta periksa bahan terlebih dahulu sebelum mencoba koreksi kamera.'
    : analysis.cameraAction;

  return (
    <section aria-label="Panduan RGB operator" className="mb-5 rounded-xl border border-studio-700 bg-studio-950 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-xs font-semibold text-studio-300">Arah Warna terhadap Master</h5>
        <span className="text-sm font-bold text-amber-300">{analysis.label}</span>
      </div>
      {analysis.available && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {([
            ['r', 'Merah (R)', 'text-rose-300'],
            ['g', 'Hijau (G)', 'text-emerald-300'],
            ['b', 'Biru (B)', 'text-sky-300'],
          ] as const).map(([channel, label, color]) => (
            <div key={channel} className="rounded-lg bg-studio-900 px-2 py-2">
              <div className={`text-xs font-semibold ${color}`}>{label}</div>
              <div className="text-sm font-mono text-studio-100 mt-1">
                {analysis.deltaSharePercent[channel] > 0 ? '+' : ''}{analysis.deltaSharePercent[channel].toFixed(1)}
              </div>
              <div className="text-[10px] text-studio-400">poin persen proporsi</div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-studio-400">Nilai positif berarti proporsi kanal bertambah dibanding master; kayu tidak harus memiliki R, G, B yang sama.</p>
      <p className="text-xs text-studio-200 leading-relaxed">{action}</p>
      <p className="text-[11px] text-studio-400">Panduan kamera: Canon EOS 80D. Tipe kamera belum dibaca otomatis dari foto. Merah–hijau: G ↔ M; biru–kuning: A ↔ B. Setelah foto ulang, unggah foto produk baru lalu bandingkan.</p>
    </section>
  );
}
