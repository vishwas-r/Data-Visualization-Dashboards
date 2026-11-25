# Executive Analytics Dashboard with CanvasJS & Bootstrap 5

A modern, responsive executive analytics and SaaS dashboard template built with **Bootstrap 5.3** and **CanvasJS Charts**. Features full light/dark theme switching, interactive multi-series charts, dynamic period filters, sparklines, and zero build setup.

---

## Features

- **Light & Dark Themes**: Instant one-click theme switcher that updates both the UI and CanvasJS chart themes (`light2` &harr; `dark2`) seamlessly.
- **KPI Sparkline Cards**:
  - Total Revenue (+14.2%) with area sparkline.
  - Active Users (+8.5%) with growth sparkline.
  - Total Orders (-2.4%) with column mini-chart.
  - Conversion Rate (+0.8%) with smooth trendline.
- **Interactive Multi-Series Revenue & Profit Chart**:
  - Compare Revenue, Net Profit, and Target Goals on a single timeline.
  - Dynamic period filters: switch between `7D`, `1M`, `6M`, and `1Y` with live chart reflow.
  - Export to PNG and Print directly from the dashboard.
  - Interactive legend (click to toggle series visibility).
- **Traffic Sources Donut Chart**:
  - Breakdown of customer acquisition channels (Direct, Organic, Social, Referral, Email).
  - Center metric callout and interactive hover slices.
- **Sales by Category Bar Chart**:
  - Horizontal bar visualization comparing top merchandise lines.
- **Recent Transactions Table**:
  - Status badges (*Paid*, *Pending*, *Failed*), customer avatars, and formatted amounts.
- **Zero Build Setup & No jQuery**:
  - Built with clean modern Vanilla JavaScript and Bootstrap 5.3.
  - CanvasJS is loaded directly from the [CanvasJS CDN](https://cdn.canvasjs.com/canvasjs.min.js).

---

## Quickstart

Just clone or download this folder and open `index.html` directly in any web browser:

```bash
# Optional: serve locally with any static server
npx serve .
# or
python -m http.server 8000
```

---

## File Structure

```text
Simple Bootstrap Dashboard/
├── index.html                 # Main dashboard markup
├── assets/
│   ├── css/
│   │   └── styles.css         # Modern design tokens & light/dark theme styles
│   ├── js/
│   │   └── scripts.js         # CanvasJS chart configs, theme switcher, and UI logic
│   └── images/
│       ├── dp.png             # User profile avatar
│       └── favicon.ico        # Site favicon
├── LICENSE                    # MIT License
└── README.md                  # Documentation
```

---

## License

This dashboard template is open-source under the [MIT License](LICENSE).

This project uses CanvasJS Charts. CanvasJS is a commercial charting library with its own licensing terms—please review the [CanvasJS License](https://canvasjs.com/license/) for details regarding commercial usage.
