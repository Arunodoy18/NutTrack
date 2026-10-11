
# Tink (via androidx.security-crypto) references optional annotation classes
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.annotations.**
-keep class tech.buildc3.nura.HealthSyncWorker { *; }
-keep class tech.buildc3.nura.ReminderWorker { *; }
