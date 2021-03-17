const fetch = require("node-fetch");
const parse = require("node-html-parser").parse;
const tickers = require("../tickers.js");
const pool = require("../pool.js");

(async () => {
    let query = `
        use stocks;
        delete from cashflows;
        ALTER TABLE cashflows AUTO_INCREMENT = 1;
    `;

    await pool.query(query);

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - cashflow for ${symbol}`);

        let freeCashflows = await getFreeCashflows(symbol);

        if (freeCashflows) {
            for (let j = 0; j < freeCashflows.length; j++) {
                let query = `
                    insert into cashflows 
                        (symbol, period, cashflow, timestamp)
                    values
                        (?, ?, ?, now())
                `;
                await pool.query(query, [symbol, freeCashflows[j].period, freeCashflows[j].cashflow]);
            }
        }
    }

    async function getFreeCashflows(symbol) {
        let url = `https://www.barchart.com/stocks/quotes/${symbol}/cash-flow/annual`;

        let response = await fetch(url);
        let raw = await response.text();

        const root = parse(raw);
        // console.log(root);

        let dates = [];
        let datesElement = root.querySelectorAll("tr.bc-financial-report__row-dates");
        if (datesElement && datesElement.length > 0) {
            let dateCells = datesElement[0].childNodes.filter((item) => item.rawTagName == "td");
            dateCells.shift();
            dateCells.map((item) => {
                let date = item.childNodes[0].rawText.trim();
                dates.push(date);
            });

            let cashflows = [];
            let elements = root.querySelectorAll("tr.odd");

            let rows = elements[elements.length - 1].childNodes;
            let cells = rows.filter((item) => item.rawTagName == "td");
            cells.shift();
            cells.map((item) => {
                let string = item.childNodes[0].rawText;
                let value = parseInt(string.replace(/,/g, "")) * 1000;
                cashflows.push(value);
            });

            let data = dates.map((date, i) => {
                return {
                    period: date,
                    cashflow: !isNaN(cashflows[i]) ? cashflows[i] : null,
                };
            });

            return data;
        }
    }
})();
