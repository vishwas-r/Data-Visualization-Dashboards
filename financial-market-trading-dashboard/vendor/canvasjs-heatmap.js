/*! CanvasJS Heatmap 1.0.0
 *  Heatmap for CanvasJS Charts, built from stackedColumn100 (CanvasJS has no native heatmap type).
 *  Plain ES5, no dependencies other than CanvasJS itself. Works as a <script> global, CommonJS or AMD.
 *
 *  var heat = CanvasJSHeatmap.create('chartContainer', {
 *    columns: [['Brendan Chan', 48, 104, 28], ['Carla Johnson', 85, 91, 97]],   // [label, value per row...] or { label, values }
 *    rows: ['Mon', 'Tue', 'Wed']                                               // row labels, top to bottom
 *  });
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CanvasJSHeatmap = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_COLORS = ['#E3F2FD', '#0D47A1'];

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isObj(v) { return v && typeof v === 'object' && !(v instanceof Array) && !(v instanceof Date); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function extend(a, b) { for (var k in b) { if (has(b, k)) a[k] = b[k]; } return a; }
  function merge(a, b) {
    if (!b) return a;
    for (var k in b) {
      if (!has(b, k)) continue;
      a[k] = isObj(b[k]) ? merge(isObj(a[k]) ? a[k] : {}, b[k]) : b[k];
    }
    return a;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---- colour helpers (hex colours only: #rgb or #rrggbb) ---- */
  function rgb(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
    return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
  }
  function hex2(n) { var s = Math.round(n).toString(16); return s.length < 2 ? '0' + s : s; }
  function mix(a, b, p) {
    var x = rgb(a), y = rgb(b);
    return '#' + hex2(x[0] + (y[0] - x[0]) * p) + hex2(x[1] + (y[1] - x[1]) * p) + hex2(x[2] + (y[2] - x[2]) * p);
  }
  function lum(c) { var v = rgb(c); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; }
  function colorAt(stops, p) {
    p = Math.max(0, Math.min(1, p));
    if (stops.length === 1) return stops[0];
    var x = p * (stops.length - 1), i = Math.floor(x);
    return i >= stops.length - 1 ? stops[stops.length - 1] : mix(stops[i], stops[i + 1], x - i);
  }

  /* ---- data ---- */
  function prepare(cfg) {
    var cols = (cfg.columns || []).map(function (c) {
      if (c instanceof Array) return { label: String(c[0]), values: c.slice(1) };
      return { label: String(c.label), values: c.values || [] };
    });
    var n = (cfg.rows || []).length, labels = [], r;
    cols.forEach(function (c) { if (c.values.length > n) n = c.values.length; });
    for (r = 0; r < n; r++) labels.push(cfg.rows && cfg.rows[r] != null ? String(cfg.rows[r]) : String(r + 1));
    return { cols: cols, rowLabels: labels };
  }

  /* Long format -> { columns, rows }. rows: [{ row, col, value }]; override field names (or use functions) with map. */
  function fromCells(cells, map) {
    map = map || {};
    function field(r, k) { var f = map[k] || k; return typeof f === 'function' ? f(r) : r[f]; }
    var colNames = [], rowNames = [], grid = {};
    (cells || []).forEach(function (r) {
      var rl = String(field(r, 'row')), cl = String(field(r, 'col'));
      if (colNames.indexOf(cl) < 0) colNames.push(cl);
      if (rowNames.indexOf(rl) < 0) rowNames.push(rl);
      grid[rl] = grid[rl] || {};
      grid[rl][cl] = +field(r, 'value');
    });
    return {
      rows: rowNames,
      columns: colNames.map(function (cl) {
        return { label: cl, values: rowNames.map(function (rl) { return grid[rl][cl]; }) };
      })
    };
  }

  /* ---- CanvasJS options ---- */
  function buildOptions(config) {
    var cfg = extend({ gap: 2, showValues: true, fontSize: 11 }, config || {});
    var d = prepare(cfg), cols = d.cols, labels = d.rowLabels, rn = labels.length, n = cols.length;
    var step = 100 / (rn || 1), stops = cfg.colors || DEFAULT_COLORS, mid = cfg.midpoint;
    var gapColor = cfg.gapColor || cfg.backgroundColor || '#ffffff';
    var show = cfg.valueFormat || function (v) { return String(v); };

    var lo = Infinity, hi = -Infinity;
    cols.forEach(function (c) { c.values.forEach(function (v) { if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); });
    if (isNum(cfg.min)) lo = cfg.min;
    if (isNum(cfg.max)) hi = cfg.max;
    function shade(v) {
      var p;
      if (isNum(mid)) p = 0.5 + 0.5 * (v - mid) / (Math.max(Math.abs(lo - mid), Math.abs(hi - mid)) || 1);
      else p = hi === lo ? 1 : (v - lo) / (hi - lo);
      return colorAt(stops, p);
    }

    var data = [], r, c;
    for (r = 0; r < rn; r++) {
      var pts = [];
      for (c = 0; c < n; c++) {
        var v = cols[c].values[r], ok = isNum(v), col = ok ? shade(v) : (cfg.missingColor || gapColor);
        var p = { x: c, label: cols[c].label, y: 1, color: col, toolTipContent: '<b>' + esc(labels[r]) + '</b> · ' + esc(cols[c].label) + '<br/>' + (ok ? esc(show(v)) : 'No data') };
        if (ok && cfg.showValues !== false) {
          p.indexLabel = show(v);
          p.indexLabelFontColor = lum(col) > 0.55 ? '#142033' : '#ffffff';
        }
        pts.push(p);
      }
      data.push({ type: 'stackedColumn100', name: labels[r], indexLabelPlacement: 'inside', indexLabelFontSize: cfg.fontSize, dataPoints: pts });
    }

    var xLines = [], yLines = [];
    for (c = 0; c < n - 1; c++) xLines.push({ value: c + 0.5, color: gapColor, thickness: cfg.gap, showOnTop: true });
    for (r = 1; r < rn; r++) yLines.push({ value: r * step, color: gapColor, thickness: cfg.gap, showOnTop: true });

    var axisX = { interval: 1, gridThickness: 0, lineThickness: 0, tickLength: 0, labelAngle: 0, labelTextAlign: 'center', stripLines: xLines };
    var axisY = {
      minimum: 0, maximum: 100, interval: step / 2, reversed: true, gridThickness: 0, lineThickness: 0, tickLength: 0, stripLines: yLines,
      labelFormatter: function (e) {   // labels sit at row centres: (k + 0.5) * step
        var k = e.value / step - 0.5, i = Math.round(k);
        return Math.abs(k - i) < 0.001 && i >= 0 && i < rn ? labels[i] : '';
      }
    };
    if (cfg.labelColor) { axisX.labelFontColor = cfg.labelColor; axisY.labelFontColor = cfg.labelColor; }

    var o = { theme: cfg.theme || 'light2', animationEnabled: false, axisX: axisX, axisY: axisY, data: data };
    if (cfg.backgroundColor) o.backgroundColor = cfg.backgroundColor;
    if (cfg.backgroundColor || cfg.textColor) o.toolTip = { backgroundColor: cfg.backgroundColor, fontColor: cfg.textColor, borderColor: gapColor, cornerRadius: 6 };
    if (cfg.title) o.title = { text: cfg.title };
    if (cfg.height) o.height = cfg.height;
    return merge(o, cfg.options);
  }

  /* Sets dataPointWidth from the plot width so every column fills its slot (the heatmap look). */
  function fit(chart, count) {
    var ax = chart.axisX && chart.axisX[0];
    if (!ax || !ax.bounds || !count) return;
    var w = Math.ceil(ax.bounds.width / count);
    if (w > 0 && chart.options.dataPointWidth !== w) chart.set('dataPointWidth', w);
  }

  function create(container, config, lib) {
    lib = lib || (typeof window !== 'undefined' ? window.CanvasJS : null);
    if (!lib || !lib.Chart) throw new Error('CanvasJSHeatmap: CanvasJS not found. Load it first, or pass it as the third argument.');
    var el = typeof container === 'string' ? document.getElementById(container) : container;
    var cfg = extend({}, config || {});
    var chart = new lib.Chart(el, buildOptions(cfg));
    chart.render();
    fit(chart, prepare(cfg).cols.length);

    var timer = null, lastW = el.clientWidth, observer = null;
    function onResize() {
      if (el.clientWidth === lastW && observer) return;
      lastW = el.clientWidth;
      clearTimeout(timer);
      timer = setTimeout(function () { chart.render(); fit(chart, prepare(cfg).cols.length); }, 60);
    }
    if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(onResize); observer.observe(el); }
    else window.addEventListener('resize', onResize);

    return {
      chart: chart,
      /* Pass any config keys to change (columns, rows, colors, backgroundColor, ...). */
      update: function (patch) {
        extend(cfg, patch || {});
        var o = buildOptions(cfg), opt = chart.options;
        opt.theme = o.theme; opt.backgroundColor = o.backgroundColor; opt.toolTip = o.toolTip;
        opt.axisX = o.axisX; opt.axisY = o.axisY; opt.data = o.data;
        if (o.height) opt.height = o.height;
        chart.render();
        fit(chart, prepare(cfg).cols.length);
      },
      destroy: function () {
        if (observer) observer.disconnect(); else window.removeEventListener('resize', onResize);
        clearTimeout(timer);
        chart.destroy();
      }
    };
  }

  return { version: '1.0.0', create: create, options: buildOptions, fit: fit, fromCells: fromCells };
}));
