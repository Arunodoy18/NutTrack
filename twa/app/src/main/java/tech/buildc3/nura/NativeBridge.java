package tech.buildc3.nura;

import android.webkit.JavascriptInterface;

/** The only door from web pages into the app: voice input and live-workout step counting. Calls from any other site are ignored. */
final class NativeBridge {
    private final MainActivity host;
    NativeBridge(MainActivity host) { this.host = host; }

    @JavascriptInterface public void startSpeech() { host.speechStart(); }
    @JavascriptInterface public void stopSpeech() { host.speechStop(); }
    /** Starts counting steps; if the phone still needs the Physical activity permission it asks first and starts once granted. */
    @JavascriptInterface public String workoutStart() { return host.workoutStart(); }
    @JavascriptInterface public String workoutState() { return host.workoutState(); }
    @JavascriptInterface public String workoutStop() { return host.workoutStop(); }
}
