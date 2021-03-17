const fetch = require("node-fetch");
const pool = require("../pool.js");
const tickers = require("../tickers.js");

(async () => {
    let query = `
        use stocks;
        delete from metrics;
        ALTER TABLE metrics AUTO_INCREMENT = 1;
    `;

    await pool.query(query);

    // 5,741 tickers in 24 minutes = 240 tickers/min
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

                        now()
                    );
            `;

            let stockData = [
                symbol,
                data.price.shortName,
                data.summaryProfile ? data.summaryProfile.longBusinessSummary : null,
                data.summaryProfile ? data.summaryProfile.industry : null,
                data.summaryProfile ? data.summaryProfile.sector : null,

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

            await pool.query(query, stockData);
        } catch (err) {
            console.log(err);
        }
    }
})();
