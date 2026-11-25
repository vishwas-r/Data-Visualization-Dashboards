/**
 * Modern Responsive Admin Dashboard Script
 * Integrates CanvasJS Charts with Bootstrap 5 & Light/Dark Theme Switching
 */

(function () {
  "use strict";

  // List of all instantiated CanvasJS charts for unified theme updates
  var registeredCharts = [];

  // Theme Management
  var currentTheme = localStorage.getItem("app-theme") || "light";
  document.documentElement.setAttribute("data-theme", currentTheme);

  function getCanvasTheme() {
    return currentTheme === "dark" ? "dark2" : "light2";
  }

  // ----------------------------------------------------
  // 1. KPI Sparkline Charts
  // ----------------------------------------------------
  var commonSparklineOptions = {
    backgroundColor: "transparent",
    animationEnabled: true,
    theme: getCanvasTheme(),
    axisX: {
      lineThickness: 0,
      tickLength: 0,
      margin: 0,
      labelFormatter: function () { return ""; }
    },
    axisY: {
      lineThickness: 0,
      gridThickness: 0,
      tickLength: 0,
      margin: 0,
      labelFormatter: function () { return ""; }
    },
    toolTip: {
      enabled: true,
      animationEnabled: true,
      cornerRadius: 6
    }
  };

  // Sparkline 1: Total Revenue
  var sparklineRevenue = new CanvasJS.Chart("sparklineRevenue", Object.assign({}, commonSparklineOptions, {
    data: [{
      type: "splineArea",
      color: "#4f46e5",
      fillOpacity: 0.18,
      markerSize: 0,
      toolTipContent: "Revenue: ${y}k",
      dataPoints: [
        { y: 14 }, { y: 18 }, { y: 16 }, { y: 22 }, { y: 19 },
        { y: 25 }, { y: 23 }, { y: 29 }, { y: 28 }, { y: 34 }
      ]
    }]
  }));
  registeredCharts.push(sparklineRevenue);

  // Sparkline 2: Subscriptions
  var sparklineSubscriptions = new CanvasJS.Chart("sparklineSubscriptions", Object.assign({}, commonSparklineOptions, {
    data: [{
      type: "splineArea",
      color: "#10b981",
      fillOpacity: 0.18,
      markerSize: 0,
      toolTipContent: "Active Users: {y}",
      dataPoints: [
        { y: 210 }, { y: 245 }, { y: 230 }, { y: 280 }, { y: 310 },
        { y: 295 }, { y: 340 }, { y: 365 }, { y: 350 }, { y: 395 }
      ]
    }]
  }));
  registeredCharts.push(sparklineSubscriptions);

  // Sparkline 3: Orders
  var sparklineOrders = new CanvasJS.Chart("sparklineOrders", Object.assign({}, commonSparklineOptions, {
    data: [{
      type: "column",
      color: "#f59e0b",
      dataPoints: [
        { y: 28 }, { y: 34 }, { y: 45 }, { y: 38 }, { y: 52 },
        { y: 46 }, { y: 60 }, { y: 54 }, { y: 65 }, { y: 58 }
      ]
    }]
  }));
  registeredCharts.push(sparklineOrders);

  // Sparkline 4: Conversion Rate
  var sparklineConversion = new CanvasJS.Chart("sparklineConversion", Object.assign({}, commonSparklineOptions, {
    data: [{
      type: "spline",
      color: "#0ea5e9",
      markerSize: 0,
      lineThickness: 3,
      toolTipContent: "Conversion: {y}%",
      dataPoints: [
        { y: 2.8 }, { y: 2.9 }, { y: 3.1 }, { y: 3.0 }, { y: 3.3 },
        { y: 3.2 }, { y: 3.5 }, { y: 3.4 }, { y: 3.6 }, { y: 3.8 }
      ]
    }]
  }));
  registeredCharts.push(sparklineConversion);

  // ----------------------------------------------------
  // 2. Revenue & Profit Multi-Series Overview Chart
  // ----------------------------------------------------
  var revenuePeriodsData = {
    "7D": {
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      revenue: [12400, 15800, 14200, 18900, 21400, 24500, 22800],
      profit: [4200, 5600, 4900, 6800, 7900, 9200, 8400],
      target: [14000, 14500, 15000, 16000, 17500, 19000, 19500]
    },
    "1M": {
      categories: ["Week 1", "Week 2", "Week 3", "Week 4"],
      revenue: [64500, 78200, 89400, 98100],
      profit: [23800, 29400, 34100, 38500],
      target: [70000, 75000, 82000, 90000]
    },
    "6M": {
      categories: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
      revenue: [210000, 245000, 230000, 285000, 320000, 368000],
      profit: [78000, 92000, 84000, 108000, 122000, 145000],
      target: [220000, 240000, 260000, 280000, 310000, 340000]
    },
    "1Y": {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      revenue: [145000, 162000, 185000, 178000, 195000, 215000, 235000, 248000, 262000, 285000, 312000, 348000],
      profit: [52000, 58000, 68000, 64000, 71000, 82000, 89000, 95000, 102000, 112000, 124000, 139000],
      target: [150000, 160000, 170000, 180000, 190000, 205000, 220000, 235000, 250000, 270000, 295000, 320000]
    }
  };

  function buildPeriodDataPoints(periodKey) {
    var raw = revenuePeriodsData[periodKey];
    var revPoints = [];
    var profPoints = [];
    var targetPoints = [];

    for (var i = 0; i < raw.categories.length; i++) {
      revPoints.push({ label: raw.categories[i], y: raw.revenue[i] });
      profPoints.push({ label: raw.categories[i], y: raw.profit[i] });
      targetPoints.push({ label: raw.categories[i], y: raw.target[i] });
    }

    return { revPoints: revPoints, profPoints: profPoints, targetPoints: targetPoints };
  }

  var initialPeriod = buildPeriodDataPoints("1Y");

  var revenueOverviewChart = new CanvasJS.Chart("revenueOverviewChart", {
    backgroundColor: "transparent",
    animationEnabled: true,
    theme: getCanvasTheme(),
    toolTip: {
      shared: true,
      cornerRadius: 8,
      contentFormatter: function (e) {
        var content = "<strong>" + e.entries[0].dataPoint.label + "</strong><br/>";
        for (var i = 0; i < e.entries.length; i++) {
          var color = e.entries[i].dataSeries.color;
          var name = e.entries[i].dataSeries.name;
          var val = "$" + e.entries[i].dataPoint.y.toLocaleString();
          content += "<span style='color:" + color + ";'>\u25cf</span> " + name + ": <strong>" + val + "</strong><br/>";
        }
        return content;
      }
    },
    legend: {
      cursor: "pointer",
      verticalAlign: "top",
      horizontalAlign: "right",
      fontSize: 12,
      fontFamily: "inherit",
      itemclick: function (e) {
        if (typeof e.dataSeries.visible === "undefined" || e.dataSeries.visible) {
          e.dataSeries.visible = false;
        } else {
          e.dataSeries.visible = true;
        }
        e.chart.render();
      }
    },
    axisX: {
      lineColor: "#e2e8f0",
      tickLength: 0,
      labelFontColor: "#64748b",
      labelFontSize: 12
    },
    axisY: {
      lineThickness: 0,
      tickLength: 0,
      gridColor: "#f1f5f9",
      labelFontColor: "#64748b",
      labelFontSize: 12,
      valueFormatString: "$#,##0"
    },
    data: [
      {
        type: "splineArea",
        name: "Total Revenue",
        showInLegend: true,
        color: "#4f46e5",
        fillOpacity: 0.16,
        markerSize: 6,
        markerBorderThickness: 2,
        dataPoints: initialPeriod.revPoints
      },
      {
        type: "spline",
        name: "Net Profit",
        showInLegend: true,
        color: "#10b981",
        lineThickness: 3,
        markerSize: 6,
        dataPoints: initialPeriod.profPoints
      },
      {
        type: "line",
        name: "Target Goal",
        showInLegend: true,
        color: "#94a3b8",
        lineDashType: "dash",
        lineThickness: 2,
        markerSize: 0,
        dataPoints: initialPeriod.targetPoints
      }
    ]
  });
  registeredCharts.push(revenueOverviewChart);

  // Period filter button interactions
  var periodButtons = document.querySelectorAll(".chart-filter-btn");
  periodButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      periodButtons.forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");

      var period = this.getAttribute("data-period");
      var updated = buildPeriodDataPoints(period);

      revenueOverviewChart.options.data[0].dataPoints = updated.revPoints;
      revenueOverviewChart.options.data[1].dataPoints = updated.profPoints;
      revenueOverviewChart.options.data[2].dataPoints = updated.targetPoints;
      revenueOverviewChart.render();
    });
  });

  // Export & Print actions
  var exportBtn = document.getElementById("exportRevenueChart");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      revenueOverviewChart.exportChart({ format: "png" });
    });
  }

  var printBtn = document.getElementById("printRevenueChart");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      revenueOverviewChart.print();
    });
  }

  // ----------------------------------------------------
  // 3. Traffic & Customer Acquisition Sources Chart
  // ----------------------------------------------------
  var trafficSourcesChart = new CanvasJS.Chart("trafficSourcesChart", {
    backgroundColor: "transparent",
    animationEnabled: true,
    theme: getCanvasTheme(),
    title: {
      text: "142.8k",
      verticalAlign: "center",
      horizontalAlign: "center",
      dockInsidePlotArea: true,
      fontSize: 24,
      fontWeight: "bold",
      fontColor: currentTheme === "dark" ? "#f8fafc" : "#1e293b"
    },
    subtitles: [{
      text: "Total Visits",
      verticalAlign: "center",
      horizontalAlign: "center",
      dockInsidePlotArea: true,
      fontSize: 12,
      fontColor: "#64748b",
      margin: 22
    }],
    legend: {
      verticalAlign: "bottom",
      horizontalAlign: "center",
      fontSize: 12,
      fontFamily: "inherit"
    },
    toolTip: {
      cornerRadius: 6,
      content: "{name}: <strong>{y}%</strong> ({shares} visits)"
    },
    data: [{
      type: "doughnut",
      startAngle: -90,
      innerRadius: "72%",
      radius: "95%",
      showInLegend: true,
      dataPoints: [
        { y: 38, name: "Direct", color: "#4f46e5", shares: "54.2k" },
        { y: 26, name: "Organic Search", color: "#0ea5e9", shares: "37.1k" },
        { y: 18, name: "Social Media", color: "#10b981", shares: "25.7k" },
        { y: 12, name: "Referrals", color: "#f59e0b", shares: "17.1k" },
        { y: 6,  name: "Email Campaigns", color: "#8b5cf6", shares: "8.5k" }
      ]
    }]
  });
  registeredCharts.push(trafficSourcesChart);

  // ----------------------------------------------------
  // 4. Sales by Category (Horizontal Bar Chart)
  // ----------------------------------------------------
  var categorySalesChart = new CanvasJS.Chart("categorySalesChart", {
    backgroundColor: "transparent",
    animationEnabled: true,
    theme: getCanvasTheme(),
    toolTip: {
      cornerRadius: 6,
      content: "{label}: <strong>${y}</strong>"
    },
    axisX: {
      lineThickness: 0,
      tickLength: 0,
      labelFontColor: "#64748b",
      labelFontSize: 12
    },
    axisY: {
      lineThickness: 0,
      tickLength: 0,
      gridColor: "#f1f5f9",
      labelFontColor: "#64748b",
      labelFontSize: 11,
      valueFormatString: "$#,##0"
    },
    data: [{
      type: "bar",
      color: "#4f46e5",
      dataPoints: [
        { y: 18600, label: "Beauty & Health", color: "#8b5cf6" },
        { y: 28400, label: "Digital Goods", color: "#0ea5e9" },
        { y: 35800, label: "Home & Decor", color: "#10b981" },
        { y: 48500, label: "Apparel & Shoes", color: "#f59e0b" },
        { y: 64200, label: "Consumer Tech", color: "#4f46e5" }
      ]
    }]
  });
  registeredCharts.push(categorySalesChart);

  // Initial render of all charts
  registeredCharts.forEach(function (chart) {
    chart.render();
  });

  // ----------------------------------------------------
  // 5. Theme Toggling (Light <-> Dark)
  // ----------------------------------------------------
  var themeToggleBtn = document.getElementById("themeToggleBtn");
  var themeIcon = document.getElementById("themeIcon");

  function updateThemeUI(theme) {
    if (themeIcon) {
      if (theme === "dark") {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
      } else {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
      }
    }
  }

  updateThemeUI(currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function () {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", currentTheme);
      localStorage.setItem("app-theme", currentTheme);
      updateThemeUI(currentTheme);

      var newCanvasTheme = getCanvasTheme();
      registeredCharts.forEach(function (chart) {
        chart.set("theme", newCanvasTheme);
        chart.set("backgroundColor", "transparent");
      });

      // Update donut center title color
      if (trafficSourcesChart.options.title) {
        trafficSourcesChart.options.title.fontColor = currentTheme === "dark" ? "#f8fafc" : "#1e293b";
        trafficSourcesChart.render();
      }
    });
  }

  // ----------------------------------------------------
  // 6. Sidebar Responsive Drawer
  // ----------------------------------------------------
  var sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  var dashboardSidebar = document.getElementById("dashboardSidebar");
  var sidebarOverlay = document.getElementById("sidebarOverlay");

  function toggleSidebar() {
    if (dashboardSidebar) {
      dashboardSidebar.classList.toggle("show");
    }
  }

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", function () {
      if (dashboardSidebar) {
        dashboardSidebar.classList.remove("show");
      }
    });
  }

  // Handle Window Resize for Chart Reflow
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      registeredCharts.forEach(function (chart) {
        chart.render();
      });
    }, 200);
  });

})();
