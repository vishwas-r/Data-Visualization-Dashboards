/*! MarketStatistics 1.0.0
 * Pure calculations for price history: returns, volatility, drawdown, monthly returns, distributions.
 * Plain ES5, no dependencies. Candles are { date: Date, open, high, low, close, volume }, oldest first.
 */
(function(window) {
  "use strict";

  var tradingDaysPerYear = 252;
  var monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function isNullOrUndefined(value) {
    return (value === null || value === undefined);
  }

  function resolvePeriodsPerYear(periodsPerYear) {
    return isNullOrUndefined(periodsPerYear) ? tradingDaysPerYear : periodsPerYear;
  }

  function calculateStandardDeviation(values) {
    var sum = 0;
    var squaredDifferenceSum = 0;
    var mean = 0;

    if(values.length < 2) {
      return null;
    }

    for(var i = 0; i < values.length; i++) {
      sum += values[i];
    }

    mean = sum / values.length;

    for(var j = 0; j < values.length; j++) {
      squaredDifferenceSum += Math.pow(values[j] - mean, 2);
    }

    return Math.sqrt(squaredDifferenceSum / (values.length - 1));
  }

  /* Simple daily returns as fractions (0.01 = 1%). Index 0 is null because it has no previous close. */
  function calculateReturns(candles) {
    var returns = [];

    for(var i = 0; i < candles.length; i++) {
      if(i === 0 || candles[i - 1].close === 0) {
        returns.push(null);
      } else {
        returns.push(candles[i].close / candles[i - 1].close - 1);
      }
    }

    return returns;
  }

  function collectValidReturns(returns, startIndex, endIndex) {
    var validReturns = [];

    for(var i = startIndex; i <= endIndex; i++) {
      if(!isNullOrUndefined(returns[i])) {
        validReturns.push(returns[i]);
      }
    }

    return validReturns;
  }

  function calculateTotalReturn(candles) {
    if(candles.length < 2 || candles[0].close === 0) {
      return null;
    }

    return (candles[candles.length - 1].close / candles[0].close - 1) * 100;
  }

  function calculateAnnualizedVolatility(candles, periodsPerYear) {
    var deviation = calculateStandardDeviation(collectValidReturns(calculateReturns(candles), 0, candles.length - 1));

    return isNullOrUndefined(deviation) ? null : deviation * Math.sqrt(resolvePeriodsPerYear(periodsPerYear)) * 100;
  }

  function calculateRollingVolatility(candles, windowSize, periodsPerYear) {
    var returns = calculateReturns(candles);
    var points = [];
    var deviation = null;

    for(var i = windowSize; i < candles.length; i++) {
      deviation = calculateStandardDeviation(collectValidReturns(returns, i - windowSize + 1, i));

      if(!isNullOrUndefined(deviation)) {
        points.push({ x: candles[i].date, y: deviation * Math.sqrt(resolvePeriodsPerYear(periodsPerYear)) * 100 });
      }
    }

    return points;
  }

  /* Percent below the running peak close; always 0 or negative. */
  function calculateDrawdownSeries(candles) {
    var points = [];
    var peakClose = 0;

    for(var i = 0; i < candles.length; i++) {
      if(candles[i].close > peakClose) {
        peakClose = candles[i].close;
      }

      points.push({ x: candles[i].date, y: peakClose === 0 ? 0 : (candles[i].close / peakClose - 1) * 100 });
    }

    return points;
  }

  function calculateMaximumDrawdown(candles) {
    var series = calculateDrawdownSeries(candles);
    var deepestDrawdown = 0;

    for(var i = 0; i < series.length; i++) {
      if(series[i].y < deepestDrawdown) {
        deepestDrawdown = series[i].y;
      }
    }

    return deepestDrawdown;
  }

  /* Returns { rows: ["2026", "2025", ...], columns: [{ label: "Jan", values: [one value per row] }, ...] }, the format CanvasJSHeatmap takes. Values are percent; null where a month has no data. */
  function calculateMonthlyReturns(candles) {
    var monthEndCloses = {};
    var years = [];
    var previousMonthClose = candles.length > 0 ? candles[0].close : 0;
    var monthKey = "";
    var year = 0;
    var month = 0;
    var monthlyReturns = {};
    var orderedKeys = [];
    var columns = [];
    var rows = [];
    var rowValues = null;

    for(var i = 0; i < candles.length; i++) {
      year = candles[i].date.getFullYear();
      month = candles[i].date.getMonth();
      monthKey = year + "-" + month;

      if(isNullOrUndefined(monthEndCloses[monthKey])) {
        orderedKeys.push({ key: monthKey, year: year, month: month });
      }

      monthEndCloses[monthKey] = candles[i].close;
    }

    for(var j = 0; j < orderedKeys.length; j++) {
      monthlyReturns[orderedKeys[j].key] = previousMonthClose === 0 ? null : (monthEndCloses[orderedKeys[j].key] / previousMonthClose - 1) * 100;
      previousMonthClose = monthEndCloses[orderedKeys[j].key];

      if(years.length === 0 || years[years.length - 1] !== orderedKeys[j].year) {
        years.push(orderedKeys[j].year);
      }
    }

    for(var k = years.length - 1; k >= 0; k--) {
      rows.push(String(years[k]));
    }

    for(var monthIndex = 0; monthIndex < 12; monthIndex++) {
      rowValues = [];

      for(var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        monthKey = rows[rowIndex] + "-" + monthIndex;
        rowValues.push(isNullOrUndefined(monthlyReturns[monthKey]) ? null : monthlyReturns[monthKey]);
      }

      columns.push({ label: monthLabels[monthIndex], values: rowValues });
    }

    return { rows: rows, columns: columns };
  }

  /* Histogram of daily returns in percent. Each bar: { label, y: count, center }. */
  function calculateReturnDistribution(candles, binCount) {
    var returns = collectValidReturns(calculateReturns(candles), 0, candles.length - 1);
    var smallestReturn = Infinity;
    var largestReturn = -Infinity;
    var bins = [];
    var binWidth = 0;
    var binIndex = 0;

    if(returns.length === 0) {
      return bins;
    }

    for(var i = 0; i < returns.length; i++) {
      returns[i] = returns[i] * 100;
      smallestReturn = Math.min(smallestReturn, returns[i]);
      largestReturn = Math.max(largestReturn, returns[i]);
    }

    binWidth = (largestReturn - smallestReturn) / binCount;

    if(binWidth === 0) {
      binWidth = 1;
    }

    for(var j = 0; j < binCount; j++) {
      bins.push({ center: smallestReturn + binWidth * (j + 0.5), y: 0 });
    }

    for(var k = 0; k < returns.length; k++) {
      binIndex = Math.min(binCount - 1, Math.floor((returns[k] - smallestReturn) / binWidth));
      bins[binIndex].y++;
    }

    for(var labelIndex = 0; labelIndex < bins.length; labelIndex++) {
      bins[labelIndex].label = bins[labelIndex].center.toFixed(1) + "%";
    }

    return bins;
  }

  function createDateKey(date) {
    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
  }

  /* Rebases the comparison symbol so it starts at the same price as the main symbol. Missing days carry the last known close forward. */
  function rebaseComparison(mainCandles, comparisonCandles) {
    var comparisonCloseByDate = {};
    var points = [];
    var lastComparisonClose = null;
    var comparisonBase = null;
    var mainBase = 0;
    var dateKey = "";

    for(var i = 0; i < comparisonCandles.length; i++) {
      comparisonCloseByDate[createDateKey(comparisonCandles[i].date)] = comparisonCandles[i].close;
    }

    for(var j = 0; j < mainCandles.length; j++) {
      dateKey = createDateKey(mainCandles[j].date);

      if(!isNullOrUndefined(comparisonCloseByDate[dateKey])) {
        lastComparisonClose = comparisonCloseByDate[dateKey];
      }

      if(!isNullOrUndefined(lastComparisonClose)) {
        if(isNullOrUndefined(comparisonBase)) {
          comparisonBase = lastComparisonClose;
          mainBase = mainCandles[j].close;
        }

        points.push({ x: mainCandles[j].date, y: lastComparisonClose / comparisonBase * mainBase });
      }
    }

    return points;
  }

  /* rangeKey: "1M", "3M", "6M", "YTD", "1Y", "5Y" or "ALL". Returns the first date of that range ending at endDate. */
  function calculateRangeStartDate(rangeKey, endDate, firstDate) {
    var startDate = new Date(endDate.getTime());
    var monthsBack = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "5Y": 60 };

    if(rangeKey === "YTD") {
      return new Date(endDate.getFullYear(), 0, 1);
    }

    if(isNullOrUndefined(monthsBack[rangeKey])) {
      return firstDate;
    }

    startDate.setMonth(startDate.getMonth() - monthsBack[rangeKey]);

    return startDate.getTime() < firstDate.getTime() ? firstDate : startDate;
  }

  function sliceFromDate(candles, startDate, endDate) {
    var slicedCandles = [];

    for(var i = 0; i < candles.length; i++) {
      if(candles[i].date.getTime() >= startDate.getTime() && (isNullOrUndefined(endDate) || candles[i].date.getTime() <= endDate.getTime())) {
        slicedCandles.push(candles[i]);
      }
    }

    return slicedCandles;
  }

  function calculatePeriodSummary(candles, periodsPerYear) {
    var highestPrice = -Infinity;
    var lowestPrice = Infinity;
    var volumeSum = 0;

    for(var i = 0; i < candles.length; i++) {
      highestPrice = Math.max(highestPrice, candles[i].high);
      lowestPrice = Math.min(lowestPrice, candles[i].low);
      volumeSum += candles[i].volume;
    }

    return {
      totalReturn: calculateTotalReturn(candles),
      annualizedVolatility: calculateAnnualizedVolatility(candles, periodsPerYear),
      maximumDrawdown: calculateMaximumDrawdown(candles),
      highestPrice: candles.length === 0 ? null : highestPrice,
      lowestPrice: candles.length === 0 ? null : lowestPrice,
      averageVolume: candles.length === 0 ? null : volumeSum / candles.length
    };
  }

  window.MarketStatistics = {
    version: "1.0.0",
    calculateReturns: calculateReturns,
    calculateTotalReturn: calculateTotalReturn,
    calculateAnnualizedVolatility: calculateAnnualizedVolatility,
    calculateRollingVolatility: calculateRollingVolatility,
    calculateDrawdownSeries: calculateDrawdownSeries,
    calculateMaximumDrawdown: calculateMaximumDrawdown,
    calculateMonthlyReturns: calculateMonthlyReturns,
    calculateReturnDistribution: calculateReturnDistribution,
    rebaseComparison: rebaseComparison,
    calculateRangeStartDate: calculateRangeStartDate,
    sliceFromDate: sliceFromDate,
    calculatePeriodSummary: calculatePeriodSummary
  };
})(window);
