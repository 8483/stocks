const fetch = require("node-fetch");
const parse = require("node-html-parser").parse;
const tickers = require("./tickers.js");
const pool = require("./pool.js");

/*
ebitda
earnings growth yoy
free cashflow
*/

(async () => {
    let query = `
        use stocks;
        delete from data;
        ALTER TABLE data AUTO_INCREMENT = 1;
    `;

    await pool.query(query);

    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - data for ${symbol}`);

        let ebitda = await getEbitda(symbol);
        let freeCashflow = await getFreeCashflow(symbol);

        console.log(ebitda);
        console.log(freeCashflow);
    }

    async function getEbitda(symbol) {
        let url = `https://stockanalysis.com/stocks/${symbol}/financials/?period=trailing`;

        console.log(url);

        let response = await fetch(url);
        let raw = await response.text();

        const root = parse(raw);

        let table = root.querySelectorAll("#fintable tbody tr");

        if (table[13]) {
            let incomeElements = table[13].childNodes;
            let value = incomeElements[2].rawAttrs.split('"')[1];
            let ebitda = value ? parseInt(value.replace(/,/g, "")) : null;
            return ebitda;
        }

        // console.log(ebitda);
    }

    async function getFreeCashflow(symbol) {
        let url = `https://stockanalysis.com/stocks/${symbol}/financials/cash-flow-statement/?period=trailing`;

        let response = await fetch(url);
        let raw = await response.text();

        const root = parse(raw);

        let table = root.querySelectorAll("#fintable tbody tr");

        if (table[16]) {
            let incomeElements = table[16].childNodes;
            let value = incomeElements[2].rawAttrs.split('"')[1];
            let freeCashflow = value ? parseInt(value.replace(/,/g, "")) : null;
            return freeCashflow;
        }

        // console.log(ebitda);
    }

    getEbitda("gme");
    getFreeCashflow("gme");
})();
