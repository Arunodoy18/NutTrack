package tech.buildc3.nura;

import android.content.Context;
import android.health.connect.AggregateRecordsRequest;
import android.health.connect.AggregateRecordsResponse;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.ReadRecordsRequestUsingFilters;
import android.health.connect.ReadRecordsResponse;
import android.health.connect.TimeInstantRangeFilter;
import android.health.connect.datatypes.ActiveCaloriesBurnedRecord;
import android.health.connect.datatypes.ExerciseSessionRecord;
import android.health.connect.datatypes.ExerciseSessionType;
import android.health.connect.datatypes.StepsRecord;
import android.health.connect.datatypes.WeightRecord;
import android.health.connect.datatypes.units.Energy;
import android.os.Build;
import android.os.OutcomeReceiver;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Reads steps, active calories, workouts and weight from Health Connect (Android 14+ framework API)
 * and uploads them to Nura with the paired device's token. Blocking: call from a background thread.
 */
final class HealthSync {
    static final String[] READ_PERMISSIONS = {
            "android.permission.health.READ_STEPS",
            "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
            "android.permission.health.READ_EXERCISE",
            "android.permission.health.READ_WEIGHT",
    };
    static final String BACKGROUND_PERMISSION = "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND";

    static boolean supported() { return Build.VERSION.SDK_INT >= 34; }

    static final class Result {
        final boolean ok; final String message;
        Result(boolean ok, String message) { this.ok = ok; this.message = message; }
    }

    private static final Executor EXEC = Executors.newCachedThreadPool();

    private static <T> T await(CountDownLatch latch, AtomicReference<T> out, AtomicReference<Exception> err) throws Exception {
        if (!latch.await(60, TimeUnit.SECONDS)) throw new Exception("Health Connect timed out");
        if (err.get() != null) throw err.get();
        return out.get();
    }

    private static Long steps(HealthConnectManager m, Instant from, Instant to) throws Exception {
        TimeInstantRangeFilter f = new TimeInstantRangeFilter.Builder().setStartTime(from).setEndTime(to).build();
        AggregateRecordsRequest<Long> req = new AggregateRecordsRequest.Builder<Long>(f).addAggregationType(StepsRecord.STEPS_COUNT_TOTAL).build();
        CountDownLatch l = new CountDownLatch(1);
        AtomicReference<Long> out = new AtomicReference<>(); AtomicReference<Exception> err = new AtomicReference<>();
        m.aggregate(req, EXEC, new OutcomeReceiver<AggregateRecordsResponse<Long>, HealthConnectException>() {
            public void onResult(AggregateRecordsResponse<Long> r) { out.set(r.get(StepsRecord.STEPS_COUNT_TOTAL)); l.countDown(); }
            public void onError(HealthConnectException e) { err.set(e); l.countDown(); }
        });
        return await(l, out, err);
    }

    private static double kcal(HealthConnectManager m, Instant from, Instant to) throws Exception {
        TimeInstantRangeFilter f = new TimeInstantRangeFilter.Builder().setStartTime(from).setEndTime(to).build();
        AggregateRecordsRequest<Energy> req = new AggregateRecordsRequest.Builder<Energy>(f).addAggregationType(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL).build();
        CountDownLatch l = new CountDownLatch(1);
        AtomicReference<Energy> out = new AtomicReference<>(); AtomicReference<Exception> err = new AtomicReference<>();
        m.aggregate(req, EXEC, new OutcomeReceiver<AggregateRecordsResponse<Energy>, HealthConnectException>() {
            public void onResult(AggregateRecordsResponse<Energy> r) { out.set(r.get(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)); l.countDown(); }
            public void onError(HealthConnectException e) { err.set(e); l.countDown(); }
        });
        Energy e = await(l, out, err);
        return e == null ? 0 : e.getInCalories() / 1000.0;
    }

    private static <T extends android.health.connect.datatypes.Record> List<T> read(HealthConnectManager m, Class<T> type, Instant from, Instant to) throws Exception {
        TimeInstantRangeFilter f = new TimeInstantRangeFilter.Builder().setStartTime(from).setEndTime(to).build();
        ReadRecordsRequestUsingFilters<T> req = new ReadRecordsRequestUsingFilters.Builder<>(type).setTimeRangeFilter(f).setPageSize(500).build();
        CountDownLatch l = new CountDownLatch(1);
        AtomicReference<List<T>> out = new AtomicReference<>(); AtomicReference<Exception> err = new AtomicReference<>();
        m.readRecords(req, EXEC, new OutcomeReceiver<ReadRecordsResponse<T>, HealthConnectException>() {
            public void onResult(ReadRecordsResponse<T> r) { out.set(r.getRecords()); l.countDown(); }
            public void onError(HealthConnectException e) { err.set(e); l.countDown(); }
        });
        return await(l, out, err);
    }

    static String kindOf(int t) {
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_WALKING || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_HIKING) return "walking";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_RUNNING || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_RUNNING_TREADMILL) return "running";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_BIKING || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_BIKING_STATIONARY) return "cycling";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_SWIMMING_POOL || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_SWIMMING_OPEN_WATER) return "swimming";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_YOGA || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_STRETCHING || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_PILATES) return "yoga";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_STRENGTH_TRAINING || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_WEIGHTLIFTING) return "strength";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING) return "hiit";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_DANCING) return "dance";
        if (t == ExerciseSessionType.EXERCISE_SESSION_TYPE_BADMINTON || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_CRICKET
                || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_TENNIS
                || t == ExerciseSessionType.EXERCISE_SESSION_TYPE_BASKETBALL) return "sports";
        return "other";
    }

    /** @param daysBack how many days to (re-)read, including today */
    static Result run(Context ctx, int daysBack) {
        HealthStore store;
        try { store = new HealthStore(ctx); } catch (Exception e) { return new Result(false, "Secure storage unavailable"); }
        String token = store.token();
        if (token == null) return new Result(false, "Not paired");
        if (!supported()) return new Result(false, "Needs Android 14 or newer");
        try {
            HealthConnectManager m = (HealthConnectManager) ctx.getSystemService(Context.HEALTHCONNECT_SERVICE);
            if (m == null) return new Result(false, "Health Connect not available");
            ZoneId zone = ZoneId.systemDefault();
            LocalDate today = LocalDate.now(zone);
            JSONArray days = new JSONArray(), workouts = new JSONArray(), weights = new JSONArray();
            for (int i = 0; i < daysBack; i++) {
                LocalDate d = today.minusDays(i);
                Instant from = d.atStartOfDay(zone).toInstant();
                Instant to = i == 0 ? Instant.now() : d.plusDays(1).atStartOfDay(zone).toInstant();
                Long st = steps(m, from, to);
                double kc = kcal(m, from, to);
                if ((st != null && st > 0) || kc > 0) days.put(new JSONObject().put("day", d.toString()).put("steps", st == null ? 0 : st).put("activeKcal", Math.round(kc)));
            }
            Instant start = today.minusDays(daysBack - 1).atStartOfDay(zone).toInstant();
            for (ExerciseSessionRecord s : read(m, ExerciseSessionRecord.class, start, Instant.now())) {
                long minutes = Math.max(1, (s.getEndTime().toEpochMilli() - s.getStartTime().toEpochMilli()) / 60000);
                double kc = 0;
                try { kc = kcal(m, s.getStartTime(), s.getEndTime()); } catch (Exception ignore) { /* leave 0 */ }
                JSONObject w = new JSONObject().put("externalId", s.getMetadata().getId()).put("startedAt", s.getStartTime().toString())
                        .put("minutes", minutes).put("kcal", Math.round(kc)).put("kind", kindOf(s.getExerciseType()));
                if (s.getTitle() != null) w.put("title", s.getTitle().toString());
                workouts.put(w);
            }
            for (WeightRecord w : read(m, WeightRecord.class, start, Instant.now())) {
                weights.put(new JSONObject().put("at", w.getTime().toString()).put("kg", w.getWeight().getInGrams() / 1000.0));
            }
            JSONObject body = new JSONObject().put("source", "health-connect").put("days", days).put("workouts", workouts).put("weights", weights);
            int code = post(store, token, body.toString());
            if (code == 401) { store.clear(); return new Result(false, "This phone was disconnected. Pair again from Nura."); }
            if (code != 200) { store.saveResult(false, "Server error " + code); return new Result(false, "Server error " + code); }
            String msg = days.length() + " days, " + workouts.length() + " workouts, " + weights.length() + " weigh-ins";
            store.saveResult(true, msg);
            return new Result(true, msg);
        } catch (SecurityException e) {
            store.saveResult(false, "Permission needed");
            return new Result(false, "Allow Nura in Health Connect to read your data");
        } catch (Exception e) {
            String msg = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            store.saveResult(false, msg);
            return new Result(false, msg);
        }
    }

    private static int post(HealthStore store, String token, String json) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(HealthStore.BASE_URL + "/api/activity/import").openConnection();
        c.setRequestMethod("POST"); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("Authorization", "Bearer " + token);
        try (OutputStream os = c.getOutputStream()) { os.write(json.getBytes(StandardCharsets.UTF_8)); }
        int code = c.getResponseCode();
        try (InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream()) { if (is != null) while (is.read() != -1) { /* drain */ } }
        c.disconnect();
        return code;
    }

    /** Swap a pairing code for a device token. Returns the profile name. */
    static String pair(Context ctx, String code) throws Exception { return pair(ctx, code, false); }

    /** @param forApp true = the app's own account link (reminders); false = Health Connect for a chosen profile */
    static String pair(Context ctx, String code, boolean forApp) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(HealthStore.BASE_URL + "/api/sync/device").openConnection();
        c.setRequestMethod("POST"); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        String label = (Build.MANUFACTURER + " " + Build.MODEL).trim();
        try (OutputStream os = c.getOutputStream()) { os.write(new JSONObject().put("code", code).put("label", label).put("purpose", forApp ? "app" : "health").toString().getBytes(StandardCharsets.UTF_8)); }
        int status = c.getResponseCode();
        StringBuilder sb = new StringBuilder();
        try (InputStream is = status >= 400 ? c.getErrorStream() : c.getInputStream()) {
            if (is != null) { byte[] buf = new byte[1024]; int n; while ((n = is.read(buf)) > 0) sb.append(new String(buf, 0, n, StandardCharsets.UTF_8)); }
        }
        c.disconnect();
        JSONObject j = new JSONObject(sb.toString());
        if (status != 200 || !j.has("token")) throw new Exception(j.optString("error", "Pairing failed"));
        String name = j.optString("profileName", "");
        HealthStore st = new HealthStore(ctx);
        if (forApp) st.saveReminderToken(j.getString("token")); else st.savePairing(j.getString("token"), name);
        return name;
    }
}
