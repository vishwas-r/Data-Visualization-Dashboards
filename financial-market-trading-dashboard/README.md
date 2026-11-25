# Financial Market & Trading Dashboard

A real-time and historical financial market desk built on CanvasJS StockChart, complete with technical indicators (SMA, EMA, Bollinger Bands, VWAP, RSI, MACD, Stochastic, ATR, OBV), monthly-returns heatmap, light & dark themes, and ready-to-run data sources. Designed to let any developer drop in their own financial data and use it in their application. Plain ES5 code with zero build step.

- **Live Desk**: quote bar, real-time candlestick chart updating from ticks, technical indicator toggles, watchlist, time & sales, top movers, market breadth.
- **Historical Analysis**: range buttons (1M to 5Y), candle / OHLC / line / area modes, symbol comparison (rebased to range start), indicator buttons, visible range statistics (period return, high, low, volume, annualized volatility, max drawdown), drawdown chart, rolling volatility, monthly-returns heatmap, and daily-return distribution.
- **Dual Mode**: seamlessly switch between `#live` and `#historical` tabs in the address bar. Set `pages: ["live"]` or `pages: ["historical"]` to display only one.

### Quick Demos (Open in browser):
- `index.html`: **Live Crypto Desk** using Binance's public market-data WebSocket and REST endpoints (no API key required).
- `examples/bring-your-own-data.html`: **Clean starter template** showing how to plug in your own custom OHLC history and live trade feeds.
- `examples/simulated-demo.html`: **Simulated market demo** with fictional tickers and offline price generator.
- `examples/local-json-stocks.html`: **Historical stock analysis** from local JSON files.

## Quickstart

```html
<link rel="stylesheet" href="market-dashboard.css">
<div id="app"></div>

<!-- 1. CanvasJS StockChart from CDN -->
<script src="https://cdn.canvasjs.com/canvasjs.stock.min.js"></script>

<!-- 2. Plugins -->
<script src="vendor/canvasjs-heatmap.js"></script>
<script src="vendor/technical-indicators/technical-indicators-core.js"></script>
<script src="vendor/technical-indicators/indicators/simple-moving-average.js"></script>
<script src="vendor/technical-indicators/indicators/relative-strength-index.js"></script>
<!-- Or load all 9 indicators with the bundled file: -->
<!-- <script src="vendor/technical-indicators/technical-indicators.min.js"></script> -->

<!-- 3. Dashboard Engine -->
<script src="market-statistics.js"></script>
<script src="market-dashboard.js"></script>

<script>
  var dashboard = MarketDashboard.create("app", {
    symbols: ["AAPL", "MSFT"],
    historical: function(symbol, callback) {
      callback(arrayOfDailyCandles);
    },
    realtime: {
      subscribe: function(symbol, onTick) {
        // Call onTick({ time, price, volume }) whenever your feed receives a trade
        return function() { /* unsubscribe */ };
      }
    }
  });
</script>
```

React and Angular wrappers are available in `react/` and `angular/`.

## Your data
- **Candles** (`historical`, and `realtime.history`): `{ date, open, high, low, close, volume }`. `date` can be a Date, a timestamp in milliseconds or seconds, or "YYYY-MM-DD". If your fields are named differently, map them: `fields: { date: "t", open: "o", high: "h", low: "l", close: "c", volume: "v" }`. Only `date` and `close` are required.
- **Ticks** (`realtime.subscribe`): `{ time, price, volume }`; optional `previousClose` sets the reference for the change figures (otherwise the first price or candle open is used). You can also push ticks yourself: `dashboard.pushTick("AAPL", { time: Date.now(), price: 191.2, volume: 150 })`.
- **Intraday history** (optional): `realtime.history(symbol, callback)` returns today's candles so far, so the live chart is not empty at start. They must use the same interval as `interval`.
- `interval`: seconds per live candle (default 60).

## Options
| Option | Default | Notes |
|---|---|---|
| `title` | "Market Desk" | |
| `symbols` | sample symbols in demo mode | symbol list for the selector and watchlist |
| `symbol` | first symbol | selected at start |
| `historical`, `realtime` | demo data | see above |
| `fields` | date, open, high, low, close, volume | your property names for candles |
| `currency` | "$" | price prefix |
| `interval` | 60 | seconds per live candle |
| `theme` | "midnight" | "midnight" or "daylight"; add your own in `themes` with the same keys as `MarketDashboard.themes.midnight` (hex colours) |
| `pages`, `page` | both, first | `useHash: false` turns off address-bar navigation |
| `indicators` | SMA 20/50, EMA 21, Bollinger, VWAP, RSI, MACD, Stochastic, ATR, OBV | list of indicator configurations, see the technical-indicators README. Add `label` for the button text and `enabledOn: ["live", "historical"]` for the ones switched on at start. Buttons appear only for indicators whose file you loaded |
| `notice` | | footer text |
| `canvasJs` | `window.CanvasJS` | pass the CanvasJS object if you import it as a module |

Returned object: `pushTick(symbol, tick)`, `setSymbol(symbol)`, `showPage(name)`, `setTheme(name)`, `getSelectedSymbol()`, `destroy()`.

## Data sources
`data-sources/market-data-sources.js` has two ready-made sources; pass one as `dataSource` (your own options still override it):
```js
MarketDashboard.create("app", { dataSource: MarketDataSources.binance() });                       // crypto: history + live trades
MarketDashboard.create("app", { dataSource: MarketDataSources.localJson({ baseUrl: "data/stocks/" }) });  // stock history from JSON files
```
- **Binance**: `restBaseUrl` (default `https://data-api.binance.vision`) and `streamBaseUrl` (default `wss://data-stream.binance.vision`) are Binance's market-data-only hosts, which need no key. Options: `symbols` (default BTC, ETH, SOL, BNB, XRP, ADA, DOGE, LINK against USDT), `dailyCandleCount` (1500), `intradayCandleCount` (240 one-minute candles). Change figures are 24-hour changes, and volatility is annualized over 365 days. If Binance is blocked where you are, try another host from Binance's docs.
- **Local JSON**: one file per symbol, `[{ date, open, high, low, close, volume }, ...]`. The download script uses Yahoo Finance's public chart endpoint (Stooq CSV as the fallback), both unofficial and for personal use. Check their terms, and use a licensed provider for anything you publish or sell.
- **Stocks in real time**: there is no legitimately free, no-signup real-time stock feed. For one, write a `realtime.subscribe` for your provider (Finnhub, Polygon, Alpaca and others have free tiers with a key) and pass it in; see "Your data".
- An error from a source shows as a message in the chart ("Could not load ...") instead of a blank chart. In a custom source, call `callback(null, "message")` to report one.

## Notes
- `sample-market-data.js` is only for demos and is simulated: leave it out and the dashboard uses what you pass. Whenever it is used, the header shows "SIMULATED DATA".
- The comparison line is rebased to the start of the selected range, so changing the range redraws it. Dragging the navigator updates the statistics for the visible range; the comparison line is not recalculated until the next range button click.
- The monthly heatmap always uses the full history you pass; the other analytics follow the visible range.
- Market data licences (for real feeds) are yours to sort out; the demo data is simulated.
- Files: `market-statistics.js` (pure calculations, usable on its own), `market-dashboard.js`, `market-dashboard.css`.

## License

This dashboard template is open-source under the [MIT License](../Simple%20Bootstrap%20Dashboard/LICENSE).

This is a dashboard template for CanvasJS and requires CanvasJS StockChart. CanvasJS itself is proprietary and licensed separately—please review the [CanvasJS License](https://canvasjs.com/license/) for its licensing terms.
