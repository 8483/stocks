const pool = require("./pool.js");

(async () => {
    try {
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

                beta DECIMAL(50, 2),
                currentPrice DECIMAL(50, 2),
                regularMarketOpen DECIMAL(50, 2),
                preMarketPrice DECIMAL(50, 2),
                regularMarketPreviousClose DECIMAL(50, 2),
                fiftyDayAverage DECIMAL(50, 2),
                twoHundredDayAverage DECIMAL(50, 2),
                fiftyTwoWeekHigh DECIMAL(50, 2),
                fiftyTwoWeekLow DECIMAL(50, 2),

                regularMarketVolume BIGINT,
                averageDailyVolume10Day BIGINT,
                averageDailyVolume3Month BIGINT,

                marketCap BIGINT,
                enterpriseValue BIGINT,
                totalRevenue BIGINT,
                enterpriseToRevenue DECIMAL(50, 2),
                ebitda BIGINT,
                enterpriseToEbitda DECIMAL(50, 2),
                profitMargins DECIMAL(50, 2),

                revenueGrowthYoy DECIMAL(50, 2),
                earningsGrowthYoy DECIMAL(50, 2),
                revenueQuarterlyGrowthYoy DECIMAL(50, 2),
                earningsQuarterlyGrowthYoy DECIMAL(50, 2),

                trailingEps DECIMAL(50, 2),
                trailingPe DECIMAL(50, 2),
                forwardPe DECIMAL(50, 2),
                pegRatio DECIMAL(50, 2),
                bookValue DECIMAL(50, 2),
                priceToBook DECIMAL(50, 2),
                returnOnAssets DECIMAL(50, 2),
                returnOnEquity DECIMAL(50, 2),

                totalCash BIGINT,
                freeCashflow BIGINT,
                currentRatio DECIMAL(50, 2),
                debtToEquity DECIMAL(50, 2),
                totalDebt BIGINT,

                sharesOutstanding BIGINT,
                floatShares BIGINT,
                sharesShort BIGINT,
                sharesShortPriorMonth BIGINT,
                shortRatio DECIMAL(50, 2),
                shortPercentOfFloat DECIMAL(50, 2),

                lastFiscalYearEnd DATE,
                nextFiscalYearEnd DATE,

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

            CREATE TABLE cashflows (
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,

                symbol VARCHAR(10),

                period varchar(10),
                cashflow BIGINT,

                timestamp DATETIME
            );

            CREATE TABLE income (
                id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,

                symbol VARCHAR(10),

                revenue BIGINT,
                ebitda BIGINT,
                interestExpense BIGINT,
                incomeTaxExpense BIGINT,
                incomeBeforeTax BIGINT,
                netIncome BIGINT,

                timestamp DATETIME
            );
        `;

        await pool.query(initDatabase);

        console.log("DATABASE CREATED!");
    } catch (err) {
        console.log(err);
    }
})();
