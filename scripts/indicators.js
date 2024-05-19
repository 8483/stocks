const tickers = require("./tickers.js");
const pool = require("../pool.js");
const RSI = require("technicalindicators").RSI;
const MACD = require("technicalindicators").MACD;

(async () => {
    let query = `
        use stocks;
        delete from indicators;
        ALTER TABLE prices AUTO_INCREMENT = 1;
    `;

    await pool.query(query);

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let pricesQuery = `
            use stocks;

            select *
            from prices
            where symbol = ?
            order by date asc;
        `;

        let pricesRaw = await pool.query(pricesQuery, [symbol]);

        let prices = pricesRaw[1].map((item) => item.close);

        let rsis = RSI.calculate({
            values: prices,
            period: 14, // last 14 prices
        });

        let rsi = rsis.length > 0 ? rsis[rsis.length - 1] : null;

        var macds = MACD.calculate({
            values: prices,
            fastPeriod: 12, // last 12 prices
            slowPeriod: 26, // last 26 prices
            signalPeriod: 9, // last 9 prices
            SimpleMAOscillator: false,
            SimpleMASignal: false,
        });

        let lastMACDObject = macds.length > 0 ? macds[macds.length - 1] : null;

        let macd = lastMACDObject && lastMACDObject.MACD ? lastMACDObject.MACD.toFixed(2) : null;
        let signal = lastMACDObject && lastMACDObject.signal ? lastMACDObject.signal.toFixed(2) : null;
        let histogram = lastMACDObject && lastMACDObject.histogram ? lastMACDObject.histogram.toFixed(2) : null;

        let secondToLastMACDObject = macds.length > 1 ? macds[macds.length - 2] : null;
        let thirdToLastMACDObject = macds.length > 2 ? macds[macds.length - 3] : null;

        let secondToLastHistogram = secondToLastMACDObject && secondToLastMACDObject.histogram ? secondToLastMACDObject.histogram : null;
        let thirdToLastHistogram = thirdToLastMACDObject && thirdToLastMACDObject.histogram ? thirdToLastMACDObject.histogram : null;

        let slope = 0;

        if (histogram >= secondToLastHistogram && secondToLastHistogram >= thirdToLastHistogram) {
            slope = 1;
        } else if (histogram <= secondToLastHistogram && secondToLastHistogram <= thirdToLastHistogram) {
            slope = -1;
        }

        let change = histogram / thirdToLastHistogram - 1;

        let velocity = isFinite(change) ? change : null;

        let indicatorsQuery = `
            use stocks;

            insert into indicators
                (symbol, rsi, macd, macdSignal, macdHistogram, histogramSlope, histogramVelocity, timestamp)
            values
                (?, ?, ?, ?, ?, ?, ?, now());
        `;

        await pool.query(indicatorsQuery, [symbol, rsi, macd, signal, histogram, slope, velocity]);

        let progress = Math.round(((i + 1) / tickers.length) * 100);
        console.log(`${progress}% - ${i + 1}/${tickers.length} - indicators for ${symbol} RSI: ${rsi}  MACD: ${macd} signal: ${signal} histogram: ${histogram}`);
    }
})();
