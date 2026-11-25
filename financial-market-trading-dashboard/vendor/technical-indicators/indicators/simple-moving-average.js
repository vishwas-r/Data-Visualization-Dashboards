/* Simple Moving Average. Overlay. Works in Chart and StockChart.
 * { type: "sma", period: 20, source: "close" } */
(function(window) {
  "use strict";

  var calculations = window.TechnicalIndicators.calculations;

  window.TechnicalIndicators.register({
    type: "sma",
    name: "Simple Moving Average",
    placement: "overlay",
    requiresOhlc: false,
    requiresVolume: false,
    defaults: { period: 20, source: "close" },
    integerParameters: ["period"],
    calculate: function(candles, parameters) {
      var sourceValues = calculations.extractValues(candles, parameters.source);

      return { average: calculations.simpleMovingAverage(sourceValues, parameters.period) };
    },
    series: [
      { type: "line", output: "average", colorIndex: 0, label: function(parameters) { return "SMA (" + parameters.period + ")"; } }
    ]
  });
})(window);
