const fetch = require("node-fetch");
const tickers = require("./tickers.js");
const pool = require("../pool.js");

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
                            postMarketPrice,
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

                            dividendRate,
                            dividendYield,
                            dividendDate,

                            recommendationMean,
                            recommendationKey,
                            targetLowPrice,
                            targetMeanPrice,
                            targetMedianPrice,
                            targetHighPrice,

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

                    extractRaw("summaryDetail", "beta"),
                    extractRaw("financialData", "currentPrice"),
                    extractRaw("price", "regularMarketOpen"),
                    extractRaw("price", "preMarketPrice"),
                    extractRaw("price", "postMarketPrice"),
                    extractRaw("price", "regularMarketPreviousClose"),
                    extractRaw("summaryDetail", "fiftyDayAverage"),
                    extractRaw("summaryDetail", "twoHundredDayAverage"),
                    extractRaw("summaryDetail", "fiftyTwoWeekHigh"),
                    extractRaw("summaryDetail", "fiftyTwoWeekLow"),

                    extractRaw("price", "regularMarketVolume"),
                    extractRaw("price", "averageDailyVolume10Day"),
                    extractRaw("price", "averageDailyVolume3Month"),

                    extractRaw("summaryDetail", "marketCap"),
                    extractRaw("defaultKeyStatistics", "enterpriseValue"),
                    extractRaw("financialData", "totalRevenue"),
                    extractRaw("defaultKeyStatistics", "enterpriseToRevenue"),
                    extractRaw("financialData", "ebitda"),
                    extractRaw("defaultKeyStatistics", "enterpriseToEbitda"),
                    extractRaw("financialData", "profitMargins"),

                    extractRaw("financialData", "revenueGrowth"),
                    extractRaw("financialData", "earningsGrowth"),
                    extractRaw("defaultKeyStatistics", "revenueQuarterlyGrowth"),
                    extractRaw("defaultKeyStatistics", "earningsQuarterlyGrowth"),

                    extractRaw("defaultKeyStatistics", "trailingEps"),
                    extractRaw("summaryDetail", "trailingPE"),
                    extractRaw("summaryDetail", "forwardPE"),
                    extractRaw("defaultKeyStatistics", "pegRatio"),
                    extractRaw("defaultKeyStatistics", "bookValue"),
                    extractRaw("defaultKeyStatistics", "priceToBook"),
                    extractRaw("financialData", "returnOnAssets"),
                    extractRaw("financialData", "returnOnEquity"),

                    extractRaw("financialData", "totalCash"),
                    extractRaw("financialData", "freeCashflow"),
                    extractRaw("financialData", "currentRatio"),
                    extractRaw("financialData", "debtToEquity"),
                    extractRaw("financialData", "totalDebt"),

                    extractRaw("defaultKeyStatistics", "sharesOutstanding"),
                    extractRaw("defaultKeyStatistics", "floatShares"),
                    extractRaw("defaultKeyStatistics", "sharesShort"),
                    extractRaw("defaultKeyStatistics", "sharesShortPriorMonth"),
                    extractRaw("defaultKeyStatistics", "shortRatio"),
                    extractRaw("defaultKeyStatistics", "shortPercentOfFloat"),

                    data.defaultKeyStatistics ? data.defaultKeyStatistics.lastFiscalYearEnd.fmt : null,
                    data.defaultKeyStatistics ? data.defaultKeyStatistics.nextFiscalYearEnd.fmt : null,

                    extractRaw("summaryDetail", "dividendRate"),
                    extractRaw("summaryDetail", "dividendYield"),
                    extractFormatted("summaryDetail", "exDividendDate"),

                    extractRaw("financialData", "recommendationMean"),
                    data.financialData && data.financialData.recommendationKey ? data.financialData.recommendationKey : null,
                    extractRaw("financialData", "targetLowPrice"),
                    extractRaw("financialData", "targetMeanPrice"),
                    extractRaw("financialData", "targetMedianPrice"),
                    extractRaw("financialData", "targetHighPrice"),
                ];

                function extractRaw(module, metric) {
                    return data[module] && data[module][metric] ? data[module][metric].raw : null;
                }

                function extractFormatted(module, metric) {
                    return data[module] && data[module][metric] ? data[module][metric].fmt : null;
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
            let modules = ["summaryDetail", "defaultKeyStatistics", "financialData", "summaryProfile", "price"]; // "earnings"

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
