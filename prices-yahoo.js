const fetch = require("node-fetch");
const tickers = require("./tickers.js");
const pool = require("./pool.js");

(async () => {
    let query = `
        use stocks;
        delete from prices;
        ALTER TABLE prices AUTO_INCREMENT = 1;
    `;

    await pool.query(query);

    // 5,741 tickers in 33 minutes = 170 tickers/min
    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - prices for ${symbol}`);

        await getPrices(symbol);
    }

    async function getPrices(symbol) {
        try {
            let unixTimespampNow = Math.floor(Date.now() / 1000);
            let numberOfDays = 30; // will return 21 prices due to weekends being closed
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

                let day = {
                    date: parts[0],
                    open: parts[1],
                    high: parts[2],
                    low: parts[3],
                    close: parts[4],
                    adjustedClose: parts[5],
                    volume: parts[6],
                };

                if (day.adjustedClose) {
                    return day;
                }
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
