const fetch = require("node-fetch");
const tickers = require("./tickers.js");
const pool = require("../pool.js");

(async () => {
    // let query = `
    //     use stocks;
    //     delete from prices;
    //     ALTER TABLE prices AUTO_INCREMENT = 1;
    // `;

    // await pool.query(query);

    // 20 days 5,741 tickers in 52 minutes = 110 tickers/min
    // 50 days 5,741 tickers in 2 hours = 50 tickers/min
    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - prices for ${symbol}`);

        await getPrices(symbol);
    }

    async function getPrices(symbol) {
        try {
            let today = new Date();
            let todayDay = today.getDate();
            let todayMonth = today.getMonth() + 1;
            let todayYear = today.getFullYear();

            let endDate = `${todayMonth}/${todayDay}/${todayYear}`;

            // console.log(endDate);

            let past = new Date();
            past.setDate(past.getDate() - 80); // will return 55 prices due to weekends being closed
            let pastDay = past.getDate();
            let pastMonth = past.getMonth() + 1;
            let pastYear = past.getFullYear();

            let startDate = `${pastMonth}/${pastDay}/${pastYear}`;

            // console.log(startDate);

            // https://www.marketwatch.com/investing/stock/gme/downloaddatapartial?startdate=4/18/2021&enddate=7/7/2021&daterange=d30&frequency=p1d&csvdownload=true&downloadpartial=false&newdates=false

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
