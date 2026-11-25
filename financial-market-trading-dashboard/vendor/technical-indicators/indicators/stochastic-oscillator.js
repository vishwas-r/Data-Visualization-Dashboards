/* Stochastic Oscillator. Pane. Works only in StockChart. Needs OHLC data.
 * { type: "stochastic", period: 14, smoothing: 3, signalPeriod: 3, overbought: 80, oversold: 20, paneHeight: 120 }
 * smoothing: 1 gives the fast stochastic; 3 gives the common slow stochastic. */
(function(window) {
  "use strict";

  var calculations = window.TechnicalIndicators.calculations;
  var isNullOrUndefined = window.TechnicalIndicators.isNullOrUndefined;

  window.TechnicalIndicators.register({
    type: "stochastic",
    name: "Stochastic Oscillator",
    placement: "pane",
    requiresOhlc: true,
    requiresVolume: false,
    defaults: { period: 14, smoothing: 3, signalPeriod: 3, overbought: 80, oversold: 20 },
    integerParameters: ["period", "smoothing", "signalPeriod"],
    calculate: function(candles, parameters) {
      var highestHighs = calculations.rollingExtreme(calculations.extractValues(candles, "high"), parameters.period, true);
      var lowestLows = calculations.rollingExtreme(calculations.extractValues(candles, "low"), parameters.period, false);
      var rawValues = [];
      var priceRange = 0;

      for(var i = 0; i < candles.length; i++) {
        if(isNullOrUndefined(highestHighs[i]) || isNullOrUndefined(lowestLows[i])) {
          rawValues.push(null);
        } else {
          priceRange = highestHighs[i] - lowestLows[i];
          rawValues.push(priceRange === 0 ? 50 : (candles[i].close - lowestLows[i]) / priceRange * 100);
        }
      }

      var stochasticLine = (parameters.smoothing === 1) ? rawValues : calculations.simpleMovingAverage(rawValues, parameters.smoothing);

      return { stochasticLine: stochasticLine, signalLine: calculations.simpleMovingAverage(stochasticLine, parameters.signalPeriod) };
    },
    series: [
      { type: "line", output: "stochasticLine", colorIndex: 0, label: function(parameters) { return "Stochastic (" + parameters.period + ", " + parameters.smoothing + ", " + parameters.signalPeriod + ")"; } },
      { type: "line", output: "signalLine", colorIndex: 1, label: "Signal" }
    ],
    paneOptions: function(parameters) {
      return {
        axisY: {
          minimum: 0,
          maximum: 100,
          stripLines: [
            { value: parameters.overbought, color: "#9E9E9E", thickness: 1, lineDashType: "dash" },
            { value: parameters.oversold, color: "#9E9E9E", thickness: 1, lineDashType: "dash" }
          ]
        }
      };
    }
  });
})(window);
