# Data Visualization Dashboards

A curated collection of production-ready, open-source dashboard templates and data visualization examples built with [CanvasJS Charts](https://canvasjs.com). 

Each dashboard is completely self-contained in its own folder and ready to run or adapt into your own applications.

---

## Available Dashboards

| Dashboard | Tech Stack | Highlights | Link |
|---|---|---|---|
| **Financial Market & Trading Dashboard** | Plain JS / StockChart | Real-time & historical market desk, live crypto WebSocket feed, 9 technical indicators, monthly returns heatmap, drawdown analytics. | [Explore &rarr;](./financial-market-trading-dashboard) |
| **Django Dashboard using CanvasJS** | Python / Django | Full-stack web application integrating dynamic database-driven CanvasJS charts with Django templates. | [Explore &rarr;](./Django%20Dashboard%20using%20CanvasJS%20Python%20Charts) |
| **Simple Bootstrap Dashboard** | HTML5 / Bootstrap | Lightweight responsive business analytics dashboard template with KPIs, revenue charts, and tables. | [Explore &rarr;](./Simple%20Bootstrap%20Dashboard) |

---

### 1. [Financial Market & Trading Dashboard](./financial-market-trading-dashboard)

A real-time financial market terminal built on CanvasJS StockChart. 
* **Live Desk**: Live candlestick chart ticking from real-time trade feeds, time & sales, order book, watchlist, top movers.
* **Historical Analysis**: Range selector (1M to 5Y), monthly-returns heatmap, drawdown curve, rolling volatility, and comparison mode.
* **Technical Indicators Built-in**: SMA, EMA, Bollinger Bands, VWAP, RSI, MACD, Stochastic, ATR, and OBV.
* **Zero-Setup Live Feed**: Connects to Binance's public market-data endpoints out of the box with no API keys required.
* **Bring Your Own Data**: Ready-made examples for plugging in your own custom REST endpoints, WebSockets, or CSV/JSON files.

---

### 2. [Django Dashboard using CanvasJS Python Charts](./Django%20Dashboard%20using%20CanvasJS%20Python%20Charts)

A complete Python Django web project demonstrating how to query database models and render dynamic interactive CanvasJS charts on the frontend.
* Django models and views passing data to CanvasJS.
* Multi-series interactive charts.
* Clean architecture for backend-driven data visualization.

---

### 3. [Simple Bootstrap Dashboard](./Simple%20Bootstrap%20Dashboard)

A responsive, lightweight dashboard layout built with Bootstrap and CanvasJS.
* Overview statistics and KPI summary cards.
* Clean visual aesthetics with multiple chart types.
* Ideal starting template for admin panels and SaaS reporting.

---

## License

The dashboard templates in this repository are open-source and licensed under the [MIT License](LICENSE).

These dashboards are built for and require CanvasJS Charts / StockCharts. CanvasJS is a separate library with its own licensing terms—please review the [CanvasJS License](https://canvasjs.com/license/) for details regarding commercial and non-commercial usage.
