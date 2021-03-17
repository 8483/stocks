const pool = require("../pool.js");
const ts = require("timeseries-analysis");
const tickers = require("../tickers.js");

(async () => {
    // let query = `
    //     use stocks;
    //     delete from prices;
    // `;

    // await pool.query(query);

    // Execution time ~ 13 min.
    for (let i = 0; i < tickers.length; i++) {
        let company = tickers[i];
        let symbol = company.symbol;

        let progress = Math.round(((i + 1) / tickers.length) * 100);

        console.log(`${progress}% - ${i + 1}/${tickers.length} - prices for ${symbol}`);

        await forecast(symbol);
    }

    async function forecast(symbol) {
        try {
            let query = `
                select * from stocks.prices
                where symbol = ?
            `;

            let prices = await pool.query(query, [symbol]);

            // console.log(prices[prices.length - 1]);

            // console.log(prices);

            let data = prices.map((item) => item.adjustedClose);

            // Load the data
            // Formats the data into [ date, value ]
            let t = new ts.main(ts.adapter.fromArray(data));

            // console.log(t);

            // Generate trend
            t.dsp_itrend({ alpha: 0.7 }).smoother({ period: 2 }).save("dsp");

            function predict(pastDataPoints, futureDataPoint) {
                let dataPoints = data.length;
                // console.log("Data points:", dataPoints)

                // Last N data points
                let slicedData = t.data.slice(dataPoints - pastDataPoints, dataPoints);
                // console.log(slicedData)

                // We calculate the AR coefficients of the last N points
                let coeffs = t.ARMaxEntropy({
                    degree: 7,
                    data: slicedData,
                });

                // console.log(coeffs)

                // Forecast the specified period after the last N data points
                let forecastDatapoint = slicedData.length + futureDataPoint;
                // console.log("Forecast data point:", forecastDatapoint)

                // Now, we calculate the forecasted value of that N + 1 datapoint using the AR coefficients:
                let forecast = 0; // Init the value at 0.
                for (let i = 0; i < coeffs.length; i++) {
                    // Loop through the coefficients
                    // forecast -= t.data[10 - i][1] * coeffs[i];
                    // Explanation for that line:
                    // t.data contains the current dataset, which is in the format [ [date, value], [date,value], ... ]
                    // For each coefficient, we substract from "forecast" the value of the "N - x" datapoint's value, multiplicated by the coefficient,
                    // where N is the last known datapoint value, and x is the coefficient's index.
                    let value = t.data[forecastDatapoint - i][1];
                    // console.log(value)
                    forecast -= Math.round(value * coeffs[i]);
                }

                return forecast;
            }

            let chartObject = {
                type: "bar",
                data: {
                    datasets: [
                        {
                            label: "Prices",
                            data: [],
                            fill: false,
                            backgroundColor: "rgba(0, 0, 0, 0.3)",
                            order: 2,
                        },
                        {
                            label: "Trend",
                            data: [],
                            type: "line",
                            fill: false,
                            borderWidth: 1,
                            backgroundColor: "rgba(0, 0, 0, 1)",
                            borderColor: "rgba(0, 0, 0, 1)",
                            pointRadius: 0,
                            order: 1,
                        },
                    ],
                },
                options: {
                    title: {
                        display: true,
                        text: `${symbol}`,
                    },
                    scales: {
                        xAxes: [
                            {
                                type: "category",
                                labels: [],
                                stacked: true,
                                ticks: {
                                    fontSize: 6,
                                },
                                gridLines: {
                                    color: "rgba(0, 0, 0, 0.1)",
                                },
                            },
                        ],
                        yAxes: [
                            {
                                position: "right",
                                stacked: false,
                                // ticks: {
                                //     stepSize: 100
                                // },
                                gridLines: {
                                    color: "rgba(0, 0, 0, 0.1)",
                                },
                            },
                        ],
                    },
                },
            };

            // Add X Axis labels
            prices.map((item) => {
                let date = item.date.toISOString().split("T")[0];
                chartObject.options.scales.xAxes[0].labels.push(date);
            });

            // Populate prices
            prices.map((item) => {
                chartObject.data.datasets[0].data.push(item.adjustedClose);
            });

            // Populate Trend data
            t.data.map((item) => {
                chartObject.data.datasets[1].data.push(Math.round(item[1]));
            });

            let forecast = predict(30, 1);

            // console.log(chartObject.data.datasets[0].data);
            // console.log(forecast);

            chartObject.options.scales.xAxes[0].labels.push("x");
            chartObject.data.datasets[0].data.push(forecast);

            // console.log(chartObject.data.datasets[0].data);

            let forecastQuery = `
                update stocks.metrics
                set forecast = ?
                where symbol = ?;
            `;

            await pool.query(forecastQuery, [forecast, symbol]);

            // console.log(chartObject.data);

            const json = JSON.stringify(chartObject);
            const url_escaped_json = encodeURIComponent(json);

            let url = { url: `https://quickchart.io/chart?w=1000&bkg=white&c=${url_escaped_json}` };

            console.log(url);
        } catch (err) {
            console.log(err);
        }
    }
})();
