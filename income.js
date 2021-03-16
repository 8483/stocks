const fetch = require("node-fetch");
const parse = require("node-html-parser").parse;
const tickers = require("./tickers.js");
const pool = require("./pool.js");

(async () => {
    let query = `
        use stocks;
        delete from income;
        ALTER TABLE income AUTO_INCREMENT = 1;
    `;

    await pool.query(query);

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - data for ${symbol}`);

        let data = await getData(symbol);

        // console.log(data);

        if (data) {
            let query = `
                insert into income
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
            await pool.query(query, [symbol, data.revenue, data.ebitda, data.income, data.incomeTax, data.incomeBeforeTax, data.interestExpense]);
        }
    }

    async function getData(symbol) {
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
    }
})();
