/*! TechnicalIndicators 1.0.0
 * Technical indicators for CanvasJS Chart and StockChart. Plain ES5 (IE8 compatible), no dependencies.
 * Load order: CanvasJS, this file, then only the files you need from the indicators folder.
 *
 * Overlay indicators (moving averages, bands, ...) work in Chart and StockChart.
 * Pane indicators (RSI, MACD, ...) need their own chart and work only in StockChart.
 */
(function(window) {
  "use strict";

  var registeredIndicators = {};
  var warnedMessages = {};
  var wrappedPrototypes = [];
  var defaultColors = ["#2962FF", "#FF6D00", "#8E24AA", "#00897B", "#C2185B", "#5D4037"];
  var defaultPositiveColor = "#26A69A";
  var defaultNegativeColor = "#EF5350";
  var defaultPaneHeight = 120;
  var supportedSourceFields = ["open", "high", "low", "close"];
  var inheritedAxisProperties = ["labelFontColor", "labelFontSize", "labelFontFamily", "lineColor", "tickColor", "gridColor"];
  var inheritedToolTipProperties = ["backgroundColor", "fontColor", "borderColor", "cornerRadius"];

  function isNullOrUndefined(value) {
    return (value === null || value === undefined);
  }

  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  function isFiniteNumber(value) {
    return (typeof value === "number" && isFinite(value));
  }

  function isPlainObject(value) {
    return (!isNullOrUndefined(value) && Object.prototype.toString.call(value) === "[object Object]");
  }

  function containsProperty(object, propertyName) {
    return Object.prototype.hasOwnProperty.call(object, propertyName);
  }

  function warn(message) {
    var fullMessage = "TechnicalIndicators: " + message;

    if(warnedMessages[fullMessage] === true) {
      return;
    }

    warnedMessages[fullMessage] = true;

    if(!isNullOrUndefined(window.console) && !isNullOrUndefined(window.console.warn)) {
      window.console.warn(fullMessage);
    }
  }

  function createFilledArray(length, fillValue) {
    var filledArray = [];

    for(var i = 0; i < length; i++) {
      filledArray.push(fillValue);
    }

    return filledArray;
  }

  function copyProperties(target, source) {
    for(var propertyName in source) {
      if(containsProperty(source, propertyName)) {
        target[propertyName] = source[propertyName];
      }
    }

    return target;
  }

  function mergeDeep(target, source) {
    if(isNullOrUndefined(source)) {
      return target;
    }

    for(var propertyName in source) {
      if(containsProperty(source, propertyName)) {
        if(isPlainObject(source[propertyName]) && isPlainObject(target[propertyName])) {
          mergeDeep(target[propertyName], source[propertyName]);
        } else if(isPlainObject(source[propertyName])) {
          target[propertyName] = mergeDeep({}, source[propertyName]);
        } else {
          target[propertyName] = source[propertyName];
        }
      }
    }

    return target;
  }

  function copySelectedProperties(source, target, propertyNames) {
    if(isNullOrUndefined(source)) {
      return;
    }

    for(var i = 0; i < propertyNames.length; i++) {
      if(!isNullOrUndefined(source[propertyNames[i]])) {
        target[propertyNames[i]] = source[propertyNames[i]];
      }
    }
  }

  function removeFromArray(list, item) {
    for(var i = 0; i < list.length; i++) {
      if(list[i] === item) {
        list.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  function isSupportedSourceField(fieldName) {
    for(var i = 0; i < supportedSourceFields.length; i++) {
      if(supportedSourceFields[i] === fieldName) {
        return true;
      }
    }

    return false;
  }

  /* Shared math used by the indicator files. Every function returns an array as long as its input, with null where a value cannot be calculated yet. */
  var calculations = {
    extractValues: function(candles, fieldName) {
      var sourceField = fieldName;
      var values = [];

      if(isSupportedSourceField(sourceField) === false) {
        warn("source must be one of open, high, low or close. Using close.");
        sourceField = "close";
      }

      for(var i = 0; i < candles.length; i++) {
        values.push(candles[i][sourceField]);
      }

      return values;
    },

    subtract: function(firstValues, secondValues) {
      var differences = [];

      for(var i = 0; i < firstValues.length; i++) {
        if(isNullOrUndefined(firstValues[i]) || isNullOrUndefined(secondValues[i])) {
          differences.push(null);
        } else {
          differences.push(firstValues[i] - secondValues[i]);
        }
      }

      return differences;
    },

    simpleMovingAverage: function(values, period) {
      var averages = createFilledArray(values.length, null);
      var windowSum = 0;
      var validValueCount = 0;

      for(var i = 0; i < values.length; i++) {
        if(!isNullOrUndefined(values[i])) {
          windowSum += values[i];
          validValueCount++;
        }

        if(i >= period && !isNullOrUndefined(values[i - period])) {
          windowSum -= values[i - period];
          validValueCount--;
        }

        if(validValueCount === period) {
          averages[i] = windowSum / period;
        }
      }

      return averages;
    },

    /* Seeds with the simple average of the first `period` values, then smooths. smoothingFactor 2 / (period + 1) gives an exponential moving average; 1 / period gives Wilder's smoothing. */
    exponentialSmoothing: function(values, period, smoothingFactor) {
      var smoothedValues = createFilledArray(values.length, null);
      var consecutiveValueCount = 0;
      var seedSum = 0;
      var previousSmoothedValue = null;

      for(var i = 0; i < values.length; i++) {
        if(isNullOrUndefined(values[i])) {
          consecutiveValueCount = 0;
          seedSum = 0;
          previousSmoothedValue = null;
        } else if(isNullOrUndefined(previousSmoothedValue)) {
          consecutiveValueCount++;
          seedSum += values[i];

          if(consecutiveValueCount === period) {
            previousSmoothedValue = seedSum / period;
            smoothedValues[i] = previousSmoothedValue;
          }
        } else {
          previousSmoothedValue = previousSmoothedValue + (values[i] - previousSmoothedValue) * smoothingFactor;
          smoothedValues[i] = previousSmoothedValue;
        }
      }

      return smoothedValues;
    },

    standardDeviation: function(values, period) {
      var deviations = createFilledArray(values.length, null);
      var windowSum = 0;
      var windowMean = 0;
      var squaredDifferenceSum = 0;
      var isWindowComplete = true;

      for(var i = period - 1; i < values.length; i++) {
        windowSum = 0;
        isWindowComplete = true;

        for(var j = i - period + 1; j <= i; j++) {
          if(isNullOrUndefined(values[j])) {
            isWindowComplete = false;
            break;
          }

          windowSum += values[j];
        }

        if(isWindowComplete === true) {
          windowMean = windowSum / period;
          squaredDifferenceSum = 0;

          for(var k = i - period + 1; k <= i; k++) {
            squaredDifferenceSum += Math.pow(values[k] - windowMean, 2);
          }

          deviations[i] = Math.sqrt(squaredDifferenceSum / period);
        }
      }

      return deviations;
    },

    rollingExtreme: function(values, period, findHighest) {
      var extremes = createFilledArray(values.length, null);
      var extremeValue = null;

      for(var i = period - 1; i < values.length; i++) {
        extremeValue = null;

        for(var j = i - period + 1; j <= i; j++) {
          if(isNullOrUndefined(values[j])) {
            extremeValue = null;
            break;
          }

          if(isNullOrUndefined(extremeValue) || (findHighest === true && values[j] > extremeValue) || (findHighest === false && values[j] < extremeValue)) {
            extremeValue = values[j];
          }
        }

        extremes[i] = extremeValue;
      }

      return extremes;
    },

    trueRange: function(candles) {
      var ranges = [];
      var highLowRange = 0;
      var previousClose = 0;

      for(var i = 0; i < candles.length; i++) {
        highLowRange = candles[i].high - candles[i].low;

        if(i === 0) {
          ranges.push(highLowRange);
        } else {
          previousClose = candles[i - 1].close;
          ranges.push(Math.max(highLowRange, Math.abs(candles[i].high - previousClose), Math.abs(candles[i].low - previousClose)));
        }
      }

      return ranges;
    }
  };

  function registerIndicator(definition) {
    if(isNullOrUndefined(definition) || isNullOrUndefined(definition.type) || !isArray(definition.series)) {
      warn("register() needs a definition with a type and a series list");
      return;
    }

    registeredIndicators[definition.type] = definition;
  }

  function getPlacement(type) {
    return containsProperty(registeredIndicators, type) ? registeredIndicators[type].placement : null;
  }

  function getRegisteredTypes() {
    var types = [];

    for(var type in registeredIndicators) {
      if(containsProperty(registeredIndicators, type)) {
        types.push(type);
      }
    }

    return types;
  }

  /* Reads price points into candles. Line and area points become candles with open = high = low = close. */
  function readCandles(dataSeries, volumeDataSeries) {
    var candles = [];
    var ohlcCount = 0;
    var volumeCount = 0;
    var dataPoints = (isNullOrUndefined(dataSeries) || isNullOrUndefined(dataSeries.dataPoints)) ? [] : dataSeries.dataPoints;
    var volumeDataPoints = (isNullOrUndefined(volumeDataSeries) || isNullOrUndefined(volumeDataSeries.dataPoints)) ? [] : volumeDataSeries.dataPoints;
    var dataPoint = null;
    var priceValue = null;
    var candle = null;

    for(var i = 0; i < dataPoints.length; i++) {
      dataPoint = dataPoints[i];
      priceValue = dataPoint.y;
      candle = null;

      if(isArray(priceValue) && priceValue.length >= 4) {
        candle = { x: dataPoint.x, open: priceValue[0], high: priceValue[1], low: priceValue[2], close: priceValue[3], volume: null };
        ohlcCount++;
      } else if(isFiniteNumber(priceValue)) {
        candle = { x: dataPoint.x, open: priceValue, high: priceValue, low: priceValue, close: priceValue, volume: null };
      }

      if(!isNullOrUndefined(candle)) {
        if(isNullOrUndefined(candle.x)) {
          candle.x = i;
        }

        if(isFiniteNumber(dataPoint.volume)) {
          candle.volume = dataPoint.volume;
        } else if(!isNullOrUndefined(volumeDataPoints[i]) && isFiniteNumber(volumeDataPoints[i].y)) {
          candle.volume = volumeDataPoints[i].y;
        }

        if(!isNullOrUndefined(candle.volume)) {
          volumeCount++;
        }

        candles.push(candle);
      }
    }

    return { candles: candles, hasOhlc: (ohlcCount === candles.length), hasVolume: (volumeCount === candles.length) };
  }

  function describeLastDataPoint(dataSeries) {
    if(isNullOrUndefined(dataSeries) || isNullOrUndefined(dataSeries.dataPoints) || dataSeries.dataPoints.length === 0) {
      return "empty";
    }

    var lastDataPoint = dataSeries.dataPoints[dataSeries.dataPoints.length - 1];

    return dataSeries.dataPoints.length + "|" + String(lastDataPoint.x) + "|" + String(lastDataPoint.y) + "|" + String(lastDataPoint.volume);
  }

  function pickColor(colorIndex, parameters, paletteOffset) {
    if(colorIndex === 0 && !isNullOrUndefined(parameters.color)) {
      return parameters.color;
    }

    return defaultColors[(colorIndex + paletteOffset) % defaultColors.length];
  }

  function createSeriesShell(descriptor, parameters, paletteOffset) {
    var color = pickColor(isNullOrUndefined(descriptor.colorIndex) ? 0 : descriptor.colorIndex, parameters, paletteOffset);
    var label = (typeof descriptor.label === "function") ? descriptor.label(parameters) : descriptor.label;
    var series = { type: descriptor.type, name: label, showInLegend: true, markerSize: 0, dataPoints: [] };

    if(descriptor.type === "line") {
      series.color = color;
      series.lineThickness = 2;
      series.yValueFormatString = "#,##0.00";
    } else if(descriptor.type === "rangeArea") {
      series.color = color;
      series.fillOpacity = 0.15;
      series.lineThickness = 1;
    } else if(descriptor.type === "column") {
      series.yValueFormatString = "#,##0.00";

      if(descriptor.colorBySign !== true) {
        series.color = color;
      }
    }

    mergeDeep(series, descriptor.seriesOptions);
    mergeDeep(series, parameters.options);

    return series;
  }

  function buildDataPoints(descriptor, calculation, parameters) {
    var dataPoints = [];
    var candles = calculation.candles;
    var outputs = calculation.outputs;
    var positiveColor = isNullOrUndefined(parameters.positiveColor) ? defaultPositiveColor : parameters.positiveColor;
    var negativeColor = isNullOrUndefined(parameters.negativeColor) ? defaultNegativeColor : parameters.negativeColor;
    var upperValue = null;
    var lowerValue = null;
    var value = null;
    var dataPoint = null;

    for(var i = 0; i < candles.length; i++) {
      if(descriptor.type === "rangeArea") {
        upperValue = outputs[descriptor.outputs[0]][i];
        lowerValue = outputs[descriptor.outputs[1]][i];

        if(!isNullOrUndefined(upperValue) && !isNullOrUndefined(lowerValue)) {
          dataPoints.push({ x: candles[i].x, y: [lowerValue, upperValue] });
        }
      } else {
        value = outputs[descriptor.output][i];

        if(!isNullOrUndefined(value)) {
          dataPoint = { x: candles[i].x, y: value };

          if(descriptor.colorBySign === true) {
            dataPoint.color = (value >= 0) ? positiveColor : negativeColor;
          }

          dataPoints.push(dataPoint);
        }
      }
    }

    return dataPoints;
  }

  function findInvalidParameter(definition, parameters) {
    var parameterNames = definition.integerParameters;
    var value = null;

    if(isNullOrUndefined(parameterNames)) {
      return null;
    }

    for(var i = 0; i < parameterNames.length; i++) {
      value = parameters[parameterNames[i]];

      if(!isFiniteNumber(value) || value < 1 || Math.floor(value) !== value) {
        return parameterNames[i];
      }
    }

    return null;
  }

  /* Holds every indicator added to one chart. `options` is the chart's options object; `chart` is optional and only used to render. */
  function createIndicatorSet(options, chart) {
    var isStockChart = isArray(options.charts);
    var entries = [];
    var createdEntryCount = 0;
    var indicatorSet = null;

    function renderChart() {
      if(!isNullOrUndefined(chart)) {
        chart.render();
      }
    }

    function findEntryIndex(identifier) {
      for(var i = 0; i < entries.length; i++) {
        if(entries[i].identifier === identifier) {
          return i;
        }
      }

      return -1;
    }

    function createIdentifier(configuration) {
      var baseIdentifier = isNullOrUndefined(configuration.id) ? configuration.type : configuration.id;
      var candidateIdentifier = baseIdentifier;
      var duplicateCounter = 1;

      while(findEntryIndex(candidateIdentifier) !== -1) {
        duplicateCounter++;
        candidateIdentifier = baseIdentifier + "-" + duplicateCounter;
      }

      return candidateIdentifier;
    }

    function getDataSeries(chartIndex, seriesIndex) {
      var dataSeriesList = null;

      if(isStockChart === true) {
        if(isNullOrUndefined(options.charts[chartIndex])) {
          return null;
        }

        dataSeriesList = options.charts[chartIndex].data;
      } else {
        dataSeriesList = options.data;
      }

      if(isNullOrUndefined(dataSeriesList) || isNullOrUndefined(dataSeriesList[seriesIndex])) {
        return null;
      }

      return dataSeriesList[seriesIndex];
    }

    function getVolumeDataSeries(parameters) {
      if(isNullOrUndefined(parameters.volumeSeriesIndex)) {
        return null;
      }

      return getDataSeries(isNullOrUndefined(parameters.volumeChartIndex) ? parameters.chartIndex : parameters.volumeChartIndex, parameters.volumeSeriesIndex);
    }

    function describeDataProblem(definition, parameters, priceData) {
      if(priceData.candles.length === 0) {
        return null;
      }

      if(definition.requiresOhlc === true && priceData.hasOhlc === false) {
        return parameters.type + " needs candlestick or OHLC data";
      }

      if(definition.requiresVolume === true && priceData.hasVolume === false) {
        return parameters.type + " needs volume. Add a volume property to each data point or set volumeSeriesIndex (and volumeChartIndex in a StockChart).";
      }

      return null;
    }

    function readPriceData(parameters) {
      return readCandles(getDataSeries(parameters.chartIndex, parameters.seriesIndex), getVolumeDataSeries(parameters));
    }

    function calculateEntry(entry) {
      var priceData = readPriceData(entry.parameters);
      var dataProblem = describeDataProblem(entry.definition, entry.parameters, priceData);

      if(!isNullOrUndefined(dataProblem)) {
        warn(dataProblem);
        return null;
      }

      return { candles: priceData.candles, outputs: entry.definition.calculate(priceData.candles, entry.parameters) };
    }

    function refreshEntry(entry) {
      var calculation = calculateEntry(entry);

      for(var i = 0; i < entry.definition.series.length; i++) {
        entry.seriesList[i].dataPoints = isNullOrUndefined(calculation) ? [] : buildDataPoints(entry.definition.series[i], calculation, entry.parameters);
      }

      entry.sourceSignature = describeLastDataPoint(getDataSeries(entry.parameters.chartIndex, entry.parameters.seriesIndex)) + "#" + describeLastDataPoint(getVolumeDataSeries(entry.parameters));
    }

    function createPane(entry) {
      var pane = {
        height: isNullOrUndefined(entry.parameters.paneHeight) ? defaultPaneHeight : entry.parameters.paneHeight,
        axisX: { crosshair: { enabled: true, snapToDataPoint: true }, tickLength: 0, labelFormatter: function() { return ""; } },
        axisY: {},
        toolTip: { shared: true },
        legend: { verticalAlign: "top", horizontalAlign: "left" },
        data: entry.seriesList
      };

      var priceChartOptions = options.charts[entry.parameters.chartIndex];

      /* Panes look like the price chart: same axis colours and fonts, tooltip and legend colours. */
      copySelectedProperties(priceChartOptions.axisX, pane.axisX, inheritedAxisProperties);
      copySelectedProperties(priceChartOptions.axisY, pane.axisY, inheritedAxisProperties);
      copySelectedProperties(priceChartOptions.toolTip, pane.toolTip, inheritedToolTipProperties);
      copySelectedProperties(priceChartOptions.legend, pane.legend, ["fontColor", "fontSize", "fontFamily"]);

      if(!isNullOrUndefined(entry.definition.paneOptions)) {
        mergeDeep(pane, entry.definition.paneOptions(entry.parameters));
      }

      mergeDeep(pane, entry.parameters.paneOptions);

      return pane;
    }

    function detachEntry(entry) {
      if(!isNullOrUndefined(entry.pane)) {
        removeFromArray(options.charts, entry.pane);
      } else {
        for(var i = 0; i < entry.seriesList.length; i++) {
          removeFromArray(entry.hostList, entry.seriesList[i]);
        }
      }
    }

    function addEntry(configuration) {
      if(isNullOrUndefined(configuration) || isNullOrUndefined(configuration.type)) {
        warn("Each indicator needs a type, for example { type: \"sma\", period: 20 }");
        return null;
      }

      if(!containsProperty(registeredIndicators, configuration.type)) {
        warn("Unknown indicator \"" + configuration.type + "\". Load its file from the indicators folder.");
        return null;
      }

      var definition = registeredIndicators[configuration.type];

      if(definition.placement === "pane" && isStockChart === false) {
        warn(configuration.type + " is supported only in StockChart");
        return null;
      }

      var parameters = copyProperties(copyProperties({ chartIndex: 0, seriesIndex: 0 }, definition.defaults), configuration);
      var invalidParameterName = findInvalidParameter(definition, parameters);

      if(!isNullOrUndefined(invalidParameterName)) {
        warn(configuration.type + ": " + invalidParameterName + " must be a whole number of at least 1");
        return null;
      }

      if(!isNullOrUndefined(definition.validate)) {
        var validationMessage = definition.validate(parameters);

        if(!isNullOrUndefined(validationMessage)) {
          warn(configuration.type + ": " + validationMessage);
          return null;
        }
      }

      if(isNullOrUndefined(getDataSeries(parameters.chartIndex, parameters.seriesIndex))) {
        warn(configuration.type + ": no data series found at seriesIndex " + parameters.seriesIndex);
        return null;
      }

      var dataProblem = describeDataProblem(definition, parameters, readPriceData(parameters));

      if(!isNullOrUndefined(dataProblem)) {
        warn(dataProblem);
        return null;
      }

      var entry = {
        identifier: createIdentifier(configuration),
        definition: definition,
        parameters: parameters,
        seriesList: [],
        pane: null,
        hostList: null,
        sourceSignature: ""
      };

      for(var i = 0; i < definition.series.length; i++) {
        entry.seriesList.push(createSeriesShell(definition.series[i], parameters, createdEntryCount));
      }

      createdEntryCount++;

      if(definition.placement === "pane") {
        entry.pane = createPane(entry);
        options.charts.push(entry.pane);
      } else {
        entry.hostList = (isStockChart === true) ? options.charts[parameters.chartIndex].data : options.data;

        for(var j = 0; j < entry.seriesList.length; j++) {
          entry.hostList.push(entry.seriesList[j]);
        }
      }

      refreshEntry(entry);
      entries.push(entry);

      return entry.identifier;
    }

    indicatorSet = {
      /* Adds an indicator and renders the chart. Returns its identifier, or null when it was ignored (a warning is logged). */
      add: function(configuration) {
        var identifier = addEntry(configuration);

        if(!isNullOrUndefined(identifier)) {
          renderChart();
        }

        return identifier;
      },

      remove: function(identifier) {
        var entryIndex = findEntryIndex(identifier);

        if(entryIndex === -1) {
          return false;
        }

        detachEntry(entries[entryIndex]);
        entries.splice(entryIndex, 1);
        renderChart();

        return true;
      },

      /* Recalculates every indicator from the current data and renders. Call it after the price data changes. */
      update: function() {
        for(var i = 0; i < entries.length; i++) {
          refreshEntry(entries[i]);
        }

        renderChart();
      },

      destroy: function() {
        for(var i = 0; i < entries.length; i++) {
          detachEntry(entries[i]);
        }

        entries = [];

        if(!isNullOrUndefined(chart)) {
          chart.technicalIndicators = null;
        }

        renderChart();
      },

      getIdentifiers: function() {
        var identifiers = [];

        for(var i = 0; i < entries.length; i++) {
          identifiers.push(entries[i].identifier);
        }

        return identifiers;
      },

      /* Used by apply(), options() and enable(); they decide when to render. */
      addWithoutRendering: addEntry,

      refreshChangedEntries: function() {
        var currentSignature = "";

        for(var i = 0; i < entries.length; i++) {
          currentSignature = describeLastDataPoint(getDataSeries(entries[i].parameters.chartIndex, entries[i].parameters.seriesIndex)) + "#" + describeLastDataPoint(getVolumeDataSeries(entries[i].parameters));

          if(currentSignature !== entries[i].sourceSignature) {
            refreshEntry(entries[i]);
          }
        }
      }
    };

    return indicatorSet;
  }

  function addConfigurations(indicatorSet, configurations) {
    if(!isArray(configurations)) {
      return;
    }

    for(var i = 0; i < configurations.length; i++) {
      indicatorSet.addWithoutRendering(configurations[i]);
    }
  }

  /* Call once the price data is in the chart options. Reads chart.options.indicators, adds the series and panes, and renders. */
  function applyIndicators(chart, indicatorConfigurations) {
    if(isNullOrUndefined(chart) || isNullOrUndefined(chart.options)) {
      warn("apply() needs a CanvasJS Chart or StockChart");
      return null;
    }

    var indicatorSet = chart.technicalIndicators;

    if(isNullOrUndefined(indicatorSet)) {
      indicatorSet = createIndicatorSet(chart.options, chart);
      chart.technicalIndicators = indicatorSet;
      addConfigurations(indicatorSet, isNullOrUndefined(indicatorConfigurations) ? chart.options.indicators : indicatorConfigurations);
      chart.render();
    } else {
      addConfigurations(indicatorSet, indicatorConfigurations);
      indicatorSet.update();
    }

    return indicatorSet;
  }

  /* Adds the indicators in options.indicators to the options object and returns it. Use it when the data points are already in the options. */
  function addIndicatorsToOptions(chartOptions) {
    addConfigurations(createIndicatorSet(chartOptions, null), chartOptions.indicators);

    return chartOptions;
  }

  function prepareChartForRender(chart) {
    if(isNullOrUndefined(chart.options) || !isArray(chart.options.indicators)) {
      return;
    }

    if(isNullOrUndefined(chart.technicalIndicators)) {
      chart.technicalIndicators = createIndicatorSet(chart.options, chart);
      addConfigurations(chart.technicalIndicators, chart.options.indicators);
    } else {
      chart.technicalIndicators.refreshChangedEntries();
    }
  }

  function wrapRender(chartConstructor) {
    if(isNullOrUndefined(chartConstructor) || isNullOrUndefined(chartConstructor.prototype) || typeof chartConstructor.prototype.render !== "function") {
      return;
    }

    var prototypeObject = chartConstructor.prototype;

    for(var i = 0; i < wrappedPrototypes.length; i++) {
      if(wrappedPrototypes[i].prototypeObject === prototypeObject) {
        return;
      }
    }

    var originalRender = prototypeObject.render;

    prototypeObject.render = function() {
      prepareChartForRender(this);

      return originalRender.apply(this, arguments);
    };

    wrappedPrototypes.push({ prototypeObject: prototypeObject, originalRender: originalRender });
  }

  /* Optional. Wraps render() once so that "indicators" in the options works without calling apply(), and indicators recalculate when the data changes. */
  function enableAutomaticMode(canvasJsNamespace) {
    var namespace = isNullOrUndefined(canvasJsNamespace) ? window.CanvasJS : canvasJsNamespace;

    if(isNullOrUndefined(namespace)) {
      warn("enable() could not find CanvasJS. Load CanvasJS first or pass it as the argument.");
      return false;
    }

    wrapRender(namespace.Chart);
    wrapRender(namespace.StockChart);

    return true;
  }

  function disableAutomaticMode() {
    for(var i = 0; i < wrappedPrototypes.length; i++) {
      wrappedPrototypes[i].prototypeObject.render = wrappedPrototypes[i].originalRender;
    }

    wrappedPrototypes = [];
  }

  window.TechnicalIndicators = {
    version: "1.0.0",
    calculations: calculations,
    isNullOrUndefined: isNullOrUndefined,
    register: registerIndicator,
    getRegisteredTypes: getRegisteredTypes,
    getPlacement: getPlacement,
    apply: applyIndicators,
    options: addIndicatorsToOptions,
    enable: enableAutomaticMode,
    disable: disableAutomaticMode
  };
})(window);
