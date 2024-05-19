const fetch = require("node-fetch");
const tickers = require("./tickers.js");
const pool = require("../pool.js");

(async () => {
    let query = `
        SELECT distinct symbol 
        FROM stocks.prices;
    `;

    let data = await pool.query(query);
    let inserted = data.map((item) => item.symbol);

    let missing = tickers.filter((item) => !inserted.includes(item.symbol));

    // 5,741 tickers in 33 minutes = 170 tickers/min
    for (let i = 0; i < missing.length; i++) {
        let company = missing[i];
        let symbol = company.symbol;

        await getPrices(symbol);
        let progress = Math.round(((i + 1) / missing.length) * 100);
        console.log(`${progress}% - ${i + 1}/${missing.length} - prices for missing ${symbol}`);
    }

    async function getPrices(symbol) {
        try {
            let unixTimespampNow = Math.floor(Date.now() / 1000);
            let numberOfDays = 80; // will return 55 prices due to weekends being closed
            let oneDaySeconds = 86400;

            let timestampFrom = unixTimespampNow - numberOfDays * oneDaySeconds;
            let timestampTo = unixTimespampNow; // 0 is since beginning

            // console.log(timestampFrom)
            // console.log(timestampTo)

            let url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${timestampFrom}&period2=${timestampTo}&interval=1d&events=history`;

            // console.log(url);

            let response = await fetch(url);
            let csv = await response.text();

            // console.log(csv);

            let data = csv.split(/\r?\n/);

            // remove csv header row
            data.shift();

            let prices = data.map((item) => {
                let parts = item.split(",");
                // console.log(parts);

                let day = {
                    date: parts[0],
                    close: parts[4],
                    volume: parts[6],
                };

                if (day.close) {
                    return day;
                }
            });

            for (let i = 0; i < prices.length; i++) {
                let price = prices[i];
                // console.log(price);

                let query = `
                    use stocks;
                    insert into prices
                        (
                            symbol,
                            date,
                            close,
                            volume,
                            timestamp
                        )
                    values
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            now()
                        );
                `;

                let data = [symbol, price.date, price.close, price.volume];

                await pool.query(query, data);
            }
        } catch (err) {
            console.log(err);
        }
    }
})();
