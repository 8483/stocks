const fetch = require("node-fetch");
const parse = require("node-html-parser").parse;
const tickers = require("../tickers.js");
const pool = require("../pool.js");

(async () => {
    let query = `
        use stocks;
        select symbol from forecast;
    `;

    let result = await pool.query(query);
    let insertedTickersRaw = result[1];
    let insertedTickers = insertedTickersRaw.map((item) => item.symbol);

    // console.log(insertedTickers);
    // console.log(await getForecast("aca"));

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let message = "";

        if (insertedTickers.includes(symbol)) {
            message = "skipping ...";
        } else {
            let data = await getForecast(symbol);

            let query = `
                insert into forecast
                    (symbol, revenueCurrentYear, revenueNextYear, timestamp)
                values
                    (?, ?, ?, now())
            `;

            if (data) {
                await pool.query(query, [symbol, data.current, data.next]);
                message = "inserting +++";
            } else {
                await pool.query(query, [symbol, null, null]);
                message = "NO DATA ???";
            }
        }

        let progress = Math.round(((i + 1) / tickers.length) * 100);
        console.log(`${progress}% - ${i + 1}/${tickers.length} - forecast for ${symbol} - ${message}`);
    }

    async function getForecast(symbol) {
        try {
            let url = `https://finance.yahoo.com/quote/${symbol}/analysis`;

            let response = await fetch(url);
            let raw = await response.text();

            const root = parse(raw);

            let rows = root.querySelectorAll("tr");

            if (rows && rows.length > 0) {
                let currentRaw = rows[8].childNodes[3].childNodes[0].childNodes[0].rawText;
                let nextRaw = rows[8].childNodes[4].childNodes[0].childNodes[0].rawText;

                return {
                    current: getValue(currentRaw),
                    next: getValue(nextRaw),
                };
            }

            function getValue(string) {
                if (string == "N/A") return null;

                let numberRaw = string.slice(0, string.length - 1);
                let letter = string.slice(string.length - 1, string.length);

                let numberParts = numberRaw.split(".");

                let numberLeft = numberParts[0] ? parseInt(numberParts[0]) : 0;
                let numberRight = numberParts[1] ? parseInt(numberParts[1]) : 0;

                let number = 0;

                if (letter == "B") {
                    number = numberLeft * 1000000000 + numberRight * 10000000;
                } else {
                    number = numberLeft * 1000000 + numberRight * 10000;
                }

                // console.log(numberRaw, numberLeft, numberRight, letter, number);
                return number;
            }
        } catch (err) {
            console.log(symbol);
            console.log(err);
        }
    }
})();
