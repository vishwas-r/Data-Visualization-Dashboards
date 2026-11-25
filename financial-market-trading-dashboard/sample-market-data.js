/*! SIMULATED sample market data for trying MarketDashboard without a data source. Fictional companies, random prices: not real market data.
 *  MarketSampleData.symbols, .historical(symbol, callback), .realtime (subscribe + history). Plain ES5. */
(function(window) {
  "use strict";

  var symbolDefinitions = [
    { symbol: "AURA", name: "Aurora Systems (fictional)", startPrice: 150, dailyVolatility: 0.017 },
    { symbol: "BRKW", name: "Brickwell Industries (fictional)", startPrice: 280, dailyVolatility: 0.015 },
    { symbol: "CYRN", name: "Cyrion Labs (fictional)", startPrice: 120, dailyVolatility: 0.032 },
    { symbol: "DLTF", name: "Delta Freight (fictional)", startPrice: 210, dailyVolatility: 0.035 },
    { symbol: "EMBR", name: "Ember Foods (fictional)", startPrice: 130, dailyVolatility: 0.02 },
    { symbol: "FLXN", name: "Fluxon Energy (fictional)", startPrice: 120, dailyVolatility: 0.018 },
    { symbol: "GRVB", name: "Gravity Bank (fictional)", startPrice: 240, dailyVolatility: 0.025 },
    { symbol: "HLXB", name: "Helix Biotech (fictional)", startPrice: 140, dailyVolatility: 0.014 }
  ];

  var historyCache = {};
  var currentPrices = {};
  var intradayCache = {};

  function isNullOrUndefined(value) {
    return (value === null || value === undefined);
  }

  function findDefinition(symbol) {
    for(var i = 0; i < symbolDefinitions.length; i++) {
      if(symbolDefinitions[i].symbol === symbol) {
        return symbolDefinitions[i];
      }
    }

    return symbolDefinitions[0];
  }

  function createRandomGenerator(seedText) {
    var seed = 7;

    for(var i = 0; i < seedText.length; i++) {
      seed = (seed * 31 + seedText.charCodeAt(i)) % 2147483647;
    }

    return function() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function createNormalNumber(nextRandomNumber) {
    return (nextRandomNumber() + nextRandomNumber() + nextRandomNumber() + nextRandomNumber() - 2) * 1.7;
  }

  function padWithZero(number) {
    return number < 10 ? "0" + number : String(number);
  }

  function createDailyCandles(definition) {
    var nextRandomNumber = createRandomGenerator(definition.symbol);
    var candles = [];
    var closePrice = definition.startPrice;
    var currentDate = new Date();
    var openPrice = 0;
    var dailyChange = 0;

    currentDate.setHours(0, 0, 0, 0);
    currentDate.setFullYear(currentDate.getFullYear() - 5);

    while(currentDate.getTime() < new Date().getTime() - 86400000) {
      currentDate.setDate(currentDate.getDate() + 1);

      if(currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        openPrice = closePrice * (1 + (nextRandomNumber() - 0.5) * 0.004);
        dailyChange = createNormalNumber(nextRandomNumber) * definition.dailyVolatility + 0.0004;
        closePrice = openPrice * (1 + dailyChange);
        candles.push({
          date: currentDate.getFullYear() + "-" + padWithZero(currentDate.getMonth() + 1) + "-" + padWithZero(currentDate.getDate()),
          open: Math.round(openPrice * 100) / 100,
          high: Math.round(Math.max(openPrice, closePrice) * (1 + nextRandomNumber() * 0.008) * 100) / 100,
          low: Math.round(Math.min(openPrice, closePrice) * (1 - nextRandomNumber() * 0.008) * 100) / 100,
          close: Math.round(closePrice * 100) / 100,
          volume: Math.round(20000000 * (0.6 + nextRandomNumber() * 0.9) * (1 + Math.abs(dailyChange) * 20))
        });
      }
    }

    return candles;
  }

  function getHistory(symbol) {
    if(isNullOrUndefined(historyCache[symbol])) {
      historyCache[symbol] = createDailyCandles(findDefinition(symbol));
    }

    return historyCache[symbol];
  }

  /* One-minute candles for the last 90 minutes, ending at the current minute. */
  function getIntradayCandles(symbol) {
    var definition = findDefinition(symbol);
    var nextRandomNumber = createRandomGenerator(symbol + "-intraday");
    var dailyHistory = getHistory(symbol);
    var candles = [];
    var closePrice = dailyHistory[dailyHistory.length - 1].close;
    var openPrice = 0;
    var minuteStart = Math.floor(new Date().getTime() / 60000) * 60000 - 89 * 60000;

    if(isNullOrUndefined(intradayCache[symbol])) {
      for(var i = 0; i < 90; i++) {
        openPrice = closePrice;
        closePrice = openPrice * (1 + createNormalNumber(nextRandomNumber) * definition.dailyVolatility * 0.12);
        candles.push({
          date: minuteStart + i * 60000,
          open: openPrice,
          high: Math.max(openPrice, closePrice) * (1 + nextRandomNumber() * 0.0008),
          low: Math.min(openPrice, closePrice) * (1 - nextRandomNumber() * 0.0008),
          close: closePrice,
          volume: Math.round(40000 + nextRandomNumber() * 160000)
        });
      }

      intradayCache[symbol] = candles;
      currentPrices[symbol] = closePrice;
    }

    return intradayCache[symbol];
  }

  function subscribe(symbol, onTick) {
    var definition = findDefinition(symbol);
    var nextRandomNumber = createRandomGenerator(symbol + "-ticks" + new Date().getTime());
    var timerIdentifier = 0;

    getIntradayCandles(symbol);

    function sendTick() {
      currentPrices[symbol] = currentPrices[symbol] * (1 + createNormalNumber(nextRandomNumber) * definition.dailyVolatility * 0.03);
      onTick({ time: new Date().getTime(), price: currentPrices[symbol], volume: Math.round(10 + nextRandomNumber() * 400) });
      timerIdentifier = window.setTimeout(sendTick, 350 + nextRandomNumber() * 900);
    }

    timerIdentifier = window.setTimeout(sendTick, 300 + nextRandomNumber() * 600);

    return function() {
      window.clearTimeout(timerIdentifier);
    };
  }

  window.MarketSampleData = {
    symbols: symbolDefinitions,
    historical: function(symbol, callback) {
      callback(getHistory(symbol));
    },
    realtime: {
      subscribe: subscribe,
      history: function(symbol, callback) {
        callback(getIntradayCandles(symbol));
      }
    }
  };
})(window);
