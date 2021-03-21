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

    // 5,741 tickers in 52 minutes = 110 tickers/min
    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - prices for ${symbol}`);

        await getPrices(symbol);
    }

    async function getPrices(symbol) {
        try {
            let startDate = "02/15/2021";
            let endDate = "03/21/2021";

            let url = `https://www.marketwatch.com/investing/stock/${symbol}/downloaddatapartial?startdate=${startDate}&enddate=${endDate}&daterange=d30&frequency=p1d&csvdownload=true&downloadpartial=false&newdates=false`;

            let response = await fetch(url);
            let csv = await response.text();

            let data = csv.split(/\r?\n/);

            // remove csv header row
            data.shift();

            // remove last empty row
            data.pop();

            let prices = data.map((item) => {
                let rawParts = item.split(',"');
                let parts = rawParts.map((string) => {
                    return string.replace(/,/g, "").replace(/"/g, "");
                });

                let dateParts = parts[0].split("/");

                let day = {
                    date: `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`, // 03/19/2021
                    open: parseFloat(parts[1]),
                    high: parseFloat(parts[2]),
                    low: parseFloat(parts[3]),
                    close: parseFloat(parts[4]),
                    volume: parseInt(parts[5]),
                };

                if (day.close) {
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
                            now()
                        );
                `;

                let data = [symbol, price.date, price.open, price.high, price.low, price.close, price.volume];

                await pool.query(query, data);
            }
        } catch (err) {
            console.log(err);
        }
    }
})();
