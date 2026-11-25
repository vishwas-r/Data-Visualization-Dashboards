/*! MarketDataSources 1.0.0
 * Ready-made data sources for MarketDashboard. Each factory returns an object you pass as the dashboard's dataSource option.
 *   MarketDataSources.binance(options)    Real crypto data from Binance's public market-data endpoints: history and live trades, no API key, no signup.
 *   MarketDataSources.localJson(options)  Daily candles from JSON files you host (see scripts/download-stock-history.js).
 * Plain ES5. These talk to the network, so they need a browser with XMLHttpRequest CORS and WebSocket support.
 */
(function(window) {
  "use strict";

  var defaultCryptoSymbols = [
    { symbol: "BTCUSDT", name: "Bitcoin" },
    { symbol: "ETHUSDT", name: "Ethereum" },
    { symbol: "SOLUSDT", name: "Solana" },
    { symbol: "BNBUSDT", name: "BNB" },
    { symbol: "XRPUSDT", name: "XRP" },
    { symbol: "ADAUSDT", name: "Cardano" },
    { symbol: "DOGEUSDT", name: "Dogecoin" },
    { symbol: "LINKUSDT", name: "Chainlink" }
  ];
  var defaultStockSymbols = [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corp." },
    { symbol: "NVDA", name: "NVIDIA Corp." },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "META", name: "Meta Platforms" },
    { symbol: "JPM", name: "JPMorgan Chase" }
  ];
  var maximumKlinesPerRequest = 1000;
  var reconnectDelayMilliseconds = 2000;

  function isNullOrUndefined(value) {
    return (value === null || value === undefined);
  }

  function copyProperties(target, source) {
    for(var propertyName in source) {
      if(Object.prototype.hasOwnProperty.call(source, propertyName)) {
        target[propertyName] = source[propertyName];
      }
    }

    return target;
  }

  function requestJson(url, onSuccess, onFailure) {
    var request = new window.XMLHttpRequest();

    request.open("GET", url, true);
    request.onreadystatechange = function() {
      if(request.readyState !== 4) {
        return;
      }

      if(request.status === 200) {
        try {
          onSuccess(JSON.parse(request.responseText));
        } catch(error) {
          onFailure("the response was not valid JSON");
        }
      } else if(request.status === 0) {
        onFailure("network error (offline, blocked, or the server does not allow browser requests)");
      } else {
        onFailure("HTTP " + request.status);
      }
    };
    request.send();
  }

  /* Binance kline: [openTime, open, high, low, close, volume, closeTime, ...], numbers as strings. */
  function convertKlines(klines) {
    var candles = [];

    for(var i = 0; i < klines.length; i++) {
      candles.push({ date: klines[i][0], open: Number(klines[i][1]), high: Number(klines[i][2]), low: Number(klines[i][3]), close: Number(klines[i][4]), volume: Number(klines[i][5]) });
    }

    return candles;
  }

  function createBinanceDataSource(options) {
    var settings = isNullOrUndefined(options) ? {} : options;
    var restBaseUrl = isNullOrUndefined(settings.restBaseUrl) ? "https://data-api.binance.vision" : settings.restBaseUrl;
    var streamBaseUrl = isNullOrUndefined(settings.streamBaseUrl) ? "wss://data-stream.binance.vision" : settings.streamBaseUrl;
    var dailyCandleCount = isNullOrUndefined(settings.dailyCandleCount) ? 1500 : settings.dailyCandleCount;
    var intradayCandleCount = isNullOrUndefined(settings.intradayCandleCount) ? 240 : settings.intradayCandleCount;
    var openPriceBySymbol = {};

    /* Daily candles, oldest first. Binance returns at most 1000 per request, so older pages are requested until dailyCandleCount is reached. */
    function loadDailyCandles(symbol, callback) {
      var collectedCandles = [];

      function loadPage(endTime) {
        var remainingCount = dailyCandleCount - collectedCandles.length;
        var url = restBaseUrl + "/api/v3/klines?symbol=" + symbol + "&interval=1d&limit=" + Math.min(maximumKlinesPerRequest, remainingCount) + (isNullOrUndefined(endTime) ? "" : "&endTime=" + endTime);

        requestJson(url, function(klines) {
          var pageCandles = convertKlines(klines);

          collectedCandles = pageCandles.concat(collectedCandles);

          if(pageCandles.length === maximumKlinesPerRequest && collectedCandles.length < dailyCandleCount) {
            loadPage(pageCandles[0].date - 1);
          } else {
            callback(collectedCandles);
          }
        }, function(message) {
          if(collectedCandles.length > 0) {
            callback(collectedCandles);
          } else {
            callback(null, message);
          }
        });
      }

      loadPage(null);
    }

    /* One-minute candles for the live chart, plus the price 24 hours ago so the change figures are 24-hour changes. */
    function loadIntradayCandles(symbol, callback) {
      requestJson(restBaseUrl + "/api/v3/klines?symbol=" + symbol + "&interval=1m&limit=" + intradayCandleCount, function(klines) {
        requestJson(restBaseUrl + "/api/v3/ticker/24hr?symbol=" + symbol, function(ticker) {
          openPriceBySymbol[symbol] = Number(ticker.openPrice);
          callback(convertKlines(klines));
        }, function() {
          callback(convertKlines(klines));
        });
      }, function(message) {
        callback(null, message);
      });
    }

    /* One WebSocket per symbol on the trade stream. Binance closes a connection after 24 hours, so it reconnects. */
    function subscribe(symbol, onTick) {
      var socket = null;
      var reconnectTimer = null;
      var isStopped = false;

      function connect() {
        socket = new window.WebSocket(streamBaseUrl + "/ws/" + symbol.toLowerCase() + "@trade");
        socket.onmessage = function(event) {
          var message = JSON.parse(event.data);

          if(message.e === "trade") {
            onTick({ time: message.T, price: Number(message.p), volume: Number(message.q), previousClose: openPriceBySymbol[symbol] });
          }
        };
        socket.onclose = function() {
          if(isStopped === false) {
            reconnectTimer = window.setTimeout(connect, reconnectDelayMilliseconds);
          }
        };
      }

      connect();

      return function() {
        isStopped = true;
        window.clearTimeout(reconnectTimer);

        if(!isNullOrUndefined(socket)) {
          socket.close();
        }
      };
    }

    return {
      symbols: isNullOrUndefined(settings.symbols) ? defaultCryptoSymbols : settings.symbols,
      historical: loadDailyCandles,
      realtime: { history: loadIntradayCandles, subscribe: subscribe },
      currency: "$",
      periodsPerYear: 365,
      interval: 60,
      notice: "Live data: Binance public market-data API (no key). Prices are USDT-quoted; change figures are 24-hour changes."
    };
  }

  /* options: { baseUrl: "data/stocks/", symbols: [...] }. Each symbol needs baseUrl + SYMBOL + ".json": an array of { date, open, high, low, close, volume }. Serve the folder over http(s); browsers block local file requests. */
  function createLocalJsonDataSource(options) {
    var settings = isNullOrUndefined(options) ? {} : options;
    var baseUrl = isNullOrUndefined(settings.baseUrl) ? "data/stocks/" : settings.baseUrl;

    return {
      symbols: isNullOrUndefined(settings.symbols) ? defaultStockSymbols : settings.symbols,
      historical: function(symbol, callback) {
        requestJson(baseUrl + symbol + ".json", function(candles) {
          callback(candles);
        }, function(message) {
          callback(null, message + " for " + baseUrl + symbol + ".json (run scripts/download-stock-history.js and serve the folder over http)");
        });
      },
      realtime: null,
      pages: ["historical"],
      currency: "$",
      periodsPerYear: 252,
      notice: isNullOrUndefined(settings.notice) ? "Daily prices from local JSON files. There is no free real-time stock feed, so only the historical page is shown." : settings.notice
    };
  }

  window.MarketDataSources = {
    version: "1.0.0",
    binance: createBinanceDataSource,
    localJson: createLocalJsonDataSource,
    defaultCryptoSymbols: defaultCryptoSymbols,
    defaultStockSymbols: defaultStockSymbols,
    copyProperties: copyProperties
  };
})(window);
