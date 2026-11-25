/* Volume Weighted Average Price. Overlay. Works in Chart and StockChart. Needs OHLC data and volume.
 * { type: "vwap", reset: "day" }   reset: "day" restarts every day (intraday bars), "none" runs over the whole series.
 * Volume comes from a volume property on each data point, or from volumeSeriesIndex (plus volumeChartIndex in a StockChart). */
(function(window) {
  "use strict";

  function createSessionKey(xValue) {
    var date = new Date(xValue);

    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
  }

  window.TechnicalIndicators.register({
    type: "vwap",
    name: "Volume Weighted Average Price",
    placement: "overlay",
    requiresOhlc: true,
    requiresVolume: true,
    defaults: { reset: "day" },
    calculate: function(candles, parameters) {
      var weightedAveragePrices = [];
      var cumulativeTypicalPriceVolume = 0;
      var cumulativeVolume = 0;
      var previousSessionKey = null;
      var sessionKey = "";
      var typicalPrice = 0;

      for(var i = 0; i < candles.length; i++) {
        sessionKey = (parameters.reset === "day") ? createSessionKey(candles[i].x) : "all";

        if(sessionKey !== previousSessionKey) {
          cumulativeTypicalPriceVolume = 0;
          cumulativeVolume = 0;
          previousSessionKey = sessionKey;
        }

        typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
        cumulativeTypicalPriceVolume += typicalPrice * candles[i].volume;
        cumulativeVolume += candles[i].volume;
        weightedAveragePrices.push((cumulativeVolume === 0) ? null : cumulativeTypicalPriceVolume / cumulativeVolume);
      }

      return { weightedAveragePrice: weightedAveragePrices };
    },
    series: [
      { type: "line", output: "weightedAveragePrice", colorIndex: 0, label: "VWAP" }
    ]
  });
})(window);
