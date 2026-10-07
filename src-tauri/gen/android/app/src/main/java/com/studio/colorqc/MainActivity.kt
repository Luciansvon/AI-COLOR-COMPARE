package com.studio.colorqc

import android.content.Context
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.print.PrintAttributes
import android.print.PrintJob
import android.print.PrintManager
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  private lateinit var createDocumentLauncher: ActivityResultLauncher<android.content.Intent>
  private var printWebView: WebView? = null
  private var activePrintJob: PrintJob? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    createDocumentLauncher = activityResultRegistry.register(
      "studio-color-qc-create-document",
      this,
      ActivityResultContracts.StartActivityForResult(),
    ) { result -> AndroidDocumentRequestCoordinator.deliver(result) }
    AndroidDocumentRequestCoordinator.attach(this, createDocumentLauncher)

    val contentView = findViewById<android.view.View>(android.R.id.content)
    if (contentView != null) {
      ViewCompat.setOnApplyWindowInsetsListener(contentView) { view, insets ->
        val bars = insets.getInsets(
          WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
        )
        view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
        insets
      }
    }
  }

  fun printHtmlReport(html: String, jobName: String, onOpened: (String?) -> Unit) {
    runOnUiThread {
      var resultSent = false
      fun finish(error: String?) {
        if (resultSent) return
        resultSent = true
        onOpened(error)
      }
      try {
        val oldJob = activePrintJob
        if (oldJob != null && !oldJob.isCompleted && !oldJob.isCancelled && !oldJob.isFailed) {
          finish("Pekerjaan cetak sebelumnya masih berjalan.")
          return@runOnUiThread
        }

        printWebView?.destroy()
        printWebView = null
        activePrintJob = null
        val printManager = getSystemService(Context.PRINT_SERVICE) as? PrintManager
        if (printManager == null) {
          finish("Layanan cetak tidak tersedia pada perangkat ini.")
          return@runOnUiThread
        }

        val printView = WebView(this)
        printWebView = printView
        printView.setBackgroundColor(android.graphics.Color.WHITE)
        printView.settings.javaScriptEnabled = false
        printView.settings.blockNetworkLoads = true
        printView.settings.blockNetworkImage = true
        printView.settings.allowFileAccess = false
        val timeout = Runnable {
          if (!resultSent) {
            printView.destroy()
            if (printWebView === printView) printWebView = null
            finish("Laporan tidak selesai dimuat untuk dicetak.")
          }
        }
        android.os.Handler(mainLooper).postDelayed(timeout, PRINT_LOAD_TIMEOUT_MS)
        printView.webViewClient = object : WebViewClient() {
          override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true

          override fun onPageFinished(view: WebView, url: String) {
            if (resultSent) return
            android.os.Handler(mainLooper).removeCallbacks(timeout)
            try {
              activePrintJob = printManager.print(
                jobName,
                view.createPrintDocumentAdapter(jobName),
                PrintAttributes.Builder().build(),
              )
              finish(null)
            } catch (error: Exception) {
              view.destroy()
              if (printWebView === view) printWebView = null
              finish(error.message ?: "Gagal membuat pekerjaan cetak.")
            }
          }
        }
        printView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
      } catch (error: Exception) {
        finish(error.message ?: "WebView cetak gagal disiapkan.")
      }
    }
  }

  override fun onDestroy() {
    AndroidDocumentRequestCoordinator.detach(this)
    printWebView?.destroy()
    printWebView = null
    super.onDestroy()
  }

  companion object {
    private const val PRINT_LOAD_TIMEOUT_MS = 20_000L
  }
}
