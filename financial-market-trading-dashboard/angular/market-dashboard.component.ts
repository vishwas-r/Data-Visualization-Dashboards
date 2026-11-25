import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

/* Add the stylesheet and scripts to angular.json (they create window.MarketDashboard):
     "styles": ["src/market/market-dashboard.css"],
     "scripts": ["src/market/canvasjs.stock.min.js", "src/market/canvasjs-heatmap.js",
                 "src/market/technical-indicators-core.js", "src/market/indicators/relative-strength-index.js",
                 "src/market/market-statistics.js", "src/market/market-dashboard.js"]
   Usage: <market-dashboard [options]="options" (ready)="onReady($event)"></market-dashboard>
   options is the same object you would pass to MarketDashboard.create(). */
declare const MarketDashboard: any;

@Component({
  selector: 'market-dashboard',
  standalone: true,
  template: '',
  styles: [':host { display: block; }']
})
export class MarketDashboardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() options: any = {};
  @Output() ready = new EventEmitter<any>();
  private dashboard: any;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.create();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (this.dashboard && changes['options'] && !changes['options'].firstChange) {
      this.dashboard.destroy();
      this.create();
    }
  }
  ngOnDestroy(): void {
    this.dashboard?.destroy();
  }
  private create(): void {
    this.dashboard = MarketDashboard.create(this.host.nativeElement, this.options);
    this.ready.emit(this.dashboard);
  }
}
