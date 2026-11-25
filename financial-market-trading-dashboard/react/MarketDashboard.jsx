import { useEffect, useRef } from 'react';

/* Load the CSS and these scripts first (for example from public/index.html), in this order:
     canvasjs.stock.min.js, canvasjs-heatmap.js, technical-indicators-core.js (+ the indicator files you want),
     market-statistics.js, market-dashboard.js
   They create window.MarketDashboard. Usage:
     <MarketDashboard historical={loadHistory} realtime={feed} symbols={symbols} theme="midnight" />
   Keep the options referentially stable (module constants or useMemo); changing them rebuilds the dashboard. */
export default function MarketDashboard({ onReady, ...options }) {
  const container = useRef(null);
  const dashboard = useRef(null);

  useEffect(() => {
    dashboard.current = window.MarketDashboard.create(container.current, options);
    if (onReady) onReady(dashboard.current);
    return () => dashboard.current.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.keys(options).map(key => options[key]));

  return <div ref={container} />;
}
