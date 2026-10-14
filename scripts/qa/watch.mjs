// Reload the current page and print console errors / failed or non-2xx requests for N seconds.
const secs = Number(process.argv[2] || 12), path = process.argv[3];
const list = await (await fetch("http://localhost:9222/json")).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
const reqs = new Map();
ws.onopen = () => { send("Network.enable"); send("Log.enable"); send("Runtime.enable"); send("Page.enable"); if (path) send("Page.navigate", { url: "https://dietbuddy.buildc3.tech" + path }); else send("Page.reload"); };
ws.onmessage = (m) => { const d = JSON.parse(m.data);
  if (d.method === "Network.requestWillBeSent") reqs.set(d.params.requestId, d.params.request.method + " " + d.params.request.url.replace("https://dietbuddy.buildc3.tech", "").slice(0, 90));
  if (d.method === "Network.responseReceived" && d.params.response.status >= 400) console.log("HTTP", d.params.response.status, reqs.get(d.params.requestId));
  if (d.method === "Network.loadingFailed") console.log("FAILED", reqs.get(d.params.requestId), d.params.errorText);
  if (d.method === "Log.entryAdded" && d.params.entry.level !== "info") console.log("LOG", d.params.entry.level, (d.params.entry.text || "").slice(0, 200), d.params.entry.url || "");
  if (d.method === "Runtime.exceptionThrown") console.log("EXC", (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || "").slice(0, 300));
  if (d.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(d.params.type)) console.log("CONSOLE", d.params.type, d.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
};
setTimeout(() => process.exit(0), secs * 1000);
