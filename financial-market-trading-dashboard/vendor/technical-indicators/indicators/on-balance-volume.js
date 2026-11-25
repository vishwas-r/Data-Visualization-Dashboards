/* On-Balance Volume. Pane. Works only in StockChart. Needs volume.
 * { type: "obv", volumeChartIndex: 1, volumeSeriesIndex: 0, paneHeight: 120 }
 * Volume comes from a volume property on each data point, or from volumeSeriesIndex (plus volumeChartIndex in a StockChart). */
(function(window) {
  "use strict";

  window.TechnicalIndicators.register({
    type: "obv",
    name: "On-Balance Volume",
    placement: "pane",
    requiresOhlc: false,
    requiresVolume: true,
    defaults: { source: "close" },
    calculate: function(candles) {
      var onBalanceVolume = [];
      var runningTotal = 0;

      for(var i = 0; i < candles.length; i++) {
        if(i > 0) {
          if(candles[i].close > candles[i - 1].close) {
            runningTotal += candles[i].volume;
          } else if(candles[i].close < candles[i - 1].close) {
            runningTotal -= candles[i].volume;
          }
        }

        onBalanceVolume.push(runningTotal);
      }

      return { onBalanceVolume: onBalanceVolume };
    },
    series: [
      { type: "line", output: "onBalanceVolume", colorIndex: 0, label: "OBV" }
    ]
  });
})(window);
