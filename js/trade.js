/* =============================================
   TRADE — Screener Harian & Rencana Perdagangan
   Mode:
     "pagi" = Beli Pagi · Jual Sore  (intraday day-trade)
     "sore" = Beli Sore · Jual Pagi  (overnight)
   Semua level dihitung dari bar intraday 15-menit
   sesuai jam analisis (cutoff), plus nilai wajar
   fundamental (EPS × PER wajar sektor).
   ============================================= */

const Trade = {

    WINDOWS: {
        pagi: ["10:00", "11:00", "12:00"],
        sore: ["14:30", "15:15", "16:00"]
    },
    DEFAULT_END: { pagi: "11:00", sore: "15:15" },

    MODE_LABEL: {
        pagi: "Beli Pagi · Jual Sore",
        sore: "Beli Sore · Jual Pagi"
    },

    exitWindowText(mode) {
        return mode === "pagi"
            ? "15:15–15:45 WIB"
            : "Besok 09:00–10:00 WIB";
    },

    /* ---------- tick harga IDX ---------- */
    tickOf(p) {
        if (p < 200) return 1;
        if (p < 500) return 2;
        if (p < 2000) return 5;
        if (p < 5000) return 10;
        return 25;
    },
    tickR(p, v) {
        const t = this.tickOf(p);
        return Math.round(v / t) * t;
    },

    /* ---------- nilai wajar fundamental ---------- */
    fair(stock) {
        let pers = STOCKS
            .filter(s => s.sector === stock.sector && s.eps > 0 && s.code !== stock.code)
            .map(s => s.per)
            .sort((a, b) => a - b);
        if (pers.length > 3) pers = pers.slice(1, -1);          // buang outlier
        const med = pers.length ? pers[Math.floor(pers.length / 2)] : 12;

        let fp = med;
        if (stock.roe >= 18) fp *= 1.12;                        // profitabilitas tinggi
        if (stock.der >= 2.5) fp *= 0.86;                       // utang tinggi
        if (stock.divY >= 5) fp *= 1.05;                        // dividen menarik
        fp = Math.max(4, Math.min(30, fp));

        const value = stock.eps * fp;
        return {
            per: Math.round(fp * 10) / 10,
            medPer: Math.round(med * 10) / 10,
            value: this.tickR(stock.price, value),
            buy: this.tickR(stock.price, value * 0.90),          // margin of safety 10%
            sell: this.tickR(stock.price, value * 1.15),         // target jual wajar
            basis: `EPS ${fmtNum(stock.eps)} × PER wajar ${fp.toFixed(1)} (median sektor ${med.toFixed(1)}×)`
        };
    },

    /* ---------- level kunci (pivot klasik + ATR) ---------- */
    levels(stock) {
        const daily = getSeries(stock.code);
        if (!daily || daily.length < 3) return null;
        const b = daily[daily.length - 2];              // hari terakhir yang selesai
        const H = b.high, L = b.low, C = b.close;
        const P = (H + L + C) / 3;
        // ATR(14)
        const n = Math.min(14, daily.length - 1);
        let tr = 0;
        for (let i = daily.length - n; i < daily.length; i++) {
            const cur = daily[i], pv = daily[i - 1] || cur;
            tr += Math.max(cur.high - cur.low, Math.abs(cur.high - pv.close), Math.abs(cur.low - pv.close));
        }
        const atr = tr / n;
        const t = p => this.tickR(stock.price, p);
        return {
            P: t(P),
            r1: t(2 * P - L), s1: t(2 * P - H),
            r2: t(P + (H - L)), s2: t(P - (H - L)),
            r3: t(H + 2 * (P - L)), s3: t(L - 2 * (H - P)),
            atr: Math.round(atr),
            atrPct: (atr / stock.price) * 100,
            prevH: H, prevL: L, prevC: C
        };
    },

    /* ---------- ukuran posisi (money management) ---------- */
    positionSize(entry, stop, side, modal = 10000000, riskPct = 1) {
        const riskPerShare = Math.abs(entry - stop);
        if (riskPerShare <= 0) return null;
        const riskBudget = modal * (riskPct / 100);
        let shares = Math.floor(riskBudget / riskPerShare);
        const lots = Math.floor(shares / 100);
        shares = lots * 100;
        const value = shares * entry;
        const maxLoss = shares * riskPerShare;
        return {
            modal, riskPct, lots, shares, value,
            perShare: riskPerShare, maxLoss,
            pctModal: value / modal * 100
        };
    },

    /* ---------- state intraday sampai jam cutoff ---------- */
    dayState(stock, end) {
        const bars = getIntraday(stock.code);
        const daily = getSeries(stock.code);
        const prevBar = daily[daily.length - 2];
        const last = daily[daily.length - 1];
        const prev = { c: prevBar.close, h: prevBar.high, l: prevBar.low };
        const cut = bars.filter(b => b.t <= end);
        if (!cut.length) return null;

        const n = cut.length;
        let pv = 0, vv = 0;
        cut.forEach(b => { const tp = (b.h + b.l + b.c) / 3; pv += tp * b.v; vv += b.v; });
        const vwap = pv / vv;

        const closes = cut.map(b => b.c);
        const price = closes[closes.length - 1];
        const per = Math.max(2, Math.min(14, n - 2));
        const rsiArr = n > 3 ? TInd.rsi(closes, per) : [];
        const rsi = rsiArr.length ? rsiArr[rsiArr.length - 1].v : 50;

        const dayH = Math.max(...cut.map(b => b.h));
        const dayL = Math.min(...cut.map(b => b.l));
        const pos = dayH === dayL ? 0.5 : (price - dayL) / (dayH - dayL);

        const orB = cut.slice(0, Math.min(4, n));               // opening range 09:00-10:00
        const orH = Math.max(...orB.map(b => b.h));
        const orL = Math.min(...orB.map(b => b.l));

        const avgV = vv / n;
        const volRatio = cut[cut.length - 1].v / avgV;
        const gap = (last.open - prev.c) / prev.c * 100;
        const atr = cut.reduce((a, b) => a + (b.h - b.l), 0) / n;
        const mom = closes.length > 3 ? price - closes[closes.length - 4] : 0;
        const morn = bars.filter(b => b.sess === "p");
        const lastMorn = morn.length ? morn[morn.length - 1].c : bars[0].o;
        const momPM = price - lastMorn;

        const sup = Math.min(Math.max(prev.l, orL), price);
        const resC = [dayH, prev.h].filter(v => v > price * 1.0002);
        const res = resC.length ? Math.min(...resC) : price * 1.01;

        return {
            bars, cut, end, price, vwap, rsi, rsiPer: per,
            dayH, dayL, pos, orH, orL, volRatio, gap, atr, mom, momPM,
            prev, last, sup, res, n
        };
    },

    /* ---------- rencana lengkap ---------- */
    plan(stock, mode, end) {
        const d = this.dayState(stock, end || this.DEFAULT_END[mode]);
        if (!d) return null;
        const fair = this.fair(stock);
        const price = d.price;
        const vwap = d.vwap;
        const tick = this.tickOf(price);

        /* === skor & faktor === */
        let score = 50;
        const factors = [];
        const F = (bull, w, text) => {
            score += bull ? w : -w;
            factors.push({ bull, w, text });
        };

        if (mode === "pagi") {
            const dist = ((price - d.sup) / price) * 100;
            F(price > vwap, 12,
                price > vwap
                    ? `Harga ${fmtRp(price)} di atas VWAP ${fmtRp(vwap)} — kontrol ada di pembeli`
                    : `Harga ${fmtRp(price)} di bawah VWAP ${fmtRp(vwap)} — tunggu harga kembali ke atas VWAP`);
            F(vwap > d.prev.c * 0.999, 7,
                `VWAP ${fmtRp(vwap)} ≥ penutupan kemarin ${fmtRp(d.prev.c)} — bias harian positif`,
                `VWAP ${fmtRp(vwap)} < penutupan kemarin ${fmtRp(d.prev.c)} — bias harian lemah`);
            F(d.pos > 0.55, 8,
                `Posisi ${(d.pos * 100).toFixed(0)}% di rentang hari (di bagian atas) — momentum beli`,
                `Posisi ${(d.pos * 100).toFixed(0)}% di rentang hari — belum tembus area atas`);
            F(d.volRatio > 1.15, 7,
                `Volume bar terakhir ${d.volRatio.toFixed(1)}× rata-rata — minat beli naik`,
                `Volume bar terakhir ${d.volRatio.toFixed(1)}× rata-rata — pasar sepi`);
            F(d.rsi >= 46 && d.rsi <= 70, 9,
                `RSI intraday ${d.rsi.toFixed(0)} — kuat namun belum jenuh beli`,
                d.rsi > 70
                    ? `RSI ${d.rsi.toFixed(0)} jenuh beli — jangan kejar harga`
                    : `RSI ${d.rsi.toFixed(0)} masih lemah — tunggu penguatan`);
            F(d.gap > -1.5 && d.gap < 2.0, 7,
                `Gap pembukaan ${fmtPct(d.gap)} — wajar untuk entry`,
                d.gap >= 2
                    ? `Gap up ${fmtPct(d.gap)} terlalu tinggi — rawan profit taking`
                    : `Gap down ${fmtPct(d.gap)} — tekanan jual awal`);
            F(dist <= 0.8, 6,
                `Dekat support ${fmtRp(d.sup)} (jarak ${dist.toFixed(2)}%) — risiko-terbalik menarik`,
                `Jauh dari support ${fmtRp(d.sup)} (jarak ${dist.toFixed(2)}%) — beli di harga tinggi berisiko`);
            F(price > d.orL, 6,
                `Struktur utuh — masih di atas OR low ${fmtRp(d.orL)}`,
                `Sudah menembus OR low ${fmtRp(d.orL)} — struktur intraday rusak`);
            F(price <= vwap * 1.012, 6,
                `Harga belum terlalu tinggi di atas VWAP (${fmtPct((price / vwap - 1) * 100)})`,
                `Harga terlalu tinggi di atas VWAP (${fmtPct((price / vwap - 1) * 100)}) — tunggu retrace`);
        } else {
            const dist = ((price - d.sup) / price) * 100;
            F(price > vwap, 12,
                `Harga ${fmtRp(price)} bertahan di atas VWAP ${fmtRp(vwap)} — penutupan kuat`,
                `Harga ${fmtRp(price)} di bawah VWAP ${fmtRp(vwap)} — lemah untuk dibawa menginap`);
            F(d.momPM > 0, 9,
                `Momentum sesi siang positif (+${fmtRp(d.momPM)}) — ada akumulasi sore`,
                `Momentum sesi siang negatif (${fmtRp(d.momPM)}) — tekanan jual sore`);
            F(d.pos > 0.60, 9,
                `Ditutup di ${(d.pos * 100).toFixed(0)}% rentang hari — closing kuat (bullish overnight)`,
                `Ditutup di ${(d.pos * 100).toFixed(0)}% rentang hari — closing lemah`);
            F(price >= d.dayH - price * 0.004, 6,
                `Mendekati high hari ${fmtRp(d.dayH)} — permintaan akhir sesi`,
                `Masih jauh dari high hari ${fmtRp(d.dayH)} — kurang tenaga`);
            F(d.rsi >= 45 && d.rsi <= 72, 9,
                `RSI intraday ${d.rsi.toFixed(0)} — sehat untuk dibawa menginap`,
                d.rsi > 72
                    ? `RSI ${d.rsi.toFixed(0)} terlalu panas — risiko gap down besok pagi`
                    : `RSI ${d.rsi.toFixed(0)} lemah — rawan lanjut turun`);
            F(d.volRatio > 1.1, 7,
                `Volume bar terakhir ${d.volRatio.toFixed(1)}× rata-rata — minat beli akhir sesi`,
                `Volume bar terakhir ${d.volRatio.toFixed(1)}× rata-rata — sepi`);
            F(price > d.bars[0].o, 6,
                `Close ${fmtRp(price)} di atas harga buka ${fmtRp(d.bars[0].o)} — hari positif`,
                `Close ${fmtRp(price)} di bawah harga buka ${fmtRp(d.bars[0].o)} — hari negatif`);
            F(vwap > d.prev.c * 0.999, 5,
                `VWAP ≥ penutupan kemarin — tren harian positif`,
                `VWAP < penutupan kemarin — tren harian lemah`);
            F(dist <= 1.2, 4,
                `Masih dekat support ${fmtRp(d.sup)} — pembatas risiko`,
                `Cukup jauh dari support ${fmtRp(d.sup)}`);
        }

        score = Math.max(4, Math.min(100, Math.round(score)));
        const signal = score >= 68 ? "BELI" : score <= 32 ? "JUAL" : "TAUNGGU";
        const side = signal === "JUAL" ? "short" : "long";

        /* === level harga === */
        let entry, stop, tp1, tp2, inval = null, trig = null;

        if (side === "long") {
            let eHi = this.tickR(price, Math.min(price, Math.max(vwap, price * 0.9995)));
            let eLo = this.tickR(price, Math.max(Math.min(vwap, eHi), Math.min(d.sup, price * 0.997)));
            if (eLo >= eHi) { eLo = this.tickR(price, eHi - tick * 2); }
            if (eLo >= eHi || eLo <= 0) { eHi = this.tickR(price, price); eLo = eHi - tick * 2; }
            const eMid = this.tickR(price, (eLo + eHi) / 2);

            const minR = Math.max(price * (mode === "pagi" ? 0.0035 : 0.005), tick);
            const maxR = Math.max(price * (mode === "pagi" ? 0.0075 : 0.013), tick * 2);

            let stopRaw = mode === "pagi"
                ? Math.min(eLo, d.orL, price * 0.9955) - price * 0.0015
                : Math.min(eLo, d.dayL + price * 0.0005, price * 0.996) - price * 0.001;
            stop = this.tickR(price, stopRaw);
            let risk = eMid - stop;
            if (risk < minR) { stop = eMid - this.tickR(price, minR); risk = eMid - stop; }
            if (risk > maxR) { stop = eMid - this.tickR(price, maxR); risk = eMid - stop; }
            if (risk <= 0) { stop = eMid - Math.max(tick, 1); risk = eMid - stop; }

            const k1 = mode === "pagi" ? 1.6 : 1.5;
            const k2 = mode === "pagi" ? 2.6 : 2.4;
            tp1 = this.tickR(price, eMid + k1 * risk);
            tp2 = this.tickR(price, eMid + k2 * risk);
            if (d.res > price * 1.004) {
                const cap = this.tickR(price, d.res - price * 0.0005);
                if (cap > eMid) tp1 = Math.min(tp1, cap);
                if (tp1 <= eMid + risk * 0.4) tp1 = this.tickR(price, eMid + 1.2 * risk);
            }
            if (tp2 <= tp1) tp2 = this.tickR(price, tp1 + risk);
            if (signal === "TAUNGGU") {
                trig = this.tickR(price, Math.max(d.dayH, d.orH) + tick / 2);
            }
            const rr = risk > 0 ? (tp1 - eMid) / risk : 0;
            const basis = eHi > vwap
                ? "Zona di sekitar VWAP (±0,3%) — beli saat harga kembali ke VWAP"
                : "Zona retrace ke support harian — beli pada pantulan";
            entry = { lo: Math.min(eLo, eMid), hi: Math.max(eHi, eMid), mid: eMid, basis };
            return this.build(stock, mode, d, fair, {
                signal, score, side, price, entry, stop, tp1, tp2, rr,
                risk, riskPct: (risk / price) * 100, inval, trig, factors
            });
        }

        /* === rencana JUAL / keluar === */
        const jLo = this.tickR(price, price);
        const jHi = this.tickR(price, Math.min(price * 1.006, Math.max(vwap, price * 1.002)));
        const eMid = this.tickR(price, (jLo + Math.max(jHi, jLo + tick)) / 2 || price);
        inval = this.tickR(price, Math.max(d.dayH, d.orH, price * 1.008) + tick / 2);
        tp1 = this.tickR(price, price - Math.max(price * 0.008, tick * 2));
        tp2 = this.tickR(price, Math.min(price * 0.982, d.sup - tick));
        if (tp2 >= tp1) tp2 = tp1 - tick;
        let sRisk = inval - eMid;
        if (sRisk <= 0) sRisk = Math.max(tick, price * 0.005);
        const rr = sRisk > 0 ? (eMid - tp1) / sRisk : 0;
        entry = { lo: Math.min(jLo, eMid), hi: Math.max(jHi, eMid), mid: eMid, basis: "Zona jual saat rebound — jual di kekuatan, bukan saat panik" };
        return this.build(stock, mode, d, fair, {
            signal, score, side, price, entry, stop: inval, tp1, tp2, rr,
            risk: sRisk, riskPct: (sRisk / price) * 100, inval, trig, factors
        });
    },

    /* ---------- rangkai output ---------- */
    build(stock, mode, d, fair, p) {
        const { signal, score, side, price } = p;
        const isLong = side === "long";
        const isBuy = signal === "BELI";
        const isSell = signal === "JUAL";
        const timeTxt = this.exitWindowText(mode);
        const long = isLong;

        /* daftar alasan masuk */
        const enter = p.factors.map(f => ({ ok: f.bull, t: f.text }));

        /* daftar kapan keluar */
        const exits = [];
        if (isBuy) {
            exits.push({ ico: "⏰", t: `Batas waktu keluar: ${timeTxt} — disiplin, jangan tahan melewati batas.` });
            exits.push({ ico: "🎯", t: `TARGET 1 ${fmtRp(p.tp1)} — jual 50–70% posisi (ambil profit cepat).` });
            exits.push({ ico: "🎯", t: `TARGET 2 ${fmtRp(p.tp2)} — jual sisa / trailing stop.` });
            exits.push({ ico: "🛑", t: `STOP LOSS ${fmtRp(p.stop)} — keluar segera jika tersentuh (maks. rugi ${p.riskPct.toFixed(2)}%).` });
            exits.push({ ico: "📉", t: `Indikator keluar: RSI intraday > 72, atau harga close 2 bar berturut di bawah VWAP ${fmtRp(d.vwap)}, atau volume beli menipis.` });
            if (mode === "sore")
                exits.push({ ico: "🌅", t: `Besok pagi: jual di 09:00–10:00. Jika 15 menit pertama harga di bawah harga open → keluar tanpa tunggu.` });
        } else if (isSell) {
            exits.push({ ico: "⏰", t: mode === "pagi"
                ? "Keluar hari ini sebelum 15:45 WIB bila masih memegang."
                : "Keluar besok pagi 09:00–10:00, atau segera saat rebound." });
            exits.push({ ico: "🎯", t: `Target beli kembali / ambil profit jual: ${fmtRp(p.tp1)} lalu ${fmtRp(p.tp2)}.` });
            exits.push({ ico: "🛑", t: `Setup JUAL batal jika harga menembus ${fmtRp(p.inval)} (naik di atas high hari) — tutup posisi jual.` });
            exits.push({ ico: "📉", t: `Konfirmasi bearish: harga di bawah VWAP ${fmtRp(d.vwap)} & RSI intraday < 40.` });
        } else {
            exits.push({ ico: "⏸", t: `Belum ada sinyal masuk. Tunggu pemicu: break & tahan di atas ${p.trig ? fmtRp(p.trig) : fmtRp(d.res)} dengan volume.` });
            exits.push({ ico: "🎯", t: `Jika masuk, target ${fmtRp(p.tp1)} dan ${fmtRp(p.tp2)}.` });
            exits.push({ ico: "🛑", t: `Stop ${fmtRp(p.stop)} bila masuk dari area ${fmtRp(p.entry.lo)}–${fmtRp(p.entry.hi)}.` });
            exits.push({ ico: "⏰", t: `Batas waktu: ${timeTxt}.` });
        }

        /* kondisi keluar singkat utk tabel */
        let exitCond;
        if (mode === "pagi") {
            exitCond = isBuy ? "RSI>72 · <VWAP · 15:45" : (signal === "TAUNGGU" ? "Tunggu break " + fmtNum(p.trig) : "Batas 15:45 · RSI>72");
        } else {
            exitCond = isBuy ? "Jual 09:00–10:00 · <open" : (signal === "TAUNGGU" ? "Tunggu break " + fmtNum(p.trig) : "Jual pagi · segera");
        }

        const lv = this.levels(stock);
        const size = this.positionSize(p.entry.mid, p.stop, p.side, 10000000, 1);

        return {
            code: stock.code, name: stock.name, sector: stock.sector,
            mode, modeLabel: this.MODE_LABEL[mode], end: d.end,
            signal, score, side, price,
            entry: p.entry, stop: p.stop, tp1: p.tp1, tp2: p.tp2, rr: p.rr,
            riskPct: p.riskPct, inval: p.inval, trig: p.trig,
            exitTime: timeTxt, exitCond, enter, exits, fair,
            levels: lv, size,
            tech: {
                vwap: d.vwap, rsi: d.rsi, orH: d.orH, orL: d.orL,
                dayH: d.dayH, dayL: d.dayL, pos: d.pos, volRatio: d.volRatio,
                gap: d.gap, momPM: d.momPM, sup: d.sup, res: d.res
            }
        };
    }
};
