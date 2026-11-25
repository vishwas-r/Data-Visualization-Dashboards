/* Downloads real daily stock history into data/stocks/<SYMBOL>.json (about 5 years of { date, open, high, low, close, volume }).
 *
 *   node scripts/download-stock-history.js                 downloads the default symbols
 *   node scripts/download-stock-history.js AAPL MSFT TSLA  downloads the symbols you list
 *
 * Needs Node 18 or newer (built-in fetch). No API key, no signup.
 * Source: Yahoo Finance's public chart endpoint, with Stooq's CSV download as the fallback. Both are unofficial for programmatic use
 * and meant for personal use: check their terms, and use a licensed provider for anything you publish or sell.
 */
var fileSystem = require("fs");
var path = require("path");

var defaultSymbols = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "JPM"];
var outputFolder = path.join(__dirname, "..", "data", "stocks");
var requestHeaders = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36", "Accept": "application/json,text/csv,*/*" };

function isNullOrUndefined(value) {
  return (value === null || value === undefined);
}

function formatDate(secondsSinceEpoch, offsetSeconds) {
  return new Date((secondsSinceEpoch + offsetSeconds) * 1000).toISOString().slice(0, 10);
}

/* Yahoo chart JSON: chart.result[0] has meta, timestamp[] and indicators.quote[0].{open,high,low,close,volume}[]. */
function parseYahooChart(responseBody) {
  var result = (responseBody && responseBody.chart && responseBody.chart.result) ? responseBody.chart.result[0] : null;
  var quote = null;
  var offsetSeconds = 0;
  var candles = [];

  if(isNullOrUndefined(result) || isNullOrUndefined(result.timestamp) || isNullOrUndefined(result.indicators) || isNullOrUndefined(result.indicators.quote[0])) {
    throw new Error("unexpected response from Yahoo");
  }

  quote = result.indicators.quote[0];
  offsetSeconds = isNullOrUndefined(result.meta.gmtoffset) ? 0 : result.meta.gmtoffset;

  for(var i = 0; i < result.timestamp.length; i++) {
    if(!isNullOrUndefined(quote.close[i]) && !isNullOrUndefined(quote.open[i]) && !isNullOrUndefined(quote.high[i]) && !isNullOrUndefined(quote.low[i])) {
      candles.push({
        date: formatDate(result.timestamp[i], offsetSeconds),
        open: Math.round(quote.open[i] * 10000) / 10000,
        high: Math.round(quote.high[i] * 10000) / 10000,
        low: Math.round(quote.low[i] * 10000) / 10000,
        close: Math.round(quote.close[i] * 10000) / 10000,
        volume: isNullOrUndefined(quote.volume[i]) ? 0 : quote.volume[i]
      });
    }
  }

  return { name: isNullOrUndefined(result.meta.longName) ? (isNullOrUndefined(result.meta.shortName) ? result.meta.symbol : result.meta.shortName) : result.meta.longName, candles: candles };
}

/* Stooq CSV: Date,Open,High,Low,Close,Volume */
function parseStooqCsv(csvText) {
  var lines = csvText.split("\n");
  var candles = [];
  var fields = null;

  if(lines[0].toLowerCase().indexOf("date,open,high,low,close") !== 0) {
    throw new Error("unexpected response from Stooq");
  }

  for(var i = 1; i < lines.length; i++) {
    fields = lines[i].replace("\r", "").split(",");

    if(fields.length >= 5 && fields[0] !== "") {
      candles.push({ date: fields[0], open: Number(fields[1]), high: Number(fields[2]), low: Number(fields[3]), close: Number(fields[4]), volume: isNullOrUndefined(fields[5]) ? 0 : Number(fields[5]) });
    }
  }

  return { name: "", candles: candles };
}

function downloadFromYahoo(symbol) {
  return fetch("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?range=5y&interval=1d", { headers: requestHeaders }).then(function(response) {
    if(response.ok === false) {
      throw new Error("Yahoo answered HTTP " + response.status);
    }

    return response.json();
  }).then(parseYahooChart);
}

function downloadFromStooq(symbol) {
  return fetch("https://stooq.com/q/d/l/?s=" + encodeURIComponent(symbol.toLowerCase()) + ".us&i=d", { headers: requestHeaders }).then(function(response) {
    if(response.ok === false) {
      throw new Error("Stooq answered HTTP " + response.status);
    }

    return response.text();
  }).then(parseStooqCsv);
}

function waitForMilliseconds(milliseconds) {
  return new Promise(function(resolve) {
    setTimeout(resolve, milliseconds);
  });
}

function createDownloadStep(symbol, summaries) {
  return function() {
    return downloadFromYahoo(symbol).catch(function(yahooError) {
      console.log(symbol + ": Yahoo failed (" + yahooError.message + "), trying Stooq");

      return downloadFromStooq(symbol);
    }).then(function(download) {
      if(download.candles.length === 0) {
        throw new Error("no candles returned");
      }

      fileSystem.writeFileSync(path.join(outputFolder, symbol + ".json"), JSON.stringify(download.candles));
      summaries.push({ symbol: symbol, name: download.name });
      console.log(symbol + ": " + download.candles.length + " daily candles, " + download.candles[0].date + " to " + download.candles[download.candles.length - 1].date);

      return waitForMilliseconds(600);
    }).catch(function(error) {
      console.log(symbol + ": skipped (" + error.message + ")");
    });
  };
}

function downloadSymbols(symbols) {
  var summaries = [];
  var chain = Promise.resolve();

  fileSystem.mkdirSync(outputFolder, { recursive: true });

  for(var i = 0; i < symbols.length; i++) {
    chain = chain.then(createDownloadStep(symbols[i], summaries));
  }

  return chain.then(function() {
    fileSystem.writeFileSync(path.join(outputFolder, "symbols.json"), JSON.stringify(summaries, null, 2));
    console.log("Wrote " + summaries.length + " symbols to " + outputFolder);
  });
}

module.exports = { parseYahooChart: parseYahooChart, parseStooqCsv: parseStooqCsv };

if(require.main === module) {
  downloadSymbols(process.argv.length > 2 ? process.argv.slice(2) : defaultSymbols);
}
