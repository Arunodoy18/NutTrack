
# Tink (via androidx.security-crypto) references optional annotation classes
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.annotations.**
-keep class tech.buildc3.nura.HealthSyncWorker { *; }
-keep class tech.buildc3.nura.ReminderWorker { *; }
-keepclassmembers class tech.buildc3.nura.NativeBridge { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface
-keep class tech.buildc3.nura.HcJetpack { *; }
-dontwarn androidx.health.**
-keep class tech.buildc3.nura.ReminderReceiver { *; }
