import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiniMapComponent } from './mini-map.component';

describe('MiniMapComponent (0.34.0#ESMERALDA)', () => {
  let fixture: ComponentFixture<MiniMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MiniMapComponent] }).compileComponents();
    fixture = TestBed.createComponent(MiniMapComponent);
  });

  it('no rompe cuando no hay coordenadas (actividad histórica sin ubicación estructurada)', () => {
    fixture.componentInstance.latitud = null;
    fixture.componentInstance.longitud = null;
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.mini-map')).toBeTruthy();
  });

  it('renderiza el contenedor del mapa cuando hay coordenadas', () => {
    fixture.componentInstance.latitud = 38.3452;
    fixture.componentInstance.longitud = -0.481;
    fixture.detectChanges();
    const container: HTMLElement = fixture.nativeElement.querySelector('.mini-map');
    expect(container).toBeTruthy();
    expect(container.querySelector('.leaflet-pane')).withContext('Leaflet ha inicializado el mapa').toBeTruthy();
  });

  it('actualiza el punto cuando cambian las coordenadas por @Input', () => {
    fixture.componentInstance.latitud = 38.3452;
    fixture.componentInstance.longitud = -0.481;
    fixture.detectChanges();
    expect(() => {
      fixture.componentInstance.latitud = 38.36;
      fixture.componentInstance.longitud = -0.49;
      fixture.componentInstance.ngOnChanges({} as any);
    }).not.toThrow();
  });
});
