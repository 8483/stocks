const fetch = require("node-fetch");
const pool = require("./pool.js");
const tickers = require("./tickers.js");

(async () => {
    let query = `
        use stocks;
        delete from prices;
    `;

    await pool.query(query);

    // Execution time ~ 10 min.
    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - prices for ${symbol}`);

        await getPrices(symbol);
    }

    async function getPrices(symbol) {
        try {
            // UNIX timestamp
            let now = Math.floor(Date.now() / 1000);
            let numberOfDays = 60;
            let oneDaySeconds = 86400;

            let timestampFrom = now - numberOfDays * oneDaySeconds;
            let timestampTo = now; // 0 is since beginning

            let url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${timestampFrom}&period2=${timestampTo}&interval=1d&events=history`;

            let response = await fetch(url);
            let csv = await response.text();
            let data = csv.split(/\r?\n/);

            // remove csv header row
            data.shift();

            let prices = data.map((item) => {
                let parts = item.split(",");

                return {
                    date: parts[0],
                    open: parts[1],
                    high: parts[2],
                    low: parts[3],
                    close: parts[4],
                    adjustedClose: parts[5],
                    volume: parts[6],
                };
            });

            for (let i = 0; i < prices.length; i++) {
                let price = prices[i];

                let query = `
                    use stocks;
                    insert into prices
                        (
                            symbol,
                            date,
                            open,
                            high,
                            low,
                            close,
                            adjustedClose,
                            volume,
                            timestamp
                        )
                    values
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            now()
                        );
                `;

                let data = [symbol, price.date, price.open, price.high, price.low, price.close, price.adjustedClose, price.volume];

                await pool.query(query, data);
            }
        } catch (err) {
            console.log(err);
        }
    }
})();
