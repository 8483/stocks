const fetch = require("node-fetch");
const tickers = require("./tickers.js");
const pool = require("./pool.js");

(async () => {
    let query = `
        use stocks;

        select 
            symbol,
            date
        from (
            SELECT
                symbol,
                date,
                ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) rowNumber
            FROM stocks.prices
        ) t1
        where rowNumber = 1;
    `;

    let lastDatesRaw = await pool.query(query);
    let lastDates = lastDatesRaw[1];

    // console.log(lastDates);

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let message = "";

        let today = new Date();
        let currentISODate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

        let lastDateForSymbol = lastDates.filter((item) => item.symbol == symbol);
        let lastISODate = lastDateForSymbol[0] ? lastDateForSymbol[0].date.toISOString().split("T")[0] : "";

        console.log(currentISODate, lastISODate, currentISODate == lastISODate);

        let data = [];

        data = await getPricesMarketwatch(symbol, lastISODate, currentISODate);

        data = await getPricesYahoo(lastISODate, currentISODate);

        let progress = Math.round(((i + 1) / tickers.length) * 100);
        console.log(`${progress}% - ${i + 1}/${tickers.length} - metrics for ${symbol} - ${message}`);
    }

    async function getPricesMarketwatch(symbol, startISODate, endISODate) {
        try {
            let startDateParts = 

// PAUSE DUE TO START DATE DEFAULT

            let endDate = `${todayMonth}/${todayDay}/${todayYear}`;

            // console.log(endDate);

            let past = new Date();
            past.setDate(past.getDate() - 80);
            let pastDay = past.getDate();
            let pastMonth = past.getMonth() + 1;
            let pastYear = past.getFullYear();

            let startDate = `${pastMonth}/${pastDay}/${pastYear}`;

            // console.log(startDate);

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

    async function getPricesYahoo(symbol, startISODate, endISODate) {}

    async function insertPrices() {}
})();
