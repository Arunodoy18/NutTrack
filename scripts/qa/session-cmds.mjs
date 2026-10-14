// Prints the cdp.mjs command list that signs a user.json session into the app and opens a path.
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const path = process.argv[3] || "/dashboard";
const c = d.cookies.map((k) => ({ method: "Network.setCookie", params: { name: k.name, value: decodeURIComponent(k.value), domain: "dietbuddy.buildc3.tech", path: "/", secure: true, httpOnly: true, sameSite: "Lax" } }));
c.push({ method: "Page.navigate", params: { url: "https://dietbuddy.buildc3.tech" + path } });
console.log(JSON.stringify(c));
