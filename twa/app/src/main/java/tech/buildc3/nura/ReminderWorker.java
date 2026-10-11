package tech.buildc3.nura;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/** Every ~15 min: ask the server what is due for this account and show it as notifications. */
public class ReminderWorker extends Worker {
    private static final String NAME = "nura_reminders";

    public ReminderWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    @NonNull @Override
    public Result doWork() {
        try {
            HealthStore store = new HealthStore(getApplicationContext());
            String token = store.reminderToken();
            if (token == null) return Result.success();
            HttpURLConnection c = (HttpURLConnection) new URL(HealthStore.BASE_URL + "/api/device/due").openConnection();
            c.setConnectTimeout(15000); c.setReadTimeout(30000);
            c.setRequestProperty("Authorization", "Bearer " + token);
            int code = c.getResponseCode();
            if (code == 401) { store.clearReminderToken(); cancel(getApplicationContext()); c.disconnect(); return Result.success(); }
            if (code != 200) { c.disconnect(); return Result.retry(); }
            StringBuilder sb = new StringBuilder();
            try (InputStream is = c.getInputStream()) { byte[] buf = new byte[2048]; int n; while ((n = is.read(buf)) > 0) sb.append(new String(buf, 0, n, StandardCharsets.UTF_8)); }
            c.disconnect();
            JSONArray arr = new JSONObject(sb.toString()).optJSONArray("reminders");
            for (int i = 0; arr != null && i < arr.length(); i++) {
                JSONObject r = arr.getJSONObject(i);
                Notifier.show(getApplicationContext(), r.optString("title", "Nura"), r.optString("body", ""), r.optString("url", "/dashboard"), r.optString("tag", r.optString("key", "r")));
            }
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    static void schedule(Context ctx) {
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(ReminderWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build();
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.UPDATE, req);
    }
    static void cancel(Context ctx) { WorkManager.getInstance(ctx).cancelUniqueWork(NAME); }
}
