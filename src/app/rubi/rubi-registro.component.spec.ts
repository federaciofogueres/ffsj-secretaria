import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { RegistroAsistidoPreparacion, RubiApiService } from './rubi-api.service';
import { RubiRegistroComponent } from './rubi-registro.component';

const destinatarios = [{ id: 3, nombre: 'Secretaria General', email: null, departamentoId: 1, departamentoCodigo: 'secretaria', departamentoNombre: 'Secretaria' }];

function preparacion(overrides: Partial<RegistroAsistidoPreparacion> = {}): RegistroAsistidoPreparacion {
  return {
    estado: 'preparada', asociacionId: 12, tipo: 'documentacion',
    destinatario: { id: 3, nombre: 'Secretaria General', departamentoNombre: 'Secretaria' },
    titulo: 'Un titulo', mensaje: 'Un mensaje de al menos diez caracteres', adjuntos: [{ fileName: 'a.pdf', mimeType: 'application/pdf', size: 100 }],
    siguientePaso: 'confirmar', efectos: { creaRegistro: true, escribeEnCenso: false, requiereFirma: false, circuito: 'ordinario' },
    confirmacion: { referencia: 'x'.repeat(43), expiraAt: '2099-01-01T00:00:00Z', confirmacionHumanaHabilitada: true },
    ...overrides
  };
}

describe('RubiRegistroComponent', () => {
  let fixture: ComponentFixture<RubiRegistroComponent>;
  let component: RubiRegistroComponent;
  let api: jasmine.SpyObj<RubiApiService>;
  let secretaria: jasmine.SpyObj<SecretariaService>;

  function setup(tipo: 'documentacion' | 'comunicacion' = 'documentacion', ejercicioActivo = true) {
    api = jasmine.createSpyObj('RubiApiService', ['prepararRegistro', 'confirmarRegistro', 'cancelarPreparacionRegistro']);
    api.cancelarPreparacionRegistro.and.returnValue(of({ cancelada: true }));
    secretaria = jasmine.createSpyObj('SecretariaService', ['getRegistroDestinatarios', 'subirAdjunto']);
    secretaria.getRegistroDestinatarios.and.returnValue(of({ destinatarios }));
    secretaria.subirAdjunto.and.returnValue(of({ id: 1 } as any));
    TestBed.configureTestingModule({
      imports: [RubiRegistroComponent],
      providers: [I18nService,
        { provide: RubiApiService, useValue: api },
        { provide: SecretariaService, useValue: secretaria },
        { provide: PermissionsService, useValue: { contextSnapshot: { asociacionId: 12 }, hasPermission: () => true } },
        { provide: EjercicioService, useValue: { isSelectedActive: ejercicioActivo } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RubiRegistroComponent);
    component = fixture.componentInstance;
    component.tipo = tipo;
    fixture.detectChanges();
  }

  it('carga destinatarios y prepara documentacion exigiendo al menos un adjunto', () => {
    setup('documentacion');
    api.prepararRegistro.and.returnValue(of(preparacion()));
    component.form.patchValue({ destinatarioId: 3, titulo: 'Un titulo', mensaje: 'Un mensaje de al menos diez caracteres' });
    component.prepare();
    expect(component.errorKey).toBe('rubi.registro.error.form');
    expect(api.prepararRegistro).not.toHaveBeenCalled();
    component.adjuntos = [new File(['contenido'], 'a.pdf', { type: 'application/pdf' })];
    component.prepare();
    const args = api.prepararRegistro.calls.mostRecent().args;
    expect(args[0]).toBe('documentacion');
    expect(args[1]).toBe(3);
    expect(component.prepared?.tipo).toBe('documentacion');
  });

  it('permite preparar una comunicacion sin adjuntos', () => {
    setup('comunicacion');
    api.prepararRegistro.and.returnValue(of(preparacion({ tipo: 'comunicacion', adjuntos: [] })));
    component.form.patchValue({ destinatarioId: 3, titulo: 'Un titulo', mensaje: 'Un mensaje de al menos diez caracteres' });
    component.prepare();
    expect(api.prepararRegistro).toHaveBeenCalled();
    expect(component.prepared?.tipo).toBe('comunicacion');
  });

  it('bloquea la comunicacion cuando el ejercicio consultado no esta activo', () => {
    setup('comunicacion', false);
    expect(component.exerciseBlocked).toBe(true);
  });

  it('requiere confirmacion humana, confirma y sube los adjuntos tras crear el registro real', () => {
    setup('documentacion');
    api.confirmarRegistro.and.returnValue(of({ registroId: 501, numero: 'REG-2026-000501', tipo: 'documentacion', estado: 'enviada', fechaEntrada: '2026-01-01T00:00:00Z', idempotentReplay: false }));
    component.prepared = preparacion() as any;
    component.adjuntos = [new File(['contenido'], 'a.pdf', { type: 'application/pdf' })];
    component.confirm();
    expect(api.confirmarRegistro).not.toHaveBeenCalled();
    component.confirmationAccepted = true;
    component.confirm();
    expect(api.confirmarRegistro).toHaveBeenCalledWith('x'.repeat(43));
    expect(component.confirmed?.registroId).toBe(501);
    expect(secretaria.subirAdjunto).toHaveBeenCalledWith('registro', 501, component.adjuntos[0]);
    expect(component.pendingUploads).toEqual([]);
  });

  it('permite reintentar la subida si algun adjunto falla, sin volver a crear el registro', () => {
    setup('documentacion');
    api.confirmarRegistro.and.returnValue(of({ registroId: 501, numero: 'REG-2026-000501', tipo: 'documentacion', estado: 'enviada', fechaEntrada: '2026-01-01T00:00:00Z', idempotentReplay: false }));
    secretaria.subirAdjunto.and.returnValue(throwError(() => new Error('fallo de red')));
    component.prepared = preparacion() as any;
    component.adjuntos = [new File(['contenido'], 'a.pdf', { type: 'application/pdf' })];
    component.confirmationAccepted = true;
    component.confirm();
    expect(component.confirmed?.registroId).toBe(501);
    expect(component.pendingUploads.length).toBe(1);
    expect(component.errorKey).toBe('rubi.registro.error.uploadFailed');
    expect(api.confirmarRegistro).toHaveBeenCalledTimes(1);

    secretaria.subirAdjunto.and.returnValue(of({ id: 1 } as any));
    component.retryUploads();
    expect(component.pendingUploads).toEqual([]);
    expect(api.confirmarRegistro).toHaveBeenCalledTimes(1);
  });

  it('deriva errores funcionales sin mostrar detalles tecnicos', () => {
    setup('documentacion');
    api.prepararRegistro.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { details: { code: 'REGISTRO_DESTINATARIO_NO_VALIDO' }, stack: 'secret' } })));
    component.form.patchValue({ destinatarioId: 3, titulo: 'Un titulo', mensaje: 'Un mensaje de al menos diez caracteres' });
    component.adjuntos = [new File(['contenido'], 'a.pdf', { type: 'application/pdf' })];
    component.prepare();
    expect(component.errorKey).toBe('rubi.registro.error.destinatario');
    expect(component.errorKey).not.toContain('secret');
  });

  it('incluye los textos nuevos en ES, VA y EN', () => {
    setup('documentacion');
    const i18n = TestBed.inject(I18nService);
    for (const language of ['es', 'va', 'en'] as const) {
      i18n.setLanguage(language);
      expect(i18n.t('rubi.registro.doc.title')).not.toBe('rubi.registro.doc.title');
      expect(i18n.t('rubi.registro.comm.title')).not.toBe('rubi.registro.comm.title');
      expect(i18n.t('rubi.registro.confirm.action')).not.toBe('rubi.registro.confirm.action');
    }
  });
});
