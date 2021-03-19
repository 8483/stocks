const fetch = require("node-fetch");
const tickers = require("./tickers.js");
const pool = require("./pool.js");

(async () => {
    let query = `
        use stocks;
        select symbol from metrics;
    `;

    let result = await pool.query(query);
    let insertedTickersRaw = result[1];
    let insertedTickers = insertedTickersRaw.map((item) => item.symbol);

    // 5,741 tickers in 24 minutes = 240 tickers/min
    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;
        let country = company.country;
        let ipoYear = company.ipoYear;

        let message = "";

        if (insertedTickers.includes(symbol)) {
            message = "skipping ...";
        } else {
            let data = await getMetrics(symbol);

            try {
                let query = `
                    use stocks;
                    insert into metrics
                        (
                            symbol,
                            name,
                            description, 
                            industry,
                            sector,
                            country,
                            ipoYear,

                            beta,
                            currentPrice,
                            regularMarketOpen,
                            preMarketPrice,
                            regularMarketPreviousClose,
                            fiftyDayAverage,
                            twoHundredDayAverage,
                            fiftyTwoWeekHigh,
                            fiftyTwoWeekLow,

                            regularMarketVolume,
                            averageDailyVolume10Day,
                            averageDailyVolume3Month,

                            marketCap,
                            enterpriseValue,
                            totalRevenue,
                            enterpriseToRevenue,
                            ebitda,
                            enterpriseToEbitda,
                            profitMargins,

                            revenueGrowthYoy,
                            earningsGrowthYoy,
                            revenueQuarterlyGrowthYoy,
                            earningsQuarterlyGrowthYoy,

                            trailingEps,
                            trailingPe,
                            forwardPe,
                            pegRatio,
                            bookValue,
                            priceToBook,
                            returnOnAssets,
                            returnOnEquity,

                            totalCash,
                            freeCashflow,
                            currentRatio,
                            debtToEquity,
                            totalDebt,

                            sharesOutstanding,
                            floatShares,
                            sharesShort,
                            sharesShortPriorMonth,
                            shortRatio,
                            shortPercentOfFloat,

                            lastFiscalYearEnd,
                            nextFiscalYearEnd,

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
                    country,
                    ipoYear,

                    extractValue("summaryDetail", "beta"),
                    extractValue("financialData", "currentPrice"),
                    extractValue("price", "regularMarketOpen"),
                    extractValue("price", "preMarketPrice"),
                    extractValue("price", "regularMarketPreviousClose"),
                    extractValue("summaryDetail", "fiftyDayAverage"),
                    extractValue("summaryDetail", "twoHundredDayAverage"),
                    extractValue("summaryDetail", "fiftyTwoWeekHigh"),
                    extractValue("summaryDetail", "fiftyTwoWeekLow"),

                    extractValue("price", "regularMarketVolume"),
                    extractValue("price", "averageDailyVolume10Day"),
                    extractValue("price", "averageDailyVolume3Month"),

                    extractValue("summaryDetail", "marketCap"),
                    extractValue("defaultKeyStatistics", "enterpriseValue"),
                    extractValue("financialData", "totalRevenue"),
                    extractValue("defaultKeyStatistics", "enterpriseToRevenue"),
                    extractValue("financialData", "ebitda"),
                    extractValue("defaultKeyStatistics", "enterpriseToEbitda"),
                    extractValue("financialData", "profitMargins"),

                    extractValue("financialData", "revenueGrowth"),
                    extractValue("financialData", "earningsGrowth"),
                    extractValue("defaultKeyStatistics", "revenueQuarterlyGrowth"),
                    extractValue("defaultKeyStatistics", "earningsQuarterlyGrowth"),

                    extractValue("defaultKeyStatistics", "trailingEps"),
                    extractValue("summaryDetail", "trailingPE"),
                    extractValue("summaryDetail", "forwardPE"),
                    extractValue("defaultKeyStatistics", "pegRatio"),
                    extractValue("defaultKeyStatistics", "bookValue"),
                    extractValue("defaultKeyStatistics", "priceToBook"),
                    extractValue("financialData", "returnOnAssets"),
                    extractValue("financialData", "returnOnEquity"),

                    extractValue("financialData", "totalCash"),
                    extractValue("financialData", "freeCashflow"),
                    extractValue("financialData", "currentRatio"),
                    extractValue("financialData", "debtToEquity"),
                    extractValue("financialData", "totalDebt"),

                    extractValue("defaultKeyStatistics", "sharesOutstanding"),
                    extractValue("defaultKeyStatistics", "floatShares"),
                    extractValue("defaultKeyStatistics", "sharesShort"),
                    extractValue("defaultKeyStatistics", "sharesShortPriorMonth"),
                    extractValue("defaultKeyStatistics", "shortRatio"),
                    extractValue("defaultKeyStatistics", "shortPercentOfFloat"),

                    data.defaultKeyStatistics ? data.defaultKeyStatistics.lastFiscalYearEnd.fmt : null,
                    data.defaultKeyStatistics ? data.defaultKeyStatistics.nextFiscalYearEnd.fmt : null,
                ];

                function extractValue(module, metric) {
                    return data[module] && data[module][metric] ? data[module][metric].raw : null;
                }

                if (data) {
                    await pool.query(query, stockData);
                    message = "inserting +++";
                } else {
                    message = "NO DATA ???";
                }
            } catch (err) {
                console.log(symbol);
                console.log(err);
            }
        }

        let progress = Math.round(((i + 1) / tickers.length) * 100);
        console.log(`${progress}% - ${i + 1}/${tickers.length} - metrics for ${symbol} - ${message}`);
    }

    async function getMetrics(symbol) {
        try {
            let modules = ["summaryDetail", "defaultKeyStatistics", "financialData", "summaryProfile", "price", "earnings"];

            // https://query1.finance.yahoo.com/v10/finance/quoteSummary/ABR?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData%2CsummaryProfile%2Cprice%2Cearnings

            let url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules.join("%2C")}`;

            let response = await fetch(url);
            let raw = await response.json();
            let data = raw.quoteSummary.result[0];

            return data;
        } catch (err) {
            console.log(err);
        }
    }
})();
