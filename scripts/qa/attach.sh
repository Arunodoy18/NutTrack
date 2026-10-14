#!/bin/bash
# Start (or reuse) the Nura debug app and forward its WebView DevTools to localhost:9222.
# Usage: ANDROID_SERIAL=<serial> scripts/qa/attach.sh
adb shell am start -n tech.buildc3.nura/.MainActivity >/dev/null
for i in $(seq 1 30); do
  PID=$(adb shell pidof tech.buildc3.nura | tr -d '\r')
  if [ -n "$PID" ]; then
    adb forward --remove-all >/dev/null 2>&1
    adb forward tcp:9222 localabstract:webview_devtools_remote_$PID >/dev/null 2>&1
    if curl -s -m 2 localhost:9222/json | grep -q '"type": "page"'; then echo "attached pid=$PID"; exit 0; fi
  fi
  sleep 1
done
echo "could not attach"; exit 1
