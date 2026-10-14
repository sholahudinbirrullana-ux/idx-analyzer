/* =============================================
   INDIKATOR TEKNIKAL
   ============================================= */

const TInd = {

    /* Simple Moving Average */
    sma(values, period) {
        const out = [];
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
            sum += values[i];
            if (i >= period) sum -= values[i - period];
            if (i >= period - 1) out.push({ i, v: sum / period });
        }
        return out;
    },

    /* Exponential Moving Average */
    ema(values, period) {
        const k = 2 / (period + 1);
        const out = [];
        let prev = null;
        for (let i = 0; i < values.length; i++) {
            if (i < period - 1) continue;
            if (prev === null) {
                let s = 0;
                for (let j = i - period + 1; j <= i; j++) s += values[j];
                prev = s / period;
            } else {
                prev = values[i] * k + prev * (1 - k);
            }
            out.push({ i, v: prev });
        }
        return out;
    },

    /* RSI (Wilder) */
    rsi(closes, period = 14) {
        if (closes.length <= period) return [];
        let gain = 0, loss = 0;
        for (let i = 1; i <= period; i++) {
            const d = closes[i] - closes[i - 1];
            if (d >= 0) gain += d; else loss -= d;
        }
        let avgG = gain / period, avgL = loss / period;
        const out = [{ i: period, v: avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL) }];
        for (let i = period + 1; i < closes.length; i++) {
            const d = closes[i] - closes[i - 1];
            const g = d > 0 ? d : 0;
            const l = d < 0 ? -d : 0;
            avgG = (avgG * (period - 1) + g) / period;
            avgL = (avgL * (period - 1) + l) / period;
            out.push({ i, v: avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL) });
        }
        return out;
    },

    /* MACD (12,26,9) */
    macd(closes, fast = 12, slow = 26, sig = 9) {
        const eFast = this.emaArr(closes, fast);
        const eSlow = this.emaArr(closes, slow);
        const line = [];
        for (let i = 0; i < closes.length; i++) {
            if (eFast[i] == null || eSlow[i] == null) { line.push(null); continue; }
            line.push(eFast[i] - eSlow[i]);
        }
        const valid = line.map((v, i) => v == null ? null : { i, v }).filter(Boolean).map(o => o.v);
        const sigRaw = this.emaArr(valid, sig);
        // re-align
        const offset = line.findIndex(v => v != null);
        const signal = line.map((v, i) => {
            const idx = i - offset;
            if (idx < 0 || sigRaw[idx] == null) return null;
            return sigRaw[idx];
        });
        const hist = line.map((v, i) => (v == null || signal[i] == null) ? null : v - signal[i]);
        return { line, signal, hist };
    },

    emaArr(values, period) {
        const k = 2 / (period + 1);
        const out = new Array(values.length).fill(null);
        let prev = null;
        let cnt = 0;
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            if (v == null) continue;
            cnt++;
            if (cnt < period) continue;
            if (prev === null) {
                let s = 0, n = 0;
                for (let j = Math.max(0, i - period + 1); j <= i; j++) {
                    if (values[j] != null) { s += values[j]; n++; }
                }
                prev = s / period;
            } else {
                prev = v * k + prev * (1 - k);
            }
            out[i] = prev;
        }
        return out;
    },

    /* Bollinger Bands (20, 2) */
    bollinger(closes, period = 20, mult = 2) {
        const mid = [], upper = [], lower = [];
        for (let i = 0; i < closes.length; i++) {
            if (i < period - 1) { mid.push(null); upper.push(null); lower.push(null); continue; }
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) sum += closes[j];
            const m = sum / period;
            let varr = 0;
            for (let j = i - period + 1; j <= i; j++) varr += (closes[j] - m) ** 2;
            const sd = Math.sqrt(varr / period);
            mid.push(m); upper.push(m + mult * sd); lower.push(m - mult * sd);
        }
        return { mid, upper, lower };
    },

    /* MACD / Stochastic Oscillator %K/%D */
    stoch(highs, lows, closes, period = 14, smooth = 3) {
        const k = [];
        for (let i = 0; i < closes.length; i++) {
            if (i < period - 1) { k.push(null); continue; }
            let hh = -Infinity, ll = Infinity;
            for (let j = i - period + 1; j <= i; j++) {
                if (highs[j] > hh) hh = highs[j];
                if (lows[j] < ll) ll = lows[j];
            }
            k.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
        }
        const d = [];
        for (let i = 0; i < k.length; i++) {
            if (i < smooth - 1 || k[i] == null) { d.push(null); continue; }
            let s = 0, n = 0;
            for (let j = i - smooth + 1; j <= i; j++) if (k[j] != null) { s += k[j]; n++; }
            d.push(n ? s / n : null);
        }
        return { k, d };
    },

    /* ADX sederhana (trend strength) */
    adx(highs, lows, closes, period = 14) {
        const tr = [], pDM = [], nDM = [];
        for (let i = 1; i < closes.length; i++) {
            const h = highs[i] - highs[i - 1];
            const l = lows[i - 1] - lows[i];
            pDM.push(h > l && h > 0 ? h : 0);
            nDM.push(l > h && l > 0 ? l : 0);
            tr.push(Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            ));
        }
        if (tr.length < period * 2) return 15 + Math.random() * 20;
        let atr = 0, pdm = 0, ndm = 0;
        for (let i = 0; i < period; i++) { atr += tr[i]; pdm += pDM[i]; ndm += nDM[i]; }
        const dxs = [];
        for (let i = period; i < tr.length; i++) {
            atr = atr - atr / period + tr[i];
            pdm = pdm - pdm / period + pDM[i];
            ndm = ndm - ndm / period + nDM[i];
            const pdi = atr ? (pdm / atr) * 100 : 0;
            const ndi = atr ? (ndm / atr) * 100 : 0;
            const sum = pdi + ndi;
            dxs.push(sum ? (Math.abs(pdi - ndi) / sum) * 100 : 0);
        }
        if (!dxs.length) return 20;
        const a = dxs.slice(-period);
        return a.reduce((x, y) => x + y, 0) / a.length;
    },

    /* ===== SINYAL KOMPOSIT ===== */
    evaluate(stock) {
        const s = getSeries(stock.code);
        const closes = s.map(b => b.close);
        const highs = s.map(b => b.high);
        const lows = s.map(b => b.low);
        const last = closes[closes.length - 1];

        const rsiArr = this.rsi(closes, 14);
        const rsi = rsiArr.length ? rsiArr[rsiArr.length - 1].v : 50;

        const ma20Arr = this.sma(closes, 20);
        const ma50Arr = this.sma(closes, 50);
        const ma20 = ma20Arr.length ? ma20Arr[ma20Arr.length - 1].v : last;
        const ma50 = ma50Arr.length ? ma50Arr[ma50Arr.length - 1].v : last;

        const m = this.macd(closes);
        const macdLine = m.line[m.line.length - 1] ?? 0;
        const macdSig = m.signal[m.signal.length - 1] ?? 0;
        const macdHist = m.hist[m.hist.length - 1] ?? 0;

        const st = this.stoch(highs, lows, closes);
        const stK = [...st.k].reverse().find(v => v != null) ?? 50;
        const stD = [...st.d].reverse().find(v => v != null) ?? 50;

        const adxVal = this.adx(highs, lows, closes);
        const bb = this.bollinger(closes);
        const bbU = bb.upper[bb.upper.length - 1];
        const bbL = bb.lower[bb.lower.length - 1];
        const bbPos = bbU && bbL ? ((last - bbL) / (bbU - bbL)) * 100 : 50;

        let bull = 0, total = 0;
        const votes = [];
        const add = (cond, label) => {
            total++;
            if (cond) bull++;
            votes.push({ label, ok: cond });
        };

        add(last > ma20, "Harga > MA20");
        add(ma20 > ma50, "MA20 > MA50");
        add(rsi > 50 && rsi < 70, "RSI sehat (50–70)");
        add(macdLine > macdSig, "MACD > Signal");
        add(macdHist > 0, "MACD histogram +");
        add(stK > stD, "Stoch %K > %D");
        add(stK < 80, "Stoch belum overbought");
        add(adxVal > 20, "Tren kuat (ADX>20)");
        add(bbPos > 20 && bbPos < 85, "Harga di dalam band");

        const score = total ? bull / total : 0.5;
        let signal = "Netral";
        if (score >= 0.62) signal = "Bullish";
        else if (score <= 0.38) signal = "Bearish";

        return {
            rsi, ma20, ma50, macdLine, macdSig, macdHist,
            stK, stD, adx: adxVal, bbU, bbL, bbPos,
            score, signal, votes,
            priceVsMa20: ((last - ma20) / ma20) * 100,
            priceVsMa50: ((last - ma50) / ma50) * 100
        };
    },

    /* Statistik harga dari series */
    stats(series) {
        const closes = series.map(b => b.close);
        const highs = series.map(b => b.high);
        const lows = series.map(b => b.low);
        const vols = series.map(b => b.volume);
        const n = series.length;
        const win20 = closes.slice(-20);
        const last = closes[n - 1];
        const ret = (a, b) => ((b - a) / a) * 100;

        const mean = closes.reduce((a, b) => a + b, 0) / n;
        const variance = closes.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
        const sd = Math.sqrt(variance);

        const rets = [];
        for (let i = 1; i < n; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
        const rMean = rets.reduce((a, b) => a + b, 0) / rets.length;
        const rVar = rets.reduce((a, b) => a + (b - rMean) ** 2, 0) / rets.length;
        const vol = Math.sqrt(rVar * 252) * 100;

        // max drawdown
        let peak = -Infinity, mdd = 0;
        for (const c of closes) {
            if (c > peak) peak = c;
            const dd = (peak - c) / peak;
            if (dd > mdd) mdd = dd;
        }

        return {
            high52: round1(Math.max(...highs.slice(-250))),
            low52: round1(Math.min(...lows.slice(-250))),
            range52: ((Math.max(...highs.slice(-250)) - Math.min(...lows.slice(-250))) / Math.min(...lows.slice(-250))) * 100,
            ret5d: ret(closes[Math.max(0, n - 6)], last),
            ret20d: ret(closes[Math.max(0, n - 21)], last),
            ret60d: ret(closes[Math.max(0, n - 61)], last),
            ret1y: ret(closes[Math.max(0, n - 251)], last),
            avgVol: Math.round(vols.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, n)),
            volatility: vol,
            stdDev: round1(sd),
            mdd: mdd * 100,
            avg20: round1(win20.reduce((a, b) => a + b, 0) / win20.length),
            psar_like: round1(Math.min(...lows.slice(-20)))
        };
    }
};
