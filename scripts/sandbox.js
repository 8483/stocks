const MACD = require("technicalindicators").MACD;

let prices = [
    133.11, 133.5, 131.94, 134.32, 134.72, 134.39, 133.58, 133.48, 131.46, 132.54, 127.85, 128.1, 129.74, 130.21, 126.85, 125.91, 122.77, 124.97, 127.45, 126.27, 124.85, 124.69, 127.31, 125.43, 127.1, 126.9, 126.85, 125.28, 124.61, 124.28, 125.06, 123.54, 125.89, 125.9, 126.74, 127.13, 126.11,
    127.35, 130.48, 129.64, 130.15, 131.79, 130.46, 132.3, 133.98, 133.7, 133.41, 133.11, 134.78, 136.33, 136.96, 137.27, 139.96,
];

var macds = MACD.calculate({
    values: prices,
    fastPeriod: 12, // last 12 prices
    slowPeriod: 26, // last 26 prices
    signalPeriod: 9, // last 9 prices
    SimpleMAOscillator: false,
    SimpleMASignal: false,
});

console.log(macds);
