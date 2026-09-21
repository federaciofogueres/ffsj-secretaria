import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import * as L from 'leaflet';

// 0.34.0#ESMERALDA: mini mapa de solo lectura para el detalle de una
// actividad. Reutiliza el mismo proveedor (Leaflet + teselas de
// OpenStreetMap) que ya usa `LocationPickerComponent` en "Datos" - no es un
// segundo sistema de mapas, solo una variante de presentacion sin buscador
// ni edicion (no hace falta esa parte del picker para mostrar un punto ya
// guardado).
@Component({
  selector: 'app-mini-map',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `<div class="mini-map" #map [attr.aria-label]="label || 'Mapa de la ubicación'" role="img"></div>`,
  styles: [`
    .mini-map { width: 100%; height: 200px; border-radius: 12px; overflow: hidden; background: #e5e7eb; }
    .leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-tile-container, .leaflet-pane > svg, .leaflet-layer { position: absolute; left: 0; top: 0; }
    .leaflet-pane { z-index: 400; } .leaflet-tile-pane { z-index: 200; } .leaflet-overlay-pane { z-index: 400; } .leaflet-marker-pane { z-index: 600; }
    .leaflet-top, .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; } .leaflet-top { top: 0; } .leaflet-left { left: 0; }
    .leaflet-control { position: relative; z-index: 800; pointer-events: auto; } .leaflet-top .leaflet-control { margin: 10px; }
    .leaflet-bar { border-radius: 4px; box-shadow: 0 1px 5px #000a; }
    .leaflet-bar a { display: block; width: 26px; height: 26px; border-bottom: 1px solid #ccc; background: #fff; color: #111; text-align: center; line-height: 26px; text-decoration: none; }
    .leaflet-tile { visibility: hidden; max-width: none !important; max-height: none !important; width: auto; padding: 0; }
    .leaflet-tile-loaded { visibility: inherit; }
    .leaflet-zoom-animated { transform-origin: 0 0; }
    .leaflet-pane > svg { z-index: 200; max-width: none !important; max-height: none !important; }
  `]
})
export class MiniMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitud: number | null = null;
  @Input() longitud: number | null = null;
  @Input() label = '';
  @ViewChild('map') mapElement?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.CircleMarker;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['latitud'] || changes['longitud']) && this.viewInitialized) this.render();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private render(): void {
    if (!this.mapElement || this.latitud === null || this.longitud === null) return;
    const point: L.LatLngExpression = [this.latitud, this.longitud];
    if (!this.map) {
      this.map = L.map(this.mapElement.nativeElement, { zoomControl: true }).setView(point, 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this.map);
    } else {
      this.map.setView(point, 16);
    }
    this.marker?.remove();
    this.marker = L.circleMarker(point, { radius: 9, color: '#b91c2d', fillColor: '#b91c2d', fillOpacity: 0.9 }).addTo(this.map);
    if (this.label) this.marker.bindTooltip(this.label);
    setTimeout(() => this.map?.invalidateSize());
  }
}
