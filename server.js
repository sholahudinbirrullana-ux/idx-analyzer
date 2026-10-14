/* ============================================================
   IDX Analyzer — server statis + proxy Yahoo Finance v8
   Menyajikan file statis dan endpoint /api/* yang mem-proxy
   data pasar asli (menghindari CORS browser).
   Jalankan:  node server.js   (default http://localhost:8090)
   ============================================================ */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");
const os = require("os");
const { exec } = require("child_process");

/* deteksi mode executable (Node SEA) */
let SEA = null;
try { SEA = require("node:sea"); } catch (e) { SEA = null; }
const IS_SEA = !!(SEA && SEA.isSea());

/* aset tertanam hasil bundling (dibuat oleh build-exe.sh) */
let ASSETS = null;
try { ASSETS = require("./embedded-assets.js"); } catch (e) { ASSETS = null; }

const PORT = parseInt(process.env.PORT, 10) || 8090;
const ROOT = __dirname;
const CACHE_DIR = process.env.CACHE_DIR ||
    (IS_SEA ? path.join(os.homedir(), ".idx-analyzer-cache") : path.join(ROOT, ".cache"));

/* daftar aset statis yang ditanam di executable (dipakai saat berjalan sebagai SEA) */
const EMBEDDED_ASSETS = [
    "index.html", "css/style.css",
    "js/data.js", "js/indicators.js", "js/charts.js", "js/trade.js", "js/app.js"
];
const YF_HOST = "query1.finance.yahoo.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/122.0 Safari/537.36";

/* mode fetch: "auto" (langsung→jina), "direct", "jina" */
const FETCH_MODE = process.env.FETCH_MODE || "auto";

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2"
};

/* ---------- cache (memori + disk) ---------- */
const cache = new Map();
// TTL lebih panjang agar tidak memicu rate-limit Yahoo
const TTL = { daily: 15 * 60 * 1000, intraday: 3 * 60 * 1000 };
const DISK_TTL = 6 * 60 * 60 * 1000;          // data lama tetap dipakai maks 6 jam bila fetch gagal
function cget(k) { const c = cache.get(k); return c && Date.now() - c.t < c.ttl ? c.data : null; }
function cstale(k) { const c = cache.get(k); return c ? c.data : null; }
function diskPath(k) { return path.join(CACHE_DIR, Buffer.from(k).toString("base64url") + ".json"); }
function cset(k, data, ttl) {
    cache.set(k, { t: Date.now(), data, ttl });
    try {
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(diskPath(k), JSON.stringify({ t: Date.now(), data }));
    } catch (e) { /* abaikan error disk */ }
}
function cloadDisk() {
    try {
        if (!fs.existsSync(CACHE_DIR)) return;
        let n = 0;
        for (const f of fs.readdirSync(CACHE_DIR)) {
            if (!f.endsWith(".json")) continue;
            try {
                const o = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), "utf8"));
                const key = Buffer.from(f.replace(".json", ""), "base64url").toString();
                if (o && Date.now() - o.t < DISK_TTL) { cache.set(key, { t: o.t, data: o.data, ttl: TTL.daily }); n++; }
            } catch (e) { /* lewati file rusak */ }
        }
        if (n) console.log("  memuat " + n + " data dari cache disk");
    } catch (e) { /* abaikan */ }
}

/* ---------- Yahoo fetch (dengan retry + backoff) ---------- */
function httpsGet(host, pathStr, headers) {
    return new Promise((resolve, reject) => {
        const req = https.get({ host, path: pathStr, headers }, res => {
            let buf = "";
            res.on("data", d => buf += d);
            res.on("end", () => resolve({ status: res.statusCode, body: buf }));
        });
        req.on("error", reject);
        req.setTimeout(20000, () => req.destroy(new Error("timeout")));
    });
}

/* pengambil JSON inti: coba Yahoo langsung, lalu via proxy r.jina.ai */
let directDownUntil = 0;                    // jeda sementara bila Yahoo membalas 429/403
const DIRECT_COOLDOWN = 10 * 60 * 1000;

async function fetchJSON(pathStr, attempt = 0) {
    const directHeaders = {
        "User-Agent": UA,
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9"
    };

    // mode langsung (dilewati sementara bila sedang kena blokir)
    if (FETCH_MODE !== "jina" && Date.now() > directDownUntil) {
        const host = attempt % 2 === 0 ? YF_HOST : "query2.finance.yahoo.com";
        try {
            const r = await httpsGet(host, pathStr, directHeaders);
            if (r.status === 200) return JSON.parse(r.body);
            if (r.status === 429 || r.status === 403) {
                directDownUntil = Date.now() + DIRECT_COOLDOWN;   // Yahoo blokir → pakai jina sementara
                throw new Error("ratelimit:" + r.status);
            }
            throw new Error("http:" + r.status);
        } catch (e) {
            if (FETCH_MODE === "direct") throw e;
            // jatuh ke jina
        }
    }

    // mode jina (proxy server-side, bypass blokir IP lokal)
    const jinaUrl = "https://r.jina.ai/https://" + YF_HOST + pathStr;
    const j = await new Promise((resolve, reject) => {
        const u = new URL(jinaUrl);
        const req = https.get({
            host: u.hostname, path: u.pathname + u.search,
            headers: { "User-Agent": UA, "Accept": "*/*", "X-Return-Format": "text" }
        }, res => {
            let buf = "";
            res.on("data", d => buf += d);
            res.on("end", () => resolve({ status: res.statusCode, body: buf }));
        });
        req.on("error", reject);
        req.setTimeout(30000, () => req.destroy(new Error("timeout")));
    });
    if (j.status !== 200) throw new Error("jina:" + j.status);
    const i = j.body.indexOf("{");
    if (i < 0) throw new Error("jina:no-json");
    return JSON.parse(j.body.slice(i));
}

/* retry hingga 3x dengan jeda bertingkat */
async function fetchWithRetry(pathStr) {
    let err;
    for (let i = 0; i < 3; i++) {
        try { return await fetchJSON(pathStr, i); }
        catch (e) {
            err = e;
            const retriable = /ratelimit|timeout|jina|http:5/.test(String(e.message));
            if (!retriable || i === 2) break;
            await new Promise(r => setTimeout(r, 500 + 700 * i));
        }
    }
    throw err;
}

function round(n) { return Math.round(n * 100) / 100; }

/* normalisasi respons v8 chart → bentuk yang dipakai frontend */
function normalize(json, interval) {
    const r = json && json.chart && json.chart.result && json.chart.result[0];
    if (!r) return null;
    const m = r.meta || {};
    const off = m.gmtoffset || 25200;                 // WIB
    const ts = r.timestamp || [];
    const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
    const isDaily = /d|wk|mo|y/.test(interval) && !interval.endsWith("m");
    let series = [];
    for (let i = 0; i < ts.length; i++) {
        const o = q.open && q.open[i], h = q.high && q.high[i];
        const l = q.low && q.low[i], c = q.close && q.close[i];
        const v = q.volume && q.volume[i];
        if (o == null || h == null || l == null || c == null) continue;
        const tw = new Date((ts[i] + off) * 1000);
        if (isDaily) {
            series.push({
                time: tw.toISOString().slice(0, 10),
                open: round(o), high: round(h), low: round(l), close: round(c),
                volume: v || 0
            });
        } else {
            const hh = String(tw.getUTCHours()).padStart(2, "0");
            const mi = String(tw.getUTCMinutes()).padStart(2, "0");
            series.push({
                _d: tw.toISOString().slice(0, 10),
                t: hh + ":" + mi,
                sess: tw.getUTCHours() < 12 ? "p" : "s",
                time: ts[i] + off,
                o: round(o), h: round(h), l: round(l), c: round(c), v: v || 0
            });
        }
    }
    // data intraday: sisakan hari terakhir saja (jam akan berulang bila >1 hari)
    if (!isDaily && series.length) {
        const lastDay = series[series.length - 1]._d;
        series = series.filter(b => b._d === lastDay);
    }
    series.forEach(b => delete b._d);
    return {
        code: (m.symbol || "").replace(".JK", ""),
        symbol: m.symbol,
        name: m.longName || m.shortName || "",
        price: m.regularMarketPrice,
        prevClose: m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose,
        changePct: m.regularMarketChangePercent,
        dayHigh: m.regularMarketDayHigh,
        dayLow: m.regularMarketDayLow,
        volume: m.regularMarketVolume,
        high52: m.fiftyTwoWeekHigh,
        low52: m.fiftyTwoWeekLow,
        marketTime: m.regularMarketTime,
        currency: m.currency || "IDR",
        series
    };
}

const SCHEMA = 2;                    // ubah bila format data berubah (memaksa cache lama kedaluwarsa)

async function getChart(code, range, interval) {
    const key = SCHEMA + "|" + code + "|" + range + "|" + interval;
    const ttl = /m$/.test(interval) ? TTL.intraday : TTL.daily;
    const hit = cget(key);
    if (hit) return hit;
    const p = "/v8/finance/chart/" + encodeURIComponent(code.startsWith("^") ? code : code + ".JK") +
              "?range=" + range + "&interval=" + interval + "&includePrePost=false";
    try {
        const json = await fetchWithRetry(p);
        const data = normalize(json, interval);
        if (data) cset(key, data, ttl);
        return data;
    } catch (e) {
        // gagal fetch → pakai data lama bila ada (stale), jangan error total
        const old = cstale(key);
        if (old) return old;
        throw e;
    }
}

/* kumpulkan dengan batas konkurensi + satu kali ulang yang gagal */
async function batch(codes, range, interval, limit = 4) {
    const out = {};
    const failed = [];
    let idx = 0;
    async function worker() {
        while (idx < codes.length) {
            const code = codes[idx++];
            try { const d = await getChart(code, range, interval); if (d) out[code] = d; else failed.push(code); }
            catch (e) { failed.push(code); }
            await new Promise(r => setTimeout(r, 60));   // jeda kecil agar tidak kena throttle
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, codes.length) }, worker));
    // ulang sekali untuk yang gagal
    for (const code of failed.slice()) {
        try { const d = await getChart(code, range, interval); if (d) { out[code] = d; failed.splice(failed.indexOf(code), 1); } }
        catch (e) { /* biarkan gagal */ }
        await new Promise(r => setTimeout(r, 120));
    }
    return out;
}

/* ---------- HTTP server ---------- */
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsed.pathname);

    /* ---- API ---- */
    if (pathname.startsWith("/api/")) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        try {
            if (pathname === "/api/status") {
                return res.end(JSON.stringify({
                    ok: true,
                    time: new Date().toISOString(),
                    cache: cache.size
                }));
            }
            if (pathname === "/api/chart") {
                const { symbol, range = "1y", interval = "1d" } = parsed.query;
                if (!symbol) { res.statusCode = 400; return res.end(JSON.stringify({ error: "symbol wajib" })); }
                const d = await getChart(symbol.replace(".JK", ""), range, interval);
                return res.end(JSON.stringify(d || {}));
            }
            if (pathname === "/api/batch") {
                const symbols = (parsed.query.symbols || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 90);
                const range = parsed.query.range || "1y";
                const interval = parsed.query.interval || "1d";
                if (!symbols.length) { res.statusCode = 400; return res.end(JSON.stringify({ error: "symbols wajib" })); }
                const data = await batch(symbols, range, interval);
                return res.end(JSON.stringify(data));
            }
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "endpoint tidak ditemukan" }));
        } catch (e) {
            res.statusCode = 502;
            return res.end(JSON.stringify({ error: String(e.message || e) }));
        }
    }

    /* ---- static ---- */
    let file = pathname === "/" ? "/index.html" : pathname;
    file = path.normalize(file).replace(/^(\.\.[\/\\])+/, "");
    const assetKey = file.replace(/^\//, "");

    /* mode executable/bundle: sajikan dari aset yang ditanam */
    if (IS_SEA || ASSETS) {
        let data = null;
        if (IS_SEA) {
            try { if (SEA.getAssetKeys().includes(assetKey)) data = SEA.getAsset(assetKey, "utf8"); } catch (e) {}
        }
        if (data == null && ASSETS && Object.prototype.hasOwnProperty.call(ASSETS, assetKey)) {
            data = ASSETS[assetKey];
        }
        if (data == null) { res.statusCode = 404; return res.end("Not found"); }
        res.setHeader("Content-Type", MIME[path.extname(assetKey).toLowerCase()] || "application/octet-stream");
        return res.end(data);
    }

    const full = path.join(ROOT, file);
    if (!full.startsWith(ROOT)) { res.statusCode = 403; return res.end("Forbidden"); }
    fs.readFile(full, (err, data) => {
        if (err) { res.statusCode = 404; return res.end("Not found"); }
        res.setHeader("Content-Type", MIME[path.extname(full).toLowerCase()] || "application/octet-stream");
        res.end(data);
    });
});

function openBrowser(u) {
    const cmd = process.platform === "darwin" ? ["open", u]
        : process.platform === "win32" ? ["cmd", "/c", "start", "", u]
        : ["xdg-open", u];
    try { exec(cmd[0] + " " + cmd.slice(1).map(a => '"' + a + '"').join(" "), () => {}); } catch (e) {}
}

function start(port, attempts = 0) {
    server.once("error", e => {
        if (e.code === "EADDRINUSE" && attempts < 12) {
            start(port + 1, attempts + 1);
        } else {
            console.error("\n  Gagal menjalankan server: " + e.message + "\n");
            process.exit(1);
        }
    });
    server.listen(port, () => {
        cloadDisk();
        const u = "http://localhost:" + port;
        console.log("\n  ┌───────────────────────────────────────────────┐");
        console.log("  │   IDX Analyzer — Analisis & Screener Saham BEI  │");
        console.log("  └───────────────────────────────────────────────┘");
        console.log("   Buka di browser : " + u);
        console.log("   Mode data       : " + FETCH_MODE + "  (FETCH_MODE=direct|jina|auto)");
        console.log("   Data live via   : /api/chart · /api/batch · /api/status");
        console.log("   Berhenti        : tekan Ctrl+C\n");
        if (process.env.NO_OPEN !== "1") openBrowser(u);
    });
}

start(PORT);

process.on("SIGINT", () => { console.log("\n  Sampai jumpa!\n"); process.exit(0); });
