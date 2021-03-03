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

// filteredCompanies = filteredCompanies.filter((company) => company.symbol == "RKT");

(async () => {
    console.log("CREATING DATABASE...");

    let initDatabase = `
        DROP DATABASE IF EXISTS stocks;
        CREATE DATABASE stocks;

        use stocks;

        CREATE TABLE metrics (
            id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
            symbol VARCHAR(10),

            name VARCHAR(255),
            description TEXT,
            industry VARCHAR(255),
            sector VARCHAR(255),

            currentPrice DECIMAL(50, 2),
            regularMarketOpen DECIMAL(50, 2),
            preMarketPrice DECIMAL(50, 2),
            regularMarketPreviousClose DECIMAL(50, 2),
            fiftyDayAverage DECIMAL(50, 2),
            twoHundredDayAverage DECIMAL(50, 2),
            fiftyTwoWeekHigh DECIMAL(50, 2),
            fiftyTwoWeekLow DECIMAL(50, 2),

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

            revenueGrowthYoy DECIMAL(50, 2),
            earningsGrowthYoy DECIMAL(50, 2),
            revenueQuarterlyGrowthYoy DECIMAL(50, 2),
            earningsQuarterlyGrowthYoy DECIMAL(50, 2),

            ebitda BIGINT,

            returnOnAssets DECIMAL(50, 2),
            returnOnEquity DECIMAL(50, 2),

            totalCash BIGINT,
            freeCashflow BIGINT,

            debtToEquity DECIMAL(50, 2),

            timestamp DATETIME
        );

        CREATE TABLE prices (
            id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,

            symbol VARCHAR(10),
            date DATE,

            open DECIMAL(50, 2),
            high DECIMAL(50, 2),
            low DECIMAL(50, 2),
            close DECIMAL(50, 2),
            adjustedClose DECIMAL(50, 2),
            volume BIGINT,

            timestamp DATETIME
        );
    `;

    await pool.query(initDatabase);

    // Execution time ~ 6 min.
    // 100 companies in 22 seconds = 4 companies / second. 1,700 companies in 425 seconds i.e. 7 minutes.
    for (let i = 0; i < filteredCompanies.length; i++) {
        let company = filteredCompanies[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / filteredCompanies.length) * 100);

        console.log(`${progress}% - ${i + 1}/${filteredCompanies.length} - ${symbol}`);

        // 7 minutes
        await getMetrics(symbol);

        // 17 minutes
        await getPrices(symbol);
    }

    async function getMetrics(symbol) {
        try {
            let modules = ["summaryDetail", "defaultKeyStatistics", "financialData", "summaryProfile", "price", "earnings"];

            // https://query1.finance.yahoo.com/v10/finance/quoteSummary/ABR?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData%2CsummaryProfile%2Cprice%2Cearnings

            let url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules.join("%2C")}`;

            let response = await fetch(url);
            let raw = await response.json();
            let data = raw.quoteSummary.result[0];

            // console.log(data);

            let query = `
                use stocks;
                insert into metrics
                    (
                        symbol,
                        name,
                        description, 
                        industry,
                        sector,

                        currentPrice,
                        regularMarketOpen,
                        preMarketPrice,
                        regularMarketPreviousClose,
                        fiftyDayAverage,
                        twoHundredDayAverage,
                        fiftyTwoWeekHigh,
                        fiftyTwoWeekLow,

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

                        revenueGrowthYoy,
                        earningsGrowthYoy,
                        revenueQuarterlyGrowthYoy,
                        earningsQuarterlyGrowthYoy,

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

                extractValue("financialData", "currentPrice"),
                extractValue("price", "regularMarketOpen"),
                extractValue("price", "preMarketPrice"),
                extractValue("price", "regularMarketPreviousClose"),
                extractValue("summaryDetail", "fiftyDayAverage"),
                extractValue("summaryDetail", "twoHundredDayAverage"),
                extractValue("summaryDetail", "fiftyTwoWeekHigh"),
                extractValue("summaryDetail", "fiftyTwoWeekLow"),

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

                extractValue("financialData", "revenueGrowth"),
                extractValue("financialData", "earningsGrowth"),
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

    async function getPrices(symbol) {
        try {
            let numberOfDays = 60;

            let timestampFrom = Math.floor(Date.now() / 1000) - numberOfDays * 86400;
            let timestampTo = Math.floor(Date.now() / 1000); // 0 is since beginning

            let url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${timestampFrom}&period2=${timestampTo}&interval=1d&events=history`;

            let response = await fetch(url);
            let csv = await response.text();
            let data = csv.split(/\r?\n/);

            // remove csv header row
            data.shift();

            let prices = data.map((item) => {
                let parts = item.split(",");

                return {
                    date: parts[0],
                    open: parts[1],
                    high: parts[2],
                    low: parts[3],
                    close: parts[4],
                    adjustedClose: parts[5],
                    volume: parts[6],
                };
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
                            adjustedClose,
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
                            ?,
                            now()
                        );
                `;

                let data = [symbol, price.date, price.open, price.high, price.low, price.close, price.adjustedClose, price.volume];

                await pool.query(query, data);
            }
        } catch (err) {
            console.log(err);
        }
    }
})();
