const fetch = require("node-fetch");
const parse = require("node-html-parser").parse;
const tickers = require("./tickers.js");
const pool = require("./pool.js");

(async () => {
    let query = `
        use stocks;
        select symbol from rating;
    `;

    let result = await pool.query(query);
    let insertedTickersRaw = result[1];
    let insertedTickers = insertedTickersRaw.map((item) => item.symbol);

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let message = "";

        if (insertedTickers.includes(symbol)) {
            message = "skipping ...";
        } else {
            let data = await getRating(symbol);

            console.log(data);

            // let query = `
            //     insert into forecast
            //         (symbol, revenueCurrentYear, revenueNextYear, timestamp)
            //     values
            //         (?, ?, ?, now())
            // `;

            // if (data) {
            //     await pool.query(query, [symbol, data.revenueCurrentYear, data.revenueNextYear]);
            //     message = "inserting +++";
            // } else {
            //     await pool.query(query, [symbol, null, null]);
            //     message = "NO DATA ???";
            // }
        }

        let progress = Math.round(((i + 1) / tickers.length) * 100);
        console.log(`${progress}% - ${i + 1}/${tickers.length} - rating for ${symbol} - ${message}`);
    }

    async function getRating(symbol) {
        try {
            let url = `https://finance.yahoo.com/quote/${symbol}/analysis`;

            let response = await fetch(url);
            let raw = await response.text();

            const root = parse(raw);

            let element = root.querySelectorAll('div[data-test="rec-rating-txt"]');

            console.log(element);
        } catch (err) {
            console.log(symbol);
            console.log(err);
        }
    }
})();
