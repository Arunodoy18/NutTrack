package tech.buildc3.nura;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.format.DateUtils;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/** Pair with a code from the Nura web app, grant Health Connect access, and sync. Also the permission-rationale screen. */
public class HealthSyncActivity extends Activity {
    private static final int REQ = 71;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private TextView status, detail;
    private Button primary, secondary;
    private HealthStore store;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(Color.WHITE);
        int p = (int) (24 * getResources().getDisplayMetrics().density);
        root.setPadding(p, p * 2, p, p);

        TextView title = new TextView(this);
        title.setText("Nura · Health Connect");
        title.setTextSize(24); title.setTextColor(Color.parseColor("#1B1B1F")); title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title);
        detail = new TextView(this);
        detail.setTextSize(14); detail.setTextColor(Color.parseColor("#5B5B66")); detail.setPadding(0, p / 2, 0, p / 2);
        detail.setText("Nura reads your steps, active calories, workouts and weight from Health Connect to show them in the app. It never writes to Health Connect, and you can disconnect at any time. Your data is sent only to your Nura account and is covered by our privacy policy at dietbuddy.buildc3.tech/privacy.");
        root.addView(detail);
        status = new TextView(this);
        status.setTextSize(16); status.setTextColor(Color.parseColor("#1B1B1F")); status.setPadding(0, p / 2, 0, p / 2);
        root.addView(status);
        primary = button(root, true);
        secondary = button(root, false);
        setContentView(root);

        try { store = new HealthStore(this); } catch (Exception e) { status.setText("Secure storage is unavailable on this phone."); primary.setVisibility(android.view.View.GONE); secondary.setVisibility(android.view.View.GONE); return; }
        handleIntent(getIntent());
    }

    private Button button(LinearLayout root, boolean filled) {
        Button bt = new Button(this);
        bt.setAllCaps(false); bt.setTextSize(16);
        bt.setBackgroundColor(filled ? Color.parseColor("#FC4C02") : Color.parseColor("#F1F1F4"));
        bt.setTextColor(filled ? Color.WHITE : Color.parseColor("#1B1B1F"));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, (int) (52 * getResources().getDisplayMetrics().density));
        lp.topMargin = (int) (12 * getResources().getDisplayMetrics().density);
        root.addView(bt, lp);
        return bt;
    }

    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); if (store != null) handleIntent(i); }

    private void handleIntent(Intent i) {
        Uri d = i == null ? null : i.getData();
        String code = d != null && "nura".equals(d.getScheme()) ? d.getQueryParameter("code") : null;
        if (code != null && !code.isEmpty()) {
            status.setText("Connecting…"); primary.setVisibility(android.view.View.GONE); secondary.setVisibility(android.view.View.GONE);
            new Thread(() -> {
                try {
                    String name = HealthSync.pair(this, code);
                    ui.post(() -> { refresh("Connected" + (name.isEmpty() ? "" : " for " + name) + "."); requestAccess(); });
                } catch (Exception e) {
                    ui.post(() -> { refresh("Couldn't connect: " + e.getMessage() + "\nCreate a fresh code in Nura → Activity & connected apps."); });
                }
            }).start();
        } else refresh(null);
    }

    private void refresh(String headline) {
        boolean paired = store.token() != null;
        StringBuilder s = new StringBuilder();
        if (headline != null) s.append(headline).append("\n\n");
        if (!paired) s.append("Not connected. In Nura open Profile → Activity & connected apps and tap “Create pairing code”.");
        else {
            s.append("Connected").append(store.profileName() == null || store.profileName().isEmpty() ? "" : " for " + store.profileName()).append(".\n");
            long t = store.lastSync();
            s.append(t == 0 ? "Not synced yet." : "Last sync: " + DateUtils.getRelativeTimeSpanString(t, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS));
            if (store.lastStatus() != null) s.append("\n").append(store.lastStatus());
        }
        status.setText(s.toString());
        boolean ok = paired && HealthSync.supported();
        primary.setVisibility(ok ? android.view.View.VISIBLE : android.view.View.GONE);
        secondary.setVisibility(ok ? android.view.View.VISIBLE : android.view.View.GONE);
        primary.setText("Sync now"); primary.setOnClickListener(v -> requestAccess());
        secondary.setText("Disconnect this phone"); secondary.setOnClickListener(v -> { store.clear(); HealthSyncWorker.cancel(this); refresh("Disconnected."); });
    }

    private void requestAccess() {
        if (!HealthSync.builtIn()) { requestAccessJetpack(); return; }
        List<String> need = new ArrayList<>();
        for (String perm : HealthSync.READ_PERMISSIONS) if (checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) need.add(perm);
        if (checkSelfPermission(HealthSync.BACKGROUND_PERMISSION) != PackageManager.PERMISSION_GRANTED) need.add(HealthSync.BACKGROUND_PERMISSION);
        if (!need.isEmpty()) { requestPermissions(need.toArray(new String[0]), REQ); return; }
        syncNow();
    }

    @Override public void onRequestPermissionsResult(int rc, String[] perms, int[] res) {
        super.onRequestPermissionsResult(rc, perms, res);
        if (rc != REQ) return;
        boolean any = false;
        for (String perm : HealthSync.READ_PERMISSIONS) if (checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED) any = true;
        if (any) syncNow(); else refresh("No access granted. Tap “Sync now” to try again.");
    }

    /** Android 9-13: needs the Health Connect app from Google Play, then its own permission screen. */
    private void requestAccessJetpack() {
        int st = HcJetpack.status(this);
        if (st != 3) {
            refresh(st == 2 ? "Health Connect needs an update before Nura can read from it." : "Install Health Connect (a free Google app) so Nura can read your steps and workouts.");
            primary.setVisibility(android.view.View.VISIBLE);
            primary.setText(st == 2 ? "Update Health Connect" : "Get Health Connect");
            primary.setOnClickListener(v -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + HcJetpack.PROVIDER))); } catch (Exception e) { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + HcJetpack.PROVIDER))); } });
            return;
        }
        new Thread(() -> {
            boolean ok; try { ok = HcJetpack.hasPermissions(this); } catch (Exception e) { ok = false; }
            final boolean granted = ok;
            ui.post(() -> {
                if (granted) { syncNow(); return; }
                try { startActivityForResult(HcJetpack.permissionIntent(this), REQ + 1); }
                catch (Exception e) { refresh("Couldn't open Health Connect: " + e.getMessage()); }
            });
        }).start();
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ + 1) return;
        new Thread(() -> {
            boolean ok; try { ok = HcJetpack.hasPermissions(this); } catch (Exception e) { ok = false; }
            final boolean granted = ok;
            ui.post(() -> { if (granted) syncNow(); else refresh("No access granted. Tap “Sync now” to try again."); });
        }).start();
    }

    private void syncNow() {
        status.setText("Syncing…"); primary.setEnabled(false);
        new Thread(() -> {
            HealthSync.Result r = HealthSync.run(this, 30);
            if (r.ok) HealthSyncWorker.schedule(this);
            ui.post(() -> { primary.setEnabled(true); refresh(r.ok ? "Synced: " + r.message : "Sync failed: " + r.message); });
        }).start();
    }
}
