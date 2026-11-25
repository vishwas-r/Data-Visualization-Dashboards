/* Moving Average Convergence Divergence. Pane. Works only in StockChart.
 * { type: "macd", fast: 12, slow: 26, signal: 9, source: "close", paneHeight: 120 }
 * Histogram colours: positiveColor and negativeColor. */
(function(window) {
  "use strict";

  var calculations = window.TechnicalIndicators.calculations;

  window.TechnicalIndicators.register({
    type: "macd",
    name: "Moving Average Convergence Divergence",
    placement: "pane",
    requiresOhlc: false,
    requiresVolume: false,
    defaults: { fast: 12, slow: 26, signal: 9, source: "close" },
    integerParameters: ["fast", "slow", "signal"],
    validate: function(parameters) {
      if(parameters.fast >= parameters.slow) {
        return "fast must be smaller than slow";
      }

      return null;
    },
    calculate: function(candles, parameters) {
      var sourceValues = calculations.extractValues(candles, parameters.source);
      var fastAverages = calculations.exponentialSmoothing(sourceValues, parameters.fast, 2 / (parameters.fast + 1));
      var slowAverages = calculations.exponentialSmoothing(sourceValues, parameters.slow, 2 / (parameters.slow + 1));
      var convergenceDivergence = calculations.subtract(fastAverages, slowAverages);
      var signalLine = calculations.exponentialSmoothing(convergenceDivergence, parameters.signal, 2 / (parameters.signal + 1));

      return { convergenceDivergence: convergenceDivergence, signalLine: signalLine, histogram: calculations.subtract(convergenceDivergence, signalLine) };
    },
    series: [
      { type: "column", output: "histogram", colorBySign: true, label: "MACD Histogram" },
      { type: "line", output: "convergenceDivergence", colorIndex: 0, label: function(parameters) { return "MACD (" + parameters.fast + ", " + parameters.slow + ")"; } },
      { type: "line", output: "signalLine", colorIndex: 1, label: function(parameters) { return "Signal (" + parameters.signal + ")"; } }
    ]
  });
})(window);
