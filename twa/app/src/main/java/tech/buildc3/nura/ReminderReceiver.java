package tech.buildc3.nura;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Runs when a reminder alarm fires, and after a reboot/app update (alarms don't survive those). */
public class ReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "NuraReminder";

    @Override
    public void onReceive(Context context, Intent intent) {
        final Context app = context.getApplicationContext();
        final String action = intent == null ? null : intent.getAction();
        final PendingResult pr = goAsync();
        new Thread(() -> {
            try {
                if ("tech.buildc3.nura.REMINDER_ALARM".equals(action)) showDue(app);
                ReminderAlarms.sync(app); // refresh whatever is left
                ReminderWorker.schedule(app); // keep the periodic job as a backup
            } catch (Exception e) {
                Log.w(TAG, "receiver failed: " + e);
            } finally {
                pr.finish();
            }
        }).start();
    }

    private static void showDue(Context ctx) throws Exception {
        String token = new HealthStore(ctx).reminderToken();
        if (token == null) return;
        HttpURLConnection c = (HttpURLConnection) new URL(HealthStore.BASE_URL + "/api/device/due").openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(20000);
        c.setRequestProperty("Authorization", "Bearer " + token);
        int code = c.getResponseCode();
        Log.i(TAG, "alarm poll -> " + code);
        if (code != 200) { c.disconnect(); return; }
        StringBuilder sb = new StringBuilder();
        try (InputStream is = c.getInputStream()) { byte[] buf = new byte[2048]; int n; while ((n = is.read(buf)) > 0) sb.append(new String(buf, 0, n, StandardCharsets.UTF_8)); }
        c.disconnect();
        JSONArray arr = new JSONObject(sb.toString()).optJSONArray("reminders");
        for (int i = 0; arr != null && i < arr.length(); i++) {
            JSONObject r = arr.getJSONObject(i);
            Notifier.show(ctx, r.optString("title", "Nura"), r.optString("body", ""), r.optString("url", "/dashboard"), r.optString("tag", r.optString("key", "r")));
        }
    }
}
