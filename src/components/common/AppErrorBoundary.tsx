import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return {
      hasError: true,
      message,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[Startup] Antarmuka gagal dirender:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-studio-950 text-studio-100 flex items-center justify-center p-6 font-sans">
        <section className="w-full max-w-xl rounded-2xl border border-rose-500/40 bg-studio-900 p-6 shadow-2xl">
          <h1 className="text-lg font-bold text-rose-300">Antarmuka Studio Color QC gagal dimuat</h1>
          <p className="mt-2 text-sm leading-relaxed text-studio-300">
            Data foto tidak diubah. Tutup aplikasi lalu buka kembali. Jika masalah tetap muncul, gunakan installer Windows terbaru.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-studio-950 p-3 text-xs text-rose-200 whitespace-pre-wrap break-words">
            {this.state.message || 'Kesalahan tidak diketahui'}
          </pre>
          <button
            type="button"
            className="mt-4 rounded-lg bg-studio-100 px-4 py-2 text-sm font-semibold text-studio-950 hover:bg-white"
            onClick={() => window.location.reload()}
          >
            Muat ulang aplikasi
          </button>
        </section>
      </main>
    );
  }
}
