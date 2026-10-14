/* =============================================
   APP — logika utama IDX Analyzer
   ============================================= */

const App = {
    view: "dashboard",
    current: "BBCA",
    tf: "1M",
    watch: [],
    alerts: [],
    sgMode: "general",
    sgWin: { pagi: "11:00", sore: "15:15" },
    _pChart: null,
    _pSeries: null,

    /* ===== INIT ===== */
    init() {
        this.loadWatch();
        this.loadAlerts();
        this.buildSelects();
        this.bind();
        this.tickClock();
        setInterval(() => this.tickClock(), 1000);
        this.renderDashboard();
        this.renderScreener();
        this.renderFundamental(this.current);
        this.openChart(this.current, false);
        this.renderWatchlist();
        this.renderAlerts();
        this.updateMarketStatus();
        this.maybeLive();
    },

    /* ===== NAV ===== */
    bind() {
        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.addEventListener("click", () => this.go(btn.dataset.view));
        });
        document.querySelectorAll("[data-nav]").forEach(btn => {
            btn.addEventListener("click", () => this.go(btn.dataset.nav));
        });

        // search
        const si = document.getElementById("searchInput");
        const sr = document.getElementById("searchResults");
        si.addEventListener("input", () => this.search(si.value));
        si.addEventListener("focus", () => { if (si.value) this.search(si.value); });
        document.addEventListener("click", e => {
            if (!e.target.closest(".search-box")) sr.classList.remove("show");
        });

        // chart controls
        document.querySelectorAll("#tfSeg button").forEach(b => {
            b.addEventListener("click", () => {
                document.querySelectorAll("#tfSeg button").forEach(x => x.classList.remove("active"));
                b.classList.add("active");
                this.tf = b.dataset.tf;
                this.drawChart();
            });
        });
        document.getElementById("chartType").addEventListener("change", () => this.drawChart());
        document.getElementById("maPeriod").addEventListener("change", () => this.drawChart());

        // filters
        ["fSector", "fPerMax", "fPbvMin", "fPbvMax", "fRsiMax", "fChgMin", "fSignal", "fScoreMin", "fRrMin"]
            .forEach(id => document.getElementById(id).addEventListener("input", () => this.renderScreener()));
        document.getElementById("fReset").addEventListener("click", () => {
            ["fSector", "fPerMax", "fPbvMin", "fPbvMax", "fRsiMax", "fChgMin", "fSignal", "fScoreMin", "fRrMin"]
                .forEach(id => document.getElementById(id).value = "");
            this.renderScreener();
        });

        // screener mode tabs
        document.querySelectorAll("#screenerMode button").forEach(b => {
            b.addEventListener("click", () => {
                this.sgMode = b.dataset.mode;
                document.querySelectorAll("#screenerMode button").forEach(x => x.classList.toggle("active", x === b));
                this.renderScreener();
            });
        });
        // window chips
        document.getElementById("winChips").addEventListener("click", e => {
            const b = e.target.closest("[data-win]");
            if (!b) return;
            this.sgWin[this.sgMode] = b.dataset.win;
            this.renderScreener();
        });

        // fundamental picker
        document.getElementById("fundTicker").addEventListener("change", e => {
            this.renderFundamental(e.target.value);
        });

        // watchlist
        document.getElementById("watchAddBtn").addEventListener("click", () => this.addWatch());
        document.getElementById("watchInput").addEventListener("keydown", e => { if (e.key === "Enter") this.addWatch(); });

        // alert harga
        document.getElementById("alertAddBtn").addEventListener("click", () => this.addAlert());
        ["alertCode", "alertTarget", "alertNote"].forEach(id => {
            document.getElementById(id).addEventListener("keydown", e => { if (e.key === "Enter") this.addAlert(); });
        });
        const nb = document.getElementById("notifBtn");
        if (nb) nb.addEventListener("click", () => this.requestNotifPermission());

        // modal
        document.getElementById("mClose").addEventListener("click", () => this.closeModal());
        document.getElementById("modal").addEventListener("click", e => {
            if (e.target.id === "modal") this.closeModal();
        });
        document.getElementById("mAnalyzeBtn").addEventListener("click", () => {
            this.closeModal();
            this.openChart(document.getElementById("mCode").textContent);
        });
        document.getElementById("mPlanBtn").addEventListener("click", () => {
            const code = document.getElementById("mCode").textContent;
            this.closeModal();
            this.openPlan(code);
        });

        // plan modal
        document.getElementById("pClose").addEventListener("click", () => this.closePlan());
        document.getElementById("planModal").addEventListener("click", e => {
            if (e.target.id === "planModal") this.closePlan();
        });
        document.getElementById("pChartBtn").addEventListener("click", () => {
            const code = document.getElementById("pCode").textContent;
            this.closePlan();
            this.openChart(code);
        });
        document.getElementById("pAlertBtn").addEventListener("click", () => {
            const code = document.getElementById("pCode").textContent;
            this.closePlan();
            this.go("alert");
            const ci = document.getElementById("alertCode");
            ci.value = code;
            const s = STOCK_MAP[code];
            const at = document.getElementById("alertTarget");
            if (s && !at.value) at.value = s.price;
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") { this.closeModal(); this.closePlan(); }
        });

        // tombol refresh data
        const dr = document.getElementById("dataRefresh");
        if (dr) dr.addEventListener("click", () => this.manualRefresh());
    },

    go(view) {
        this.view = view;
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        document.getElementById("view-" + view).classList.add("active");
        if (window.innerWidth <= 900) document.getElementById("sidebar").classList.remove("open");
        if (view === "chart") setTimeout(() => this.drawChart(true), 60);
        if (view === "watchlist") this.renderWatchlist();
        if (view === "alert") this.renderAlerts();
    },

    /* ===== CLOCK & MARKET STATUS ===== */
    tickClock() {
        const now = new Date();
        document.getElementById("clock").textContent = now.toLocaleTimeString("id-ID", { hour12: false });
    },

    updateMarketStatus() {
        const now = new Date();
        const day = now.getDay();
        const mins = now.getHours() * 60 + now.getMinutes();
        const dot = document.querySelector(".status-dot");
        const txt = document.getElementById("marketStatusText");
        const buka = mins >= 540 && mins < 720;       // 09:00–12:00
        const sesi2 = mins >= 810 && mins < 960;      // 13:30–16:00
        const kerja = day >= 1 && day <= 5;
        const open = kerja && (buka || sesi2);

        dot.className = "status-dot " + (open ? "open" : "closed");
        if (!kerja) txt.textContent = "Tutup · akhir pekan";
        else if (buka) txt.textContent = "Sesi I · 09:00–12:00 WIB";
        else if (sesi2) txt.textContent = "Sesi II · 13:30–16:00 WIB";
        else if (mins >= 720 && mins < 810) txt.textContent = "Istirahat · 12:00–13:30";
        else if (mins < 540) txt.textContent = "Pre-market · buka 09:00";
        else txt.textContent = "Pasca-penutupan";
    },

    /* ===== LIVE QUOTES via backend lokal ===== */
    async maybeLive() {
        this.renderDataStatus("loading");
        await loadLiveData(() => this.renderDataStatus("loading"));
        if (LIVE.enabled) {
            this.renderDashboard();
            this.renderScreener();
            this.renderFundamental(document.getElementById("fundTicker").value || this.current);
            this.renderWatchlist();
            this.renderAlerts();
            if (this.view === "chart") this.drawChart(true);
        }
        this.renderDataStatus(LIVE.enabled ? "live" : "sim");
        this.checkAlerts();
        this.startAutoRefresh();
    },

    /* status data di topbar */
    renderDataStatus(state, extra) {
        const dot = document.getElementById("dataDot");
        const label = document.getElementById("dataLabel");
        const upd = document.getElementById("dataUpdated");
        if (!dot || !label) return;
        if (state === "loading") {
            dot.className = "data-dot load";
            label.textContent = extra ? "Memuat data " + extra + "…" : "Memuat data live…";
            if (upd) upd.textContent = "";
        } else if (state === "live") {
            dot.className = "data-dot live";
            label.textContent = "Live · Yahoo";
            if (upd) upd.textContent = LIVE.lastUpdate
                ? "diperbarui " + LIVE.lastUpdate.toLocaleTimeString("id-ID", { hour12: false }) + " · " +
                  LIVE.daily + " harian / " + LIVE.intraday + " intraday"
                : "";
        } else {
            dot.className = "data-dot sim";
            label.textContent = "Simulasi";
            if (upd) upd.textContent = "jalankan `node server.js` untuk data live";
        }
    },

    isMarketOpen() {
        const now = new Date();
        const day = now.getDay();
        if (day === 0 || day === 6) return false;
        const mins = now.getHours() * 60 + now.getMinutes();
        return (mins >= 540 && mins < 720) || (mins >= 810 && mins < 960);
    },

    /* refresh otomatis tiap 60 detik saat bursa buka */
    startAutoRefresh() {
        if (this._refreshTimer) return;
        this._refreshTimer = setInterval(async () => {
            if (!LIVE.enabled || !this.isMarketOpen()) return;
            const n = await refreshIntraday();
            if (n > 0) {
                this.renderDashboard();
                if (this.sgMode !== "general") this.renderScreener();
                this.renderDataStatus("live");
                this.checkAlerts();
            }
        }, 60000);
    },

    async manualRefresh() {
        if (!LIVE.enabled) {
            this.renderDataStatus("loading");
            await loadLiveData(() => this.renderDataStatus("loading"));
            this.renderDataStatus(LIVE.enabled ? "live" : "sim");
            if (LIVE.enabled) this.rerenderAll();
            this.checkAlerts();
            return;
        }
        this.toast("Memperbarui…");
        const n = await refreshIntraday();
        if (n > 0) { this.rerenderAll(); this.toast("Data diperbarui (" + n + " saham)"); }
        else this.toast("Tidak ada data baru");
        this.checkAlerts();
    },

    rerenderAll() {
        this.renderDashboard();
        this.renderScreener();
        this.renderFundamental(document.getElementById("fundTicker").value || this.current);
        this.renderWatchlist();
        this.renderAlerts();
        if (this.view === "chart") this.drawChart(true);
    },

    /* ===== SEARCH ===== */
    search(q) {
        const sr = document.getElementById("searchResults");
        q = q.trim().toUpperCase();
        if (!q) { sr.classList.remove("show"); return; }
        const hits = STOCKS.filter(s => s.code.includes(q) || s.name.toUpperCase().includes(q)).slice(0, 9);
        if (!hits.length) {
            sr.innerHTML = `<div class="sr-item" style="cursor:default;color:var(--text-3)">Tidak ditemukan</div>`;
        } else {
            sr.innerHTML = hits.map(s => {
                const c = chgOf(s);
                return `<div class="sr-item" data-code="${s.code}">
                    <div><div class="sr-code">${s.code}</div><div class="sr-name">${s.name}</div></div>
                    <div style="text-align:right">
                        <div class="sr-code" style="font-size:13px">${fmtRp(s.price)}</div>
                        <div class="sr-chg ${c >= 0 ? "up" : "down"}">${fmtPct(c)}</div>
                    </div>
                </div>`;
            }).join("");
            sr.querySelectorAll(".sr-item[data-code]").forEach(el => {
                el.addEventListener("click", () => {
                    sr.classList.remove("show");
                    document.getElementById("searchInput").value = "";
                    this.showModal(el.dataset.code);
                });
            });
        }
        sr.classList.add("show");
    },

    /* ===== DASHBOARD ===== */
    renderDashboard() {
        const chg = ((IHSG_LAST - IHSG_PREV) / IHSG_PREV) * 100;
        document.getElementById("ihsgValue").textContent = fmtNum(IHSG_LAST, 0);
        const ic = document.getElementById("ihsgChange");
        ic.textContent = fmtNum(IHSG_LAST - IHSG_PREV, 0) + " (" + fmtPct(chg) + ")";
        ic.className = "ihsg-change " + (chg >= 0 ? "up" : "down");

        document.getElementById("statIhsg").textContent = fmtNum(IHSG_LAST, 0);
        const sic = document.getElementById("statIhsgChg");
        sic.textContent = fmtNum(IHSG_LAST - IHSG_PREV, 0) + "  " + fmtPct(chg);
        sic.className = "stat-change " + (chg >= 0 ? "up" : "down");

        document.getElementById("statValue").textContent = "8,7";
        document.getElementById("statVolume").textContent = "16,4";

        const adv = STOCKS.filter(s => chgOf(s) > 0.05).length;
        const dec = STOCKS.filter(s => chgOf(s) < -0.05).length;
        document.getElementById("statAdv").textContent = adv;
        document.getElementById("statDec").textContent = dec;

        CH.ihsgSpark();
        CH.ihsgLine();
        CH.sectorChart();

        const sorted = [...STOCKS].sort((a, b) => chgOf(b) - chgOf(a));
        this.miniList("topGainer", sorted.slice(0, 6));
        this.miniList("topLoser", sorted.slice(-6).reverse());

        this.renderReco();

        const lq = STOCKS.filter(s => s.lq45);
        const tb = document.querySelector("#dashboardTable tbody");
        tb.innerHTML = lq.map(s => this.rowHTML(s, true)).slice(0, 16).join("");
        this.bindRows(tb);
    },

    /* rekomendasi hari ini di dashboard */
    renderReco() {
        const grid = document.getElementById("recoGrid");
        if (!grid) return;
        const mode = this.sgMode === "general" ? "pagi" : this.sgMode;
        const end = this.sgWin[mode];
        document.getElementById("recoMode").textContent = Trade.MODE_LABEL[mode];

        const plans = STOCKS.map(s => Trade.plan(s, mode, end)).filter(Boolean);
        const buys = plans.filter(p => p.signal === "BELI").sort((a, b) => b.score - a.score).slice(0, 4);
        const sells = plans.filter(p => p.signal === "JUAL").sort((a, b) => a.score - b.score).slice(0, 4);

        const card = (p, kind) => {
            const c = chgOf(STOCK_MAP[p.code]);
            return `<div class="reco-card ${kind}" data-plan="${p.code}">
                <div class="reco-top">
                    <div>
                        <div class="reco-code">${p.code}</div>
                        <div class="reco-name">${p.name}</div>
                    </div>
                    <div class="reco-chg ${c >= 0 ? "up" : "down"}">${fmtPct(c)}</div>
                </div>
                <div class="reco-mid">
                    <span class="reco-price">${fmtRp(p.price)}</span>
                    <span class="reco-score">skor ${p.score}</span>
                </div>
                <div class="reco-levels">
                    <span><i class="dot target"></i>Target ${fmtNum(p.tp1)}</span>
                    <span><i class="dot stop"></i>Stop ${fmtNum(p.stop)}</span>
                    <span><i class="dot rr"></i>RR 1:${p.rr.toFixed(1).replace(".", ",")}</span>
                </div>
            </div>`;
        };

        const col = (title, arr, kind, empty) => `
            <div class="reco-col">
                <div class="reco-col-head ${kind}">${title}</div>
                ${arr.length ? arr.map(p => card(p, kind)).join("") : `<div class="reco-empty">${empty}</div>`}
            </div>`;

        grid.innerHTML =
            col("▲ Peluang Beli", buys, "buy", "Tidak ada sinyal beli kuat saat ini") +
            col("▼ Sinyal Jual / Hindari", sells, "sell", "Tidak ada sinyal jual kuat saat ini");

        grid.querySelectorAll("[data-plan]").forEach(el => {
            el.addEventListener("click", () => this.openPlan(el.dataset.plan));
        });
    },

    miniList(id, arr) {
        const el = document.getElementById(id);
        el.innerHTML = arr.map(s => {
            const c = chgOf(s);
            return `<div class="mini-row" data-code="${s.code}">
                <div class="mini-code">${s.code}</div>
                <div class="mini-name">${s.name}</div>
                <div class="mini-price">${fmtRp(s.price)}</div>
                <div class="mini-chg ${c >= 0 ? "up" : "down"}">${fmtPct(c)}</div>
            </div>`;
        }).join("");
        this.bindRows(el);
    },

    rowHTML(s, withSector = false) {
        const c = chgOf(s);
        const ev = TInd.evaluate(s);
        const pil = ev.signal === "Bullish" ? "bull" : ev.signal === "Bearish" ? "bear" : "neutral";
        const series = getSeries(s.code);
        const volLn = (series[series.length - 1].volume / 1e6);
        const valM = Math.round(s.price * series[series.length - 1].volume / 1e9);
        return `<tr data-code="${s.code}">
            <td class="td-code">${s.code}</td>
            <td class="td-name">${s.name}</td>
            ${withSector ? "" : `<td><span class="pill sector">${s.sector}</span></td>`}
            <td class="num">${fmtNum(s.price)}</td>
            <td class="num ${c >= 0 ? "up" : "down"}" style="font-weight:700">${fmtPct(c)}</td>
            ${withSector ? `<td class="num">${volLn.toFixed(1)}</td><td class="num">${valM}</td>` : ""}
            <td class="num">${s.pbv.toFixed(1)}</td>
            <td class="num">${s.per.toFixed(1)}</td>
            ${withSector ? `<td class="num">${ev.rsi.toFixed(0)}</td>` : `<td class="num">${ev.rsi.toFixed(0)}</td><td class="num ${s.price > ev.ma20 ? "up" : "down"}">${s.price > ev.ma20 ? "atas" : "bawah"}</td>`}
            <td><span class="pill ${pil}">${ev.signal}</span></td>
        </tr>`;
    },

    bindRows(scope) {
        scope.querySelectorAll("[data-code]").forEach(el => {
            el.addEventListener("click", e => {
                if (e.detail === 2) { this.openChart(el.dataset.code); return; }
                this.showModal(el.dataset.code);
            });
        });
    },

    /* ===== SCREENER ===== */
    renderScreener() {
        const day = this.sgMode !== "general";
        document.getElementById("screenerTitle").textContent = day
            ? (this.sgMode === "pagi" ? "Screener Harian — Beli Pagi · Jual Sore" : "Screener Overnight — Beli Sore · Jual Pagi")
            : "Screener Saham IDX";
        document.getElementById("screenerTableWrap").classList.toggle("hide", day);
        document.getElementById("dayTableWrap").classList.toggle("hide", !day);
        document.getElementById("windowRow").classList.toggle("hide", !day);
        document.getElementById("signalSummary").classList.toggle("hide", !day);
        document.getElementById("dayLegend").classList.toggle("hide", !day);
        document.getElementById("fgScore").classList.toggle("hide", !day);
        document.getElementById("fgRr").classList.toggle("hide", !day);
        if (day) this.renderDay();
        else this.renderGeneral();
    },

    /* filter umum (dipakai kedua mode) */
    commonFilters(list, sigMap) {
        const sector = document.getElementById("fSector").value;
        const perMax = parseFloat(document.getElementById("fPerMax").value);
        const pbvMin = parseFloat(document.getElementById("fPbvMin").value);
        const pbvMax = parseFloat(document.getElementById("fPbvMax").value);
        const rsiMax = parseFloat(document.getElementById("fRsiMax").value);
        const chgMin = parseFloat(document.getElementById("fChgMin").value);
        let sig = document.getElementById("fSignal").value;
        if (sigMap) sig = sigMap[sig] || sig;
        let rows = list;
        if (sector) rows = rows.filter(r => r.s.sector === sector);
        if (!isNaN(perMax)) rows = rows.filter(r => r.s.per <= perMax);
        if (!isNaN(pbvMin)) rows = rows.filter(r => r.s.pbv >= pbvMin);
        if (!isNaN(pbvMax)) rows = rows.filter(r => r.s.pbv <= pbvMax);
        if (!isNaN(rsiMax)) rows = rows.filter(r => r.rsi <= rsiMax);
        if (!isNaN(chgMin)) rows = rows.filter(r => r.c >= chgMin);
        if (sig) rows = rows.filter(r => r.signal === sig);
        return rows;
    },

    renderGeneral() {
        let rows = STOCKS.map(s => {
            const ev = TInd.evaluate(s);
            return { s, ev, c: chgOf(s), rsi: ev.rsi, signal: ev.signal };
        });
        rows = this.commonFilters(rows);
        rows.sort((a, b) => b.c - a.c);
        document.getElementById("screenerCount").textContent = rows.length + " saham";

        const tb = document.querySelector("#screenerTable tbody");
        tb.innerHTML = rows.map(({ s, ev, c }) => {
            const pil = ev.signal === "Bullish" ? "bull" : ev.signal === "Bearish" ? "bear" : "neutral";
            const f = Trade.fair(s);
            const wajarCls = s.price <= f.buy ? "up" : s.price >= f.sell ? "down" : "";
            return `<tr data-code="${s.code}">
                <td class="td-code">${s.code}</td>
                <td class="td-name">${s.name}</td>
                <td><span class="pill sector">${s.sector}</span></td>
                <td class="num">${fmtNum(s.price)}</td>
                <td class="num ${c >= 0 ? "up" : "down"}" style="font-weight:700">${fmtPct(c)}</td>
                <td class="num">${s.per.toFixed(1)}</td>
                <td class="num">${s.pbv.toFixed(1)}</td>
                <td class="num">${fmtNum(s.eps)}</td>
                <td class="num ${wajarCls}" title="Beli wajar ≤ ${fmtNum(f.buy)} · Jual wajar ≥ ${fmtNum(f.sell)}">${fmtNum(f.value)}</td>
                <td class="num">${ev.rsi.toFixed(0)}</td>
                <td class="num ${s.price > ev.ma20 ? "up" : "down"}">${fmtNum(round1(ev.ma20))}</td>
                <td><span class="pill ${pil}">${ev.signal}</span></td>
            </tr>`;
        }).join("") || `<tr><td colspan="12" style="text-align:center;padding:30px;color:var(--text-3)">Tidak ada saham yang cocok</td></tr>`;
        this.bindRows(tb);
    },

    renderDay() {
        const mode = this.sgMode;
        const end = this.sgWin[mode];

        // window chips
        document.getElementById("winChips").innerHTML = Trade.WINDOWS[mode]
            .map(h => `<button class="win-chip ${h === end ? "active" : ""}" data-win="${h}">s/d ${h} WIB</button>`).join("");
        document.getElementById("windowNote").textContent = mode === "pagi"
            ? "Masuk pagi (09:00–12:00) · jual sore 15:15–15:45 WIB"
            : "Masuk sore (14:30–15:30) · jual besok pagi 09:00–10:00 WIB";

        let plans = STOCKS.map(s => Trade.plan(s, mode, end)).filter(Boolean);

        // filter umum + spesifik
        plans = this.commonFilters(plans.map(p => ({
            s: { sector: p.sector, per: STOCK_MAP[p.code].per, pbv: STOCK_MAP[p.code].pbv },
            p, c: chgOf(STOCK_MAP[p.code]), rsi: p.tech.rsi, signal: p.signal
        })), { Bullish: "BELI", Bearish: "JUAL", Netral: "TAUNGGU" }).map(o => o.p);

        const scoreMin = parseFloat(document.getElementById("fScoreMin").value);
        const rrMin = parseFloat(document.getElementById("fRrMin").value);
        if (!isNaN(scoreMin)) plans = plans.filter(p => p.score >= scoreMin);
        if (!isNaN(rrMin)) plans = plans.filter(p => p.rr >= rrMin);

        plans.sort((a, b) => b.score - a.score);
        document.getElementById("screenerCount").textContent = plans.length + " saham";

        // ringkasan
        const nB = plans.filter(p => p.signal === "BELI").length;
        const nS = plans.filter(p => p.signal === "JUAL").length;
        const nT = plans.filter(p => p.signal === "TAUNGGU").length;
        const best = plans.find(p => p.signal === "BELI") || plans[0];
        document.getElementById("signalSummary").innerHTML =
            `<span class="sig-chip bull">BELI ${nB}</span>
             <span class="sig-chip neutral">TAUNGGU ${nT}</span>
             <span class="sig-chip bear">JUAL ${nS}</span>
             ${best ? `<span class="sig-best">Setup terkuat: <b>${best.code}</b> (skor ${best.score}) — ${best.signal} · ${best.modeLabel}</span>` : ""}`;

        const tb = document.querySelector("#dayTable tbody");
        tb.innerHTML = plans.map(p => {
            const pil = p.signal === "BELI" ? "bull" : p.signal === "JUAL" ? "bear" : "neutral";
            const rrTxt = "1:" + p.rr.toFixed(1).replace(".", ",");
            return `<tr data-plan="${p.code}">
                <td class="td-code">${p.code}</td>
                <td class="td-name">${p.name}</td>
                <td><span class="pill ${pil}">${p.signal}</span></td>
                <td class="num"><div class="score-cell"><span>${p.score}</span><div class="score-bar"><i class="${pil}" style="width:${p.score}%"></i></div></div></td>
                <td class="num">${fmtNum(p.price)}</td>
                <td class="num zone">${fmtNum(p.entry.lo)}–${fmtNum(p.entry.hi)}</td>
                <td class="num up" style="font-weight:700">${fmtNum(p.tp1)}</td>
                <td class="num down" style="font-weight:700">${fmtNum(p.stop)}</td>
                <td class="num">${rrTxt}</td>
                <td class="exit-time">${p.exitTime}</td>
                <td class="exit-cond">${p.exitCond}</td>
            </tr>`;
        }).join("") || `<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text-3)">Tidak ada saham yang cocok</td></tr>`;

        tb.querySelectorAll("[data-plan]").forEach(el => {
            el.addEventListener("click", () => this.openPlan(el.dataset.plan));
        });
    },

    /* ===== CHART VIEW ===== */
    openChart(code, navigate = true) {
        if (!STOCK_MAP[code]) return;
        this.current = code;
        const s = STOCK_MAP[code];
        document.getElementById("chartTicker").textContent = s.code;
        document.getElementById("chartName").textContent = s.name + " · " + s.sector;
        document.getElementById("chartPrice").textContent = fmtRp(s.price);
        const c = chgOf(s);
        const chgEl = document.getElementById("chartChg");
        chgEl.textContent = fmtNum(s.price - s.prev, 0) + " (" + fmtPct(c) + ")";
        chgEl.className = c >= 0 ? "up" : "down";
        if (navigate) this.go("chart");
        setTimeout(() => this.drawChart(true), navigate ? 80 : 0);
    },

    tfDays() {
        return { "1D": 20, "1W": 35, "1M": 65, "3M": 130, "1Y": 260 }[this.tf] || 65;
    },

    drawChart(fit = false) {
        if (this.view !== "chart" && !fit) return;
        const code = this.current;
        if (!STOCK_MAP[code]) return;
        const full = getSeries(code);
        const days = this.tfDays();
        const series = full.slice(-Math.min(days, full.length));

        const type = document.getElementById("chartType").value;
        const ma = parseInt(document.getElementById("maPeriod").value) || 0;
        const chart = CH.priceChart(series, { type, ma });
        CH.volumeChart(series);
        const rsi = CH.rsiChart(series);
        CH.macdChart(series);
        const bbPos = CH.bbChart(series);

        if (fit) chart.timeScale().fitContent();

        this.renderTechSummary(code, rsi, bbPos);
        this.renderPriceStats(code);
    },

    renderTechSummary(code, rsi, bbPos) {
        const s = STOCK_MAP[code];
        const ev = TInd.evaluate(s);
        const pil = ev.signal === "Bullish" ? "bull" : ev.signal === "Bearish" ? "bear" : "neutral";
        const rows = [
            ["Sinyal Komposit", `<span class="pill ${pil}">${ev.signal}</span> · ${(ev.score * 100).toFixed(0)}% bullish`],
            ["RSI (14)", `<span class="${rsi > 70 ? "down" : rsi < 30 ? "up" : ""}">${rsi.toFixed(1)}${rsi > 70 ? " · overbought" : rsi < 30 ? " · oversold" : ""}</span>`],
            ["Tren MA", `<span class="${s.price > ev.ma20 ? "up" : "down"}">${s.price > ev.ma20 ? "Harga di atas MA20" : "Harga di bawah MA20"}</span> (${fmtPct(ev.priceVsMa20)})`],
            ["MA Cross", `<span class="${ev.ma20 > ev.ma50 ? "up" : "down"}">${ev.ma20 > ev.ma50 ? "Golden · MA20 > MA50" : "Death · MA20 < MA50"}</span>`],
            ["MACD", `<span class="${ev.macdHist >= 0 ? "up" : "down"}">${ev.macdHist >= 0 ? "Bullish momentum" : "Bearish momentum"}</span>`],
            ["Stochastic", `${ev.stK.toFixed(0)} / ${ev.stD.toFixed(0)}${ev.stK > 80 ? " · overbought" : ev.stK < 20 ? " · oversold" : ""}`],
            ["ADX (Tren)", `${ev.adx.toFixed(0)} · ${ev.adx > 25 ? "tren kuat" : ev.adx > 20 ? "tren moderat" : "sideways"}`],
            ["Bollinger", `${bbPos.toFixed(0)}% dari band · ${ev.bbPos > 85 ? "dekat atas" : ev.bbPos < 15 ? "dekat bawah" : "di tengah"}`]
        ];
        document.getElementById("techSummary").innerHTML = rows.map(r =>
            `<div class="tech-line"><span class="label">${r[0]}</span><span class="value">${r[1]}</span></div>`
        ).join("");
    },

    renderPriceStats(code) {
        const st = TInd.stats(getSeries(code));
        const items = [
            ["Tertinggi 52M", fmtRp(st.high52)],
            ["Terendah 52M", fmtRp(st.low52)],
            ["Rentang 52M", st.range52.toFixed(1) + "%"],
            ["Return 5 hari", fmtPct(st.ret5d)],
            ["Return 1 bulan", fmtPct(st.ret20d)],
            ["Return 3 bulan", fmtPct(st.ret60d)],
            ["Return 1 tahun", fmtPct(st.ret1y)],
            ["Volatilitas (ann.)", st.volatility.toFixed(1) + "%"],
            ["Maks. Drawdown", "-" + st.mdd.toFixed(1) + "%"],
            ["Rata-rata MA20", fmtRp(st.avg20)],
            ["Avg. Volume 20H", (st.avgVol / 1e6).toFixed(1) + " ln"],
            ["Std. Deviasi", fmtRp(st.stdDev)]
        ];
        document.getElementById("priceStats").innerHTML = items.map(i =>
            `<div class="stat-item"><div class="k">${i[0]}</div><div class="v">${i[1]}</div></div>`
        ).join("");
    },

    /* ===== FUNDAMENTAL ===== */
    renderFundamental(code) {
        if (!STOCK_MAP[code]) code = this.current;
        const s = STOCK_MAP[code];
        document.getElementById("fundTicker").value = code;

        document.getElementById("fPrice").textContent = fmtRp(s.price);
        const c = chgOf(s);
        document.getElementById("fPriceSub").innerHTML = `<span class="${c >= 0 ? "up" : "down"}" style="font-weight:700">${fmtPct(c)}</span> hari ini`;
        document.getElementById("fMcap").textContent = s.mcap.toFixed(1);
        document.getElementById("fPer").textContent = s.per.toFixed(1);
        document.getElementById("fPbv").textContent = s.pbv.toFixed(1);

        const ratios = [
            ["ROE", s.roe.toFixed(1) + "%", "Return on Equity"],
            ["DER", s.der.toFixed(1), "Debt to Equity"],
            ["EPS", "Rp " + fmtNum(s.eps), "Earning per Share"],
            ["Div. Yield", s.divY.toFixed(1) + "%", "Imbal hasil dividen"],
            ["PER Sehat", (s.per < 15 ? "Ya" : "Tidak"), s.per < 15 ? "PER < 15" : "PER ≥ 15"],
            ["PBV Murah", (s.pbv < 1.5 ? "Ya" : "Tidak"), s.pbv < 1.5 ? "PBV < 1.5" : "PBV ≥ 1.5"],
            ["NPM (est.)", round1(8 + (s.roe / 4)).toFixed(1) + "%", "Margin profit"],
            ["Current Ratio", (1.1 + (2.2 / (s.der + 0.6))).toFixed(2), "Likuiditas jangka pendek"],
            ["Asset Turnover", (0.35 + s.roe / 60).toFixed(2), "Efisiensi aset"]
        ];
        document.getElementById("ratioGrid").innerHTML = ratios.map(r =>
            `<div class="ratio-cell"><div class="k">${r[0]}</div><div class="v">${r[1]}</div><div class="d">${r[2]}</div></div>`
        ).join("");

        CH.valuationChart(s);
        CH.earningsChart(s);
        this.renderScore(s);
    },

    renderScore(s) {
        const ev = TInd.evaluate(s);
        const valScore = Math.max(0, Math.min(1,
            (s.per <= 25 ? 1 - s.per / 50 : 0.3) * 0.5 + (s.pbv <= 4 ? 1 - s.pbv / 8 : 0.3) * 0.5
        ));
        const growth = Math.max(0, Math.min(1, s.roe / 30));
        const health = Math.max(0, Math.min(1, 1 - (s.der - 0.3) / 4));
        const tech = ev.score;

        const total = Math.round((valScore * 0.3 + growth * 0.25 + health * 0.2 + tech * 0.25) * 100);
        const arc = document.getElementById("scoreArc");
        const circ = 2 * Math.PI * 52;
        arc.style.strokeDasharray = circ;
        arc.style.strokeDashoffset = circ * (1 - total / 100);
        arc.style.stroke = total >= 70 ? "#22c55e" : total >= 45 ? "#f59e0b" : "#ef4444";
        document.getElementById("scoreNum").textContent = total;

        const rows = [
            ["Valuasi", valScore],
            ["Pertumbuhan (ROE)", growth],
            ["Kesehatan Keuangan", health],
            ["Teknikal", tech]
        ];
        document.getElementById("scoreBreakdown").innerHTML = rows.map(r => `
            <div>
                <div class="sb-row"><span class="k">${r[0]}</span><span class="v">${Math.round(r[1] * 100)}</span></div>
                <div class="sb-bar"><div class="sb-fill" style="width:${r[1] * 100}%;background:${r[1] > .65 ? "#22c55e" : r[1] > .4 ? "#f59e0b" : "#ef4444"}"></div></div>
            </div>`).join("");
    },

    /* ===== WATCHLIST ===== */
    loadWatch() {
        try { this.watch = JSON.parse(localStorage.getItem("idx_watch")) || []; } catch (e) { this.watch = []; }
        if (!this.watch.length) this.watch = ["BBCA", "TLKM", "ASII", "BMRI", "ADRO"];
    },
    saveWatch() {
        try { localStorage.setItem("idx_watch", JSON.stringify(this.watch)); } catch (e) {}
    },
    addWatch() {
        const inp = document.getElementById("watchInput");
        const code = inp.value.trim().toUpperCase();
        if (!STOCK_MAP[code]) { this.toast("Kode saham tidak ditemukan: " + code); return; }
        if (this.watch.includes(code)) { this.toast(code + " sudah ada di watchlist"); inp.value = ""; return; }
        this.watch.push(code);
        this.saveWatch();
        inp.value = "";
        this.renderWatchlist();
        this.toast(code + " ditambahkan ke watchlist");
    },
    toggleWatch(code) {
        if (this.watch.includes(code)) {
            this.watch = this.watch.filter(c => c !== code);
            this.toast(code + " dihapus dari watchlist");
        } else {
            this.watch.push(code);
            this.toast(code + " ditambahkan ke watchlist");
        }
        this.saveWatch();
        this.renderWatchlist();
        this.syncModalWatchBtn(code);
    },
    renderWatchlist() {
        const tb = document.querySelector("#watchTable tbody");
        const empty = document.getElementById("watchEmpty");
        document.getElementById("watchCount").textContent = this.watch.length + " saham";
        if (!this.watch.length) {
            tb.innerHTML = "";
            empty.classList.remove("hide");
            return;
        }
        empty.classList.add("hide");
        tb.innerHTML = this.watch.map(code => {
            const s = STOCK_MAP[code];
            if (!s) return "";
            const c = chgOf(s);
            const ev = TInd.evaluate(s);
            const pil = ev.signal === "Bullish" ? "bull" : ev.signal === "Bearish" ? "bear" : "neutral";
            return `<tr data-code="${s.code}">
                <td class="td-code">${s.code}</td>
                <td class="td-name">${s.name}</td>
                <td class="num">${fmtNum(s.price)}</td>
                <td class="num ${c >= 0 ? "up" : "down"}" style="font-weight:700">${fmtPct(c)}</td>
                <td class="num">${ev.rsi.toFixed(0)}</td>
                <td><span class="pill ${pil}">${ev.signal}</span></td>
                <td class="num"><button class="link-btn" data-alert="${s.code}" title="Set alert" style="color:var(--amber)">🔔</button> <button class="link-btn" data-del="${s.code}" style="color:var(--red)">Hapus</button></td>
            </tr>`;
        }).join("");
        this.bindRows(tb);
        tb.querySelectorAll("[data-alert]").forEach(b => {
            b.addEventListener("click", e => {
                e.stopPropagation();
                this.go("alert");
                document.getElementById("alertCode").value = b.dataset.alert;
                const s = STOCK_MAP[b.dataset.alert];
                const at = document.getElementById("alertTarget");
                at.value = s ? s.price : "";
                document.getElementById("alertTarget").focus();
            });
        });
        tb.querySelectorAll("[data-del]").forEach(b => {
            b.addEventListener("click", e => {
                e.stopPropagation();
                this.watch = this.watch.filter(c => c !== b.dataset.del);
                this.saveWatch();
                this.renderWatchlist();
            });
        });
    },

    /* ===== ALERT HARGA ===== */
    loadAlerts() {
        try { this.alerts = JSON.parse(localStorage.getItem("idx_alerts")) || []; } catch (e) { this.alerts = []; }
        if (!Array.isArray(this.alerts)) this.alerts = [];
    },
    saveAlerts() {
        try { localStorage.setItem("idx_alerts", JSON.stringify(this.alerts)); } catch (e) {}
    },
    addAlert(code, dir, target, note) {
        const cinp = document.getElementById("alertCode");
        code = (code || (cinp ? cinp.value : "")).trim().toUpperCase();
        dir = dir || document.getElementById("alertDir").value;
        const tinp = document.getElementById("alertTarget");
        target = target != null ? target : parseFloat(document.getElementById("alertTarget").value);
        const ninp = document.getElementById("alertNote");
        note = note != null ? note : (ninputValue(ninp));

        function alertClean() {}

        if (!STOCK_MAP[code]) { this.toast("Kode saham tidak ditemukan: " + (code || "—")); return null; }
        if (!target || isNaN(target) || target <= 0) { this.toast("Masukkan harga target yang valid"); return null; }

        const a = {
            id: "a" + Date.now() + Math.floor(Math.random() * 1000),
            code, dir, target: Number(target),
            note: note || "",
            createdAt: Date.now(), triggered: false, triggeredAt: null
        };
        this.alerts.unshift(a);
        this.saveAlerts();
        if (cinp) cinp.value = "";
        if (document.getElementById("alertTarget")) document.getElementById("alertTarget").value = "";
        if (document.getElementById("alertNote")) document.getElementById("alertNote").value = "";
        this.renderAlerts();
        this.toast("Alert " + code + (dir === "above" ? " ≥ " : " ≤ ") + fmtNum(target) + " dibuat");
    },
    removeAlert(id) {
        this.alerts = this.alerts.filter(a => a.id !== id);
        this.saveAlerts();
        this.renderAlerts();
        this.checkAlerts();
    },
    resetAlert(id) {
        const a = this.alerts.find(x => x.id === id);
        if (!a) return;
        a.triggered = false;
        a.triggeredAt = null;
        this.saveAlerts();
        this.renderAlerts();
        this.updateAlertBadge();
        this.toast("Alert " + a.code + " diaktifkan kembali");
    },
    alertDist(a, price) {
        if (!price) return null;
        if (a.dir === "above") return ((a.target - price) / price) * 100;
        return ((a.target - price) / price) * 100;
    },
    renderAlerts() {
        const tb = document.querySelector("#alertTable tbody");
        if (!tb) return;
        const empty = document.getElementById("alertEmpty");
        document.getElementById("alertCount").textContent = this.alerts.length + " alert";
        if (!this.alerts.length) {
            tb.innerHTML = "";
            empty.classList.remove("hide");
            this.updateAlertBadge();
            return;
        }
        empty.classList.add("hide");
        const sorted = [...this.alerts].sort((a, b) => (b.triggered ? 1 : 0) - (a.triggered ? 1 : 0));
        tb.innerHTML = sorted.map(a => {
            const s = STOCK_MAP[a.code];
            const price = s ? s.price : null;
            const dist = this.alertDist(a, price);
            const distTxt = dist == null ? "—" : (dist >= 0 ? "+" : "") + dist.toFixed(2) + "%";
            const near = dist != null && Math.abs(dist) <= 3;
            const dirTxt = a.dir === "above" ? "Naik ≥" : "Turun ≤";
            const st = a.triggered
                ? `<span class="pill bull">Tersentuh</span>`
                : `<span class="pill neutral">Menunggu</span>`;
            const act = a.triggered
                ? `<button class="link-btn" data-reset="${a.id}" style="color:var(--blue)">Aktifkan</button>
                   <button class="link-btn" data-del-alert="${a.id}" style="color:var(--red);margin-left:10px">Hapus</button>`
                : `<button class="link-btn" data-del-alert="${a.id}" style="color:var(--red)">Hapus</button>`;
            return `<tr data-code="${a.code}" class="${a.triggered ? "alert-row-fired" : ""}">
                <td class="td-code">${a.code}</td>
                <td class="td-name">${s ? s.name : "—"}${a.note ? `<div class="alert-note">${a.note}</div>` : ""}</td>
                <td><span class="pill ${a.dir === "above" ? "bull" : "bear"}">${dirTxt}</span></td>
                <td class="num" style="font-weight:700">${fmtNum(a.target)}</td>
                <td class="num">${price == null ? "—" : fmtNum(price)}</td>
                <td class="num ${near ? "up" : ""}" style="${near ? "font-weight:700" : ""}">${distTxt}</td>
                <td>${st}</td>
                <td>${act}</td>
            </tr>`;
        }).join("");
        this.bindRows(tb);
        tb.querySelectorAll("[data-del-alert]").forEach(b => {
            b.addEventListener("click", e => { e.stopPropagation(); this.removeAlert(b.dataset.delAlert); });
        });
        tb.querySelectorAll("[data-reset]").forEach(b => {
            b.addEventListener("click", e => { e.stopPropagation(); this.resetAlert(b.dataset.reset); });
        });
        this.updateAlertBadge();
    },
    updateAlertBadge() {
        const b = document.getElementById("alertBadge");
        if (!b) return;
        const n = this.alerts.filter(a => a.triggered).length;
        b.textContent = n;
        b.classList.toggle("hide", n === 0);
    },
    checkAlerts() {
        let fired = 0;
        this.alerts.forEach(a => {
            if (a.triggered) return;
            const s = STOCK_MAP[a.code];
            if (!s || s.price == null) return;
            const hit = a.dir === "above" ? s.price >= a.target : s.price <= a.target;
            if (hit) { a.triggered = true; a.triggeredAt = Date.now(); fired++; this.fireAlert(a, s.price); }
        });
        if (fired) { this.saveAlerts(); if (this.view === "alert") this.renderAlerts(); this.updateAlertBadge(); }
    },
    fireAlert(a, price) {
        const msg = `🔔 ${a.code} @ ${fmtNum(price)} — target ${a.dir === "above" ? "≥" : "≤"} ${fmtNum(a.target)}`;
        this.toast(msg);
        try {
            if (window.Notification && Notification.permission === "granted") {
                new Notification("Alert Harga — " + a.code, {
                    body: `${STOCK_MAP[a.code] ? STOCK_MAP[a.code].name : ""}\nHarga ${fmtNum(price)} menyentuh target ${fmtNum(a.target)}`,
                    tag: a.id
                });
            }
        } catch (e) {}
    },
    async requestNotifPermission() {
        if (!window.Notification) { this.toast("Browser tidak mendukung notifikasi"); return; }
        if (Notification.permission === "granted") { this.toast("Notifikasi browser sudah aktif"); return; }
        try {
            const p = await Notification.requestPermission();
            this.toast(p === "granted" ? "Notifikasi browser aktif" : "Notifikasi tidak diizinkan");
        } catch (e) { this.toast("Gagal meminta izin notifikasi"); }
    },

    /* ===== MODAL ===== */
    showModal(code) {
        const s = STOCK_MAP[code];
        if (!s) return;
        const c = chgOf(s);
        const ev = TInd.evaluate(s);
        const st = TInd.stats(getSeries(code));
        const fv = Trade.fair(s);
        document.getElementById("mCode").textContent = s.code;
        document.getElementById("mName").textContent = s.name + " · " + s.sector;
        const pil = ev.signal === "Bullish" ? "bull" : ev.signal === "Bearish" ? "bear" : "neutral";

        const bars = [
            ["PER vs sektor", Math.min(100, s.per / 30 * 100), s.per.toFixed(1) + "x", s.per < 15 ? "#22c55e" : "#f59e0b"],
            ["PBV vs sektor", Math.min(100, s.pbv / 6 * 100), s.pbv.toFixed(1) + "x", s.pbv < 1.5 ? "#22c55e" : "#f59e0b"],
            ["ROE", Math.min(100, s.roe / 35 * 100), s.roe.toFixed(1) + "%", s.roe > 15 ? "#22c55e" : "#3b82f6"],
            ["Skor teknikal", ev.score * 100, (ev.score * 100).toFixed(0) + "%", ev.signal === "Bullish" ? "#22c55e" : ev.signal === "Bearish" ? "#ef4444" : "#f59e0b"]
        ];

        document.getElementById("mBody").innerHTML = `
            <div class="m-price-row">
                <span class="m-price">${fmtRp(s.price)}</span>
                <span class="m-chg ${c >= 0 ? "up" : "down"}">${fmtNum(s.price - s.prev, 0)} · ${fmtPct(c)}</span>
                <span class="pill ${pil}" style="margin-left:auto">${ev.signal}</span>
            </div>
            <div class="m-grid">
                <div class="m-cell"><div class="k">PER</div><div class="v">${s.per.toFixed(1)}</div></div>
                <div class="m-cell"><div class="k">PBV</div><div class="v">${s.pbv.toFixed(1)}</div></div>
                <div class="m-cell"><div class="k">ROE</div><div class="v">${s.roe.toFixed(1)}%</div></div>
                <div class="m-cell"><div class="k">RSI</div><div class="v" style="color:${ev.rsi > 70 ? "#ef4444" : ev.rsi < 30 ? "#22c55e" : "#e8ecf5"}">${ev.rsi.toFixed(0)}</div></div>
                <div class="m-cell"><div class="k">DER</div><div class="v">${s.der.toFixed(1)}</div></div>
                <div class="m-cell"><div class="k">Div. Yield</div><div class="v">${s.divY.toFixed(1)}%</div></div>
                <div class="m-cell"><div class="k">Harga Wajar</div><div class="v">${fmtNum(fv.value)}</div></div>
                <div class="m-cell"><div class="k">Beli Wajar ≤</div><div class="v ${s.price <= fv.buy ? "up" : ""}">${fmtNum(fv.buy)}</div></div>
            </div>
            <div class="m-section-title">Posisi Harga (52 Minggu)</div>
            <div class="m-bars">
                <div class="m-bar-row">
                    <span class="m-bar-label">52M High</span>
                    <div class="m-bar-track"><div class="m-bar-fill" style="width:${Math.min(100, (s.price / st.high52) * 100)}%;background:#3b82f6"></div></div>
                    <span class="m-bar-val">${fmtRp(st.high52)}</span>
                </div>
                <div class="m-bar-row">
                    <span class="m-bar-label">vs MA20</span>
                    <div class="m-bar-track"><div class="m-bar-fill" style="width:${Math.min(100, Math.abs(ev.priceVsMa20) * 6 + 15)}%;background:${ev.priceVsMa20 >= 0 ? "#22c55e" : "#ef4444"}"></div></div>
                    <span class="m-bar-val ${ev.priceVsMa20 >= 0 ? "up" : "down"}">${fmtPct(ev.priceVsMa20)}</span>
                </div>
            </div>
            <div class="m-section-title">Metrik Kunci</div>
            <div class="m-bars">
                ${bars.map(b => `
                <div class="m-bar-row">
                    <span class="m-bar-label">${b[0]}</span>
                    <div class="m-bar-track"><div class="m-bar-fill" style="width:${b[1]}%;background:${b[3]}"></div></div>
                    <span class="m-bar-val">${b[2]}</span>
                </div>`).join("")}
            </div>
        `;
        this.syncModalWatchBtn(code);
        document.getElementById("modal").classList.add("show");
    },
    syncModalWatchBtn(code) {
        const b = document.getElementById("mWatchBtn");
        const inW = this.watch.includes(code);
        b.textContent = inW ? "★ Ada di Watchlist" : "☆ Watchlist";
        b.onclick = () => { this.toggleWatch(code); };
    },
    closeModal() { document.getElementById("modal").classList.remove("show"); },

    /* ===== RENCANA TRADING ===== */
    openPlan(code) {
        const s = STOCK_MAP[code];
        if (!s) return;
        const mode = this.sgMode === "general" ? "pagi" : this.sgMode;
        const end = this.sgWin[mode];
        const p = Trade.plan(s, mode, end);
        if (!p) return;

        const pil = p.signal === "BELI" ? "bull" : p.signal === "JUAL" ? "bear" : "neutral";
        document.getElementById("pCode").textContent = p.code;
        document.getElementById("pName").textContent = p.name + " · " + p.sector;
        const sigEl = document.getElementById("pSignal");
        sigEl.textContent = p.signal;
        sigEl.className = "pill " + pil;
        document.getElementById("pModeChip").textContent = p.modeLabel;
        document.getElementById("pPrice").textContent = fmtRp(p.price);
        document.getElementById("pScore").textContent = p.score;
        const bar = document.getElementById("pScoreBar");
        bar.style.width = p.score + "%";
        bar.className = pil;
        const est = mode === "pagi" ? "09:00–12:00 WIB" : "14:30–15:30 WIB";
        document.getElementById("pAsof").innerHTML =
            `Analisis intraday s/d <b>${p.end} WIB</b><br>Window masuk ${est}`;

        // level harga
        const side = p.side === "short";
        const lv = [
            { k: side ? "Zona Jual" : "Zona Beli Wajar", cls: "buy", v: fmtNum(p.entry.lo) + "–" + fmtNum(p.entry.hi), d: p.entry.basis },
            { k: "Target Jual 1", cls: "tp", v: fmtRp(p.tp1), d: "Take profit pertama (jual 50–70% posisi)" },
            { k: "Target Jual 2", cls: "tp2", v: fmtRp(p.tp2), d: "Target lanjutan / sisa posisi" },
            { k: side ? "Invalidasi" : "Stop Loss", cls: "sl", v: fmtRp(p.stop), d: side ? "Setup JUAL batal bila tembus" : `Maks. rugi ${p.riskPct.toFixed(2)}%` },
            { k: "Risk : Reward", cls: "rr", v: "1 : " + p.rr.toFixed(1).replace(".", ","), d: "Perbandingan potensi untung vs risiko" },
            { k: "Batas Waktu Keluar", cls: "exit", v: p.exitTime, d: mode === "pagi" ? "Jual di sesi sore, jangan diinap" : "Jual pagi berikutnya" }
        ];
        if (p.inval && !side) lv.push({ k: "Invalidasi Naik", cls: "exit", v: fmtRp(p.inval), d: "Sinyal beli batal bila tembus" });
        if (p.trig) lv.push({ k: "Pemicu Masuk", cls: "buy", v: fmtRp(p.trig), d: "Break + tahan dengan volume" });
        document.getElementById("pLevels").innerHTML = lv.map(l => `
            <div class="plan-cell ${l.cls}">
                <div class="k">${l.k}</div>
                <div class="v ${l.cls === "tp2" ? "tp" : l.cls}">${l.v}</div>
                <div class="d">${l.d}</div>
            </div>`).join("");

        document.getElementById("pCut").textContent = "s/d " + p.end + " WIB";

        // daftar kapan masuk
        const enterOk = p.signal !== "JUAL";
        document.getElementById("pEnterTitle").textContent =
            p.signal === "BELI" ? "✔ Kapan Masuk (faktor terpenuhi)" :
            p.signal === "JUAL" ? "✖ Faktor Bearish (hindari / keluar)" : "• Faktor Penilaian (belum konfirmasi)";
        document.getElementById("pEnter").innerHTML = p.enter.map(f => `
            <li class="${f.ok ? "ok" : "no"}">
                <span class="rc-ico">${f.ok ? "✓" : "✕"}</span><span>${f.t}</span>
            </li>`).join("");

        document.getElementById("pExitTitle").textContent = "⏱ Kapan Keluar";
        document.getElementById("pExit").innerHTML = p.exits.map(e => `
            <li class="tip"><span class="rc-ico">${e.ico}</span><span>${e.t}</span></li>`).join("");

        // harga wajar
        const f = p.fair;
        const verdict = s.price <= f.buy
            ? { cls: "discount", t: "✅ Harga saat ini di bawah harga beli wajar — margin of safety" }
            : s.price >= f.sell
                ? { cls: "premium", t: "⚠ Harga sudah di atas target jual wajar — pertimbangkan ambil profit" }
                : { cls: "fair", t: "◐ Harga bergerak di antara beli wajar dan jual wajar" };
        document.getElementById("pFair").innerHTML = `
            <h4>Harga Wajar (Fundamental)</h4>
            <div class="fair-row">
                <div class="fair-item"><div class="k">Beli Wajar (≤)</div><div class="v good">${fmtRp(f.buy)}</div></div>
                <div class="fair-item"><div class="k">Nilai Wajar 12 Bln</div><div class="v">${fmtRp(f.value)}</div></div>
                <div class="fair-item"><div class="k">Jual Wajar (≥)</div><div class="v warn">${fmtRp(f.sell)}</div></div>
                <div class="fair-item"><div class="k">Harga Kini</div><div class="v">${fmtRp(s.price)}</div></div>
            </div>
            <div class="fair-basis">Dasar: ${f.basis} × margin of safety 10%.</div>
            <span class="fair-verdict ${verdict.cls}">${verdict.t}</span>`;

        // level kunci (pivot klasik + ATR)
        const L = p.levels;
        if (L) {
            document.getElementById("pPivots").innerHTML = `
                <h4>Level Kunci — Pivot &amp; Volatilitas (dari hari terakhir)</h4>
                <div class="pivot-row">
                    <div class="pivot-item res"><span class="pk">R2</span><span class="pv">${fmtNum(L.r2)}</span></div>
                    <div class="pivot-item res"><span class="pk">R1</span><span class="pv">${fmtNum(L.r1)}</span></div>
                    <div class="pivot-item piv"><span class="pk">Pivot</span><span class="pv">${fmtNum(L.P)}</span></div>
                    <div class="pivot-item sup"><span class="pk">S1</span><span class="pv">${fmtNum(L.s1)}</span></div>
                    <div class="pivot-item sup"><span class="pk">S2</span><span class="pv">${fmtNum(L.s2)}</span></div>
                    <div class="pivot-item vol"><span class="pk">ATR</span><span class="pv">${fmtNum(L.atr)}</span><span class="pd">${L.atrPct.toFixed(1)}%</span></div>
                </div>
                <div class="pivot-basis">Pivot &amp; ATR dihitung dari OHLC hari sebelumnya (H ${fmtNum(L.prevH)} · L ${fmtNum(L.prevL)} · C ${fmtNum(L.prevC)}).</div>`;
        } else {
            document.getElementById("pPivots").innerHTML = "";
        }

        // ukuran posisi (money management)
        const Z = p.size;
        if (Z) {
            document.getElementById("pSize").innerHTML = `
                <h4>Manajemen Posisi — contoh modal ${fmtRp(Z.modal)} (risiko ${Z.riskPct}% per transaksi)</h4>
                <div class="size-grid">
                    <div class="size-item"><div class="k">Ukuran posisi</div><div class="v">${fmtNum(Z.lots)} lot <span class="sub">(${fmtNum(Z.shares)} lbr)</span></div></div>
                    <div class="size-item"><div class="k">Nilai transaksi</div><div class="v">${fmtRp(Math.round(Z.value))} <span class="sub">${Z.pctModal.toFixed(0)}% modal</span></div></div>
                    <div class="size-item"><div class="k">Risiko per lembar</div><div class="v">${fmtRp(Math.round(Z.perShare))}</div></div>
                    <div class="size-item"><div class="k">Maks. kerugian</div><div class="v down">${fmtRp(Math.round(Z.maxLoss))}</div></div>
                </div>`;
        } else {
            document.getElementById("pSize").innerHTML = "";
        }

        const srcTxt = LIVE.enabled
            ? `Data intraday 5 menit dari Yahoo Finance (via backend) — diperbarui ${LIVE.lastUpdate ? LIVE.lastUpdate.toLocaleTimeString("id-ID", { hour12: false }) : "—"} WIB.`
            : `Data intraday disimulasikan dari OHLC harian untuk edukasi.`;
        document.getElementById("pNote").innerHTML =
            `Sinyal <b>${p.signal}</b> (skor ${p.score}/100) dari ${p.enter.length} faktor intraday: VWAP ${fmtRp(p.tech.vwap)}, ` +
            `RSI ${p.tech.rsi.toFixed(0)}, posisi rentang ${(p.tech.pos * 100).toFixed(0)}%, volume ${p.tech.volRatio.toFixed(1)}× rata-rata, gap ${fmtPct(p.tech.gap)}. ` +
            `${srcTxt} Bukan rekomendasi beli/jual.`;

        // watch button
        const wb = document.getElementById("pWatchBtn");
        const inW = this.watch.includes(code);
        wb.textContent = inW ? "★ Ada di Watchlist" : "☆ Watchlist";
        wb.onclick = () => { this.toggleWatch(code); this.openPlan(code); };

        // buka modal dulu, baru bikin chart (butuh container terlihat)
        document.getElementById("planModal").classList.add("show");
        setTimeout(() => this.drawPlanChart(s, p, mode, end), 40);
    },

    drawPlanChart(stock, p, mode, end) {
        const el = document.getElementById("planChart");
        if (!el) return;
        if (this._pChart) { try { this._pChart.remove(); } catch (e) {} this._pChart = null; }
        el.innerHTML = "";

        const bars = getIntraday(stock.code);
        const fmtTs = t => {
            const d = new Date(t * 1000);
            return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
        };
        const chart = LightweightCharts.createChart(el, {
            layout: { background: { type: "solid", color: "transparent" }, textColor: "#5f6a85", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 },
            grid: { vertLines: { color: "rgba(35,42,61,.4)" }, horzLines: { color: "rgba(35,42,61,.4)" } },
            rightPriceScale: { borderColor: "#232a3d" },
            timeScale: { borderColor: "#232a3d", timeVisible: true, secondsVisible: false },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            localization: { timeFormatter: fmtTs },
            autoSize: true
        });
        chart.timeScale().applyOptions({ tickMarkFormatter: (t) => fmtTs(t) });

        const line = chart.addLineSeries({ color: "#3b82f6", lineWidth: 2, priceLineVisible: false });
        line.setData(dedupeTime(bars.map(b => ({ time: b.time, value: b.c }))));

        // garis VWAP
        let pv = 0, vv = 0;
        const vwapData = [];
        bars.filter(b => b.t <= end).forEach(b => {
            const tp = (b.h + b.l + b.c) / 3;
            pv += tp * b.v; vv += b.v;
            vwapData.push({ time: b.time, value: round1(pv / vv) });
        });
        if (vwapData.length) {
            const vl = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            vl.setData(dedupeTime(vwapData));
        }

        // marker cutoff
        const cutBar = bars.filter(b => b.t <= end).slice(-1)[0];
        if (cutBar) {
            line.setMarkers([{ time: cutBar.time, position: "aboveBar", color: "#22d3ee", shape: "arrowDown", text: "analisis s/d " + end }]);
        }

        const pl = (price, color, style, title) => line.createPriceLine({
            price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title
        });
        pl(p.entry.hi, "#3b82f6", LightweightCharts.LineStyle.Dotted, p.side === "short" ? "zona jual" : "zona beli");
        pl(p.entry.lo, "#3b82f6", LightweightCharts.LineStyle.Dotted, "");
        pl(p.tp1, "#22c55e", LightweightCharts.LineStyle.Solid, "TP1");
        pl(p.tp2, "#22c55e", LightweightCharts.LineStyle.Dashed, "TP2");
        pl(p.stop, "#ef4444", LightweightCharts.LineStyle.Solid, p.side === "short" ? "invalidasi" : "stop");

        this._pChart = chart;
        setTimeout(() => { try { chart.timeScale().fitContent(); } catch (e) {} }, 30);
    },

    closePlan() {
        document.getElementById("planModal").classList.remove("show");
        if (this._pChart) { try { this._pChart.remove(); } catch (e) {} this._pChart = null; }
    },

    /* ===== MISC ===== */
    buildSelects() {
        const fs = document.getElementById("fSector");
        SECTOR_LIST.forEach(s => {
            const o = document.createElement("option");
            o.value = s; o.textContent = s;
            fs.appendChild(o);
        });

        const ft = document.getElementById("fundTicker");
        const wl = document.getElementById("watchList");
        const alertList = document.getElementById("alertList");
        [...STOCKS].sort((a, b) => a.code.localeCompare(b.code)).forEach(s => {
            const o = document.createElement("option");
            o.value = s.code; o.textContent = `${s.code} — ${s.name}`;
            ft.appendChild(o);
            const o2 = document.createElement("option");
            o2.value = s.code; o2.textContent = `${s.code} — ${s.name}`;
            wl.appendChild(o2);
            const o3 = document.createElement("option");
            o3.value = s.code; o3.textContent = `${s.code} — ${s.name}`;
            alertList.appendChild(o3);
        });
        ft.value = this.current;
    },

    toast(msg) {
        const t = document.getElementById("toast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(this._tt);
        this._tt = setTimeout(() => t.classList.remove("show"), 2600);
    }
};

document.addEventListener("DOMContentLoaded", () => App.init());
