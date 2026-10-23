package tech.buildc3.nura;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Wake-up alarms for reminders. Android throttles background jobs to about one run a day for an app that has not been
 * opened for a while, but it still delivers alarms, so the server tells us when reminders are due and we set an alarm
 * for each. When one fires, {@link ReminderReceiver} asks the server what to show. Blocking: call off the main thread.
 */
final class ReminderAlarms {
    private static final String TAG = "NuraReminder";
    private static final String PREFS = "nura_alarms";
    private static final int MAX = 30;

    /** Fetch the schedule and (re)set the alarms. Safe to call as often as you like. */
    static void sync(Context ctx) {
        try {
            String token = new HealthStore(ctx).reminderToken();
            if (token == null) { cancelAll(ctx); return; }
            HttpURLConnection c = (HttpURLConnection) new URL(HealthStore.BASE_URL + "/api/device/schedule").openConnection();
            c.setConnectTimeout(15000); c.setReadTimeout(20000);
            c.setRequestProperty("Authorization", "Bearer " + token);
            int code = c.getResponseCode();
            if (code == 401) { new HealthStore(ctx).clearReminderToken(); cancelAll(ctx); c.disconnect(); return; }
            if (code != 200) { Log.w(TAG, "schedule -> " + code); c.disconnect(); return; }
            StringBuilder sb = new StringBuilder();
            try (InputStream is = c.getInputStream()) { byte[] buf = new byte[2048]; int n; while ((n = is.read(buf)) > 0) sb.append(new String(buf, 0, n, StandardCharsets.UTF_8)); }
            c.disconnect();
            JSONArray times = new JSONObject(sb.toString()).optJSONArray("times");
            schedule(ctx, times);
        } catch (Exception e) {
            Log.w(TAG, "schedule failed: " + e);
        }
    }

    private static PendingIntent pi(Context ctx, int index, boolean create) {
        Intent i = new Intent(ctx, ReminderReceiver.class).setAction("tech.buildc3.nura.REMINDER_ALARM");
        int flags = PendingIntent.FLAG_IMMUTABLE | (create ? PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_NO_CREATE);
        return PendingIntent.getBroadcast(ctx, index, i, flags);
    }

    private static void schedule(Context ctx, JSONArray times) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        cancelAll(ctx);
        int n = 0;
        long now = System.currentTimeMillis();
        for (int i = 0; times != null && i < times.length() && n < MAX; i++) {
            long t = times.optLong(i, 0);
            if (t <= now) continue;
            // Inexact-but-doze-safe: needs no special permission and is not subject to the "rare" job throttle.
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi(ctx, n, true));
            n++;
        }
        // One more alarm well before the schedule runs out, so it keeps refreshing even if the app is never opened.
        long refresh = now + 10L * 3600_000L;
        if (n < MAX) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, refresh, pi(ctx, n, true)); n++; }
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("count", n).apply();
        Log.i(TAG, "alarms set: " + n);
    }

    static void cancelAll(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int count = Math.max(p.getInt("count", 0), MAX + 1);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        for (int i = 0; i < count; i++) { PendingIntent existing = pi(ctx, i, false); if (existing != null) { am.cancel(existing); existing.cancel(); } }
        p.edit().putInt("count", 0).apply();
    }
}
