package tech.buildc3.nura;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/** Nura's one screen: the app's UI rendered in a locked-down WebView, plus the native pieces the web can't do. */
public class MainActivity extends Activity {
    private static final String HOST = "dietbuddy.buildc3.tech";
    private static final int REQ_FILE = 11, REQ_PERMS = 12, REQ_NOTIF = 13, REQ_CAPTURE = 14, REQ_MIC = 15;

    private WebView web;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private ValueCallback<Uri[]> fileCallback;
    private Uri captureUri;
    private PermissionRequest pendingWebPermission;
    private SpeechRecognizer recognizer;
    private boolean wantSpeech;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        // Brand-coloured strip behind the status bar (edge-to-edge draws the app under it).
        final View statusBg = new View(this);
        statusBg.setBackgroundColor(Color.parseColor("#FC4C02"));
        root.addView(statusBg, new FrameLayout.LayoutParams(-1, 0, android.view.Gravity.TOP));
        setContentView(root);
        // Android 15+ draws edge-to-edge: pad for the status bar, nav bar and keyboard ourselves.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, bt;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                l = i.left; t = i.top; r = i.right; bt = i.bottom;
            } else {
                l = insets.getSystemWindowInsetLeft(); t = insets.getSystemWindowInsetTop(); r = insets.getSystemWindowInsetRight(); bt = insets.getSystemWindowInsetBottom();
            }
            FrameLayout.LayoutParams wp = (FrameLayout.LayoutParams) web.getLayoutParams();
            wp.setMargins(l, t, r, bt); web.setLayoutParams(wp);
            FrameLayout.LayoutParams sp = (FrameLayout.LayoutParams) statusBg.getLayoutParams();
            sp.height = t; statusBg.setLayoutParams(sp);
            return WindowInsets.CONSUMED;
        });
        configure();
        handleIntent(getIntent(), true);
    }

    private String version() {
        try { PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0); return p.versionName; } catch (Exception e) { return "0.0.0"; }
    }

    private void configure() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setBuiltInZoomControls(false);
        s.setSupportZoom(false);
        boolean linked = false;
        try { linked = new HealthStore(this).reminderToken() != null; } catch (Exception ignore) { /* secure storage unavailable */ }
        // The website only serves the app to this marker; everything else gets the download page.
        s.setUserAgentString(s.getUserAgentString() + " NuraApp/" + version() + (linked ? " linked" : ""));
        if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web, false);
        web.addJavascriptInterface(new NativeBridge(this), "NuraNative");

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return route(r.getUrl()); }
            @Override public void onPageStarted(WebView v, String url, Bitmap f) {
                // Leaving the signed-in area: stop reminders for this account on this phone.
                super.onPageStarted(v, url, f);
            }
            @Override public void onPageFinished(WebView v, String url) { CookieManager.getInstance().flush(); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (!r.isForMainFrame()) return;
                v.loadDataWithBaseURL(null, offlineHtml(), "text/html", "utf-8", null);
            }
            @Override public void onReceivedSslError(WebView v, android.webkit.SslErrorHandler h, android.net.http.SslError e) { h.cancel(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest req) { runOnUiThread(() -> handleWebPermission(req)); }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) { return openChooser(cb, params); }
            @Override public boolean onJsAlert(WebView v, String url, String msg, JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(msg).setPositiveButton("OK", (d, w) -> r.confirm()).setOnCancelListener(d -> r.cancel()).show();
                return true;
            }
            @Override public boolean onJsConfirm(WebView v, String url, String msg, JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(msg).setPositiveButton("OK", (d, w) -> r.confirm()).setNegativeButton("Cancel", (d, w) -> r.cancel()).setOnCancelListener(d -> r.cancel()).show();
                return true;
            }
        });
        web.setDownloadListener((url, ua, cd, mime, len) -> {
            Uri u = Uri.parse(url);
            if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return;
            try {
                DownloadManager.Request rq = new DownloadManager.Request(u);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) rq.addRequestHeader("Cookie", cookie);
                rq.addRequestHeader("User-Agent", ua);
                String name = URLUtil.guessFileName(url, cd, mime);
                rq.setMimeType(mime).setTitle(name).setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                ((DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(rq);
                Toast.makeText(this, "Downloading " + name, Toast.LENGTH_SHORT).show();
            } catch (Exception e) { Toast.makeText(this, "Couldn't start the download", Toast.LENGTH_LONG).show(); }
        });
    }

    private String offlineHtml() {
        return "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='font-family:sans-serif;text-align:center;padding:64px 24px;color:#1B1B1F'>"
                + "<h2>You're offline</h2><p style='color:#5B5B66'>Nura couldn't reach the internet. Meals you log are saved on your phone and sync later.</p>"
                + "<a href='nura://retry' style='display:inline-block;margin-top:24px;background:#FC4C02;color:#fff;padding:14px 28px;border-radius:14px;text-decoration:none;font-weight:bold'>Try again</a></body></html>";
    }

    /** Decide whether a link stays in the app, opens elsewhere, or is one of our own nura:// commands. */
    private boolean route(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        if ("nura".equals(scheme)) { command(u); return true; }
        if ("https".equals(scheme)) {
            String h = u.getHost() == null ? "" : u.getHost();
            if (HOST.equals(h) || h.equals("razorpay.com") || h.endsWith(".razorpay.com")) return false; // stay in app (checkout)
            openExternal(new Intent(Intent.ACTION_VIEW, u));
            return true;
        }
        if ("http".equals(scheme)) return true; // never load plain http
        if ("intent".equals(scheme)) {
            try {
                Intent i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                i.addCategory(Intent.CATEGORY_BROWSABLE); i.setComponent(null); i.setSelector(null);
                openExternal(i);
            } catch (Exception ignore) { /* malformed */ }
            return true;
        }
        if (scheme.equals("upi") || scheme.equals("tel") || scheme.equals("mailto") || scheme.equals("market") || scheme.equals("sms")) {
            openExternal(new Intent(Intent.ACTION_VIEW, u));
        }
        return true; // everything else (file:, javascript:, data: navigations…) is dropped
    }

    private void openExternal(Intent i) {
        try { startActivity(i); } catch (ActivityNotFoundException e) { Toast.makeText(this, "No app found to open that", Toast.LENGTH_SHORT).show(); }
    }

    /** nura:// commands the website issues. They only ever act on this phone. */
    private void command(Uri u) {
        String host = u.getHost() == null ? "" : u.getHost();
        switch (host) {
            case "link": {
                String code = u.getQueryParameter("code");
                if (code == null) return;
                new Thread(() -> {
                    try {
                        HealthSync.pair(this, code, true);
                        ReminderWorker.schedule(this);
                        ui.post(this::askNotificationPermission);
                    } catch (Exception ignore) { /* retried next launch */ }
                }).start();
                return;
            }
            case "unlink": unlink(); return;
            case "notifications": askNotificationPermission(); return;
            case "test": Notifier.show(this, "Nura", "Reminders are working 🎉", "/dashboard", "test"); return;
            case "pair": startActivity(new Intent(this, HealthSyncActivity.class).setData(u)); return;
            case "retry": web.loadUrl(HealthStore.BASE_URL + "/dashboard"); return;
            default:
        }
    }

    private void unlink() {
        try {
            HealthStore st = new HealthStore(this);
            final String t = st.reminderToken();
            st.clearReminderToken();
            ReminderWorker.cancel(this);
            if (t != null) new Thread(() -> {
                try {
                    java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(HealthStore.BASE_URL + "/api/device/unlink").openConnection();
                    c.setRequestMethod("POST"); c.setConnectTimeout(10000); c.setRequestProperty("Authorization", "Bearer " + t);
                    c.getResponseCode(); c.disconnect();
                } catch (Exception ignore) { /* best effort */ }
            }).start();
        } catch (Exception ignore) { /* nothing stored */ }
    }

    private void askNotificationPermission() {
        Notifier.ensureChannel(this);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            if (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) || getSharedPreferences("nura", MODE_PRIVATE).getBoolean("asked_notif", false)) {
                // Android won't show the prompt again: send them to the settings page.
                try { startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())); } catch (Exception ignore) { /* none */ }
            } else {
                getSharedPreferences("nura", MODE_PRIVATE).edit().putBoolean("asked_notif", true).apply();
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
            }
        }
    }

    /* ── camera / mic for getUserMedia ── */
    private void handleWebPermission(PermissionRequest req) {
        if (!HOST.equals(req.getOrigin().getHost())) { req.deny(); return; }
        List<String> need = new ArrayList<>();
        for (String r : req.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) need.add(Manifest.permission.CAMERA);
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) need.add(Manifest.permission.RECORD_AUDIO);
        }
        if (need.isEmpty()) { grantAllowed(req); return; }
        if (pendingWebPermission != null) pendingWebPermission.deny();
        pendingWebPermission = req;
        requestPermissions(need.toArray(new String[0]), REQ_PERMS);
    }

    private void grantAllowed(PermissionRequest req) {
        List<String> ok = new ArrayList<>();
        for (String r : req.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) ok.add(r);
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) ok.add(r);
        }
        if (ok.isEmpty()) req.deny(); else req.grant(ok.toArray(new String[0]));
    }

    /* ── voice input (called from NativeBridge, only for our own site) ── */
    private boolean fromOurSite() {
        String u = web.getUrl();
        return u != null && Uri.parse(u).getHost() != null && HOST.equals(Uri.parse(u).getHost());
    }

    void speechStart() {
        ui.post(() -> {
            if (!fromOurSite()) return;
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { wantSpeech = true; requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC); return; }
            beginSpeech();
        });
    }

    void speechStop() { ui.post(() -> { if (recognizer != null) recognizer.stopListening(); }); }

    private void speechEvent(String type, String key, String value) {
        try {
            org.json.JSONObject o = new org.json.JSONObject().put("type", type);
            if (key != null) o.put(key, value);
            web.evaluateJavascript("window.__nuraSpeech&&window.__nuraSpeech(" + o + ")", null);
        } catch (Exception ignore) { /* page gone */ }
    }

    private void beginSpeech() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { speechEvent("error", "message", "Voice input isn't available on this phone. Type what you ate instead."); return; }
        if (recognizer != null) recognizer.destroy();
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle p) { }
            @Override public void onBeginningOfSpeech() { }
            @Override public void onRmsChanged(float v) { }
            @Override public void onBufferReceived(byte[] b) { }
            @Override public void onEndOfSpeech() { }
            @Override public void onEvent(int t, Bundle p) { }
            @Override public void onError(int e) { speechEvent(e == SpeechRecognizer.ERROR_NO_MATCH || e == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "end" : "error", "message", "Couldn't hear that. Try again."); }
            @Override public void onPartialResults(Bundle b) { push(b, false); }
            @Override public void onResults(Bundle b) { push(b, true); }
            private void push(Bundle b, boolean last) {
                ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (r != null && !r.isEmpty()) speechEvent("result", "text", r.get(0));
                if (last) speechEvent("end", null, null);
            }
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true).putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
        recognizer.startListening(i);
    }

    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == REQ_MIC) { boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED; if (wantSpeech && ok) beginSpeech(); else if (wantSpeech) speechEvent("error", "message", "Allow the microphone for Nura to use voice input."); wantSpeech = false; return; }
        if (code == REQ_PERMS && pendingWebPermission != null) { grantAllowed(pendingWebPermission); pendingWebPermission = null; }
    }

    /* ── <input type=file> (gallery + camera capture) ── */
    private boolean openChooser(ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams params) {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = cb;
        try {
            if (params.isCaptureEnabled() && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                File dir = new File(getCacheDir(), "captures"); dir.mkdirs();
                File f = File.createTempFile("photo_", ".jpg", dir);
                captureUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", f);
                Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, captureUri).addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                startActivityForResult(cam, REQ_CAPTURE);
            } else {
                startActivityForResult(params.createIntent(), REQ_FILE);
            }
            return true;
        } catch (Exception e) {
            fileCallback = null;
            return false;
        }
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (fileCallback == null) return;
        Uri[] out = null;
        if (res == Activity.RESULT_OK) {
            if (req == REQ_CAPTURE && captureUri != null) out = new Uri[]{captureUri};
            else if (req == REQ_FILE) out = WebChromeClient.FileChooserParams.parseResult(res, data);
        }
        fileCallback.onReceiveValue(out);
        fileCallback = null;
    }

    /* ── lifecycle ── */
    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); handleIntent(i, false); }

    private void handleIntent(Intent i, boolean first) {
        String path = i == null ? null : i.getStringExtra("path");
        if (path != null && path.startsWith("/") && !path.startsWith("//")) { web.loadUrl(HealthStore.BASE_URL + path); return; }
        if (first && web.getUrl() == null) web.loadUrl(HealthStore.BASE_URL + "/dashboard");
    }

    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onPause() { CookieManager.getInstance().flush(); web.onPause(); super.onPause(); }
    @Override protected void onDestroy() { if (recognizer != null) recognizer.destroy(); if (web != null) { ((FrameLayout) web.getParent()).removeView(web); web.destroy(); } super.onDestroy(); }
}
