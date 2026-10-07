package com.studio.colorqc

import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import java.lang.ref.WeakReference

data class AndroidDocumentOutcome(
  val uri: Uri? = null,
  val cancelled: Boolean = false,
  val error: String? = null,
)

/** Mengikat satu pemilih dokumen ke Activity yang masih aktif dan melepas callback saat Activity hancur. */
object AndroidDocumentRequestCoordinator {
  private var owner = WeakReference<MainActivity>(null)
  private var launcher: ActivityResultLauncher<Intent>? = null
  private var pending: ((AndroidDocumentOutcome) -> Unit)? = null

  @Synchronized
  fun attach(activity: MainActivity, resultLauncher: ActivityResultLauncher<Intent>) {
    owner = WeakReference(activity)
    launcher = resultLauncher
  }

  @Synchronized
  fun detach(activity: MainActivity) {
    if (owner.get() !== activity) return
    launcher = null
    owner.clear()
    if (activity.isFinishing && !activity.isChangingConfigurations) {
      val onPending = pending
      pending = null
      onPending?.invoke(AndroidDocumentOutcome(cancelled = true, error = "Aplikasi ditutup sebelum pemilihan berkas selesai."))
    }
  }

  @Synchronized
  fun launch(intent: Intent, onResult: (AndroidDocumentOutcome) -> Unit): Boolean {
    val currentLauncher = launcher ?: return false
    if (owner.get() == null || pending != null) return false
    pending = onResult
    return try {
      currentLauncher.launch(intent)
      true
    } catch (error: Exception) {
      pending = null
      throw error
    }
  }

  @Synchronized
  fun currentActivity(): MainActivity? = owner.get()

  @Synchronized
  fun deliver(result: ActivityResult) {
    val onPending = pending
    pending = null
    if (onPending == null) return
    if (result.resultCode != android.app.Activity.RESULT_OK) {
      onPending(AndroidDocumentOutcome(cancelled = true))
      return
    }
    val uri = result.data?.data
    if (uri == null) onPending(AndroidDocumentOutcome(error = "Android tidak mengembalikan lokasi berkas."))
    else onPending(AndroidDocumentOutcome(uri = uri))
  }
}
