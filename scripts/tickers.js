const fs = require("fs");

// https://www.nasdaq.com/market-activity/stocks/screener for the csv file, paste in tickers
// DON'T USE A FILTER... Around 7,900 tickers.

let inputFile = `../tickers.csv`;
let input = fs.readFileSync(inputFile, "utf8");
let data = input.split(/\r?\n/);

// remove csv header row
data.shift();

let companies = data.map((item) => {
    let parts = item.split(",");

    let company = {
        symbol: parts[0].trim(),
        name: parts[1],
        // lastSale: parts[2],
        // netChange: parts[3],
        // percentChange: parts[4],
        marketCap: parts[5],
        country: parts[6],
        ipoYear: parts[7],
        // volume: parts[8],
        sector: parts[9],
        industry: parts[10],
    };

    return company;
});

// Around 5,800 tickers after filter.
let filteredCompanies = companies.filter((company) => !company.symbol.includes("/") && !company.symbol.includes("^") && company.marketCap > 0);

// filteredCompanies = filteredCompanies.filter((company) => company.symbol == "RKT");

module.exports = filteredCompanies;
