/* =============================================
   RENDER CHART (Lightweight Charts + Chart.js)
   ============================================= */

const CH = {
    main: null, volume: null, rsi: null, macd: null, bb: null,
    _ihsgLine: null, _ihsgSpark: null, sector: null,
    valuation: null, earnings: null,

    /* --- THEME HELPERS --- */
    grid: { color: "rgba(35,42,61,.55)", style: 0 },
    txtColor: "#5f6a85",
    up: "#22c55e",
    down: "#ef4444",
    blue: "#3b82f6",
    amber: "#f59e0b",
    purple: "#a78bfa",
    cyan: "#22d3ee",

    baseChartOpts(container) {
        return {
            layout: {
                background: { type: "solid", color: "transparent" },
                textColor: this.txtColor,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11
            },
            grid: { vertLines: { color: "rgba(35,42,61,.4)" }, horzLines: { color: "rgba(35,42,61,.4)" } },
            rightPriceScale: { borderColor: "#232a3d" },
            timeScale: { borderColor: "#232a3d", timeVisible: false, rightOffset: 4 },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: { color: "#3b82f6", width: 1, style: 3, labelBackgroundColor: "#3b82f6" },
                horzLine: { color: "#3b82f6", width: 1, style: 3, labelBackgroundColor: "#3b82f6" }
            },
            handleScale: { axisPressedMouseMove: { time: true, price: false } },
            autoSize: true
        };
    },

    destroy(obj) {
        if (!obj) return null;
        try {
            if (typeof obj.destroy === "function") obj.destroy();
            else if (typeof obj.remove === "function") obj.remove();
        } catch (e) {}
        return null;
    },

    /* ===== MAIN PRICE CHART ===== */
    priceChart(series, opts = {}) {
        const el = document.getElementById("mainChart");
        this.main = this.destroy(this.main);
        el.innerHTML = "";
        const type = opts.type || "candle";
        const chart = LightweightCharts.createChart(el, this.baseChartOpts(el));
        chart.timeScale().fitContent();

        let mainSeries;
        if (type === "candle") {
            mainSeries = chart.addCandlestickSeries({
                upColor: this.up, downColor: this.down,
                borderUpColor: this.up, borderDownColor: this.down,
                wickUpColor: this.up, wickDownColor: this.down
            });
            mainSeries.setData(series);
        } else if (type === "line") {
            mainSeries = chart.addLineSeries({ color: this.blue, lineWidth: 2 });
            mainSeries.setData(series.map(b => ({ time: b.time, value: b.close })));
        } else {
            mainSeries = chart.addAreaSeries({
                lineColor: this.blue, topColor: "rgba(59,130,246,.28)",
                bottomColor: "rgba(59,130,246,.02)", lineWidth: 2
            });
            mainSeries.setData(series.map(b => ({ time: b.time, value: b.close })));
        }

        // MA overlay
        const period = opts.ma || 0;
        if (period > 0) {
            const closes = series.map(b => b.close);
            const ma = TInd.sma(closes, period);
            const line = chart.addLineSeries({
                color: this.amber, lineWidth: 1.5,
                priceLineVisible: false, lastValueVisible: false,
                crosshairMarkerVisible: false
            });
            line.setData(ma.map(o => ({ time: series[o.i].time, value: round1(o.v) })));
        }

        this.main = chart;
        return chart;
    },

    /* ===== VOLUME ===== */
    volumeChart(series) {
        const el = document.getElementById("volumeChart");
        this.volume = this.destroy(this.volume);
        el.innerHTML = "";
        const chart = LightweightCharts.createChart(el, this.baseChartOpts(el));
        chart.applyOptions({
            rightPriceScale: { visible: false },
            timeScale: { visible: false, borderVisible: false },
            grid: { vertLines: { visible: false }, horzLines: { visible: false } }
        });
        const s = chart.addHistogramSeries({
            priceFormat: { type: "volume" },
            priceScaleId: "vol"
        });
        chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
        s.setData(series.map(b => ({
            time: b.time, value: b.volume,
            color: b.close >= b.open ? "rgba(34,197,94,.55)" : "rgba(239,68,68,.55)"
        })));
        this.volume = chart;
    },

    /* ===== RSI ===== */
    rsiChart(series) {
        const el = document.getElementById("rsiChart");
        this.rsi = this.destroy(this.rsi);
        el.innerHTML = "";
        const chart = LightweightCharts.createChart(el, this.baseChartOpts(el));
        chart.applyOptions({
            rightPriceScale: { scaleMargins: { top: 0.15, bottom: 0.15 } },
            timeScale: { visible: false },
            grid: { vertLines: { visible: false } }
        });
        const closes = series.map(b => b.close);
        const data = TInd.rsi(closes, 14);

        // overbought/oversold zones
        const z1 = chart.addLineSeries({ color: "rgba(239,68,68,.35)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        z1.setData(data.map(o => ({ time: series[o.i].time, value: 70 })));
        const z2 = chart.addLineSeries({ color: "rgba(34,197,94,.35)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        z2.setData(data.map(o => ({ time: series[o.i].time, value: 30 })));

        const line = chart.addLineSeries({ color: this.purple, lineWidth: 2, priceLineVisible: false });
        line.setData(data.map(o => ({ time: series[o.i].time, value: o.v })));
        this.rsi = chart;

        const cur = data.length ? data[data.length - 1].v : 50;
        const chip = document.getElementById("rsiChip");
        chip.textContent = cur.toFixed(1);
        chip.style.color = cur > 70 ? this.down : cur < 30 ? this.up : this.amber;
        return cur;
    },

    /* ===== MACD ===== */
    macdChart(series) {
        const el = document.getElementById("macdChart");
        this.macd = this.destroy(this.macd);
        el.innerHTML = "";
        const chart = LightweightCharts.createChart(el, this.baseChartOpts(el));
        chart.applyOptions({
            rightPriceScale: { scaleMargins: { top: 0.15, bottom: 0.15 } },
            timeScale: { visible: false },
            grid: { vertLines: { visible: false } }
        });
        const closes = series.map(b => b.close);
        const m = TInd.macd(closes);
        const idxOf = i => series[i] ? series[i].time : null;

        const hist = chart.addHistogramSeries({ priceFormat: { type: "price", precision: 3, minMove: 0.001 } });
        const hData = [];
        m.hist.forEach((v, i) => {
            const t = idxOf(i);
            if (v == null || !t) return;
            hData.push({ time: t, value: v, color: v >= 0 ? "rgba(34,197,94,.55)" : "rgba(239,68,68,.55)" });
        });
        // lightweight-charts butuh data time ascending unik
        hist.setData(dedupeTime(hData));

        const l = chart.addLineSeries({ color: this.blue, lineWidth: 2, priceLineVisible: false });
        l.setData(dedupeTime(m.line.map((v, i) => ({ time: idxOf(i), value: v })).filter(o => o.time && o.value != null)));

        const s = chart.addLineSeries({ color: this.amber, lineWidth: 1.5, priceLineVisible: false });
        s.setData(dedupeTime(m.signal.map((v, i) => ({ time: idxOf(i), value: v })).filter(o => o.time && o.value != null)));

        this.macd = chart;
        const curH = [...m.hist].reverse().find(v => v != null) ?? 0;
        const chip = document.getElementById("macdChip");
        chip.textContent = (curH >= 0 ? "+" : "") + curH.toFixed(2);
        chip.style.color = curH >= 0 ? this.up : this.down;
        return curH;
    },

    /* ===== BOLLINGER ===== */
    bbChart(series) {
        const el = document.getElementById("bbChart");
        this.bb = this.destroy(this.bb);
        el.innerHTML = "";
        const chart = LightweightCharts.createChart(el, this.baseChartOpts(el));
        chart.applyOptions({
            rightPriceScale: { scaleMargins: { top: 0.12, bottom: 0.12 } },
            timeScale: { visible: false },
            grid: { vertLines: { visible: false } }
        });
        const closes = series.map(b => b.close);
        const bb = TInd.bollinger(closes);
        const mk = (arr, color, dashed) => {
            const s = chart.addLineSeries({
                color, lineWidth: 1, priceLineVisible: false,
                lastValueVisible: false, crosshairMarkerVisible: false,
                lineStyle: dashed ? LightweightCharts.LineStyle.Dashed : LightweightCharts.LineStyle.Solid
            });
            s.setData(arr.map((v, i) => v == null || !series[i] ? null : ({ time: series[i].time, value: round1(v) })).filter(Boolean));
            return s;
        };
        mk(bb.upper, "rgba(59,130,246,.7)", true);
        mk(bb.lower, "rgba(59,130,246,.7)", true);
        const mid = chart.addLineSeries({ color: this.amber, lineWidth: 1.5, priceLineVisible: false });
        mid.setData(bb.mid.map((v, i) => v == null || !series[i] ? null : ({ time: series[i].time, value: round1(v) })).filter(Boolean));
        const px = chart.addLineSeries({ color: "#e8ecf5", lineWidth: 2, priceLineVisible: false, crosshairMarkerVisible: false });
        px.setData(series.map(b => ({ time: b.time, value: b.close })));

        this.bb = chart;
        const last = closes[closes.length - 1];
        const u = bb.upper[bb.upper.length - 1], l = bb.lower[bb.lower.length - 1];
        const pos = u && l ? ((last - l) / (u - l)) * 100 : 50;
        const chip = document.getElementById("bbChip");
        chip.textContent = pos.toFixed(0) + "% band";
        chip.style.color = pos > 85 ? this.down : pos < 15 ? this.up : this.amber;
        return pos;
    },

    /* ===== IHSG LINE (Chart.js) ===== */
    ihsgLine() {
        const el = document.getElementById("ihsgLine");
        if (!el) return;
        this._ihsgLine = this.destroy(this._ihsgLine);
        const ctx = el.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 0, 260);
        grad.addColorStop(0, "rgba(59,130,246,.30)");
        grad.addColorStop(1, "rgba(59,130,246,0)");
        const up = IHSG_LAST >= IHSG_PREV;
        const lineCol = up ? "#22c55e" : "#ef4444";
        const g2 = ctx.createLinearGradient(0, 0, 0, 260);
        g2.addColorStop(0, up ? "rgba(34,197,94,.28)" : "rgba(239,68,68,.28)");
        g2.addColorStop(1, "rgba(0,0,0,0)");

        this._ihsgLine = new Chart(ctx, {
            type: "line",
            data: {
                labels: IHSG_HISTORY.map(p => p.time.slice(8) + "/" + p.time.slice(5, 7)),
                datasets: [{
                    data: IHSG_HISTORY.map(p => p.value),
                    borderColor: lineCol, borderWidth: 2.2,
                    backgroundColor: g2, fill: true,
                    tension: 0.35, pointRadius: 0, pointHitRadius: 14
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, backgroundColor: "#1c2233", borderColor: "#2d3650", borderWidth: 1, titleFont: { family: "JetBrains Mono" }, bodyFont: { family: "JetBrains Mono" }, padding: 11, displayColors: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: "#5f6a85", font: { size: 10, family: "JetBrains Mono" }, maxTicksLimit: 8 } },
                    y: { position: "right", grid: { color: "rgba(35,42,61,.5)" }, ticks: { color: "#5f6a85", font: { size: 10, family: "JetBrains Mono" }, callback: v => v.toLocaleString("id-ID") } }
                },
                interaction: { mode: "nearest", axis: "x", intersect: false }
            }
        });
    },

    /* IHSG sparkline */
    ihsgSpark() {
        const el = document.getElementById("ihsgSpark");
        if (!el) return;
        this._ihsgSpark = this.destroy(this._ihsgSpark);
        const up = IHSG_LAST >= IHSG_PREV;
        this._ihsgSpark = new Chart(el.getContext("2d"), {
            type: "line",
            data: {
                labels: IHSG_HISTORY.map(() => ""),
                datasets: [{
                    data: IHSG_HISTORY.map(p => p.value),
                    borderColor: up ? "#22c55e" : "#ef4444",
                    borderWidth: 1.8, tension: 0.4, pointRadius: 0, fill: true,
                    backgroundColor: up ? "rgba(34,197,94,.10)" : "rgba(239,68,68,.10)"
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } },
                animation: { duration: 900 }
            }
        });
    },

    /* Sector bar chart */
    sectorChart() {
        const el = document.getElementById("sectorChart");
        if (!el) return;
        this.sector = this.destroy(this.sector);
        const entries = Object.entries(SECTOR_PERF).sort((a, b) => b[1] - a[1]);
        this.sector = new Chart(el.getContext("2d"), {
            type: "bar",
            data: {
                labels: entries.map(e => e[0]),
                datasets: [{
                    data: entries.map(e => e[1]),
                    backgroundColor: entries.map(e => e[1] >= 0 ? "rgba(34,197,94,.75)" : "rgba(239,68,68,.75)"),
                    borderRadius: 5, borderSkipped: false, barThickness: 15
                }]
            },
            options: {
                indexAxis: "y", responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#1c2233", borderColor: "#2d3650", borderWidth: 1,
                        bodyFont: { family: "JetBrains Mono" }, padding: 10, displayColors: false,
                        callbacks: { label: c => fmtPct(c.parsed.x) }
                    }
                },
                scales: {
                    x: { grid: { color: "rgba(35,42,61,.5)" }, ticks: { color: "#5f6a85", font: { size: 10, family: "JetBrains Mono" }, callback: v => v + "%" } },
                    y: { grid: { display: false }, ticks: { color: "#9aa4bd", font: { size: 11 } } }
                }
            }
        });
    },

    /* Valuasi vs sektor (bar) */
    valuationChart(stock) {
        const el = document.getElementById("valuationChart");
        if (!el) return;
        this.valuation = this.destroy(this.valuation);
        const peers = STOCKS.filter(s => s.sector === stock.sector);
        const avgPer = peers.reduce((a, b) => a + b.per, 0) / peers.length;
        const avgPbv = peers.reduce((a, b) => a + b.pbv, 0) / peers.length;
        const avgRoe = peers.reduce((a, b) => a + b.roe, 0) / peers.length;

        this.valuation = new Chart(el.getContext("2d"), {
            type: "bar",
            data: {
                labels: ["PER", "PBV", "ROE %"],
                datasets: [
                    { label: stock.code, data: [stock.per, stock.pbv, stock.roe], backgroundColor: "rgba(59,130,246,.8)", borderRadius: 6 },
                    { label: "Rata-rata " + stock.sector, data: [round1(avgPer), round1(avgPbv), round1(avgRoe)], backgroundColor: "rgba(167,139,250,.6)", borderRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#9aa4bd", boxWidth: 12, font: { size: 11 } } },
                    tooltip: { backgroundColor: "#1c2233", borderColor: "#2d3650", borderWidth: 1, bodyFont: { family: "JetBrains Mono" }, padding: 10 }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: "#9aa4bd", font: { size: 11.5, weight: "600" } } },
                    y: { grid: { color: "rgba(35,42,61,.5)" }, ticks: { color: "#5f6a85", font: { size: 10, family: "JetBrains Mono" } } }
                }
            }
        });
    },

    /* Earnings 4T (mixed bar+line) */
    earningsChart(stock) {
        const el = document.getElementById("earningsChart");
        if (!el) return;
        this.earnings = this.destroy(this.earnings);
        const rand = seedRand(hashCode(stock.code) + 7);
        const base = stock.eps;
        const q = [
            round1(base * (0.78 + rand() * 0.2)),
            round1(base * (0.85 + rand() * 0.2)),
            round1(base * (0.9 + rand() * 0.2)),
            round1(base * (1.0 + rand() * 0.18))
        ];
        const rev = q.map(v => round1(v * (1.9 + rand() * 1.4)));
        this.earnings = new Chart(el.getContext("2d"), {
            type: "bar",
            data: {
                labels: ["Q1", "Q2", "Q3", "Q4"],
                datasets: [
                    { label: "EPS (Rp)", data: q, backgroundColor: "rgba(59,130,246,.8)", borderRadius: 6, yAxisID: "y" },
                    { label: "Pendapatan indeks", data: rev, type: "line", borderColor: "#f59e0b", borderWidth: 2, pointRadius: 4, pointBackgroundColor: "#f59e0b", tension: 0.35, yAxisID: "y1" }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#9aa4bd", boxWidth: 12, font: { size: 11 } } },
                    tooltip: { backgroundColor: "#1c2233", borderColor: "#2d3650", borderWidth: 1, bodyFont: { family: "JetBrains Mono" }, padding: 10 }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: "#9aa4bd", font: { size: 11.5, weight: "600" } } },
                    y: { position: "left", grid: { color: "rgba(35,42,61,.5)" }, ticks: { color: "#3b82f6", font: { size: 10, family: "JetBrains Mono" } }, title: { display: true, text: "EPS", color: "#3b82f6", font: { size: 10 } } },
                    y1: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#f59e0b", font: { size: 10, family: "JetBrains Mono" } } }
                }
            }
        });
    },

    destroyAll() {
        ["main", "volume", "rsi", "macd", "bb", "_ihsgLine", "_ihsgSpark", "sector", "valuation", "earnings"]
            .forEach(k => { this[k] = this.destroy(this[k]); });
    }
};

/* buang duplikat time agar lightweight-charts tidak error */
function dedupeTime(arr) {
    const seen = new Set();
    const out = [];
    for (const o of arr) {
        if (o == null || o.time == null) continue;
        const key = typeof o.time === "object" ? JSON.stringify(o.time) : o.time;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(o);
    }
    return out.sort((a, b) => (a.time > b.time ? 1 : -1));
}
