# Data Visualization Dashboards

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demos-brightgreen?style=flat&logo=github)](https://vishwas-r.github.io/Data-Visualization-Dashboards/)
[![CanvasJS](https://img.shields.io/badge/CanvasJS-Charts%20%26%20StockCharts-blue.svg)](https://canvasjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A curated collection of production-ready, open-source dashboard templates and data visualization applications built with [CanvasJS Charts](https://canvasjs.com).

> 🌐 **Live Showcase**: Run and explore the interactive dashboards directly in your browser at **[https://vishwas-r.github.io/Data-Visualization-Dashboards/](https://vishwas-r.github.io/Data-Visualization-Dashboards/)**

---

## Available Dashboards

| Dashboard | Tech Stack | Highlights | Live Demo | Source |
|---|---|---|---|---|
| **Executive Analytics Dashboard** | Bootstrap 5.3 / Vanilla JS | Modern business analytics with Dark/Light mode, synchronized KPI sparklines via `canvasjs-sync-charts`, period filtering, and transaction tables. | [🚀 Run Live](https://vishwas-r.github.io/Data-Visualization-Dashboards/bootstrap-dashboard/) | [Explore &rarr;](./bootstrap-dashboard) |
| **Financial Market & Trading Dashboard** | CanvasJS StockChart / Vanilla JS | Real-time & historical trading desk, live Binance WebSocket trade feed, 9 technical indicators, monthly returns heatmap, drawdown analytics. | [🚀 Run Live](https://vishwas-r.github.io/Data-Visualization-Dashboards/financial-market-trading-dashboard/) | [Explore &rarr;](./financial-market-trading-dashboard) |
| **Django Dashboard using CanvasJS** | Python / Django | Full-stack web application integrating dynamic database-driven CanvasJS charts with Django templates. | — | [Explore &rarr;](./Django%20Dashboard%20using%20CanvasJS%20Python%20Charts) |

---

### 1. [Executive Analytics Dashboard](./bootstrap-dashboard) &bull; [Run Live &rarr;](https://vishwas-r.github.io/Data-Visualization-Dashboards/bootstrap-dashboard/)

A responsive, modern executive analytics dashboard built with Bootstrap 5.3 and CanvasJS Charts.
* **Light & Dark Theme Toggle**: One-click theme switcher that updates both the UI and CanvasJS chart themes (`light2` &harr; `dark2`).
* **Synchronized Tooltips & Crosshairs**: Uses [canvasjs-sync-charts](https://github.com/vishwas-r/canvasjs-sync-charts) loaded via jsDelivr CDN to synchronize crosshairs and tooltips across the KPI sparklines and Revenue overview.
* **KPI Sparkline Cards**: Total revenue, active users, orders, and conversion rate with embedded edge-to-edge mini-charts.
* **Multi-Series Revenue & Profit Chart**: Compare revenue, profit, and targets with dynamic period filters (`7D`, `1M`, `6M`, `1Y`).
* **Traffic Sources & Category Sales**: Donut chart with center metrics and horizontal bar chart breakdown.
* **Recent Orders Table**: Customer order tracking with status badges.
* **Modern & Clean**: Pure Vanilla JS (zero jQuery dependencies) and CanvasJS loaded via CDN.

---

### 2. [Financial Market & Trading Dashboard](./financial-market-trading-dashboard) &bull; [Run Live &rarr;](https://vishwas-r.github.io/Data-Visualization-Dashboards/financial-market-trading-dashboard/)

A real-time financial market terminal built on CanvasJS StockChart. 
* **Live Desk**: Live candlestick chart ticking from real-time trade feeds, time & sales, order book, watchlist, top movers.
* **Historical Analysis**: Range selector (1M to 5Y), monthly-returns heatmap, drawdown curve, rolling volatility, and comparison mode.
* **Technical Indicators Built-in**: SMA, EMA, Bollinger Bands, VWAP, RSI, MACD, Stochastic, ATR, and OBV.
* **Zero-Setup Live Feed**: Connects to Binance's public market-data endpoints out of the box with no API keys required.
* **Bring Your Own Data**: Ready-made examples for plugging in your own custom REST endpoints, WebSockets, or CSV/JSON files.

---

### 3. [Django Dashboard using CanvasJS Python Charts](./Django%20Dashboard%20using%20CanvasJS%20Python%20Charts)

A complete Python Django web project demonstrating how to query database models and render dynamic interactive CanvasJS charts on the frontend.
* Django models and views passing data to CanvasJS.
* Multi-series interactive charts.
* Clean architecture for backend-driven data visualization.

---

## License

The dashboard templates in this repository are open-source and licensed under the [MIT License](LICENSE).

These dashboards are built for and require CanvasJS Charts / StockCharts. CanvasJS is a separate library with its own licensing terms—please review the [CanvasJS License](https://canvasjs.com/license/) for details regarding commercial and non-commercial usage.
