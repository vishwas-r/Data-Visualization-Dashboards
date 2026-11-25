/* Relative Strength Index (Wilder). Pane. Works only in StockChart.
 * { type: "rsi", period: 14, overbought: 70, oversold: 30, source: "close", paneHeight: 120 } */
(function(window) {
  "use strict";

  var calculations = window.TechnicalIndicators.calculations;
  var isNullOrUndefined = window.TechnicalIndicators.isNullOrUndefined;

  window.TechnicalIndicators.register({
    type: "rsi",
    name: "Relative Strength Index",
    placement: "pane",
    requiresOhlc: false,
    requiresVolume: false,
    defaults: { period: 14, overbought: 70, oversold: 30, source: "close" },
    integerParameters: ["period"],
    calculate: function(candles, parameters) {
      var sourceValues = calculations.extractValues(candles, parameters.source);
      var gains = [null];
      var losses = [null];
      var change = 0;
      var relativeStrengthIndex = [];

      for(var i = 1; i < sourceValues.length; i++) {
        if(isNullOrUndefined(sourceValues[i]) || isNullOrUndefined(sourceValues[i - 1])) {
          gains.push(null);
          losses.push(null);
        } else {
          change = sourceValues[i] - sourceValues[i - 1];
          gains.push(change > 0 ? change : 0);
          losses.push(change < 0 ? -change : 0);
        }
      }

      var averageGains = calculations.exponentialSmoothing(gains, parameters.period, 1 / parameters.period);
      var averageLosses = calculations.exponentialSmoothing(losses, parameters.period, 1 / parameters.period);

      for(var j = 0; j < sourceValues.length; j++) {
        if(isNullOrUndefined(averageGains[j]) || isNullOrUndefined(averageLosses[j])) {
          relativeStrengthIndex.push(null);
        } else if(averageLosses[j] === 0) {
          relativeStrengthIndex.push(averageGains[j] === 0 ? 50 : 100);
        } else {
          relativeStrengthIndex.push(100 - 100 / (1 + averageGains[j] / averageLosses[j]));
        }
      }

      return { relativeStrengthIndex: relativeStrengthIndex };
    },
    series: [
      { type: "line", output: "relativeStrengthIndex", colorIndex: 0, label: function(parameters) { return "RSI (" + parameters.period + ")"; } }
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
