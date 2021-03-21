const fetch = require("node-fetch");
const parse = require("node-html-parser").parse;
const tickers = require("./tickers.js");
const pool = require("./pool.js");

(async () => {
    let query = `
        use stocks;
        select symbol from ttm;
    `;

    let result = await pool.query(query);
    let insertedTickersRaw = result[1];
    let insertedTickers = insertedTickersRaw.map((item) => item.symbol);

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        if (insertedTickers.includes(symbol)) {
            message = "skipping ...";
        } else {
            let data = await getData(symbol);

            let query = `
                insert into ttm
                    (
                        symbol,
                        revenue,
                        ebitda,
                        interestExpense,
                        incomeTaxExpense,
                        incomeBeforeTax,
                        netIncome,
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
                    )
            `;

            if (data) {
                await pool.query(query, [symbol, data.revenue, data.ebitda, data.interestExpense, data.incomeTax, data.incomeBeforeTax, data.income]);
                message = "inserting +++";
            } else {
                await pool.query(query, [symbol, null, null, null, null, null, null]);
                message = "NO DATA ???";
            }
        }

        let progress = Math.round(((i + 1) / tickers.length) * 100);
        console.log(`${progress}% - ${i + 1}/${tickers.length} - ttm for ${symbol} - ${message}`);
    }

    async function getData(symbol) {
        try {
            let url = `https://www.barchart.com/stocks/quotes/${symbol}/income-statement/quarterly`;

            let response = await fetch(url);
            let raw = await response.text();

            const root = parse(raw);

            let table = root.querySelectorAll("table");
            let rows = table[0].childNodes[1].childNodes.filter((item) => item.rawTagName == "tr");

            // console.log(rows);

            let data = rows.map((row) => {
                return row.childNodes
                    .filter((item) => item.rawTagName == "td")
                    .map((item) => {
                        let string = item.childNodes[0].rawText.trim();
                        return string;
                    });
            });

            // console.log(data);

            function getValue(string) {
                if (data.filter((item) => item[0] == string).length > 0) {
                    let values = data
                        .filter((item) => item[0] == string)[0]
                        .slice(1, 5) // last 4 quarters
                        .map((value) => {
                            return value.replace(/\$/g, ""); // remove $ sign
                        })
                        .map((value) => {
                            return value == "N/A" ? 0 : parseInt(value.replace(/,/g, "")) * 1000; // convert to number thousands
                        });
                    let sum = values.reduce((a, b) => a + b); // sum the quarters
                    // console.log(string, values, sum);
                    return sum;
                }
            }

            return {
                revenue: getValue("Sales"),
                ebitda: getValue("Ebitda"),
                income: getValue("Net Income"),
                incomeTax: getValue("Income Tax"),
                incomeBeforeTax: getValue("Pre-tax Income"),
                interestExpense: getValue("Interest Expense"),
            };
        } catch (err) {
            console.log(symbol);
            console.log(err);
        }
    }
})();
