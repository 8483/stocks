const mysql = require("mysql");
const util = require("util");

const config = require("./config.js");

const pool = mysql.createPool(config);

pool.query = util.promisify(pool.query);

module.exports = pool;
