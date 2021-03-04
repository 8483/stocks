const fetch = require("node-fetch");
const pool = require("./pool.js");
const tickers = require("./tickers.js");

(async () => {
    let query = `
        use stocks;
        delete from metrics;
    `;

    await pool.query(query);

    // Execution time ~ 7 min.
    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - metrics for ${symbol}`);

        await getMetrics(symbol);
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

                        preMarketPrice,
                        currentPrice,
                        regularMarketOpen,
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
                        enterpriseToRevenue,
                        enterpriseToEbitda,
                        priceToBook,

                        bookValue,

                        revenueGrowthYoy,
                        earningsGrowthYoy,
                        revenueQuarterlyGrowthYoy,
                        earningsQuarterlyGrowthYoy,

                        totalRevenue,
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
                extractValue("defaultKeyStatistics", "enterpriseToRevenue"),
                extractValue("defaultKeyStatistics", "enterpriseToEbitda"),
                extractValue("defaultKeyStatistics", "priceToBook"),

                extractValue("defaultKeyStatistics", "bookValue"),

                extractValue("financialData", "revenueGrowth"),
                extractValue("financialData", "earningsGrowth"),
                extractValue("defaultKeyStatistics", "revenueQuarterlyGrowth"),
                extractValue("defaultKeyStatistics", "earningsQuarterlyGrowth"),

                extractValue("financialData", "totalRevenue"),
                extractValue("financialData", "ebitda"),

                extractValue("financialData", "returnOnAssets"),
                extractValue("financialData", "returnOnEquity"),

                extractValue("financialData", "totalCash"),
                extractValue("financialData", "freeCashflow"),

                extractValue("financialData", "debtToEquity"),
            ];

            function extractValue(module, metric) {
                return data[module] && data[module][metric] ? data[module][metric].raw : null;
            }

            await pool.query(query, stockData);
        } catch (err) {
            console.log(err);
        }
    }
})();
