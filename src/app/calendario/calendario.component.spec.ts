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
});
