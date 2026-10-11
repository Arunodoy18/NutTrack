package tech.buildc3.nura;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

/** Device token + sync status, kept in encrypted app-private storage. */
final class HealthStore {
    static final String BASE_URL = "https://dietbuddy.buildc3.tech";
    private static final String FILE = "nura_health_sync";

    private final SharedPreferences prefs;

    HealthStore(Context ctx) throws Exception {
        Context app = ctx.getApplicationContext();
        MasterKey key = new MasterKey.Builder(app).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
        prefs = EncryptedSharedPreferences.create(app, FILE, key,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
    }

    String token() { return prefs.getString("token", null); }
    String profileName() { return prefs.getString("profile", null); }
    long lastSync() { return prefs.getLong("last_sync", 0); }
    String lastStatus() { return prefs.getString("last_status", null); }

    void savePairing(String token, String profileName) {
        prefs.edit().putString("token", token).putString("profile", profileName).remove("last_sync").remove("last_status").apply();
    }
    void saveResult(boolean ok, String status) {
        SharedPreferences.Editor e = prefs.edit().putString("last_status", status);
        if (ok) e.putLong("last_sync", System.currentTimeMillis());
        e.apply();
    }
    void clear() { prefs.edit().clear().apply(); }
}
