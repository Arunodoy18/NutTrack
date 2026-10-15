// DevTools driver for the Nura debug app. Real touch taps (Input.synthesizeTapGesture) + DOM assertions.
import fs from "node:fs";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connect(want = "dietbuddy") {
  const list = await (await fetch(`http://localhost:${process.env.CDP_PORT || 9222}/json`)).json();
  const page = list.find((t) => t.type === "page" && t.url.includes(want)) ?? list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed"); return r.result.value; };
  const results = [];
  // Real touch gesture inside the Android WebView; a mouse click when driving desktop Chrome (set QA_MOUSE=1).
  const click = async (x, y) => {
    if (process.env.QA_MOUSE) { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); }
    else await send("Input.synthesizeTapGesture", { x, y, tapCount: 1 });
  };
  const api = {
    send, ev, sleep, results,
    check(name, ok, extra = "") { results.push(!!ok); console.log(ok ? "PASS" : "FAIL", name, extra); return !!ok; },
    async nav(path, wait = 3500) { await send("Page.navigate", { url: path.startsWith("http") ? path : "https://dietbuddy.buildc3.tech" + path }); await sleep(wait); },
    async shot(name) { const r = await send("Page.captureScreenshot", { format: "png" }); fs.mkdirSync("/tmp/qa", { recursive: true }); fs.writeFileSync(`/tmp/qa/${name}.png`, Buffer.from(r.data, "base64")); return `/tmp/qa/${name}.png`; },
    async text() { return ev("document.body.innerText"); },
    async has(txt) { return (await ev("document.body.innerText")).toLowerCase().includes(txt.toLowerCase()); },
    async waitText(txt, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await api.has(txt)) return true; await sleep(400); } return false; },
    async waitFor(expr, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(400); } return false; },
    // centre of the first visible element matching a selector, or whose text contains `text` (optionally within selector)
    async locate(sel, text) {
      return ev(`(()=>{const q=${JSON.stringify(sel)},t=${JSON.stringify(text ?? null)};const els=[...document.querySelectorAll(q)].filter(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&(!t||(e.innerText||e.getAttribute('aria-label')||e.value||'').toLowerCase().includes(t.toLowerCase()))});
        if(!els.length)return null;const e=els[els.length>1&&t?0:0];e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    },
    async tap(sel, text) { let p = null; for (let i = 0; i < 20 && !p; i++) { p = await api.locate(sel, text); if (!p) await sleep(500); } if (!p) throw new Error(`tap: not found ${sel} ${text ?? ""}`); await sleep(500); const p2 = await api.locate(sel, text); await click(p2.x, p2.y); await sleep(500); return true; },
    async tapText(text, tag = "button,a,[role=button],[role=tab],[role=switch],label,div,span") { return api.tap(tag, text); },
    // set a text field the way a user typing would (React-friendly) – no OS keyboard, so no autofill
    async fill(sel, value) { await api.tap(sel); return ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});const proto=Object.getPrototypeOf(e);const set=Object.getOwnPropertyDescriptor(proto,'value').set;e.focus();set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()`); },
    async openScanner() {
      await api.ev("window.scrollTo(0,0)");
      const ok = await api.waitFor(`!![...document.querySelectorAll('button')].find(e=>/w-16 h-16/.test(e.className))`, 15000);
      if (!ok) throw new Error("scanner button never appeared");
      const fab = await api.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/w-16 h-16/.test(e.className));const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
      await send("Input.synthesizeTapGesture", { x: fab.x, y: fab.y }); await sleep(1800);
    },
    async setCookie(c) { await send("Network.setCookie", c); },
    close() { ws.close(); },
  };
  return api;
}

/** Replace the camera with a canvas that shows a still photo (so AI scans are repeatable and no personal scene is captured). */
export function fakeCameraJs(base64Jpeg) {
  return `(()=>{const c=document.createElement('canvas');c.width=640;c.height=640;const x=c.getContext('2d');const im=new Image();im.src='data:image/jpeg;base64,${base64Jpeg}';
  const draw=()=>{x.fillStyle='#888';x.fillRect(0,0,640,640);if(im.complete&&im.naturalWidth){const s=Math.max(640/im.naturalWidth,640/im.naturalHeight);x.drawImage(im,(640-im.naturalWidth*s)/2,(640-im.naturalHeight*s)/2,im.naturalWidth*s,im.naturalHeight*s)}};
  setInterval(draw,66);draw();const orig=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async(k)=>{if(k&&k.video){return c.captureStream(15)}return orig(k)};return 'fake camera installed'})()`;
}

/** Camera feed that shows an EAN-13 barcode (valid check digit supplied by the caller). */
export function fakeBarcodeJs(ean13) {
  return `(()=>{const code='${ean13}';const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];const R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  const P=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];const d=code.split('').map(Number);let bits='101';const pat=P[d[0]];
  for(let i=0;i<6;i++)bits+=(pat[i]==='L'?L:G)[d[i+1]];bits+='01010';for(let i=0;i<6;i++)bits+=R[d[i+7]];bits+='101';
  const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');const w=5,off=(640-bits.length*w)/2;
  const draw=()=>{x.fillStyle='#fff';x.fillRect(0,0,640,480);x.fillStyle='#000';for(let i=0;i<bits.length;i++)if(bits[i]==='1')x.fillRect(off+i*w,140,w,200);x.font='24px monospace';x.fillText(code,off+20,380)};
  setInterval(draw,66);draw();const orig=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async(k)=>{if(k&&k.video){return c.captureStream(15)}return orig(k)};return 'fake barcode camera installed'})()`;
}
