package com.studio.colorqc

import android.app.Activity
import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import android.util.Base64
import android.os.Handler
import android.os.Looper
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.Locale
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

@InvokeArg
internal class BeginExportArgs {
  lateinit var fileName: String
  lateinit var mimeType: String
  var totalBytes: Long = 0
}

@InvokeArg
internal class AppendExportChunkArgs {
  lateinit var exportId: String
  lateinit var base64: String
  var offset: Long = 0
}

@InvokeArg
internal class ExportIdArgs {
  lateinit var exportId: String
}

@InvokeArg
internal class PrintReportArgs {
  lateinit var html: String
  lateinit var jobName: String
}

private data class ActiveExport(
  val id: String,
  val file: File,
  val fileName: String,
  val mimeType: String,
  val expectedBytes: Long,
  val output: FileOutputStream,
  val digest: MessageDigest,
  var bytesWritten: Long = 0,
  var pickerPending: Boolean = false,
  var finishInvoke: Invoke? = null,
)

@TauriPlugin
class AndroidIoPlugin(private val pluginActivity: Activity) : Plugin(pluginActivity) {
  private val io = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  @Volatile private var activeExport: ActiveExport? = null
  @Volatile private var closing = false

  @Command
  fun beginExport(invoke: Invoke) {
    val args = try { invoke.parseArgs(BeginExportArgs::class.java) } catch (error: Exception) {
      invoke.reject("Data ekspor tidak valid.", error)
      return
    }
    val fileName = safeFileName(args.fileName)
    if (fileName.isEmpty() || args.mimeType !in ALLOWED_MIME_TYPES) {
      invoke.reject("Nama atau jenis berkas ekspor tidak didukung.")
      return
    }
    if (args.totalBytes <= 0 || args.totalBytes > MAX_EXPORT_BYTES) {
      invoke.reject("Ukuran ekspor harus antara 1 bita dan 256 MiB.")
      return
    }

    executeIo(invoke) {
      if (closing) {
        invoke.reject("Aplikasi sedang ditutup. Ulangi ekspor setelah dibuka kembali.")
        return@executeIo
      }
      if (activeExport != null) {
        invoke.reject("Ekspor lain masih berjalan. Tunggu sampai selesai atau dibatalkan.")
        return@executeIo
      }
      try {
        var file: File? = null
        try {
          file = File.createTempFile("studio-qc-export-", ".tmp", pluginActivity.applicationContext.cacheDir)
          val output = FileOutputStream(file)
          val session = ActiveExport(
            id = UUID.randomUUID().toString(),
            file = file,
            fileName = fileName,
            mimeType = args.mimeType,
            expectedBytes = args.totalBytes,
            output = output,
            digest = MessageDigest.getInstance("SHA-256"),
          )
          activeExport = session
          invoke.resolveObject(mapOf("exportId" to session.id, "chunkBytes" to MAX_CHUNK_BYTES))
        } catch (error: Exception) {
          file?.delete()
          throw error
        }
      } catch (error: Exception) {
        invoke.reject("Berkas sementara tidak dapat disiapkan.", error)
      }
    }
  }

  @Command
  fun appendExportChunk(invoke: Invoke) {
    val args = try { invoke.parseArgs(AppendExportChunkArgs::class.java) } catch (error: Exception) {
      invoke.reject("Potongan ekspor tidak valid.", error)
      return
    }
    if (args.base64.length > MAX_CHUNK_BASE64_CHARS) {
      invoke.reject("Potongan ekspor terlalu besar.")
      return
    }

    executeIo(invoke) {
      if (closing) {
        invoke.reject("Aplikasi sedang ditutup. Ulangi ekspor setelah dibuka kembali.")
        return@executeIo
      }
      val session = activeExport
      if (session == null || session.id != args.exportId || session.pickerPending) {
        invoke.reject("Sesi ekspor sudah berakhir. Mulai ekspor lagi.")
        return@executeIo
      }
      try {
        val bytes = Base64.decode(args.base64, Base64.NO_WRAP)
        if (bytes.isEmpty() || bytes.size > MAX_CHUNK_BYTES || args.offset != session.bytesWritten
          || session.bytesWritten + bytes.size > session.expectedBytes) {
          invoke.reject("Urutan atau ukuran potongan ekspor tidak cocok.")
          return@executeIo
        }
        session.output.write(bytes)
        session.digest.update(bytes)
        session.bytesWritten += bytes.size
        invoke.resolveObject(mapOf("bytesWritten" to session.bytesWritten))
      } catch (error: Exception) {
        failSession(session, "Berkas sementara gagal ditulis.", error, invoke)
      }
    }
  }

  @Command
  fun saveExport(invoke: Invoke) {
    val args = try { invoke.parseArgs(ExportIdArgs::class.java) } catch (error: Exception) {
      invoke.reject("Sesi ekspor tidak valid.", error)
      return
    }
    executeIo(invoke) {
      if (closing) {
        invoke.reject("Aplikasi sedang ditutup. Ulangi ekspor setelah dibuka kembali.")
        return@executeIo
      }
      val session = activeExport
      if (session == null || session.id != args.exportId || session.pickerPending) {
        invoke.reject("Sesi ekspor sudah berakhir atau sedang dipakai.")
        return@executeIo
      }
      try {
        if (session.bytesWritten != session.expectedBytes) {
          throw IllegalStateException("Jumlah bita ekspor belum lengkap.")
        }
        session.output.flush()
        session.output.fd.sync()
        session.output.close()
        session.pickerPending = true
        session.finishInvoke = invoke
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
          addCategory(Intent.CATEGORY_OPENABLE)
          type = session.mimeType
          putExtra(Intent.EXTRA_TITLE, session.fileName)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
        main.post {
          try {
            val launched = AndroidDocumentRequestCoordinator.launch(intent) { outcome ->
              executeIo(invoke) { completeSave(session, outcome) }
            }
            if (!launched) executeIo(invoke) { failSession(session, "Pemilih tujuan Android sedang dipakai. Coba lagi.", null, invoke) }
          } catch (error: Exception) {
            executeIo(invoke) { failSession(session, "Pemilih tujuan Android gagal dibuka.", error, invoke) }
          }
        }
      } catch (error: Exception) {
        failSession(session, "Berkas sementara gagal disiapkan untuk disimpan.", error, invoke)
      }
    }
  }

  @Command
  fun abortExport(invoke: Invoke) {
    val args = try { invoke.parseArgs(ExportIdArgs::class.java) } catch (error: Exception) {
      invoke.reject("Sesi ekspor tidak valid.", error)
      return
    }
    executeIo(invoke) {
      if (closing) {
        invoke.resolveObject(mapOf("status" to "aborted"))
        return@executeIo
      }
      val session = activeExport
      if (session == null || session.id != args.exportId) {
        invoke.resolveObject(mapOf("status" to "aborted"))
      } else if (session.pickerPending) {
        invoke.resolveObject(mapOf("status" to "picker_pending"))
      } else {
        cleanup(session)
        invoke.resolveObject(mapOf("status" to "aborted"))
      }
    }
  }

  @Command
  fun printReport(invoke: Invoke) {
    val args = try { invoke.parseArgs(PrintReportArgs::class.java) } catch (error: Exception) {
      invoke.reject("Isi laporan cetak tidak valid.", error)
      return
    }
    if (args.html.length !in 1..MAX_PRINT_HTML_CHARS || !args.html.contains("<html", ignoreCase = true)
      || args.html.contains(Regex("<script\\b", RegexOption.IGNORE_CASE))
      || EXTERNAL_RESOURCE_PATTERN.containsMatchIn(args.html)) {
      invoke.reject("Laporan harus berupa HTML lokal tanpa skrip atau sumber jaringan.")
      return
    }
    val jobName = safeJobName(args.jobName)
    val current = AndroidDocumentRequestCoordinator.currentActivity()
    if (current == null) {
      invoke.reject("Jendela aplikasi sedang dimulai ulang. Buka ulang laporan lalu coba lagi.")
      return
    }
    current.printHtmlReport(args.html, jobName) { error ->
      if (error == null) invoke.resolveObject(mapOf("status" to "dialog_open", "jobName" to jobName))
      else invoke.reject("Dialog cetak Android gagal dibuka: $error")
    }
  }

  override fun onDestroy(activity: androidx.appcompat.app.AppCompatActivity) {
    if (activity.isChangingConfigurations) return
    closing = true
    val session = activeExport
    val invoke = session?.finishInvoke
    try {
      io.execute {
        if (session != null && activeExport?.id == session.id) {
          cleanup(session)
          invoke?.resolveObject(mapOf("status" to "cancelled", "reason" to "Aplikasi ditutup."))
        }
      }
    } catch (_: RejectedExecutionException) {
      session?.file?.delete()
    }
    io.shutdown()
  }

  private fun completeSave(session: ActiveExport, outcome: AndroidDocumentOutcome) {
    if (activeExport?.id != session.id) {
      outcome.uri?.let { uri -> runCatching { DocumentsContract.deleteDocument(pluginActivity.contentResolver, uri) } }
      cleanup(session)
      return
    }
    val invoke = session.finishInvoke
    if (invoke == null) {
      outcome.uri?.let { uri -> runCatching { DocumentsContract.deleteDocument(pluginActivity.contentResolver, uri) } }
      cleanup(session)
      return
    }
    if (outcome.cancelled) {
      cleanup(session)
      invoke.resolveObject(mapOf("status" to "cancelled", "reason" to (outcome.error ?: "Pemilih berkas ditutup.")))
      return
    }
    val uri = outcome.uri
    if (uri == null) {
      failSession(session, outcome.error ?: "Lokasi tujuan tidak tersedia.", null, invoke)
      return
    }
    try {
      val result = copyAndVerify(uri, session)
      cleanup(session)
      invoke.resolveObject(mapOf(
        "status" to "saved",
        "fileName" to result.fileName,
        "bytesWritten" to result.bytesWritten,
        "sha256" to result.sha256,
      ))
    } catch (error: Exception) {
      runCatching { DocumentsContract.deleteDocument(pluginActivity.contentResolver, uri) }
      failSession(session, "Berkas belum dapat diverifikasi setelah disimpan. Coba lokasi lain.", error, invoke)
    }
  }

  private fun copyAndVerify(uri: Uri, session: ActiveExport): VerifiedFile {
    val resolver = pluginActivity.applicationContext.contentResolver
    var copiedBytes = 0L
    val target = resolver.openOutputStream(uri, "w")
      ?: throw IllegalStateException("Penyedia Android tidak membuka aliran tulis.")
    target.use { rawOutput ->
      BufferedInputStream(FileInputStream(session.file)).use { input ->
        val output = BufferedOutputStream(rawOutput)
        val buffer = ByteArray(IO_BUFFER_BYTES)
        while (true) {
          val count = input.read(buffer)
          if (count < 0) break
          output.write(buffer, 0, count)
          copiedBytes += count
        }
        output.flush()
      }
    }
    if (copiedBytes != session.expectedBytes) throw IllegalStateException("Jumlah bita yang ditulis tidak cocok.")

    val readBackDigest = MessageDigest.getInstance("SHA-256")
    var readBackBytes = 0L
    val input = resolver.openInputStream(uri)
      ?: throw IllegalStateException("Penyedia Android tidak mengizinkan verifikasi baca-balik.")
    BufferedInputStream(input).use { stream ->
      val buffer = ByteArray(IO_BUFFER_BYTES)
      while (true) {
        val count = stream.read(buffer)
        if (count < 0) break
        readBackDigest.update(buffer, 0, count)
        readBackBytes += count
      }
    }
    val expectedHash = session.digest.digest().toHex()
    val actualHash = readBackDigest.digest().toHex()
    if (readBackBytes != session.expectedBytes || actualHash != expectedHash) {
      throw IllegalStateException("Ukuran atau SHA-256 hasil baca-balik berbeda dari sumber.")
    }
    return VerifiedFile(queryDisplayName(resolver, uri) ?: session.fileName, readBackBytes, actualHash)
  }

  private fun queryDisplayName(resolver: ContentResolver, uri: Uri): String? = runCatching {
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME)) else null
    }
  }.getOrNull()

  private fun failSession(session: ActiveExport, message: String, error: Exception?, invoke: Invoke) {
    if (activeExport?.id == session.id) cleanup(session)
    invoke.reject(message, error)
  }

  private fun executeIo(invoke: Invoke? = null, task: () -> Unit) {
    try {
      io.execute(task)
    } catch (error: RejectedExecutionException) {
      invoke?.reject("Aplikasi sedang ditutup. Buka kembali lalu ulangi ekspor.", error)
    }
  }

  private fun cleanup(session: ActiveExport) {
    runCatching { session.output.close() }
    session.file.delete()
    if (activeExport?.id == session.id) activeExport = null
    session.finishInvoke = null
  }

  private fun safeFileName(value: String): String = value
    .replace('\\', '/')
    .substringAfterLast('/')
    .replace(Regex("[\\u0000-\\u001f]"), "_")
    .trim()
    .take(120)

  private fun safeJobName(value: String): String = value
    .replace(Regex("[\\u0000-\\u001f]"), " ")
    .trim()
    .take(80)
    .ifEmpty { "Studio Color QC" }

  private data class VerifiedFile(val fileName: String, val bytesWritten: Long, val sha256: String)

  companion object {
    private const val MAX_EXPORT_BYTES = 256L * 1024 * 1024
    private const val MAX_CHUNK_BYTES = 512 * 1024
    private const val MAX_CHUNK_BASE64_CHARS = 700_000
    private const val MAX_PRINT_HTML_CHARS = 1_000_000
    private const val IO_BUFFER_BYTES = 64 * 1024
    private val ALLOWED_MIME_TYPES = setOf("image/jpeg", "application/zip", "application/json")
    private val EXTERNAL_RESOURCE_PATTERN = Regex(
      """(?is)(?:@import\s+(?:url\s*\(\s*)?['\"]?(?:https?:)?//|url\s*\(\s*['\"]?(?:https?:)?//|(?:src|href)\s*=\s*['\"](?:https?:)?//)""",
    )

    private fun ByteArray.toHex(): String = joinToString("") { byte -> "%02x".format(Locale.ROOT, byte) }
  }
}
