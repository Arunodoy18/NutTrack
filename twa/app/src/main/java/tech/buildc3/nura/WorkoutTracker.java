package tech.buildc3.nura;

import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

import org.json.JSONObject;

/**
 * Counts steps for a live workout with the phone's own step-counter sensor (the same one fitness apps use).
 * The sensor reports steps since the phone booted, so a workout is just "reading now − reading at start".
 * That is why nothing has to keep running in the background: the start reading is saved, and the next
 * time anyone asks, the sensor's latest total gives the answer, even if the app was closed in between.
 */
final class WorkoutTracker implements SensorEventListener {
    private static final String PREFS = "nura_workout";
    private final SharedPreferences prefs;
    private final SensorManager sm;
    private final Sensor counter;
    private boolean listening;
    private float latest = -1f; // most recent step total from the sensor (since boot)

    WorkoutTracker(Context c) {
        prefs = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sm = (SensorManager) c.getSystemService(Context.SENSOR_SERVICE);
        counter = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    boolean available() { return counter != null; }
    boolean running() { return prefs.getBoolean("running", false); }

    /** Begin a workout now. The first sensor reading (normally immediate) becomes the zero point. */
    synchronized void start() {
        prefs.edit().putBoolean("running", true).putLong("startedAt", System.currentTimeMillis()).putFloat("baseline", -1f).apply();
        listen();
    }

    /** End the workout and return its final numbers; the sensor listener is released. */
    synchronized JSONObject stop() {
        JSONObject out = state();
        prefs.edit().putBoolean("running", false).apply();
        unlisten();
        return out;
    }

    /** Make sure we're reading the sensor again after the app was closed mid-workout. */
    synchronized void resume() { if (running()) listen(); }
    synchronized void pause() { /* keep listening while the process lives; the saved baseline covers the rest */ }

    synchronized JSONObject state() {
        JSONObject o = new JSONObject();
        try {
            boolean run = running();
            o.put("available", available()).put("running", run);
            if (run) {
                long startedAt = prefs.getLong("startedAt", System.currentTimeMillis());
                float baseline = prefs.getFloat("baseline", -1f);
                int steps = 0;
                if (latest >= 0 && baseline >= 0) steps = (int) Math.max(0f, latest < baseline ? latest : latest - baseline); // total reset = phone rebooted mid-workout
                o.put("startedAt", startedAt).put("steps", steps).put("sensorReady", baseline >= 0);
            }
        } catch (Exception ignore) { /* JSON never fails on these types */ }
        return o;
    }

    private void listen() {
        if (counter == null || listening) return;
        listening = sm.registerListener(this, counter, SensorManager.SENSOR_DELAY_UI);
    }

    private void unlisten() {
        if (listening) { sm.unregisterListener(this); listening = false; }
        latest = -1f;
    }

    @Override public synchronized void onSensorChanged(SensorEvent e) {
        if (e.values == null || e.values.length == 0) return;
        latest = e.values[0];
        if (running() && prefs.getFloat("baseline", -1f) < 0) prefs.edit().putFloat("baseline", latest).apply();
    }

    @Override public void onAccuracyChanged(Sensor s, int a) { }
}
