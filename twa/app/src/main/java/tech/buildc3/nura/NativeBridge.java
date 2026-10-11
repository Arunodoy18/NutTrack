package tech.buildc3.nura;

import android.webkit.JavascriptInterface;

/** The only door from web pages into the app: voice input. Calls from any other site are ignored. */
final class NativeBridge {
    private final MainActivity host;
    NativeBridge(MainActivity host) { this.host = host; }

    @JavascriptInterface public void startSpeech() { host.speechStart(); }
    @JavascriptInterface public void stopSpeech() { host.speechStop(); }
}
