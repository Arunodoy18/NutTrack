// Tiny DevTools driver for the Nura debug app's WebView.
//   adb forward tcp:9222 localabstract:webview_devtools_remote_$(adb shell pidof tech.buildc3.nura)
//   node scripts/qa/cdp.mjs '<json array of {method,params}>'     (TARGET_URL picks the page, default dietbuddy)
const list = await (await fetch("http://localhost:9222/json")).json();
const want = process.env.TARGET_URL || "dietbuddy";
const page = list.find((t) => t.type === "page" && t.url.includes(want)) ?? list.find((t) => t.type === "page");
if (!page) { console.error("no page target"); process.exit(2); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
const cmds = JSON.parse(process.argv[2]);
let i = 0;
const next = () => (i >= cmds.length ? process.exit(0) : ws.send(JSON.stringify({ id: i + 1, ...cmds[i] })));
ws.onopen = next;
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === i + 1) { console.log(JSON.stringify(d.result ?? d.error).slice(0, 600)); i++; next(); } };
setTimeout(() => process.exit(1), 60000);
