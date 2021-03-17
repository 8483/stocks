const fetch = require("node-fetch");
const parse = require("node-html-parser").parse;
const tickers = require("./tickers.js");
const pool = require("./pool.js");

(async () => {
    let query = `
    use stocks;
    select symbol from history;
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
            let data = await getHistory(symbol);

            if (data) {
                for (let j = 0; j < data.length; j++) {
                    let query = `
                        insert into history
                            (symbol, period, revenue, netIncome, ebitda, timestamp)
                        values
                            (?, ?, ?, ?, ?, now())
                    `;
                    await pool.query(query, [symbol, data[j].period, data[j].revenue, data[j].netIncome, data[j].ebitda]);
                }
                message = "inserting +++";
            } else {
                message = "NO DATA ???";
            }
        }

        let progress = Math.round(((i + 1) / tickers.length) * 100);
        console.log(`${progress}% - ${i + 1}/${tickers.length} - history for ${symbol} - ${message}`);
    }

    async function getHistory(symbol) {
        try {
            let url = `https://www.barchart.com/stocks/quotes/${symbol}/income-statement/annual`;

            let response = await fetch(url);
            let raw = await response.text();

            const root = parse(raw);

            let table = root.querySelectorAll("table");

            // the 1 is to ignore redirections when no income statements
            if (table && table.length == 1) {
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

                function getValue(string) {
                    if (data.filter((item) => item[0] == string).length > 0) {
                        let values = data
                            .filter((item) => item[0] == string)[0]
                            .slice(1, 6)
                            .map((value) => {
                                return value.replace(/\$/g, ""); // remove $ sign
                            })
                            .map((value) => {
                                return value == "N/A" ? 0 : parseInt(value.replace(/,/g, "")) * 1000; // convert to number thousands
                            });
                        // console.log(string, values);
                        return values;
                    }
                }

                let periods = data[0];
                periods.shift();
                let revenues = getValue("Sales");
                let ebitdas = getValue("Ebitda");
                let netIncomes = getValue("Net Income");

                // console.log(revenues);
                // console.log(ebitdas);
                // console.log(netIncomes);

                let result = periods.map((item, i) => {
                    return {
                        period: item,
                        revenue: revenues ? revenues[i] : null,
                        ebitda: ebitdas ? ebitdas[i] : null,
                        netIncome: netIncomes ? netIncomes[i] : null,
                    };
                });

                return result;
            }
        } catch (err) {
            console.log(symbol);
            console.log(err);
        }
    }
})();
