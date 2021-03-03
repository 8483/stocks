const fs = require("fs");
const mysql = require("mysql");
const util = require("util");
const fetch = require("node-fetch");

const db = require("./db.js");

const pool = mysql.createPool(db);

pool.query = util.promisify(pool.query);

// https://www.nasdaq.com/market-activity/stocks/screener for the csv file, paste in tickers
// NYSE USA ~ 1,800 tickers i.e. 4 days to cover them all
let inputFile = `tickers.csv`;
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

let filteredCompanies = companies.filter((company) => !company.symbol.includes("/") && !company.symbol.includes("^") && company.marketCap > 0);

(async () => {
    console.log("CREATING DATABASE...");

    let initDatabase = `
        use finance;

        DROP DATABASE IF EXISTS finance;
        CREATE DATABASE finance;

        use finance;

        CREATE TABLE overview (
            id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
            symbol VARCHAR(10),

            name VARCHAR(255),
            description TEXT,
            industry VARCHAR(255),
            sector VARCHAR(255),

            marketCap BIGINT,

            sharesOutstanding BIGINT,
            floatShares BIGINT,
            sharesShort BIGINT,
            sharesShortPriorMonth BIGINT,
            shortRatio DECIMAL(50, 2),
            shortPercentOfFloat DECIMAL(50, 2),

            enterpriseValue BIGINT,
            trailingPe DECIMAL(50, 2),
            forwardPe DECIMAL(50, 2),
            pegRatio DECIMAL(50, 2),
            enterpriseToEbitda DECIMAL(50, 2),
            priceToBook DECIMAL(50, 2),

            bookValue DECIMAL(50, 2),

            revenueQuarterlyGrowth DECIMAL(50, 2),
            earningsQuarterlyGrowth DECIMAL(50, 2),

            ebitda BIGINT,

            returnOnAssets DECIMAL(50, 2),
            returnOnEquity DECIMAL(50, 2),

            totalCash BIGINT,
            freeCashflow BIGINT,

            debtToEquity DECIMAL(50, 2),

            timestamp DATETIME
        );
    `;

    await pool.query(initDatabase);

    // 100 companies in 22 seconds = 4 companies / second. 1,700 companies in 425 seconds i.e. 7 minutes.
    for (let i = 0; i < filteredCompanies.length; i++) {
        let company = filteredCompanies[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / filteredCompanies.length) * 100);

        console.log(`${progress}% - ${i + 1}/${filteredCompanies.length} - ${symbol}`);

        await getData(symbol);

        console.log("\n");
    }

    async function getData(symbol) {
        try {
            let modules = ["summaryDetail", "defaultKeyStatistics", "financialData", "summaryProfile", "price", "earnings"];

            let url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules.join("%2C")}`;

            console.log(url);

            let response = await fetch(url);
            let raw = await response.json();
            let data = raw.quoteSummary.result[0];

            // console.log(data);

            let query = `
                use finance;
                insert into overview
                    (
                        symbol,
                        name,
                        description, 
                        industry,
                        sector,

                        marketCap,

                        sharesOutstanding,
                        floatShares,
                        sharesShort,
                        sharesShortPriorMonth,
                        shortRatio,
                        shortPercentOfFloat,

                        enterpriseValue,
                        trailingPe,
                        forwardPe,
                        pegRatio,
                        enterpriseToEbitda,
                        priceToBook,

                        bookValue,

                        revenueQuarterlyGrowth,
                        earningsQuarterlyGrowth,

                        ebitda,

                        returnOnAssets,
                        returnOnEquity,

                        totalCash,
                        freeCashflow,

                        debtToEquity,

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
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,

                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,

                        ?,

                        ?,
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

            let stockData = [
                symbol,

                data.price.shortName,
                data.summaryProfile ? data.summaryProfile.longBusinessSummary : null,
                data.summaryProfile ? data.summaryProfile.industry : null,
                data.summaryProfile ? data.summaryProfile.sector : null,

                extractValue("summaryDetail", "marketCap"),

                extractValue("defaultKeyStatistics", "sharesOutstanding"),
                extractValue("defaultKeyStatistics", "floatShares"),
                extractValue("defaultKeyStatistics", "sharesShort"),
                extractValue("defaultKeyStatistics", "sharesShortPriorMonth"),
                extractValue("defaultKeyStatistics", "shortRatio"),
                extractValue("defaultKeyStatistics", "shortPercentOfFloat"),

                extractValue("defaultKeyStatistics", "enterpriseValue"),
                extractValue("summaryDetail", "trailingPE"),
                extractValue("summaryDetail", "forwardPE"),
                extractValue("defaultKeyStatistics", "pegRatio"),
                extractValue("defaultKeyStatistics", "enterpriseToEbitda"),
                extractValue("defaultKeyStatistics", "priceToBook"),

                extractValue("defaultKeyStatistics", "bookValue"),

                extractValue("defaultKeyStatistics", "revenueQuarterlyGrowth"),
                extractValue("defaultKeyStatistics", "earningsQuarterlyGrowth"),

                extractValue("financialData", "ebitda"),

                extractValue("financialData", "returnOnAssets"),
                extractValue("financialData", "returnOnEquity"),

                extractValue("financialData", "totalCash"),
                extractValue("financialData", "freeCashflow"),

                extractValue("financialData", "debtToEquity"),
            ];

            // console.log(stockData);

            function extractValue(module, metric) {
                return data[module] && data[module][metric] ? data[module][metric].raw : null;
            }

            await pool.query(query, stockData);
        } catch (err) {
            console.log(err);
        }
    }
})();
