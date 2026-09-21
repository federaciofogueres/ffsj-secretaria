import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminAccessService } from '../core/admin-access.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { ActividadSecretaria } from '../core/models';
import { CalendarioComponent } from './calendario.component';

// 0.31.0#ESMERALDA: corrige el desfase horario (~2h) del calendario y
// anade "lugar". Estos tests fijan una actividad de verano (CEST, +02:00)
// y otra de invierno (CET, +01:00) exactamente como las devuelve ya el
// backend corregido (ISO-8601 con el offset real de Europe/Madrid, ver
// utils/zonedTime.js), y comprueban que el frontend nunca vuelve a
// desplazar esa hora, sea cual sea la zona horaria del navegador donde
// corre el test.

function actividadVerano(overrides: Partial<ActividadSecretaria> = {}): ActividadSecretaria {
  return {
    id: 'ACT-VERANO', titulo: 'Verbena', estado: 'activa', visiblePublico: true, responsable: 'Secretaria',
    fechaInicio: '2026-09-21T20:00:00+02:00', fechaFin: '2026-09-21T23:00:00+02:00',
    descripcion: '', colorEtiqueta: 'ffsj', lugar: 'Plaza del Ayuntamiento',
    ...overrides
  };
}

function actividadInvierno(overrides: Partial<ActividadSecretaria> = {}): ActividadSecretaria {
  return {
    id: 'ACT-INVIERNO', titulo: 'Concierto de invierno', estado: 'activa', visiblePublico: true, responsable: 'Secretaria',
    fechaInicio: '2026-01-15T20:00:00+01:00', fechaFin: '2026-01-15T22:00:00+01:00',
    descripcion: '', colorEtiqueta: 'ffsj', lugar: null,
    ...overrides
  };
}

describe('CalendarioComponent', () => {
  async function createComponent(isAdmin: boolean, actividades: ActividadSecretaria[]): Promise<ComponentFixture<CalendarioComponent>> {
    const secretaria = jasmine.createSpyObj<SecretariaService>('SecretariaService', [
      'getActividades', 'getInscripciones', 'crearActividad', 'actualizarActividad',
      'crearPropuestaActividad', 'getAdjuntos'
    ]);
    secretaria.getActividades.and.returnValue(of({ actividades }));
    secretaria.getInscripciones.and.returnValue(of({ inscripciones: [], paginacion: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));
    secretaria.getAdjuntos.and.returnValue(of({ adjuntos: [] }));

    await TestBed.configureTestingModule({
      imports: [CalendarioComponent],
      providers: [
        { provide: SecretariaService, useValue: secretaria },
        { provide: AdminAccessService, useValue: { isAdmin: () => isAdmin } },
        { provide: PermissionsService, useValue: { hasPermission: () => true, contextSnapshot: null } },
        { provide: (await import('../rubi/rubi-screen-context.service')).RubiScreenContextService, useValue: { set: () => undefined, clear: () => undefined } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(CalendarioComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('al seleccionar una actividad de verano, el formulario de edicion muestra la hora local exacta (sin +2h)', async () => {
    const fixture = await createComponent(true, [actividadVerano()]);
    fixture.componentInstance.select(actividadVerano());
    expect(fixture.componentInstance.editActividadForm.value.fechaInicio).toBe('2026-09-21T20:00');
    expect(fixture.componentInstance.editActividadForm.value.fechaFin).toBe('2026-09-21T23:00');
  });

  it('al seleccionar una actividad de invierno, el formulario de edicion muestra la hora local exacta (sin +2h)', async () => {
    const fixture = await createComponent(true, [actividadInvierno()]);
    fixture.componentInstance.select(actividadInvierno());
    expect(fixture.componentInstance.editActividadForm.value.fechaInicio).toBe('2026-01-15T20:00');
  });

  it('al seleccionar una actividad, el lugar se rellena en el formulario de edicion para poder editarlo despues', async () => {
    const fixture = await createComponent(true, [actividadVerano()]);
    fixture.componentInstance.select(actividadVerano());
    expect(fixture.componentInstance.editActividadForm.value.lugar).toBe('Plaza del Ayuntamiento');
  });

  it('una actividad sin lugar deja el campo vacio (compatibilidad con actividades existentes)', async () => {
    const fixture = await createComponent(true, [actividadInvierno()]);
    fixture.componentInstance.select(actividadInvierno());
    expect(fixture.componentInstance.editActividadForm.value.lugar).toBe('');
  });

  it('guardarActividad envia el lugar editado tal cual, sin tocar la hora ya correcta', async () => {
    const fixture = await createComponent(true, [actividadVerano()]);
    const component = fixture.componentInstance;
    const secretaria = (component as any).secretariaService as jasmine.SpyObj<SecretariaService>;
    secretaria.actualizarActividad.and.returnValue(of(actividadVerano({ lugar: 'Nuevo lugar' })));
    component.select(actividadVerano());
    component.editActividadForm.patchValue({ lugar: 'Nuevo lugar' });
    component.guardarActividad();
    expect(secretaria.actualizarActividad).toHaveBeenCalledWith('ACT-VERANO', jasmine.objectContaining({
      fechaInicio: '2026-09-21T20:00',
      lugar: 'Nuevo lugar'
    }));
  });

  it('el calendario coloca una actividad de madrugada en su dia de Madrid, no en el dia UTC anterior', async () => {
    // 00:30 del 15 de enero en Madrid (CET, +01:00) es 23:30 del 14 en UTC:
    // con el bug anterior (dia segun el navegador/UTC) apareceria el 14.
    const madrugada = actividadInvierno({ id: 'ACT-MADRUGADA', fechaInicio: '2026-01-15T00:30:00+01:00', fechaFin: '2026-01-15T01:30:00+01:00' });
    const fixture = await createComponent(true, [madrugada]);
    const component = fixture.componentInstance;
    (component as any).monthCursor = new Date(2026, 0, 1);
    (component as any).buildCalendar();
    const day15 = (component as any).days.find((day: any) => {
      const d = day.date as Date;
      return d.getFullYear() === 2026 && d.getMonth() === 0 && d.getDate() === 15;
    });
    const day14 = (component as any).days.find((day: any) => {
      const d = day.date as Date;
      return d.getFullYear() === 2026 && d.getMonth() === 0 && d.getDate() === 14;
    });
    expect(day15?.actividades.map((item: ActividadSecretaria) => item.id)).toContain('ACT-MADRUGADA');
    expect(day14?.actividades.map((item: ActividadSecretaria) => item.id) || []).not.toContain('ACT-MADRUGADA');
  });

  // 0.33.0#ESMERALDA: descripcion con Markdown y rediseno compacto del detalle.
  describe('descripción con Markdown (0.33.0#ESMERALDA)', () => {
    it('al seleccionar una actividad, la descripción Markdown se rellena en el editor para poder editarla después', async () => {
      const fixture = await createComponent(true, [actividadVerano({ descripcion: '## Hola\n\nTexto en **negrita**.' })]);
      fixture.componentInstance.select(actividadVerano({ descripcion: '## Hola\n\nTexto en **negrita**.' }));
      expect(fixture.componentInstance.editActividadForm.value.descripcion).toBe('## Hola\n\nTexto en **negrita**.');
    });

    it('guardarActividad persiste la descripción Markdown editada tal cual (sin transformarla)', async () => {
      const fixture = await createComponent(true, [actividadVerano()]);
      const component = fixture.componentInstance;
      const secretaria = (component as any).secretariaService as jasmine.SpyObj<SecretariaService>;
      secretaria.actualizarActividad.and.returnValue(of(actividadVerano({ descripcion: '**Nueva** descripción' })));
      component.select(actividadVerano());
      component.editActividadForm.patchValue({ descripcion: '**Nueva** descripción' });
      component.guardarActividad();
      expect(secretaria.actualizarActividad).toHaveBeenCalledWith('ACT-VERANO', jasmine.objectContaining({
        descripcion: '**Nueva** descripción'
      }));
    });

    it('el detalle lateral renderiza la descripción Markdown de forma segura (sin script)', async () => {
      const fixture = await createComponent(true, [actividadVerano({ descripcion: '**Importante**<script>window.__pwn = true;</script>' })]);
      fixture.componentInstance.select(actividadVerano({ descripcion: '**Importante**<script>window.__pwn = true;</script>' }));
      fixture.detectChanges();
      const block: HTMLElement = fixture.nativeElement.querySelector('.detail-block .activity-description');
      expect(block).withContext('bloque de descripción visible').toBeTruthy();
      expect(block.innerHTML).toContain('<strong>Importante</strong>');
      expect(block.innerHTML).not.toContain('<script');
      expect((window as any).__pwn).toBeUndefined();
    });

    it('el modal de detalle de actividad renderiza la descripción Markdown de forma segura', async () => {
      const fixture = await createComponent(true, [actividadVerano({ descripcion: '- Uno\n- Dos' })]);
      const component = fixture.componentInstance;
      component.abrirDetalleActividad(actividadVerano({ descripcion: '- Uno\n- Dos' }));
      fixture.detectChanges();
      const block: HTMLElement = fixture.nativeElement.querySelector('.activity-detail-modal .activity-description');
      expect(block).withContext('bloque de descripción del modal visible').toBeTruthy();
      expect(block.innerHTML).toContain('<li>Uno</li>');
      expect(block.innerHTML).toContain('<li>Dos</li>');
    });

    it('una actividad antigua con descripción en texto plano se sigue mostrando correctamente (compatibilidad)', async () => {
      const fixture = await createComponent(true, [actividadVerano({ descripcion: 'Descripcion antigua sin formato.' })]);
      fixture.componentInstance.select(actividadVerano({ descripcion: 'Descripcion antigua sin formato.' }));
      fixture.detectChanges();
      const block: HTMLElement = fixture.nativeElement.querySelector('.detail-block .activity-description');
      expect(block.textContent).toContain('Descripcion antigua sin formato.');
    });

    it('una actividad sin descripción no muestra ningún bloque (sin regresión)', async () => {
      const fixture = await createComponent(true, [actividadInvierno({ descripcion: '' })]);
      fixture.componentInstance.select(actividadInvierno({ descripcion: '' }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.detail-block .activity-description')).toBeNull();
    });
  });

  describe('rediseño compacto del detalle (0.33.0#ESMERALDA)', () => {
    it('el modal de detalle de actividad ya no muestra el texto redundante "Detalle de actividad"', async () => {
      const fixture = await createComponent(true, [actividadVerano()]);
      const component = fixture.componentInstance;
      component.abrirDetalleActividad(actividadVerano());
      fixture.detectChanges();
      const modal: HTMLElement = fixture.nativeElement.querySelector('.activity-detail-modal');
      expect(modal.textContent).not.toContain('Detalle de actividad');
      expect(modal.textContent).toContain('Verbena');
    });

    it('el modal de detalle muestra el título y el chip de estado en la misma cabecera', async () => {
      const fixture = await createComponent(true, [actividadVerano()]);
      const component = fixture.componentInstance;
      component.abrirDetalleActividad(actividadVerano());
      fixture.detectChanges();
      const header: HTMLElement = fixture.nativeElement.querySelector('.activity-detail-modal .modal-header-custom.activity-header');
      expect(header).withContext('cabecera con clase activity-header').toBeTruthy();
      expect(header.querySelector('h2')).withContext('título en la cabecera').toBeTruthy();
      expect(header.querySelector('app-estado-badge')).withContext('chip de estado en la cabecera').toBeTruthy();
    });

    it('el modal de detalle muestra fecha/hora, lugar y responsable en una fila de metadatos con iconos', async () => {
      const fixture = await createComponent(true, [actividadVerano()]);
      const component = fixture.componentInstance;
      component.abrirDetalleActividad(actividadVerano());
      fixture.detectChanges();
      const meta: HTMLElement = fixture.nativeElement.querySelector('.activity-detail-modal .activity-meta');
      expect(meta).withContext('fila de metadatos visible').toBeTruthy();
      expect(meta.querySelector('.bi-clock')).withContext('icono de fecha/hora').toBeTruthy();
      expect(meta.querySelector('.bi-geo-alt')).withContext('icono de lugar').toBeTruthy();
      expect(meta.querySelector('.bi-person')).withContext('icono de responsable').toBeTruthy();
      expect(meta.textContent).toContain('Plaza del Ayuntamiento');
      expect(meta.textContent).toContain('Secretaria');
    });

    it('el detalle lateral tampoco muestra el texto redundante y agrupa título y chip', async () => {
      const fixture = await createComponent(true, [actividadVerano()]);
      fixture.componentInstance.select(actividadVerano());
      fixture.detectChanges();
      const block: HTMLElement = fixture.nativeElement.querySelector('.detail-block');
      expect(block.textContent).not.toContain('Detalle de actividad');
      const header = block.querySelector('.activity-header');
      expect(header?.querySelector('h2')).toBeTruthy();
      expect(header?.querySelector('app-estado-badge')).toBeTruthy();
    });
  });
});
