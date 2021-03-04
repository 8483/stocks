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

            forecast decimal(50, 2),
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
            enterpriseToRevenue DECIMAL(50, 2),
            enterpriseToEbitda DECIMAL(50, 2),
            priceToBook DECIMAL(50, 2),

            bookValue DECIMAL(50, 2),

            revenueGrowthYoy DECIMAL(50, 2),
            earningsGrowthYoy DECIMAL(50, 2),
            revenueQuarterlyGrowthYoy DECIMAL(50, 2),
            earningsQuarterlyGrowthYoy DECIMAL(50, 2),

            totalRevenue BIGINT,
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

        console.log("DATABASE CREATED!");
    } catch (err) {
        console.log(err);
    }
})();
