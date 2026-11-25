/* Bollinger Bands. Overlay. Works in Chart and StockChart.
 * { type: "bollinger", period: 20, standardDeviations: 2, source: "close" } */
(function(window) {
  "use strict";

  var calculations = window.TechnicalIndicators.calculations;
  var isNullOrUndefined = window.TechnicalIndicators.isNullOrUndefined;

  window.TechnicalIndicators.register({
    type: "bollinger",
    name: "Bollinger Bands",
    placement: "overlay",
    requiresOhlc: false,
    requiresVolume: false,
    defaults: { period: 20, standardDeviations: 2, source: "close" },
    integerParameters: ["period"],
    calculate: function(candles, parameters) {
      var sourceValues = calculations.extractValues(candles, parameters.source);
      var middleBand = calculations.simpleMovingAverage(sourceValues, parameters.period);
      var deviations = calculations.standardDeviation(sourceValues, parameters.period);
      var upperBand = [];
      var lowerBand = [];

      for(var i = 0; i < middleBand.length; i++) {
        if(isNullOrUndefined(middleBand[i]) || isNullOrUndefined(deviations[i])) {
          upperBand.push(null);
          lowerBand.push(null);
        } else {
          upperBand.push(middleBand[i] + parameters.standardDeviations * deviations[i]);
          lowerBand.push(middleBand[i] - parameters.standardDeviations * deviations[i]);
        }
      }

      return { upperBand: upperBand, middleBand: middleBand, lowerBand: lowerBand };
    },
    series: [
      { type: "rangeArea", outputs: ["upperBand", "lowerBand"], colorIndex: 0, label: function(parameters) { return "Bollinger Bands (" + parameters.period + ", " + parameters.standardDeviations + ")"; } },
      { type: "line", output: "middleBand", colorIndex: 0, label: "Bollinger Middle", seriesOptions: { lineThickness: 1, lineDashType: "dash" } }
    ]
  });
})(window);
