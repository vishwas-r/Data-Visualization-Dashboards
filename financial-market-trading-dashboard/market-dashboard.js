/*! MarketDashboard 1.0.0
 * Realtime and historical market dashboard for CanvasJS StockChart.
 * Needs: CanvasJS (stock bundle), technical-indicators plugin, canvasjs-heatmap.js and market-statistics.js.
 * Plain ES5. Pass your data in; see README.md.
 */
(function(window) {
  "use strict";

  var themeDefinitions = {
    midnight: {
      label: "Midnight", chartTheme: "dark2", background: "#0A0E14", surface: "#111823", raised: "#182233", border: "#1F2B3F",
      text: "#E8EDF5", mutedText: "#8794A8", accent: "#4C8DFF", up: "#26C281", down: "#F0506E", comparison: "#F5B83D", gridColor: "#1D2A3F", maskColor: "rgba(10, 14, 20, 0.72)"
    },
    daylight: {
      label: "Daylight", chartTheme: "light2", background: "#F3F5F9", surface: "#FFFFFF", raised: "#F7F9FC", border: "#DDE3ED",
      text: "#101A2B", mutedText: "#5E6C84", accent: "#2563EB", up: "#0E9F6E", down: "#DC3A52", comparison: "#D98B0B", gridColor: "#E8EDF4", maskColor: "rgba(243, 245, 249, 0.78)"
    }
  };
  var historicalRanges = ["1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"];
  var chartTypeOptions = [
    { type: "candlestick", label: "Candles" },
    { type: "ohlc", label: "OHLC" },
    { type: "line", label: "Line" },
    { type: "area", label: "Area" }
  ];
  var defaultIndicators = [
    { type: "sma", period: 20, enabledOn: [] },
    { type: "sma", period: 50, enabledOn: ["historical"] },
    { type: "ema", period: 21, enabledOn: ["live"] },
    { type: "bollinger", period: 20, standardDeviations: 2, enabledOn: [] },
    { type: "vwap", reset: "day", enabledOn: ["live"] },
    { type: "rsi", period: 14, enabledOn: ["historical"] },
    { type: "macd", fast: 12, slow: 26, signal: 9, enabledOn: [] },
    { type: "stochastic", period: 14, smoothing: 3, signalPeriod: 3, enabledOn: [] },
    { type: "atr", period: 14, enabledOn: [] },
    { type: "obv", enabledOn: [] }
  ];
  var maximumCandleCount = 600;
  var maximumTickCount = 40;
  var chartHeightPerPane = 150;
  var upArrow = "\u25B2";
  var downArrow = "\u25BC";
  var dash = "\u2013";

  function isNullOrUndefined(value) {
    return (value === null || value === undefined);
  }

  function isFiniteNumber(value) {
    return (typeof value === "number" && isFinite(value));
  }

  function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  function copyProperties(target, source) {
    for(var propertyName in source) {
      if(Object.prototype.hasOwnProperty.call(source, propertyName)) {
        target[propertyName] = source[propertyName];
      }
    }

    return target;
  }

  function indexOfItem(list, item) {
    for(var i = 0; i < list.length; i++) {
      if(list[i] === item) {
        return i;
      }
    }

    return -1;
  }

  function trimText(text) {
    return text.replace(/^\s+|\s+$/g, "");
  }

  function createElement(tagName, className, text) {
    var element = window.document.createElement(tagName);

    if(!isNullOrUndefined(className)) {
      element.className = className;
    }

    if(!isNullOrUndefined(text)) {
      setText(element, text);
    }

    return element;
  }

  function setText(element, text) {
    if(!isNullOrUndefined(element.textContent)) {
      element.textContent = text;
    } else {
      element.innerText = text;
    }
  }

  function hasClass(element, className) {
    return (" " + element.className + " ").indexOf(" " + className + " ") !== -1;
  }

  function addClass(element, className) {
    if(hasClass(element, className) === false) {
      element.className = (element.className === "") ? className : element.className + " " + className;
    }
  }

  function removeClass(element, className) {
    element.className = trimText((" " + element.className + " ").replace(" " + className + " ", " "));
  }

  function setClass(element, className, shouldHaveClass) {
    if(shouldHaveClass === true) {
      addClass(element, className);
    } else {
      removeClass(element, className);
    }
  }

  function removeChildren(element) {
    while(!isNullOrUndefined(element.firstChild)) {
      element.removeChild(element.firstChild);
    }
  }

  function addEvent(target, eventName, handler) {
    if(!isNullOrUndefined(target.addEventListener)) {
      target.addEventListener(eventName, handler, false);
    } else {
      target.attachEvent("on" + eventName, handler);
    }
  }

  function removeEvent(target, eventName, handler) {
    if(!isNullOrUndefined(target.removeEventListener)) {
      target.removeEventListener(eventName, handler, false);
    } else {
      target.detachEvent("on" + eventName, handler);
    }
  }

  function formatNumber(value, decimalPlaces) {
    var parts = null;

    if(!isFiniteNumber(value)) {
      return dash;
    }

    parts = Math.abs(value).toFixed(decimalPlaces).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return ((value < 0) ? "-" : "") + parts.join(".");
  }

  function formatSignedNumber(value, decimalPlaces) {
    return ((isFiniteNumber(value) && value > 0) ? "+" : "") + formatNumber(value, decimalPlaces);
  }

  function formatPercent(value, shouldShowSign) {
    if(!isFiniteNumber(value)) {
      return dash;
    }

    return ((shouldShowSign === true && value > 0) ? "+" : "") + value.toFixed(2) + "%";
  }

  /* Trade sizes and small volumes: whole numbers stay whole, fractions keep enough decimals (0.01234 BTC). */
  function formatQuantity(value) {
    if(!isFiniteNumber(value)) {
      return dash;
    }

    if(value >= 100 || value === 0) {
      return formatNumber(value, 0);
    }

    return formatNumber(value, (value >= 1) ? 2 : 5);
  }

  function formatVolume(value) {
    if(!isFiniteNumber(value)) {
      return dash;
    }

    if(value >= 1000000000) {
      return (value / 1000000000).toFixed(2) + "B";
    }

    if(value >= 1000000) {
      return (value / 1000000).toFixed(2) + "M";
    }

    if(value >= 1000) {
      return (value / 1000).toFixed(1) + "K";
    }

    return formatQuantity(value);
  }

  function padWithZero(number) {
    return (number < 10) ? "0" + number : String(number);
  }

  function formatClockTime(date) {
    return padWithZero(date.getHours()) + ":" + padWithZero(date.getMinutes()) + ":" + padWithZero(date.getSeconds());
  }

  function parseDate(value) {
    var dateMatch = null;
    var parsedDate = null;

    if(value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if(typeof value === "number") {
      return new Date(value < 100000000000 ? value * 1000 : value);
    }

    if(typeof value === "string") {
      dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if(!isNullOrUndefined(dateMatch)) {
        return new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
      }

      parsedDate = new Date(value);

      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
  }

  /* Turns the candles you pass into { date: Date, open, high, low, close, volume }, oldest first. fieldNames maps your property names. */
  function normalizeCandles(rawCandles, fieldNames) {
    var candles = [];
    var rawCandle = null;
    var date = null;
    var closePrice = 0;

    if(!isArray(rawCandles)) {
      return candles;
    }

    for(var i = 0; i < rawCandles.length; i++) {
      rawCandle = rawCandles[i];
      date = parseDate(rawCandle[fieldNames.date]);
      closePrice = Number(rawCandle[fieldNames.close]);

      if(!isNullOrUndefined(date) && isFiniteNumber(closePrice)) {
        candles.push({
          date: date,
          open: isFiniteNumber(Number(rawCandle[fieldNames.open])) ? Number(rawCandle[fieldNames.open]) : closePrice,
          high: isFiniteNumber(Number(rawCandle[fieldNames.high])) ? Number(rawCandle[fieldNames.high]) : closePrice,
          low: isFiniteNumber(Number(rawCandle[fieldNames.low])) ? Number(rawCandle[fieldNames.low]) : closePrice,
          close: closePrice,
          volume: isFiniteNumber(Number(rawCandle[fieldNames.volume])) ? Number(rawCandle[fieldNames.volume]) : 0
        });
      }
    }

    candles.sort(function(firstCandle, secondCandle) {
      return firstCandle.date.getTime() - secondCandle.date.getTime();
    });

    return candles;
  }

  function describeIndicator(configuration) {
    var type = configuration.type;

    if(!isNullOrUndefined(configuration.label)) {
      return configuration.label;
    }

    if(type === "sma" || type === "ema" || type === "rsi" || type === "atr") {
      return type.toUpperCase() + " " + configuration.period;
    }

    if(type === "bollinger") {
      return "Bollinger " + configuration.period + "/" + configuration.standardDeviations;
    }

    if(type === "macd") {
      return "MACD " + configuration.fast + "/" + configuration.slow + "/" + configuration.signal;
    }

    if(type === "stochastic") {
      return "Stochastic " + configuration.period + "/" + configuration.smoothing + "/" + configuration.signalPeriod;
    }

    return type.toUpperCase();
  }

  function choosePriceDecimals(price) {
    var absolutePrice = isFiniteNumber(price) ? Math.abs(price) : 0;

    if(absolutePrice >= 1 || absolutePrice === 0) {
      return 2;
    }

    return (absolutePrice >= 0.01) ? 4 : 6;
  }

  function formatPrice(price) {
    return formatNumber(price, choosePriceDecimals(price));
  }

  function readSymbols(symbolsInput) {
    var symbols = [];
    var symbolInput = null;

    if(!isArray(symbolsInput)) {
      return symbols;
    }

    for(var i = 0; i < symbolsInput.length; i++) {
      symbolInput = symbolsInput[i];

      if(typeof symbolInput === "string") {
        symbols.push({ symbol: symbolInput, name: "" });
      } else {
        symbols.push({ symbol: symbolInput.symbol, name: isNullOrUndefined(symbolInput.name) ? "" : symbolInput.name });
      }
    }

    return symbols;
  }

  function createMarketDashboard(containerOrIdentifier, userConfiguration) {
    var rootElement = (typeof containerOrIdentifier === "string") ? window.document.getElementById(containerOrIdentifier) : containerOrIdentifier;
    var userSettings = isNullOrUndefined(userConfiguration) ? {} : userConfiguration;
    var settings = copyProperties(copyProperties({}, userSettings.dataSource), userSettings);
    var canvasJs = isNullOrUndefined(settings.canvasJs) ? window.CanvasJS : settings.canvasJs;
    var indicatorPlugin = window.TechnicalIndicators;
    var heatmapLibrary = window.CanvasJSHeatmap;
    var statistics = window.MarketStatistics;
    var sampleData = window.MarketSampleData;

    if(isNullOrUndefined(canvasJs) || isNullOrUndefined(canvasJs.StockChart)) {
      throw new Error("MarketDashboard: load the CanvasJS stock bundle (canvasjs.stock.min.js) first.");
    }

    if(isNullOrUndefined(statistics)) {
      throw new Error("MarketDashboard: load market-statistics.js first.");
    }

    var symbols = readSymbols(isNullOrUndefined(settings.symbols) ? (isNullOrUndefined(sampleData) ? [] : sampleData.symbols) : settings.symbols);
    var fieldNames = copyProperties({ date: "date", open: "open", high: "high", low: "low", close: "close", volume: "volume" }, settings.fields);
    var historicalSource = isNullOrUndefined(settings.historical) ? (isNullOrUndefined(sampleData) ? null : sampleData.historical) : settings.historical;
    var realtimeSource = isNullOrUndefined(settings.realtime) ? (isNullOrUndefined(sampleData) ? null : sampleData.realtime) : settings.realtime;
    var themes = copyProperties(copyProperties({}, themeDefinitions), settings.themes);
    var themeName = isNullOrUndefined(themes[settings.theme]) ? "midnight" : settings.theme;
    var currencyPrefix = isNullOrUndefined(settings.currency) ? "$" : settings.currency;
    var periodsPerYear = isFiniteNumber(settings.periodsPerYear) ? settings.periodsPerYear : 252;
    var candleIntervalMilliseconds = (isFiniteNumber(settings.interval) ? settings.interval : 60) * 1000;
    var pageNames = isArray(settings.pages) ? settings.pages : ["live", "historical"];
    var currentPageName = (indexOfItem(pageNames, settings.page) !== -1) ? settings.page : pageNames[0];
    var selectedSymbol = isNullOrUndefined(settings.symbol) ? (symbols.length > 0 ? symbols[0].symbol : "") : settings.symbol;
    var indicatorList = [];
    var symbolStates = {};
    var historyCache = {};
    var historyErrors = {};
    var pageElements = {};
    var tabElements = {};
    var elements = {};
    var unsubscribeFunctions = [];
    var dirtySymbols = {};
    var flushTimer = null;
    var lastSlowRefreshTime = 0;
    var isDestroyed = false;
    var livePageState = { isBuilt: false, isStale: true, stockChart: null, indicatorSet: null, priceDataPoints: [], volumeDataPoints: [], navigatorDataPoints: [], activeIndicators: {}, chipElements: {}, moversChart: null, breadthChart: null, watchlistRows: {} };
    var historicalPageState = { isBuilt: false, isStale: true, stockChart: null, indicatorSet: null, activeIndicators: {}, chipElements: {}, candles: [], rangeKey: "1Y", chartType: "candlestick", comparisonSymbol: "", analyticsCharts: {}, heatmap: null, rangeButtons: {}, chartTypeButtons: {} };
    var hashChangeHandler = null;

    function getTheme() {
      return themes[themeName];
    }

    function findSymbolName(symbol) {
      for(var i = 0; i < symbols.length; i++) {
        if(symbols[i].symbol === symbol) {
          return symbols[i].name;
        }
      }

      return "";
    }

    function isIndicatorAvailable(type) {
      return (!isNullOrUndefined(indicatorPlugin) && indexOfItem(indicatorPlugin.getRegisteredTypes(), type) !== -1);
    }

    function readIndicators() {
      var configurations = isArray(settings.indicators) ? settings.indicators : defaultIndicators;

      for(var i = 0; i < configurations.length; i++) {
        if(isIndicatorAvailable(configurations[i].type)) {
          indicatorList.push({
            configuration: configurations[i],
            label: describeIndicator(configurations[i]),
            placement: indicatorPlugin.getPlacement(configurations[i].type),
            index: indicatorList.length
          });
        }
      }

      for(var j = 0; j < indicatorList.length; j++) {
        livePageState.activeIndicators[j] = (isArray(indicatorList[j].configuration.enabledOn) && indexOfItem(indicatorList[j].configuration.enabledOn, "live") !== -1);
        historicalPageState.activeIndicators[j] = (isArray(indicatorList[j].configuration.enabledOn) && indexOfItem(indicatorList[j].configuration.enabledOn, "historical") !== -1);
      }
    }

    function createIndicatorConfiguration(indicatorIndex) {
      var configuration = copyProperties({}, indicatorList[indicatorIndex].configuration);

      configuration.id = "indicator-" + indicatorIndex;

      return configuration;
    }

    function collectActiveConfigurations(pageState) {
      var configurations = [];

      for(var i = 0; i < indicatorList.length; i++) {
        if(pageState.activeIndicators[i] === true) {
          configurations.push(createIndicatorConfiguration(i));
        }
      }

      return configurations;
    }

    function countActivePanes(pageState) {
      var paneCount = 0;

      for(var i = 0; i < indicatorList.length; i++) {
        if(pageState.activeIndicators[i] === true && indicatorList[i].placement === "pane") {
          paneCount++;
        }
      }

      return paneCount;
    }

    function replaceContents(targetList, newItems) {
      targetList.length = 0;

      for(var i = 0; i < newItems.length; i++) {
        targetList.push(newItems[i]);
      }
    }

    function destroyChart(chart) {
      if(!isNullOrUndefined(chart)) {
        try {
          chart.destroy();
        } catch(error) {
          /* the chart was already removed */
        }
      }

      return null;
    }

    /* ---------- building blocks ---------- */
    function createCard(titleText) {
      var card = createElement("section", "market-card");
      var header = createElement("div", "market-card-header");
      var titleElement = createElement("h2", "market-card-title", titleText);
      var body = createElement("div", "market-card-body");

      header.appendChild(titleElement);
      card.appendChild(header);
      card.appendChild(body);

      return { card: card, header: header, titleElement: titleElement, body: body };
    }

    function createQuoteBar(statLabels) {
      var card = createElement("section", "market-card market-quote");
      var identity = createElement("div", "market-quote-identity");
      var symbolElement = createElement("div", "market-quote-symbol");
      var nameElement = createElement("div", "market-quote-name");
      var priceBlock = createElement("div", "market-quote-price-block");
      var priceElement = createElement("div", "market-quote-price", dash);
      var changeElement = createElement("div", "market-quote-change", dash);
      var statsElement = createElement("div", "market-quote-stats");
      var statValueElements = {};
      var statElement = null;

      identity.appendChild(symbolElement);
      identity.appendChild(nameElement);
      priceBlock.appendChild(priceElement);
      priceBlock.appendChild(changeElement);

      for(var i = 0; i < statLabels.length; i++) {
        statElement = createElement("div", "market-stat");
        statElement.appendChild(createElement("div", "market-stat-label", statLabels[i]));
        statValueElements[statLabels[i]] = createElement("div", "market-stat-value", dash);
        statElement.appendChild(statValueElements[statLabels[i]]);
        statsElement.appendChild(statElement);
      }

      card.appendChild(identity);
      card.appendChild(priceBlock);
      card.appendChild(statsElement);

      return { card: card, identity: identity, symbolElement: symbolElement, nameElement: nameElement, priceElement: priceElement, changeElement: changeElement, statValueElements: statValueElements };
    }

    function updateQuoteBar(quoteBar, price, change, changePercent) {
      setText(quoteBar.symbolElement, selectedSymbol);
      setText(quoteBar.nameElement, findSymbolName(selectedSymbol));
      setText(quoteBar.priceElement, isFiniteNumber(price) ? currencyPrefix + formatPrice(price) : dash);

      if(isFiniteNumber(change) && isFiniteNumber(changePercent)) {
        setText(quoteBar.changeElement, (change >= 0 ? upArrow : downArrow) + " " + formatSignedNumber(change, choosePriceDecimals(price)) + " (" + formatPercent(changePercent, true) + ")");
        quoteBar.changeElement.className = "market-quote-change " + (change >= 0 ? "market-up" : "market-down");
      } else {
        setText(quoteBar.changeElement, dash);
        quoteBar.changeElement.className = "market-quote-change";
      }
    }

    function showEmptyMessage(containerElement, message) {
      removeChildren(containerElement);
      containerElement.appendChild(createElement("div", "market-empty", message));
    }

    function createBaseOptions() {
      var theme = getTheme();

      return {
        theme: theme.chartTheme,
        backgroundColor: theme.surface,
        animationEnabled: false,
        toolTip: { backgroundColor: theme.raised, fontColor: theme.text, borderColor: theme.border, cornerRadius: 6 },
        axisX: { labelFontColor: theme.mutedText, lineColor: theme.border, tickColor: theme.border, gridColor: theme.gridColor },
        axisY: { labelFontColor: theme.mutedText, lineColor: theme.border, tickColor: theme.border, gridColor: theme.gridColor }
      };
    }

    function createPriceDataPoints(candles, chartType) {
      var theme = getTheme();
      var dataPoints = [];

      for(var i = 0; i < candles.length; i++) {
        if(chartType === "candlestick" || chartType === "ohlc") {
          dataPoints.push({ x: candles[i].date, y: [candles[i].open, candles[i].high, candles[i].low, candles[i].close], color: (candles[i].close >= candles[i].open) ? theme.up : theme.down, volume: candles[i].volume });
        } else {
          dataPoints.push({ x: candles[i].date, y: candles[i].close, volume: candles[i].volume });
        }
      }

      return dataPoints;
    }

    function createVolumeDataPoints(candles) {
      var theme = getTheme();
      var dataPoints = [];

      for(var i = 0; i < candles.length; i++) {
        dataPoints.push({ x: candles[i].date, y: candles[i].volume, color: (candles[i].close >= candles[i].open) ? theme.up : theme.down });
      }

      return dataPoints;
    }

    function createNavigatorDataPoints(candles) {
      var dataPoints = [];

      for(var i = 0; i < candles.length; i++) {
        dataPoints.push({ x: candles[i].date, y: candles[i].close });
      }

      return dataPoints;
    }

    function createStockChartOptions(priceSeriesList, volumeDataPoints, navigatorDataPoints, dateFormat, sliderRange) {
      var theme = getTheme();
      var axisStyle = { labelFontColor: theme.mutedText, labelFontSize: 11, lineColor: theme.border, tickColor: theme.border, gridColor: theme.gridColor, crosshair: { enabled: true, snapToDataPoint: true, color: theme.mutedText } };
      var toolTipStyle = { shared: true, backgroundColor: theme.raised, fontColor: theme.text, borderColor: theme.border, cornerRadius: 6 };
      var priceAxisX = copyProperties({}, axisStyle);
      var volumeAxisX = copyProperties({}, axisStyle);
      var options = null;

      if(!isNullOrUndefined(dateFormat)) {
        priceAxisX.valueFormatString = dateFormat;
      }

      volumeAxisX.tickLength = 0;
      volumeAxisX.labelFormatter = function() {
        return "";
      };
      options = {
        theme: theme.chartTheme,
        backgroundColor: theme.surface,
        animationEnabled: false,
        rangeSelector: { enabled: false },
        navigator: {
          data: [{ color: theme.accent, dataPoints: navigatorDataPoints }],
          axisX: { labelFontColor: theme.mutedText, labelFontSize: 11, lineColor: theme.border, tickColor: theme.border, gridColor: theme.gridColor },
          slider: { maskColor: theme.maskColor, outlineColor: theme.border, handleColor: theme.mutedText, handleBorderColor: theme.border }
        },
        charts: [{
          toolTip: toolTipStyle,
          legend: { fontColor: theme.text, verticalAlign: "top", horizontalAlign: "left" },
          axisX: priceAxisX,
          axisY: { prefix: currencyPrefix, labelFontColor: theme.mutedText, labelFontSize: 11, lineColor: theme.border, tickColor: theme.border, gridColor: theme.gridColor },
          data: priceSeriesList
        }, {
          height: 90,
          toolTip: toolTipStyle,
          axisX: volumeAxisX,
          axisY: { labelFontColor: theme.mutedText, labelFontSize: 11, lineColor: theme.border, tickColor: theme.border, gridThickness: 0 },
          data: [{ type: "column", name: "Volume", dataPoints: volumeDataPoints }]
        }]
      };

      if(!isNullOrUndefined(sliderRange)) {
        options.navigator.slider.minimum = sliderRange.minimum;
        options.navigator.slider.maximum = sliderRange.maximum;
      }

      return options;
    }

    function resizeChartContainer(chartContainer, baseHeight, pageState) {
      chartContainer.style.height = (baseHeight + countActivePanes(pageState) * chartHeightPerPane) + "px";
    }

    /* Overlay and pane indicator buttons. Toggling adds or removes the indicator on the chart without rebuilding it. */
    function buildIndicatorChips(pageState, containerElement, onToggle) {
      var groups = [{ label: "Overlays", placement: "overlay" }, { label: "Panes", placement: "pane" }];
      var groupElement = null;
      var chipElement = null;

      if(indicatorList.length === 0) {
        return;
      }

      for(var i = 0; i < groups.length; i++) {
        groupElement = createElement("div", "market-chip-group");
        groupElement.appendChild(createElement("span", "market-chip-label", groups[i].label));

        for(var j = 0; j < indicatorList.length; j++) {
          if(indicatorList[j].placement === groups[i].placement) {
            chipElement = createElement("button", "market-chip", indicatorList[j].label);
            chipElement.type = "button";
            setClass(chipElement, "market-chip-active", pageState.activeIndicators[j] === true);
            pageState.chipElements[j] = chipElement;
            groupElement.appendChild(chipElement);
            attachChipHandler(chipElement, j, onToggle);
          }
        }

        containerElement.appendChild(groupElement);
      }
    }

    function attachChipHandler(chipElement, indicatorIndex, onToggle) {
      addEvent(chipElement, "click", function() {
        onToggle(indicatorIndex);
      });
    }

    function toggleIndicator(pageState, chartContainer, baseHeight, indicatorIndex) {
      var isActive = (pageState.activeIndicators[indicatorIndex] === true);

      pageState.activeIndicators[indicatorIndex] = !isActive;
      setClass(pageState.chipElements[indicatorIndex], "market-chip-active", !isActive);
      resizeChartContainer(chartContainer, baseHeight, pageState);

      if(isNullOrUndefined(pageState.indicatorSet)) {
        return;
      }

      if(isActive === true) {
        pageState.indicatorSet.remove("indicator-" + indicatorIndex);
      } else {
        pageState.indicatorSet.add(createIndicatorConfiguration(indicatorIndex));
      }
    }

    /* ---------- live page ---------- */
    function createSymbolState() {
      return { errorMessage: null, candles: [], ticks: [], lastPrice: null, referencePrice: null, previousClose: null, openPrice: null, highPrice: null, lowPrice: null, totalVolume: 0 };
    }

    function seedSymbolState(state, candles) {
      state.candles = candles.slice(Math.max(0, candles.length - maximumCandleCount));

      if(state.candles.length > 0) {
        state.openPrice = state.candles[0].open;
        state.referencePrice = isNullOrUndefined(state.previousClose) ? state.candles[0].open : state.previousClose;
        state.lastPrice = state.candles[state.candles.length - 1].close;
        state.highPrice = -Infinity;
        state.lowPrice = Infinity;
        state.totalVolume = 0;

        for(var i = 0; i < state.candles.length; i++) {
          state.highPrice = Math.max(state.highPrice, state.candles[i].high);
          state.lowPrice = Math.min(state.lowPrice, state.candles[i].low);
          state.totalVolume += state.candles[i].volume;
        }
      }
    }

    function handleTick(symbol, tick) {
      var state = symbolStates[symbol];
      var tickTime = isNullOrUndefined(tick) ? null : parseDate(tick.time);
      var price = isNullOrUndefined(tick) ? NaN : Number(tick.price);
      var size = (!isNullOrUndefined(tick) && isFiniteNumber(Number(tick.volume))) ? Number(tick.volume) : 0;
      var bucketStart = 0;
      var lastCandle = null;
      var previousPrice = null;

      if(isDestroyed === true || isNullOrUndefined(state) || isNullOrUndefined(tickTime) || !isFiniteNumber(price)) {
        return;
      }

      previousPrice = state.lastPrice;
      state.lastPrice = price;
      state.totalVolume += size;
      state.highPrice = isNullOrUndefined(state.highPrice) ? price : Math.max(state.highPrice, price);
      state.lowPrice = isNullOrUndefined(state.lowPrice) ? price : Math.min(state.lowPrice, price);

      if(isNullOrUndefined(state.openPrice)) {
        state.openPrice = price;
      }

      if(isFiniteNumber(Number(tick.previousClose))) {
        state.previousClose = Number(tick.previousClose);
        state.referencePrice = state.previousClose;
      } else if(isNullOrUndefined(state.referencePrice)) {
        state.referencePrice = price;
      }

      bucketStart = Math.floor(tickTime.getTime() / candleIntervalMilliseconds) * candleIntervalMilliseconds;
      lastCandle = (state.candles.length > 0) ? state.candles[state.candles.length - 1] : null;

      if(!isNullOrUndefined(lastCandle) && lastCandle.date.getTime() === bucketStart) {
        lastCandle.high = Math.max(lastCandle.high, price);
        lastCandle.low = Math.min(lastCandle.low, price);
        lastCandle.close = price;
        lastCandle.volume += size;
      } else {
        state.candles.push({ date: new Date(bucketStart), open: price, high: price, low: price, close: price, volume: size });

        if(state.candles.length > maximumCandleCount) {
          state.candles.shift();
        }
      }

      state.ticks.unshift({ time: tickTime, price: price, size: size, direction: (isNullOrUndefined(previousPrice) || price >= previousPrice) ? "up" : "down" });

      if(state.ticks.length > maximumTickCount) {
        state.ticks.pop();
      }

      dirtySymbols[symbol] = true;
      scheduleFlush();
    }

    function scheduleFlush() {
      if(isNullOrUndefined(flushTimer)) {
        flushTimer = window.setTimeout(flushLiveUpdates, 250);
      }
    }

    function calculateChange(state) {
      if(isNullOrUndefined(state) || !isFiniteNumber(state.lastPrice) || !isFiniteNumber(state.referencePrice) || state.referencePrice === 0) {
        return { change: null, percent: null };
      }

      return { change: state.lastPrice - state.referencePrice, percent: (state.lastPrice / state.referencePrice - 1) * 100 };
    }

    function refreshLiveQuote() {
      var state = symbolStates[selectedSymbol];
      var change = calculateChange(state);
      var quoteBar = elements.liveQuote;

      updateQuoteBar(quoteBar, isNullOrUndefined(state) ? null : state.lastPrice, change.change, change.percent);

      if(!isNullOrUndefined(state)) {
        setText(quoteBar.statValueElements.Open, isFiniteNumber(state.openPrice) ? currencyPrefix + formatPrice(state.openPrice) : dash);
        setText(quoteBar.statValueElements.High, isFiniteNumber(state.highPrice) ? currencyPrefix + formatPrice(state.highPrice) : dash);
        setText(quoteBar.statValueElements.Low, isFiniteNumber(state.lowPrice) ? currencyPrefix + formatPrice(state.lowPrice) : dash);
        setText(quoteBar.statValueElements.Volume, formatVolume(state.totalVolume));
      }
    }

    function refreshWatchlistRow(symbol) {
      var row = livePageState.watchlistRows[symbol];
      var change = calculateChange(symbolStates[symbol]);

      if(isNullOrUndefined(row)) {
        return;
      }

      setText(row.priceCell, isFiniteNumber(symbolStates[symbol].lastPrice) ? formatPrice(symbolStates[symbol].lastPrice) : dash);
      setText(row.changeCell, formatPercent(change.percent, true));
      row.changeCell.className = "market-number " + (isNullOrUndefined(change.percent) ? "" : (change.percent >= 0 ? "market-up" : "market-down"));
    }

    function refreshTimeAndSales() {
      var state = symbolStates[selectedSymbol];
      var tableBody = elements.timeAndSalesBody;
      var rowElement = null;

      removeChildren(tableBody);

      if(isNullOrUndefined(state)) {
        return;
      }

      for(var i = 0; i < Math.min(state.ticks.length, 14); i++) {
        rowElement = createElement("tr");
        rowElement.appendChild(createElement("td", "market-muted", formatClockTime(state.ticks[i].time)));
        rowElement.appendChild(createElement("td", "market-number " + (state.ticks[i].direction === "up" ? "market-up" : "market-down"), formatPrice(state.ticks[i].price)));
        rowElement.appendChild(createElement("td", "market-number", formatQuantity(state.ticks[i].size)));
        tableBody.appendChild(rowElement);
      }
    }

    function createLiveDataPointsFromState() {
      var state = symbolStates[selectedSymbol];

      replaceContents(livePageState.priceDataPoints, createPriceDataPoints(state.candles, "candlestick"));
      replaceContents(livePageState.volumeDataPoints, createVolumeDataPoints(state.candles));
      replaceContents(livePageState.navigatorDataPoints, createNavigatorDataPoints(state.candles));
    }

    function createLiveChart() {
      var state = symbolStates[selectedSymbol];
      var theme = getTheme();

      livePageState.stockChart = destroyChart(livePageState.stockChart);
      livePageState.indicatorSet = null;

      if(isNullOrUndefined(state) || state.candles.length === 0) {
        showEmptyMessage(elements.liveChartContainer, (!isNullOrUndefined(state) && !isNullOrUndefined(state.errorMessage)) ? "Could not load " + selectedSymbol + ": " + state.errorMessage : isNullOrUndefined(realtimeSource) ? "No realtime source. Pass realtime.subscribe, or call dashboard.pushTick(symbol, { time, price, volume })." : "Waiting for the first ticks" + dash);
        return;
      }

      removeChildren(elements.liveChartContainer);
      resizeChartContainer(elements.liveChartContainer, 500, livePageState);
      createLiveDataPointsFromState();
      livePageState.stockChart = new canvasJs.StockChart(elements.liveChartContainer, createStockChartOptions(
        [{ type: "candlestick", name: selectedSymbol, risingColor: theme.up, fallingColor: theme.down, dataPoints: livePageState.priceDataPoints }],
        livePageState.volumeDataPoints, livePageState.navigatorDataPoints, "HH:mm", null));
      livePageState.stockChart.render();

      if(!isNullOrUndefined(indicatorPlugin)) {
        livePageState.indicatorSet = indicatorPlugin.apply(livePageState.stockChart, collectActiveConfigurations(livePageState));
      }
    }

    function refreshLiveChart() {
      var state = symbolStates[selectedSymbol];

      if(isNullOrUndefined(livePageState.stockChart)) {
        if(!isNullOrUndefined(state) && state.candles.length > 0) {
          createLiveChart();
        }

        return;
      }

      createLiveDataPointsFromState();

      if(!isNullOrUndefined(livePageState.indicatorSet)) {
        livePageState.indicatorSet.update();
      } else {
        livePageState.stockChart.render();
      }
    }

    function collectMovers() {
      var movers = [];
      var change = null;

      for(var i = 0; i < symbols.length; i++) {
        change = calculateChange(symbolStates[symbols[i].symbol]);

        if(!isNullOrUndefined(change.percent)) {
          movers.push({ symbol: symbols[i].symbol, percent: change.percent });
        }
      }

      movers.sort(function(firstMover, secondMover) {
        return secondMover.percent - firstMover.percent;
      });

      return movers;
    }

    function createMoversDataPoints(movers) {
      var theme = getTheme();
      var dataPoints = [];

      for(var i = 0; i < movers.length; i++) {
        dataPoints.push({ label: movers[i].symbol, y: movers[i].percent, color: (movers[i].percent >= 0) ? theme.up : theme.down });
      }

      return dataPoints;
    }

    function createBreadthDataPoints(movers) {
      var theme = getTheme();
      var advancingCount = 0;
      var decliningCount = 0;

      for(var i = 0; i < movers.length; i++) {
        if(movers[i].percent >= 0) {
          advancingCount++;
        } else {
          decliningCount++;
        }
      }

      return [{ label: "Advancing", y: advancingCount, color: theme.up }, { label: "Declining", y: decliningCount, color: theme.down }];
    }

    function createLiveSecondaryCharts() {
      var theme = getTheme();
      var movers = collectMovers();
      var moversOptions = createBaseOptions();
      var breadthOptions = createBaseOptions();

      livePageState.moversChart = destroyChart(livePageState.moversChart);
      livePageState.breadthChart = destroyChart(livePageState.breadthChart);
      moversOptions.axisY.suffix = "%";
      moversOptions.axisY.includeZero = true;
      moversOptions.axisX.labelFontColor = theme.text;
      moversOptions.data = [{ type: "column", yValueFormatString: "0.00'%'", dataPoints: createMoversDataPoints(movers) }];
      breadthOptions.legend = { fontColor: theme.text, verticalAlign: "center", horizontalAlign: "right" };
      breadthOptions.data = [{ type: "doughnut", innerRadius: "68%", startAngle: -90, showInLegend: true, legendText: "{label}", indexLabel: "{y}", indexLabelFontColor: theme.text, indexLabelPlacement: "outside", dataPoints: createBreadthDataPoints(movers) }];
      livePageState.moversChart = new canvasJs.Chart(elements.moversContainer, moversOptions);
      livePageState.moversChart.render();
      livePageState.breadthChart = new canvasJs.Chart(elements.breadthContainer, breadthOptions);
      livePageState.breadthChart.render();
    }

    function refreshLiveSecondaryCharts() {
      var movers = collectMovers();

      if(isNullOrUndefined(livePageState.moversChart) || isNullOrUndefined(livePageState.breadthChart)) {
        return;
      }

      livePageState.moversChart.options.data[0].dataPoints = createMoversDataPoints(movers);
      livePageState.moversChart.render();
      livePageState.breadthChart.options.data[0].dataPoints = createBreadthDataPoints(movers);
      livePageState.breadthChart.render();
    }

    function refreshWatchlistSelection() {
      for(var symbol in livePageState.watchlistRows) {
        if(Object.prototype.hasOwnProperty.call(livePageState.watchlistRows, symbol)) {
          setClass(livePageState.watchlistRows[symbol].row, "market-row-selected", symbol === selectedSymbol);
        }
      }
    }

    function flushLiveUpdates() {
      var now = new Date().getTime();

      flushTimer = null;

      if(isDestroyed === true) {
        return;
      }

      for(var symbol in dirtySymbols) {
        if(Object.prototype.hasOwnProperty.call(dirtySymbols, symbol)) {
          refreshWatchlistRow(symbol);
        }
      }

      if(currentPageName === "live" && livePageState.isBuilt === true) {
        if(dirtySymbols[selectedSymbol] === true) {
          refreshLiveQuote();
          refreshTimeAndSales();
          refreshLiveChart();
        }

        if(now - lastSlowRefreshTime > 1500) {
          lastSlowRefreshTime = now;
          refreshLiveSecondaryCharts();
        }

        setText(elements.liveStatus, "LIVE " + formatClockTime(new Date()));
      }

      dirtySymbols = {};
    }

    function buildLivePage() {
      var pageElement = pageElements.live;
      var grid = createElement("div", "market-grid");
      var chartCard = createCard("Price");
      var chipContainer = createElement("div", "market-chips");
      var mainColumn = createElement("div", "market-column market-span-8");
      var splitRow = createElement("div", "market-split");
      var sideColumn = createElement("div", "market-column market-span-4");
      var watchlistCard = createCard("Watchlist");
      var salesCard = createCard("Time and sales");
      var moversCard = createCard("Movers (% change)");
      var breadthCard = createCard("Market breadth");
      var watchlistTable = createElement("table", "market-table");
      var watchlistBody = createElement("tbody");
      var salesTable = createElement("table", "market-table");
      var watchlistHeader = createElement("tr");
      var salesHeader = createElement("tr");
      var statusBadge = createElement("span", "market-live-badge");

      elements.liveQuote = createQuoteBar(["Open", "High", "Low", "Volume"]);
      elements.liveStatus = createElement("span", "market-live-text", "LIVE");
      statusBadge.appendChild(createElement("span", "market-live-dot"));
      statusBadge.appendChild(elements.liveStatus);
      elements.liveQuote.identity.appendChild(statusBadge);
      pageElement.appendChild(elements.liveQuote.card);

      buildIndicatorChips(livePageState, chipContainer, function(indicatorIndex) {
        toggleIndicator(livePageState, elements.liveChartContainer, 500, indicatorIndex);
      });
      chartCard.header.appendChild(chipContainer);
      elements.liveChartContainer = createElement("div", "market-chart");
      chartCard.body.appendChild(elements.liveChartContainer);

      watchlistHeader.appendChild(createElement("th", null, "Symbol"));
      watchlistHeader.appendChild(createElement("th", "market-number", "Last"));
      watchlistHeader.appendChild(createElement("th", "market-number", "Change"));
      watchlistTable.appendChild(createElement("thead")).appendChild(watchlistHeader);

      for(var i = 0; i < symbols.length; i++) {
        buildWatchlistRow(symbols[i], watchlistBody);
      }

      watchlistTable.appendChild(watchlistBody);
      watchlistCard.body.appendChild(watchlistTable);
      salesHeader.appendChild(createElement("th", null, "Time"));
      salesHeader.appendChild(createElement("th", "market-number", "Price"));
      salesHeader.appendChild(createElement("th", "market-number", "Size"));
      salesTable.appendChild(createElement("thead")).appendChild(salesHeader);
      elements.timeAndSalesBody = createElement("tbody");
      salesTable.appendChild(elements.timeAndSalesBody);
      salesCard.body.appendChild(salesTable);
      sideColumn.appendChild(watchlistCard.card);
      sideColumn.appendChild(salesCard.card);

      elements.moversContainer = createElement("div", "market-chart market-chart-small");
      moversCard.body.appendChild(elements.moversContainer);
      elements.breadthContainer = createElement("div", "market-chart market-chart-small");
      breadthCard.body.appendChild(elements.breadthContainer);

      splitRow.appendChild(moversCard.card);
      splitRow.appendChild(breadthCard.card);
      mainColumn.appendChild(chartCard.card);
      mainColumn.appendChild(splitRow);
      grid.appendChild(mainColumn);
      grid.appendChild(sideColumn);
      pageElement.appendChild(grid);
      livePageState.isBuilt = true;
    }

    function buildWatchlistRow(symbolDefinition, tableBody) {
      var rowElement = createElement("tr", "market-row-clickable");
      var symbolCell = createElement("td");
      var priceCell = createElement("td", "market-number", dash);
      var changeCell = createElement("td", "market-number", dash);

      symbolCell.appendChild(createElement("div", "market-symbol-name", symbolDefinition.symbol));
      symbolCell.appendChild(createElement("div", "market-symbol-description", symbolDefinition.name));
      rowElement.appendChild(symbolCell);
      rowElement.appendChild(priceCell);
      rowElement.appendChild(changeCell);
      tableBody.appendChild(rowElement);
      livePageState.watchlistRows[symbolDefinition.symbol] = { row: rowElement, priceCell: priceCell, changeCell: changeCell };
      addEvent(rowElement, "click", function() {
        selectSymbol(symbolDefinition.symbol);
      });
    }

    function renderLivePage() {
      refreshLiveQuote();
      refreshTimeAndSales();
      refreshWatchlistSelection();

      for(var i = 0; i < symbols.length; i++) {
        refreshWatchlistRow(symbols[i].symbol);
      }

      createLiveChart();
      createLiveSecondaryCharts();
      livePageState.isStale = false;
    }

    /* ---------- historical page ---------- */
    function loadHistoricalCandles(symbol, callback) {
      var handleCandles = null;

      if(!isNullOrUndefined(historyCache[symbol])) {
        callback(historyCache[symbol]);
        return;
      }

      if(isNullOrUndefined(historicalSource)) {
        callback([]);
        return;
      }

      handleCandles = function(rawCandles, errorMessage) {
        if(!isNullOrUndefined(errorMessage) || !isArray(rawCandles)) {
          historyErrors[symbol] = isNullOrUndefined(errorMessage) ? "the data source returned no candles" : errorMessage;
          callback([]);
          return;
        }

        delete historyErrors[symbol];
        historyCache[symbol] = normalizeCandles(rawCandles, fieldNames);
        callback(historyCache[symbol]);
      };

      if(typeof historicalSource === "function") {
        historicalSource(symbol, handleCandles);
      } else {
        handleCandles(historicalSource[symbol]);
      }
    }

    function getVisibleRange() {
      var candles = historicalPageState.candles;
      var firstDate = candles[0].date;
      var lastDate = candles[candles.length - 1].date;

      return { start: statistics.calculateRangeStartDate(historicalPageState.rangeKey, lastDate, firstDate), end: lastDate };
    }

    function createPriceSeriesList(candles, rangeStartDate) {
      var theme = getTheme();
      var chartType = historicalPageState.chartType;
      var dataPoints = createPriceDataPoints(candles, chartType);
      var seriesList = [];
      var comparisonCandles = historyCache[historicalPageState.comparisonSymbol];

      if(chartType === "candlestick" || chartType === "ohlc") {
        seriesList.push({ type: chartType, name: selectedSymbol, showInLegend: true, risingColor: theme.up, fallingColor: theme.down, dataPoints: dataPoints });
      } else {
        seriesList.push({ type: chartType, name: selectedSymbol, showInLegend: true, color: theme.accent, lineThickness: 2, fillOpacity: 0.15, markerSize: 0, dataPoints: dataPoints });
      }

      if(historicalPageState.comparisonSymbol !== "" && !isNullOrUndefined(comparisonCandles) && comparisonCandles.length > 0) {
        seriesList.push({ type: "line", name: historicalPageState.comparisonSymbol + " (rebased)", showInLegend: true, color: theme.comparison, lineThickness: 2, markerSize: 0, dataPoints: statistics.rebaseComparison(statistics.sliceFromDate(candles, rangeStartDate), comparisonCandles) });
      }

      return seriesList;
    }

    function createHistoricalChart() {
      var candles = historicalPageState.candles;
      var range = null;
      var options = null;

      historicalPageState.stockChart = destroyChart(historicalPageState.stockChart);
      historicalPageState.indicatorSet = null;

      if(candles.length === 0) {
        showEmptyMessage(elements.historicalChartContainer, isNullOrUndefined(historyErrors[selectedSymbol]) ? "No historical data for " + selectedSymbol + ". Pass it with the historical option." : "Could not load " + selectedSymbol + ": " + historyErrors[selectedSymbol]);
        return;
      }

      removeChildren(elements.historicalChartContainer);
      resizeChartContainer(elements.historicalChartContainer, 560, historicalPageState);
      range = getVisibleRange();
      options = createStockChartOptions(createPriceSeriesList(candles, range.start), createVolumeDataPoints(candles), createNavigatorDataPoints(candles), null, { minimum: range.start, maximum: range.end });
      options.rangeChanged = handleRangeChanged;
      historicalPageState.stockChart = new canvasJs.StockChart(elements.historicalChartContainer, options);
      historicalPageState.stockChart.render();

      if(!isNullOrUndefined(indicatorPlugin)) {
        historicalPageState.indicatorSet = indicatorPlugin.apply(historicalPageState.stockChart, collectActiveConfigurations(historicalPageState));
      }
    }

    function createDrawdownOptions(points) {
      var theme = getTheme();
      var options = createBaseOptions();

      options.axisY.suffix = "%";
      options.axisY.maximum = 0;
      options.data = [{ type: "area", color: theme.down, fillOpacity: 0.25, lineThickness: 2, markerSize: 0, yValueFormatString: "0.00'%'", dataPoints: points }];

      return options;
    }

    function createVolatilityOptions(points) {
      var options = createBaseOptions();

      options.axisY.suffix = "%";
      options.axisY.includeZero = false;
      options.data = [{ type: "line", color: getTheme().accent, lineThickness: 2, markerSize: 0, yValueFormatString: "0.0'%'", dataPoints: points }];

      return options;
    }

    function createDistributionOptions(bins) {
      var theme = getTheme();
      var options = createBaseOptions();
      var dataPoints = [];

      for(var i = 0; i < bins.length; i++) {
        dataPoints.push({ label: bins[i].label, y: bins[i].y, color: (bins[i].center >= 0) ? theme.up : theme.down });
      }

      options.axisX.interval = 2;
      options.axisY.minimum = 0;
      options.axisY.title = "Days";
      options.axisY.titleFontColor = theme.mutedText;
      options.data = [{ type: "column", yValueFormatString: "0", dataPoints: dataPoints }];

      return options;
    }

    function upsertAnalyticsChart(key, containerElement, createOptions, source) {
      var charts = historicalPageState.analyticsCharts;

      if(isNullOrUndefined(charts[key])) {
        charts[key] = new canvasJs.Chart(containerElement, createOptions(source));
      } else {
        charts[key].options.data = createOptions(source).data;
      }

      charts[key].render();
    }

    function filterPointsByDate(points, startDate, endDate) {
      var filteredPoints = [];

      for(var i = 0; i < points.length; i++) {
        if(points[i].x.getTime() >= startDate.getTime() && points[i].x.getTime() <= endDate.getTime()) {
          filteredPoints.push(points[i]);
        }
      }

      return filteredPoints;
    }

    function refreshHistoricalAnalytics(startDate, endDate) {
      var allCandles = historicalPageState.candles;
      var rangeCandles = statistics.sliceFromDate(allCandles, startDate, endDate);
      var summary = statistics.calculatePeriodSummary(rangeCandles, periodsPerYear);
      var quoteBar = elements.historicalQuote;
      var lastClose = (rangeCandles.length > 0) ? rangeCandles[rangeCandles.length - 1].close : null;
      var firstClose = (rangeCandles.length > 0) ? rangeCandles[0].close : null;

      updateQuoteBar(quoteBar, lastClose, isNullOrUndefined(lastClose) ? null : lastClose - firstClose, summary.totalReturn);
      setText(quoteBar.statValueElements["Period high"], isNullOrUndefined(summary.highestPrice) ? dash : currencyPrefix + formatPrice(summary.highestPrice));
      setText(quoteBar.statValueElements["Period low"], isNullOrUndefined(summary.lowestPrice) ? dash : currencyPrefix + formatPrice(summary.lowestPrice));
      setText(quoteBar.statValueElements["Average volume"], formatVolume(summary.averageVolume));
      setText(quoteBar.statValueElements.Volatility, isNullOrUndefined(summary.annualizedVolatility) ? dash : formatPercent(summary.annualizedVolatility, false));
      setText(quoteBar.statValueElements["Max drawdown"], formatPercent(summary.maximumDrawdown, false));

      if(rangeCandles.length < 3) {
        return;
      }

      upsertAnalyticsChart("drawdown", elements.drawdownContainer, createDrawdownOptions, statistics.calculateDrawdownSeries(rangeCandles));
      upsertAnalyticsChart("volatility", elements.volatilityContainer, createVolatilityOptions, filterPointsByDate(statistics.calculateRollingVolatility(allCandles, 30, periodsPerYear), startDate, endDate));
      upsertAnalyticsChart("distribution", elements.distributionContainer, createDistributionOptions, statistics.calculateReturnDistribution(rangeCandles, 15));
    }

    function createMonthlyHeatmap() {
      var theme = getTheme();
      var monthlyReturns = statistics.calculateMonthlyReturns(historicalPageState.candles);
      var heatmapHeight = Math.max(220, monthlyReturns.rows.length * 34 + 56);

      if(!isNullOrUndefined(historicalPageState.heatmap)) {
        historicalPageState.heatmap.destroy();
        historicalPageState.heatmap = null;
      }

      removeChildren(elements.heatmapContainer);

      if(isNullOrUndefined(heatmapLibrary)) {
        showEmptyMessage(elements.heatmapContainer, "Load canvasjs-heatmap.js to see monthly returns.");
        return;
      }

      elements.heatmapContainer.style.height = heatmapHeight + "px";
      historicalPageState.heatmap = heatmapLibrary.create(elements.heatmapContainer, {
        columns: monthlyReturns.columns,
        rows: monthlyReturns.rows,
        colors: [theme.down, theme.border, theme.up],
        midpoint: 0,
        backgroundColor: theme.surface,
        gapColor: theme.surface,
        textColor: theme.text,
        labelColor: theme.mutedText,
        theme: theme.chartTheme,
        height: heatmapHeight,
        showValues: true,
        valueFormat: function(value) {
          return value.toFixed(1);
        }
      }, canvasJs);
    }

    function handleRangeChanged(event) {
      var startDate = isNullOrUndefined(event) ? null : parseDate(event.minimum);
      var endDate = isNullOrUndefined(event) ? null : parseDate(event.maximum);

      if(isNullOrUndefined(startDate) || isNullOrUndefined(endDate) || historicalPageState.candles.length === 0) {
        return;
      }

      refreshHistoricalAnalytics(startDate, endDate);
    }

    function destroyHistoricalCharts() {
      historicalPageState.stockChart = destroyChart(historicalPageState.stockChart);
      historicalPageState.indicatorSet = null;

      for(var key in historicalPageState.analyticsCharts) {
        if(Object.prototype.hasOwnProperty.call(historicalPageState.analyticsCharts, key)) {
          destroyChart(historicalPageState.analyticsCharts[key]);
        }
      }

      historicalPageState.analyticsCharts = {};

      if(!isNullOrUndefined(historicalPageState.heatmap)) {
        historicalPageState.heatmap.destroy();
        historicalPageState.heatmap = null;
      }
    }

    function renderHistoricalCharts() {
      var range = null;

      createHistoricalChart();

      if(historicalPageState.candles.length === 0) {
        return;
      }

      range = getVisibleRange();
      refreshHistoricalAnalytics(range.start, range.end);
    }

    function renderHistoricalPage() {
      var requestedSymbol = selectedSymbol;

      historicalPageState.isStale = false;
      destroyHistoricalCharts();
      setText(elements.historicalQuote.symbolElement, selectedSymbol);
      showEmptyMessage(elements.historicalChartContainer, "Loading " + selectedSymbol + dash);

      loadHistoricalCandles(requestedSymbol, function(candles) {
        if(isDestroyed === true || requestedSymbol !== selectedSymbol) {
          return;
        }

        historicalPageState.candles = candles;
        loadComparison(function() {
          renderHistoricalCharts();
          createMonthlyHeatmap();
        });
      });
    }

    function loadComparison(callback) {
      var comparisonSymbol = historicalPageState.comparisonSymbol;

      if(comparisonSymbol === "" || comparisonSymbol === selectedSymbol) {
        historicalPageState.comparisonSymbol = "";
        callback();
        return;
      }

      loadHistoricalCandles(comparisonSymbol, callback);
    }

    function setRange(rangeKey) {
      historicalPageState.rangeKey = rangeKey;

      for(var key in historicalPageState.rangeButtons) {
        if(Object.prototype.hasOwnProperty.call(historicalPageState.rangeButtons, key)) {
          setClass(historicalPageState.rangeButtons[key], "market-segment-active", key === rangeKey);
        }
      }

      if(historicalPageState.candles.length > 0) {
        renderHistoricalCharts();
      }
    }

    function setChartType(chartType) {
      historicalPageState.chartType = chartType;

      for(var key in historicalPageState.chartTypeButtons) {
        if(Object.prototype.hasOwnProperty.call(historicalPageState.chartTypeButtons, key)) {
          setClass(historicalPageState.chartTypeButtons[key], "market-segment-active", key === chartType);
        }
      }

      if(historicalPageState.candles.length > 0) {
        renderHistoricalCharts();
      }
    }

    function setComparison(comparisonSymbol) {
      historicalPageState.comparisonSymbol = comparisonSymbol;
      loadComparison(function() {
        if(historicalPageState.candles.length > 0) {
          renderHistoricalCharts();
        }
      });
    }

    function createSegmentButton(labelText, isActive, onClick) {
      var buttonElement = createElement("button", "market-segment", labelText);

      buttonElement.type = "button";
      setClass(buttonElement, "market-segment-active", isActive);
      addEvent(buttonElement, "click", onClick);

      return buttonElement;
    }

    function buildHistoricalControls() {
      var card = createElement("section", "market-card market-controls-bar");
      var rangeGroup = createElement("div", "market-segments");
      var typeGroup = createElement("div", "market-segments");
      var comparisonGroup = createElement("label", "market-compare");
      var comparisonSelect = createElement("select", "market-select");
      var option = null;

      for(var i = 0; i < historicalRanges.length; i++) {
        historicalPageState.rangeButtons[historicalRanges[i]] = createSegmentButton(historicalRanges[i], historicalRanges[i] === historicalPageState.rangeKey, createRangeHandler(historicalRanges[i]));
        rangeGroup.appendChild(historicalPageState.rangeButtons[historicalRanges[i]]);
      }

      for(var j = 0; j < chartTypeOptions.length; j++) {
        historicalPageState.chartTypeButtons[chartTypeOptions[j].type] = createSegmentButton(chartTypeOptions[j].label, chartTypeOptions[j].type === historicalPageState.chartType, createChartTypeHandler(chartTypeOptions[j].type));
        typeGroup.appendChild(historicalPageState.chartTypeButtons[chartTypeOptions[j].type]);
      }

      comparisonGroup.appendChild(createElement("span", "market-chip-label", "Compare"));
      option = createElement("option", null, "None");
      option.value = "";
      comparisonSelect.appendChild(option);

      for(var k = 0; k < symbols.length; k++) {
        option = createElement("option", null, symbols[k].symbol);
        option.value = symbols[k].symbol;
        comparisonSelect.appendChild(option);
      }

      addEvent(comparisonSelect, "change", function() {
        setComparison(comparisonSelect.value);
      });
      elements.comparisonSelect = comparisonSelect;
      comparisonGroup.appendChild(comparisonSelect);
      card.appendChild(rangeGroup);
      card.appendChild(typeGroup);
      card.appendChild(comparisonGroup);

      return card;
    }

    function createRangeHandler(rangeKey) {
      return function() {
        setRange(rangeKey);
      };
    }

    function createChartTypeHandler(chartType) {
      return function() {
        setChartType(chartType);
      };
    }

    function buildHistoricalPage() {
      var pageElement = pageElements.historical;
      var chartCard = createCard("Price history");
      var chipContainer = createElement("div", "market-chips");
      var grid = createElement("div", "market-grid");
      var drawdownCard = createCard("Drawdown");
      var volatilityCard = createCard("Rolling volatility (30 days, annualized)");
      var heatmapCard = createCard("Monthly returns (%) \u2013 all history");
      var distributionCard = createCard("Daily return distribution");

      elements.historicalQuote = createQuoteBar(["Period high", "Period low", "Average volume", "Volatility", "Max drawdown"]);
      pageElement.appendChild(elements.historicalQuote.card);
      pageElement.appendChild(buildHistoricalControls());
      buildIndicatorChips(historicalPageState, chipContainer, function(indicatorIndex) {
        toggleIndicator(historicalPageState, elements.historicalChartContainer, 560, indicatorIndex);
      });
      chartCard.header.appendChild(chipContainer);
      elements.historicalChartContainer = createElement("div", "market-chart");
      chartCard.body.appendChild(elements.historicalChartContainer);
      addClass(chartCard.card, "market-span-12");
      elements.drawdownContainer = createElement("div", "market-chart market-chart-small");
      drawdownCard.body.appendChild(elements.drawdownContainer);
      addClass(drawdownCard.card, "market-span-6");
      elements.volatilityContainer = createElement("div", "market-chart market-chart-small");
      volatilityCard.body.appendChild(elements.volatilityContainer);
      addClass(volatilityCard.card, "market-span-6");
      elements.heatmapContainer = createElement("div", "market-chart");
      heatmapCard.body.appendChild(elements.heatmapContainer);
      addClass(heatmapCard.card, "market-span-7");
      elements.distributionContainer = createElement("div", "market-chart market-chart-small");
      distributionCard.body.appendChild(elements.distributionContainer);
      addClass(distributionCard.card, "market-span-5");
      grid.appendChild(chartCard.card);
      grid.appendChild(drawdownCard.card);
      grid.appendChild(volatilityCard.card);
      grid.appendChild(heatmapCard.card);
      grid.appendChild(distributionCard.card);
      pageElement.appendChild(grid);
      historicalPageState.isBuilt = true;
    }

    /* ---------- shell, theme and navigation ---------- */
    function applyTheme() {
      var theme = getTheme();
      var variables = { "--market-background": theme.background, "--market-surface": theme.surface, "--market-raised": theme.raised, "--market-border": theme.border, "--market-text": theme.text, "--market-muted": theme.mutedText, "--market-accent": theme.accent, "--market-up": theme.up, "--market-down": theme.down };

      for(var variableName in variables) {
        if(Object.prototype.hasOwnProperty.call(variables, variableName) && !isNullOrUndefined(rootElement.style.setProperty)) {
          rootElement.style.setProperty(variableName, variables[variableName]);
        }
      }

      rootElement.setAttribute("data-theme", themeName);

      if(!isNullOrUndefined(elements.themeSelect)) {
        elements.themeSelect.value = themeName;
      }
    }

    function renderCurrentPage() {
      var pageState = (currentPageName === "live") ? livePageState : historicalPageState;

      if(pageState.isBuilt === false) {
        if(currentPageName === "live") {
          buildLivePage();
        } else {
          buildHistoricalPage();
        }
      }

      if(pageState.isStale === true) {
        if(currentPageName === "live") {
          renderLivePage();
        } else {
          renderHistoricalPage();
        }
      } else if(currentPageName === "live") {
        refreshLiveQuote();
        refitCharts([livePageState.stockChart, livePageState.moversChart, livePageState.breadthChart]);
      } else {
        refitCharts([historicalPageState.stockChart, historicalPageState.analyticsCharts.drawdown, historicalPageState.analyticsCharts.volatility, historicalPageState.analyticsCharts.distribution]);
      }
    }

    function refitCharts(charts) {
      for(var i = 0; i < charts.length; i++) {
        if(!isNullOrUndefined(charts[i])) {
          charts[i].render();
        }
      }
    }

    function showPage(pageName) {
      if(indexOfItem(pageNames, pageName) === -1) {
        return;
      }

      currentPageName = pageName;

      for(var i = 0; i < pageNames.length; i++) {
        setClass(pageElements[pageNames[i]], "market-page-hidden", pageNames[i] !== pageName);
        setClass(tabElements[pageNames[i]], "market-tab-active", pageNames[i] === pageName);
      }

      if(pageNames.length > 1 && window.location.hash !== "#" + pageName && settings.useHash !== false) {
        window.location.hash = "#" + pageName;
      }

      renderCurrentPage();
    }

    function selectSymbol(symbol) {
      selectedSymbol = symbol;
      elements.symbolSelect.value = symbol;
      livePageState.isStale = true;
      historicalPageState.isStale = true;
      renderCurrentPage();
    }

    function setTheme(newThemeName) {
      if(isNullOrUndefined(themes[newThemeName])) {
        return;
      }

      themeName = newThemeName;
      applyTheme();
      livePageState.isStale = true;
      historicalPageState.isStale = true;
      renderCurrentPage();
    }

    function createSelect(optionDefinitions, selectedValue, onChange) {
      var selectElement = createElement("select", "market-select");
      var optionElement = null;

      for(var i = 0; i < optionDefinitions.length; i++) {
        optionElement = createElement("option", null, optionDefinitions[i].label);
        optionElement.value = optionDefinitions[i].value;
        selectElement.appendChild(optionElement);
      }

      selectElement.value = selectedValue;
      addEvent(selectElement, "change", function() {
        onChange(selectElement.value);
      });

      return selectElement;
    }

    function buildShell() {
      var headerElement = createElement("header", "market-header");
      var brandElement = createElement("div", "market-brand");
      var navigationElement = createElement("nav", "market-tabs");
      var controlsElement = createElement("div", "market-header-controls");
      var symbolOptions = [];
      var themeOptions = [];
      var pagesElement = createElement("div", "market-pages");
      var footerElement = createElement("footer", "market-footer");
      var pageLabels = { live: "Live", historical: "Historical" };
      var usesSampleData = (isNullOrUndefined(settings.historical) && isNullOrUndefined(settings.realtime) && !isNullOrUndefined(sampleData));

      removeChildren(rootElement);
      addClass(rootElement, "market-dashboard");
      brandElement.appendChild(createElement("span", "market-brand-mark"));
      brandElement.appendChild(createElement("span", "market-brand-title", isNullOrUndefined(settings.title) ? "Market Desk" : settings.title));

      if(usesSampleData === true) {
        brandElement.appendChild(createElement("span", "market-badge-simulated", "SIMULATED DATA"));
      }

      for(var i = 0; i < pageNames.length; i++) {
        tabElements[pageNames[i]] = createElement("button", "market-tab", pageLabels[pageNames[i]]);
        tabElements[pageNames[i]].type = "button";
        attachTabHandler(tabElements[pageNames[i]], pageNames[i]);
        navigationElement.appendChild(tabElements[pageNames[i]]);
        pageElements[pageNames[i]] = createElement("main", "market-page market-page-hidden");
        pagesElement.appendChild(pageElements[pageNames[i]]);
      }

      for(var j = 0; j < symbols.length; j++) {
        symbolOptions.push({ value: symbols[j].symbol, label: symbols[j].symbol + (symbols[j].name === "" ? "" : "  \u2013  " + symbols[j].name) });
      }

      for(var themeKey in themes) {
        if(Object.prototype.hasOwnProperty.call(themes, themeKey)) {
          themeOptions.push({ value: themeKey, label: themes[themeKey].label });
        }
      }

      elements.symbolSelect = createSelect(symbolOptions, selectedSymbol, selectSymbol);
      elements.themeSelect = createSelect(themeOptions, themeName, setTheme);
      controlsElement.appendChild(elements.symbolSelect);
      controlsElement.appendChild(elements.themeSelect);
      headerElement.appendChild(brandElement);
      headerElement.appendChild(navigationElement);
      headerElement.appendChild(controlsElement);
      setText(footerElement, isNullOrUndefined(settings.notice) ? (usesSampleData ? "Simulated data: fictional companies and random prices, not real market data. Pass your own data with the dataSource, historical and realtime options." : "") : settings.notice);
      rootElement.appendChild(headerElement);
      rootElement.appendChild(pagesElement);
      rootElement.appendChild(footerElement);
    }

    function attachTabHandler(tabElement, pageName) {
      addEvent(tabElement, "click", function() {
        showPage(pageName);
      });
    }

    function requestRealtimeHistory(symbol) {
      realtimeSource.history(symbol, function(rawCandles, errorMessage) {
        if(!isNullOrUndefined(errorMessage)) {
          symbolStates[symbol].errorMessage = errorMessage;
        } else {
          seedSymbolState(symbolStates[symbol], normalizeCandles(rawCandles, fieldNames));
        }

        dirtySymbols[symbol] = true;
        scheduleFlush();
      });
    }

    function subscribeToSymbol(symbol) {
      var unsubscribe = realtimeSource.subscribe(symbol, function(tick) {
        handleTick(symbol, tick);
      });

      if(typeof unsubscribe === "function") {
        unsubscribeFunctions.push(unsubscribe);
      }
    }

    function startRealtime() {
      for(var i = 0; i < symbols.length; i++) {
        symbolStates[symbols[i].symbol] = createSymbolState();
      }

      if(isNullOrUndefined(realtimeSource)) {
        return;
      }

      for(var j = 0; j < symbols.length; j++) {
        if(typeof realtimeSource.history === "function") {
          requestRealtimeHistory(symbols[j].symbol);
        }

        if(typeof realtimeSource.subscribe === "function") {
          subscribeToSymbol(symbols[j].symbol);
        }
      }
    }

    function destroy() {
      isDestroyed = true;
      window.clearTimeout(flushTimer);

      for(var i = 0; i < unsubscribeFunctions.length; i++) {
        unsubscribeFunctions[i]();
      }

      livePageState.stockChart = destroyChart(livePageState.stockChart);
      livePageState.moversChart = destroyChart(livePageState.moversChart);
      livePageState.breadthChart = destroyChart(livePageState.breadthChart);
      destroyHistoricalCharts();

      if(!isNullOrUndefined(hashChangeHandler)) {
        removeEvent(window, "hashchange", hashChangeHandler);
      }

      removeChildren(rootElement);
      removeClass(rootElement, "market-dashboard");
    }

    function readPageFromHash() {
      var hashPageName = window.location.hash.replace("#", "");

      return (indexOfItem(pageNames, hashPageName) !== -1) ? hashPageName : currentPageName;
    }

    readIndicators();
    buildShell();
    applyTheme();
    startRealtime();

    if(settings.useHash !== false && pageNames.length > 1) {
      currentPageName = readPageFromHash();
      hashChangeHandler = function() {
        showPage(readPageFromHash());
      };
      addEvent(window, "hashchange", hashChangeHandler);
    }

    showPage(currentPageName);

    return {
      pushTick: handleTick,
      setSymbol: selectSymbol,
      showPage: showPage,
      setTheme: setTheme,
      getSelectedSymbol: function() {
        return selectedSymbol;
      },
      destroy: destroy
    };
  }

  window.MarketDashboard = {
    version: "1.0.0",
    create: createMarketDashboard,
    themes: themeDefinitions
  };
})(window);
