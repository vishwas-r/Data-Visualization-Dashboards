/* Exponential Moving Average. Overlay. Works in Chart and StockChart.
 * { type: "ema", period: 20, source: "close" } */
(function(window) {
  "use strict";

  var calculations = window.TechnicalIndicators.calculations;

  window.TechnicalIndicators.register({
    type: "ema",
    name: "Exponential Moving Average",
    placement: "overlay",
    requiresOhlc: false,
    requiresVolume: false,
    defaults: { period: 20, source: "close" },
    integerParameters: ["period"],
    calculate: function(candles, parameters) {
      var sourceValues = calculations.extractValues(candles, parameters.source);

      return { average: calculations.exponentialSmoothing(sourceValues, parameters.period, 2 / (parameters.period + 1)) };
    },
    series: [
      { type: "line", output: "average", colorIndex: 0, label: function(parameters) { return "EMA (" + parameters.period + ")"; } }
    ]
  });
})(window);
