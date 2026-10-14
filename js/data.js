/* =============================================
   DATA SAHAM INDONESIA (BEI / IDX)
   Harga & rasio dapat di-update via Yahoo Finance (.JK)
   ============================================= */

const IDX_DATA = [
    // ---- Perbankan ----
    { code:"BBCA", name:"Bank Central Asia",        sector:"Perbankan",      price:9250,  prev:9175,  pbv:2.4,  per:22.5, eps:411, roe:11.6, der:0.9, divY:2.1, mcap:1140, lq45:true },
    { code:"BBRI", name:"Bank Rakyat Indonesia",    sector:"Perbankan",      price:4180,  prev:4240,  pbv:2.3,  per:11.2, eps:373, roe:17.8, der:1.4, divY:5.4, mcap:633,  lq45:true },
    { code:"BMRI", name:"Bank Mandiri",             sector:"Perbankan",      price:5375,  prev:5325,  pbv:2.1,  per:9.8,  eps:548, roe:19.4, der:1.5, divY:5.8, mcap:498,  lq45:true },
    { code:"BBNI", name:"Bank Negara Indonesia",    sector:"Perbankan",      price:4450,  prev:4510,  pbv:1.0,  per:6.4,  eps:695, roe:15.7, der:1.7, divY:7.9, mcap:166,  lq45:true },
    { code:"BRIS", name:"Bank Syariah Indonesia",   sector:"Perbankan",      price:2640,  prev:2600,  pbv:2.7,  per:21.0, eps:126, roe:13.2, der:1.2, divY:1.2, mcap:121,  lq45:true },
    { code:"BBTN", name:"Bank Tabungan Negara",     sector:"Perbankan",      price:1180,  prev:1200,  pbv:0.6,  per:5.1,  eps:231, roe:12.4, der:3.1, divY:6.8, mcap:44.7, lq45:false },
    { code:"BMNI", name:"Bank Maybank Indonesia",   sector:"Perbankan",      price:498,   prev:505,   pbv:0.5,  per:4.2,  eps:119, roe:12.1, der:2.4, divY:6.0, mcap:15.1, lq45:false },
    { code:"AGRO", name:"Bank Agronesia",           sector:"Perbankan",      price:254,   prev:250,   pbv:0.4,  per:3.6,  eps:71,  roe:11.0, der:2.0, divY:4.0, mcap:3.4,  lq45:false },

    // ---- Telkom ----
    { code:"TLKM", name:"Telkom Indonesia",         sector:"Telekomunikasi",  price:2790,  prev:2830,  pbv:1.8,  per:11.4, eps:245, roe:16.1, der:0.8, divY:6.1, mcap:276,  lq45:true },
    { code:"ISAT", name:"Indosat Ooredoo Hutchison", sector:"Telekomunikasi", price:2180,  prev:2140,  pbv:1.4,  per:18.9, eps:115, roe:7.4,  der:2.2, divY:2.1, mcap:93.7, lq45:false },
    { code:"EXCL", name:"XL Axiata",                sector:"Telekomunikasi",  price:2140,  prev:2200,  pbv:1.3,  per:15.2, eps:141, roe:8.7,  der:2.6, divY:2.3, mcap:47.9, lq45:false },
    { code:"TOWR", name:"Sarana Menara Nusantara",  sector:"Telekomunikasi",  price:675,   prev:690,   pbv:1.5,  per:9.4,  eps:72,  roe:16.6, der:1.9, divY:4.8, mcap:35.9, lq45:false },

    // ---- Aneka Industri ----
    { code:"ASII", name:"Astra International",      sector:"Aneka Industri",  price:5025,  prev:4975,  pbv:0.9,  per:5.8,  eps:866, roe:15.6, der:1.0, divY:9.2, mcap:203,  lq45:true },
    { code:"UNTR", name:"United Tractors",          sector:"Aneka Industri",  price:24350, prev:24050, pbv:1.4,  per:5.4,  eps:4509,roe:27.1, der:0.7, divY:7.4, mcap:91.1, lq45:true },
    { code:"SMSM", name:"Selamat Sempurna",         sector:"Aneka Industri",  price:1560,  prev:1545,  pbv:2.6,  per:12.8, eps:122, roe:21.4, der:0.4, divY:3.7, mcap:7.6,  lq45:false },
    { code:"ARNA", name:"Arwana Citramulia",        sector:"Aneka Industri",  price:585,   prev:575,   pbv:2.2,  per:10.9, eps:54,  roe:21.7, der:0.5, divY:3.2, mcap:6.7,  lq45:false },

    // ---- Konsumer ----
    { code:"ICBP", name:"Indofood CBP Sukses Makmur", sector:"Konsumer",      price:11150, prev:11075, pbv:3.1,  per:14.6, eps:764, roe:22.1, der:0.9, divY:2.6, mcap:130,  lq45:true },
    { code:"INDF", name:"Indofood Sukses Makmur",   sector:"Konsumer",        price:7375,  prev:7325,  pbv:1.5,  per:6.7,  eps:1101,roe:22.4, der:1.3, divY:4.1, mcap:64.7, lq45:true },
    { code:"UNVR", name:"Unilever Indonesia",       sector:"Konsumer",        price:1745,  prev:1780,  pbv:15.4, per:14.2, eps:123, roe:8.9,  der:0.9, divY:6.9, mcap:66.0, lq45:true },
    { code:"MYOR", name:"Mayora Indah",             sector:"Konsumer",        price:2210,  prev:2180,  pbv:4.3,  per:19.7, eps:112, roe:23.1, der:1.1, divY:0.7, mcap:51.5, lq45:false },
    { code:"AMRT", name:"Sumber Alfaria Trijaya",   sector:"Konsumer",        price:2480,  prev:2460,  pbv:3.8,  per:24.1, eps:103, roe:17.1, der:1.6, divY:1.1, mcap:119,  lq45:true },
    { code:"GGRM", name:"Gudang Garam",             sector:"Konsumer",        price:11250, prev:11450, pbv:0.6,  per:6.9,  eps:1630,roe:8.6,  der:1.1, divY:5.1, mcap:16.4, lq45:false },
    { code:"HMSP", name:"H.M. Sampoerna",           sector:"Konsumer",        price:630,   prev:640,   pbv:2.2,  per:8.1,  eps:78,  roe:27.6, der:0.6, divY:8.3, mcap:91.0, lq45:false },

    // ---- Energi ----
    { code:"PGAS", name:"Perusahaan Gas Negara",    sector:"Energi",          price:1660,  prev:1640,  pbv:0.9,  per:7.1,  eps:234, roe:13.4, der:1.0, divY:6.9, mcap:40.5, lq45:true },
    { code:"ADRO", name:"Alamtri Resources Indonesia", sector:"Energi",       price:2380,  prev:2440,  pbv:1.3,  per:5.2,  eps:458, roe:27.4, der:0.5, divY:9.1, mcap:73.7, lq45:true },
    { code:"PTBA", name:"Bukit Asam",               sector:"Energi",          price:2810,  prev:2870,  pbv:1.8,  per:8.3,  eps:339, roe:24.1, der:0.7, divY:5.4, mcap:32.4, lq45:false },
    { code:"MEDC", name:"Medco Energi Internasional", sector:"Energi",        price:1245,  prev:1215,  pbv:1.0,  per:5.7,  eps:219, roe:18.7, der:1.4, divY:0.0, mcap:31.3, lq45:false },
    { code:"ANTM", name:"Aneka Tambang",            sector:"Energi",          price:1585,  prev:1550,  pbv:1.7,  per:9.8,  eps:162, roe:17.2, der:0.9, divY:4.3, mcap:38.2, lq45:true },
    { code:"INCO", name:"Vale Indonesia",           sector:"Energi",          price:3420,  prev:3500,  pbv:1.5,  per:11.9, eps:287, roe:12.7, der:0.5, divY:4.8, mcap:37.7, lq45:false },
    { code:"AKRA", name:"AKR Corporindo",           sector:"Energi",          price:1195,  prev:1180,  pbv:2.3,  per:13.4, eps:89,  roe:17.4, der:1.1, divY:2.7, mcap:24.3, lq45:false },

    // ---- Pertambangan ----
    { code:"MDKA", name:"Merdeka Copper Gold",      sector:"Pertambangan",    price:2140,  prev:2220,  pbv:3.0,  per:29.4, eps:73,  roe:10.8, der:1.5, divY:0.4, mcap:52.0, lq45:true },
    { code:"INBP", name:"Indo Bharat Rayon",        sector:"Pertambangan",    price:1345,  prev:1320,  pbv:1.9,  per:9.6,  eps:140, roe:20.1, der:0.8, divY:2.1, mcap:4.0,  lq45:false },
    { code:"ITMG", name:"Indo Tambangraya Megah",   sector:"Pertambangan",    price:24850, prev:25400, pbv:1.2,  per:4.8,  eps:5177,roe:26.7, der:0.4, divY:9.6, mcap:27.6, lq45:false },
    { code:"HRUM", name:"Harum Energy",             sector:"Pertambangan",    price:1060,  prev:1090,  pbv:1.4,  per:14.7, eps:72,  roe:9.8,  der:1.2, divY:2.1, mcap:6.7,  lq45:false },

    // ---- Properti ----
    { code:"BSDE", name:"Bumi Serpong Damai",       sector:"Properti",        price:880,   prev:870,   pbv:0.7,  per:9.4,  eps:94,  roe:7.7,  der:0.9, divY:2.4, mcap:17.6, lq45:false },
    { code:"CTRA", name:"Ciputra Development",      sector:"Properti",        price:980,   prev:965,   pbv:0.9,  per:8.8,  eps:111, roe:10.7, der:1.0, divY:2.9, mcap:24.8, lq45:true },
    { code:"PWON", name:"Pakuwon Jati",             sector:"Properti",        price:388,   prev:382,   pbv:0.8,  per:9.1,  eps:43,  roe:9.2,  der:1.3, divY:2.1, mcap:18.4, lq45:false },
    { code:"SMRA", name:"Summarecon Agung",         sector:"Properti",        price:468,   prev:480,   pbv:0.7,  per:7.9,  eps:59,  roe:9.4,  der:1.1, divY:3.1, mcap:15.3, lq45:false },

    // ---- Transportasi ----
    { code:"GIAA", name:"Garuda Indonesia",         sector:"Transportasi",    price:68,    prev:72,    pbv:1.6,  per:8.2,  eps:8,   roe:19.1, der:3.4, divY:0.0, mcap:9.0,  lq45:false },
    { code:"BIRD", name:"Blue Bird",                sector:"Transportasi",    price:1485,  prev:1470,  pbv:1.6,  per:12.4, eps:120, roe:13.4, der:0.6, divY:3.4, mcap:3.7,  lq45:false },
    { code:"ASSA", name:"Adi Sarana Armada",        sector:"Transportasi",    price:560,   prev:545,   pbv:1.4,  per:10.1, eps:55,  roe:14.4, der:1.7, divY:0.0, mcap:3.5,  lq45:false },

    // ---- Infrastruktur ----
    { code:"JSMR", name:"Jasa Marga",               sector:"Infrastruktur",   price:4290,  prev:4230,  pbv:1.2,  per:8.6,  eps:499, roe:14.1, der:2.3, divY:3.2, mcap:61.9, lq45:true },
    { code:"WIKA", name:"Wijaya Karya",             sector:"Infrastruktur",   price:254,   prev:264,   pbv:0.3,  per:4.1,  eps:62,  roe:7.4,  der:4.2, divY:0.0, mcap:1.5,  lq45:false },
    { code:"PTPP", name:"PP (Persero)",             sector:"Infrastruktur",   price:402,   prev:414,   pbv:0.3,  per:3.9,  eps:103, roe:7.1,  der:4.4, divY:0.0, mcap:1.4,  lq45:false },
    { code:"ADHI", name:"Adhi Karya",               sector:"Infrastruktur",   price:228,   prev:235,   pbv:0.3,  per:4.7,  eps:49,  roe:7.4,  der:4.0, divY:0.0, mcap:1.2,  lq45:false },

    // ---- Keuangan Non-Bank ----
    { code:"ASUR", name:"Asuransi Astra Buana",     sector:"Keuangan",        price:2340,  prev:2310,  pbv:2.7,  per:12.1, eps:193, roe:23.6, der:1.4, divY:2.9, mcap:9.8,  lq45:false },
    { code:"MIKA", name:"Mitra Keluarga Karyasehat", sector:"Kesehatan",      price:2510,  prev:2490,  pbv:3.2,  per:21.7, eps:116, roe:15.6, der:0.4, divY:1.9, mcap:48.0, lq45:true },
    { code:"HEAL", name:"Siloam International Hospitals", sector:"Kesehatan", price:1785,  prev:1760,  pbv:4.8,  per:30.9, eps:58,  roe:16.4, der:0.9, divY:1.0, mcap:36.6, lq45:false },

    // ---- Perdagangan ----
    { code:"MAPI", name:"Mitra Adiperkasa",         sector:"Perdagangan",     price:1340,  prev:1315,  pbv:2.2,  per:14.1, eps:95,  roe:16.2, der:1.7, divY:2.5, mcap:47.6, lq45:false },
    { code:"ERAA", name:"Erajaya Swasembada",       sector:"Perdagangan",     price:402,   prev:396,   pbv:1.4,  per:9.7,  eps:41,  roe:15.3, der:1.9, divY:2.7, mcap:10.6, lq45:false },
    { code:"ACES", name:"Ace Hardware Indonesia",   sector:"Perdagangan",     price:705,   prev:695,   pbv:1.9,  per:13.4, eps:53,  roe:14.6, der:0.8, divY:2.8, mcap:14.6, lq45:false },

    // ---- Agronesia / Agribisnis ----
    { code:"LSIP", name:"PP London Sumatra Indonesia", sector:"Agribisnis",   price:1105,  prev:1125,  pbv:0.6,  per:7.4,  eps:149, roe:8.4,  der:1.0, divY:4.4, mcap:14.4, lq45:false },
    { code:"AALI", name:"Astra Agro Lestari",       sector:"Agribisnis",      price:6550,  prev:6650,  pbv:0.9,  per:5.9,  eps:1110,roe:15.4, der:0.6, divY:7.8, mcap:21.3, lq45:false },
    { code:"SIMP", name:"Salim Ivomas Pratama",     sector:"Agribisnis",      price:1765,  prev:1745,  pbv:1.0,  per:8.4,  eps:210, roe:12.7, der:1.2, divY:3.2, mcap:16.7, lq45:false },

    // ---- Teknologi ----
    { code:"BUKA", name:"Bukalapak.com",            sector:"Teknologi",       price:128,   prev:132,   pbv:1.9,  per:34.1, eps:4,   roe:5.6,  der:0.3, divY:0.0, mcap:13.2, lq45:false },
    { code:"GOTO", name:"GoTo Gojek Tokopedia",     sector:"Teknologi",       price:62,     prev:65,    pbv:2.8,  per:41.2, eps:2,   roe:6.4,  der:0.2, divY:0.0, mcap:75.4, lq45:true },
    { code:"EMTK", name:"Elang Mahkota Teknologi",  sector:"Teknologi",       price:348,   prev:356,   pbv:2.1,  per:27.4, eps:13,  roe:8.1,  der:0.3, divY:0.0, mcap:21.4, lq45:false },

    // ---- Lainnya ----
    { code:"BRPT", name:"Barito Pacific",           sector:"Aneka Industri",  price:945,   prev:975,   pbv:1.6,  per:9.9,  eps:95,  roe:16.7, der:1.8, divY:1.9, mcap:72.6, lq45:true },
    { code:"TPIA", name:"Chandra Asri Pacific",     sector:"Aneka Industri",  price:7825,  prev:7650,  pbv:2.4,  per:12.7, eps:616, roe:19.4, der:1.4, divY:1.3, mcap:49.1, lq45:true },
    { code:"ESSA", name:"Essa Industries Indonesia", sector:"Aneka Industri",  price:720,   prev:745,   pbv:1.1,  per:6.3,  eps:114, roe:17.4, der:1.1, divY:4.2, mcap:27.4, lq45:false },
    { code:"JPFA", name:"Charoen Pokphand Indonesia", sector:"Agribisnis",    price:1720,  prev:1700,  pbv:1.4,  per:9.4,  eps:183, roe:15.7, der:1.3, divY:2.4, mcap:22.9, lq45:false },
    { code:"SIDO", name:"Industri Jamu & Farmasi Sido Muncul", sector:"Kesehatan", price:648, prev:655, pbv:3.1, per:16.2, eps:40, roe:20.1, der:0.3, divY:3.7, mcap:28.3, lq45:false },
    { code:"KLBF", name:"Kalbe Farma",              sector:"Kesehatan",       price:1585,  prev:1600,  pbv:2.5,  per:17.9, eps:89,  roe:14.3, der:0.5, divY:2.5, mcap:74.5, lq45:true },
];

/* dedupe pengaman bila ada kode ganda */
const STOCKS = (() => {
    const m = new Map();
    IDX_DATA.forEach(s => { if (!m.has(s.code)) m.set(s.code, s); });
    return [...m.values()];
})();
const STOCK_MAP = Object.fromEntries(STOCKS.map(s => [s.code, s]));

const SECTOR_LIST = [...new Set(STOCKS.map(s => s.sector))].sort();

/* IHSG sample — 30 hari trading (fallback simulasi) */
let IHSG_HISTORY = (() => {
    const out = [];
    let base = 7860;
    let d = new Date();
    d.setDate(d.getDate() - 45);
    const pts = [
        7842, 7865, 7831, 7890, 7912, 7885, 7940, 7968, 7925, 7982,
        8010, 7976, 8035, 8061, 8022, 7998, 8055, 8090, 8124, 8085,
        8042, 8110, 8155, 8132, 8178, 8215, 8190, 8242, 8275, 8231
    ];
    let i = 0;
    while (out.length < 30 && i < 400) {
        d.setDate(d.getDate() + 1);
        const dow = d.getDay();
        if (dow === 0 || dow === 6) continue;
        out.push({ time: fmtDate(d), value: pts[out.length] ?? base });
        i++;
    }
    return out;
})();

let IHSG_LAST = IHSG_HISTORY[IHSG_HISTORY.length - 1].value;
let IHSG_PREV = IHSG_HISTORY[IHSG_HISTORY.length - 2].value;

/* sektor performance simulasi (hari ini) */
const SECTOR_PERF = {
    "Perbankan": 0.82, "Telekomunikasi": -0.41, "Aneka Industri": 1.13,
    "Konsumer": 0.36, "Energi": -1.24, "Pertambangan": -1.87,
    "Properti": 0.94, "Transportasi": -2.11, "Infrastruktur": 0.58,
    "Keuangan": 0.67, "Kesehatan": 0.29, "Perdagangan": 1.42,
    "Agribisnis": -0.73, "Teknologi": -1.58
};

/* ===== UTIL ===== */
function fmtDate(d) {
    return d.toISOString().slice(0, 10);
}
function fmtNum(n, dec = 0) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("id-ID", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtRp(n) { return "Rp " + fmtNum(n, 0); }
function fmtPct(n) { return (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }
function chgOf(s) { return ((s.price - s.prev) / s.prev) * 100; }

/* ===== GENERATE OHLC SERIES ===== */
/* Deterministic pseudo-random supaya hasil konsisten */
function seedRand(seed) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

function genOHLC(stock, days = 260) {
    const rand = seedRand(hashCode(stock.code));
    const closes = [];
    const vols = [];
    // back-calculate from current price with drift
    let vol = 0.018 + (rand() * 0.014);
    const drift = (rand() - 0.44) * 0.0018;
    let px = stock.price;
    const raw = [];
    for (let i = 0; i < days; i++) {
        const shock = (rand() - 0.5) * 2 * vol;
        px = px * (1 + drift + shock);
        raw.push(px);
    }
    // scale so last close = stock.price
    const scale = stock.price / raw[raw.length - 1];
    let d = new Date();
    d.setDate(d.getDate() - Math.round(days * 1.45));
    const series = [];
    for (let i = 0; i < days; i++) {
        do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
        const close = raw[i] * scale;
        const range = close * (0.005 + rand() * 0.018);
        const open = close + (rand() - 0.5) * range;
        const high = Math.max(open, close) + rand() * range * 0.7;
        const low = Math.min(open, close) - rand() * range * 0.7;
        const volume = Math.round((0.5 + rand()) * (stock.mcap > 50 ? 90 : 25) * 1e6);
        series.push({
            time: fmtDate(d),
            open: round1(open),
            high: round1(high),
            low: round1(low),
            close: round1(close),
            volume
        });
    }
    // paksa bar terakhir = harga saat ini
    const last = series[series.length - 1];
    last.close = stock.price;
    last.open = round1(stock.prev);
    last.high = round1(Math.max(stock.price, stock.prev) * 1.004);
    last.low = round1(Math.min(stock.price, stock.prev) * 0.996);
    return series;
}

function round1(n) { return Math.round(n * 100) / 100; }
function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

/* cache */
const _seriesCache = {};
function getSeries(code) {
    if (!_seriesCache[code]) _seriesCache[code] = genOHLC(STOCK_MAP[code]);
    return _seriesCache[code];
}

/* ===== LIVE DATA via backend lokal (/api/*) =====
   Backend (server.js) mem-proxy Yahoo Finance dari sisi server
   sehingga lolos CORS browser. Kalau tidak ada backend / gagal,
   aplikasi tetap jalan dengan data simulasi.
   ============================================= */

const LIVE = { enabled: false, source: null, lastUpdate: null, daily: 0, intraday: 0, loading: false };

function apiJSON(path, timeout = 25000) {
    return new Promise((resolve, reject) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeout);
        fetch(path, { signal: ctrl.signal })
            .then(r => { clearTimeout(t); return r.ok ? r.json() : Promise.reject(new Error("http " + r.status)); })
            .then(resolve)
            .catch(e => { clearTimeout(t); reject(e); });
    });
}

/* terapkan data live ke satu saham + series-nya */
function applyChartData(code, d) {
    const s = STOCK_MAP[code];
    if (!s || !d) return false;
    if (d.name) s.yName = d.name;
    if (d.high52 != null) s.h52 = d.high52;
    if (d.low52 != null) s.l52 = d.low52;
    if (d.changePct != null) s.liveChgPct = d.changePct;

    const hasSeries = Array.isArray(d.series) && d.series.length >= 20;
    if (hasSeries) {
        _seriesCache[code] = d.series;
        const n = d.series.length;
        // harga & penutupan sebelumnya dari bar harian (chartPreviousClose Yahoo = 1 tahun lalu)
        if (d.series[n - 1] && d.series[n - 1].close != null) s.price = d.series[n - 1].close;
        else if (d.price != null) s.price = d.price;
        if (d.series[n - 2] && d.series[n - 2].close != null) s.prev = d.series[n - 2].close;
        else if (d.prevClose != null) s.prev = d.prevClose;
    } else {
        if (d.price != null && !isNaN(d.price)) s.price = d.price;
        if (d.prevClose != null && !isNaN(d.prevClose)) s.prev = d.prevClose;
    }
    if (s.eps > 0 && s.price > 0) s.per = Math.round((s.price / s.eps) * 10) / 10;
    return hasSeries;
}

function applyIntraday(code, d) {
    if (!d || !Array.isArray(d.series) || d.series.length < 5) return false;
    _intraCache[code] = d.series;
    return true;
}

/* muat data harian (OHLC) + intraday untuk semua saham */
async function loadLiveData(onProgress) {
    if (LIVE.loading) return LIVE;
    LIVE.loading = true;
    const codes = STOCKS.map(s => s.code);
    const names = codes.join(",");
    try {
        // 1) pastikan backend ada
        await apiJSON("/api/status", 6000);
        LIVE.enabled = true;
        LIVE.source = "Yahoo (via backend)";
    } catch (e) {
        LIVE.enabled = false;
        LIVE.loading = false;
        return LIVE;
    }

    // 2) harian (OHLC 1y) — dipakai indikator & rekomendasi
    try {
        const daily = await apiJSON("/api/batch?range=1y&interval=1d&symbols=" + encodeURIComponent(names), 240000);
        let n = 0;
        for (const code of codes) if (daily[code] && applyChartData(code, daily[code])) n++;
        LIVE.daily = n;
        if (n > 0) recalcSectorPerf();
    } catch (e) { /* diamkan */ }
    LIVE.ihsg = await loadIHSG();
    if (onProgress) onProgress("harian", LIVE.daily);

    // 3) intraday (5m, hari ini) — dipakai screener harian
    try {
        const intra = await apiJSON("/api/batch?range=2d&interval=5m&symbols=" + encodeURIComponent(names), 240000);
        let m = 0;
        for (const code of codes) if (intra[code] && applyIntraday(code, intra[code])) m++;
        LIVE.intraday = m;
    } catch (e) { /* diamkan */ }
    if (onProgress) onProgress("intraday", LIVE.intraday);

    LIVE.lastUpdate = new Date();
    LIVE.loading = false;
    return LIVE;
}

/* refresh ringan: hanya intraday (untuk pergerakan hari berjalan) */
async function refreshIntraday() {
    if (!LIVE.enabled) return 0;
    const codes = STOCKS.map(s => s.code).join(",");
    try {
        const intra = await apiJSON("/api/batch?range=2d&interval=5m&symbols=" + encodeURIComponent(codes), 180000);
        let m = 0;
        for (const s of STOCKS) if (intra[s.code] && applyIntraday(s.code, intra[s.code])) m++;
        if (m) {
            // samakan harga terakhir dengan bar intraday terakhir
            STOCKS.forEach(s => {
                const b = _intraCache[s.code];
                if (b && b.length && b[b.length - 1].c != null) s.price = b[b.length - 1].c;
            });
            LIVE.lastUpdate = new Date();
        }
        return m;
    } catch (e) { return 0; }
}

/* hitung performa sektor hari ini dari data harian asli */
function recalcSectorPerf() {
    const buckets = {};
    STOCKS.forEach(s => {
        const ser = _seriesCache[s.code];
        if (!ser || ser.length < 2) return;
        const last = ser[ser.length - 1], prev = ser[ser.length - 2];
        if (!prev.close) return;
        const pct = ((last.close - prev.close) / prev.close) * 100;
        (buckets[s.sector] = buckets[s.sector] || []).push(pct);
    });
    let n = 0;
    for (const [sec, arr] of Object.entries(buckets)) {
        SECTOR_PERF[sec] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
        n++;
    }
    return n;
}

/* muat indeks IHSG (^JKSE) asli */
async function loadIHSG() {
    try {
        const d = await apiJSON("/api/chart?symbol=" + encodeURIComponent("^JKSE") + "&range=3mo&interval=1d", 60000);
        if (d && Array.isArray(d.series) && d.series.length >= 2) {
            const hist = d.series.slice(-30).map(b => ({ time: b.time, value: Math.round(b.close) }));
            if (hist.length >= 2) {
                IHSG_HISTORY = hist;
                IHSG_LAST = hist[hist.length - 1].value;
                IHSG_PREV = hist[hist.length - 2].value;
                return true;
            }
        }
    } catch (e) { /* biarkan simulasi */ }
    return false;
}

/* =============================================
   INTRADAY 15-MENIT (SIMULASI DARI OHLC HARIAN)
   Dipakai screener "beberapa jam" / harian.
   Direkonstruksi dari open/high/low/close harian
   terakhir supaya konsisten & deterministik.
   ============================================= */

const _intraCache = {};

const SESSION_BARS = [
    ...["09:00","09:15","09:30","09:45","10:00","10:15","10:30","10:45","11:00","11:15","11:30","11:45"]
        .map(t => ({ t, sess: "p" })),
    ...["13:30","13:45","14:00","14:15","14:30","14:45","15:00","15:15","15:30","15:45"]
        .map(t => ({ t, sess: "s" }))
];

function getIntraday(code) {
    if (!_intraCache[code]) _intraCache[code] = genIntraday(STOCK_MAP[code]);
    return _intraCache[code];
}

function genIntraday(stock) {
    const daily = getSeries(stock.code);
    const last = daily[daily.length - 1];
    const rand = seedRand(hashCode(stock.code) * 31 + 977);
    const o = last.open, c = last.close, hi = last.high, lo = last.low;
    const n = SESSION_BARS.length;            // 22 bar
    const up = c >= o;

    // titik balik: reversal awal (09:45-10:15) & ekstrem kedua di siang
    const a = 3 + Math.floor(rand() * 4);
    const b = 13 + Math.floor(rand() * 6);
    const wps = up
        ? [{ i: 0, v: o }, { i: a, v: lo }, { i: b, v: hi }, { i: n - 1, v: c }]
        : [{ i: 0, v: o }, { i: a, v: hi }, { i: b, v: lo }, { i: n - 1, v: c }];

    // interpolasi linear antar titik balik
    const path = new Array(n).fill(o);
    for (let k = 0; k < wps.length - 1; k++) {
        const s = wps[k], e = wps[k + 1];
        for (let i = s.i; i <= e.i; i++) {
            const t = e.i === s.i ? 0 : (i - s.i) / (e.i - s.i);
            path[i] = s.v + (e.v - s.v) * t;
        }
    }
    // noise halus, lalu clamp ke [lo,hi]
    const amp = stock.price * 0.0011;
    for (let i = 1; i < n - 1; i++) path[i] += (rand() - 0.5) * 2 * amp;
    for (let i = 0; i < n; i++) path[i] = Math.min(hi, Math.max(lo, path[i]));
    wps.forEach(w => path[w.i] = w.v);
    path[0] = o; path[n - 1] = c;

    // volume pola-U (ramai di buka & tutup)
    const wts = SESSION_BARS.map((s, i) => {
        const u = 1 + 1.3 * Math.exp(-i / 2.5) + 1.0 * Math.exp(-(n - 1 - i) / 3);
        return u * (0.7 + rand() * 0.6);
    });
    const wsum = wts.reduce((x, y) => x + y, 0);

    // waktu: pakai tanggal bar harian terakhir
    const [yy, mm, dd] = last.time.split("-").map(Number);
    const bars = [];
    for (let i = 0; i < n; i++) {
        const open = i === 0 ? o : path[i - 1];
        const close = path[i];
        const rng = stock.price * (0.0007 + rand() * 0.0011);
        const h = Math.min(hi, Math.max(open, close) + rng * rand());
        const l = Math.max(lo, Math.min(open, close) - rng * rand());
        const [hh, mi] = SESSION_BARS[i].t.split(":").map(Number);
        bars.push({
            t: SESSION_BARS[i].t,
            sess: SESSION_BARS[i].sess,
            time: Date.UTC(yy, mm - 1, dd, hh, mi) / 1000,
            o: round1(open), h: round1(h), l: round1(l), c: round1(close),
            v: Math.round(last.volume * wts[i] / wsum)
        });
    }
    // pastikan bar terakhir = harga sekarang
    bars[n - 1].c = stock.price;
    return bars;
}
