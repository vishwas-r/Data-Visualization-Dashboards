/* Average True Range (Wilder). Pane. Works only in StockChart. Needs OHLC data.
 * { type: "atr", period: 14, paneHeight: 120 } */
(function(window) {
  "use strict";

  var calculations = window.TechnicalIndicators.calculations;

  window.TechnicalIndicators.register({
    type: "atr",
    name: "Average True Range",
    placement: "pane",
    requiresOhlc: true,
    requiresVolume: false,
    defaults: { period: 14 },
    integerParameters: ["period"],
    calculate: function(candles, parameters) {
      return { averageTrueRange: calculations.exponentialSmoothing(calculations.trueRange(candles), parameters.period, 1 / parameters.period) };
    },
    series: [
      { type: "line", output: "averageTrueRange", colorIndex: 0, label: function(parameters) { return "ATR (" + parameters.period + ")"; } }
    ]
  });
})(window);
