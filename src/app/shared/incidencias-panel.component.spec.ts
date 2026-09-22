import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Incidencia } from '../core/models';
import { IncidenciasPanelComponent } from './incidencias-panel.component';
import { SecretariaService } from '../core/secretaria.service';
import { AdminAccessService } from '../core/admin-access.service';
import { PermissionsService } from '../core/permissions.service';

function incidencia(overrides: Partial<Incidencia> = {}): Incidencia {
  return {
    id: '1',
    scope: 'inscripcion',
    scopeId: '10',
    estado: 'abierta',
    mensaje: 'Incidencia de prueba',
    fechaAlta: '2026-09-22T17:18:00Z',
    eventos: [
      { id: 1, incidenciaId: 1, tipo: 'creada', actor: 'administracion', mensaje: 'Incidencia de prueba', createdAt: '2026-09-22T17:18:00Z', adjuntos: [] }
    ],
    ...overrides
  };
}

describe('IncidenciasPanelComponent (0.42.1#ESMERALDA)', () => {
  function createComponent(isAdmin = true) {
    const secretaria = jasmine.createSpyObj('SecretariaService', [
      'getIncidencias', 'crearIncidencia', 'responderIncidencia', 'comentarIncidencia', 'cerrarIncidencia', 'reabrirIncidencia', 'subirAdjunto', 'descargarAdjunto'
    ]);
    secretaria.getIncidencias.and.returnValue(of({ incidencias: [] }));
    const adminAccess = { isAdmin: () => isAdmin } as any;
    const permissions = { hasPermission: () => true } as any;
    const component = new IncidenciasPanelComponent(secretaria, adminAccess, permissions);
    component.scope = 'inscripcion';
    component.scopeId = '10';
    return { component, secretaria };
  }

  it('elimina el evento "creada" del hilo expandido porque ya se muestra como resumen del acordeón', () => {
    const { component } = createComponent();
    const item = incidencia({
      eventos: [
        { id: 1, incidenciaId: 1, tipo: 'creada', actor: 'administracion', mensaje: 'Incidencia de prueba', createdAt: '2026-09-22T17:18:00Z', adjuntos: [] },
        { id: 2, incidenciaId: 1, tipo: 'comentario_administracion', actor: 'administracion', mensaje: 'Hemos revisado la documentacion.', createdAt: '2026-09-22T17:20:00Z', adjuntos: [] }
      ]
    });
    const conversacion = component.conversacion(item);
    expect(conversacion.length).toBe(1);
    expect(conversacion[0].tipo).toBe('comentario_administracion');
  });

  it('no elimina eventos cuando el primero no es de creación (defensivo)', () => {
    const { component } = createComponent();
    const item = incidencia({
      eventos: [
        { id: 2, incidenciaId: 1, tipo: 'comentario_administracion', actor: 'administracion', mensaje: 'x', createdAt: '2026-09-22T17:20:00Z', adjuntos: [] }
      ]
    });
    expect(component.conversacion(item).length).toBe(1);
  });

  it('el acordeón expande y contrae por incidencia de forma independiente', () => {
    const { component } = createComponent();
    const uno = incidencia({ id: '1' });
    const dos = incidencia({ id: '2' });
    expect(component.isExpanded(uno)).toBeFalse();
    component.toggle(uno);
    expect(component.isExpanded(uno)).toBeTrue();
    expect(component.isExpanded(dos)).toBeFalse();
    component.toggle(uno);
    expect(component.isExpanded(uno)).toBeFalse();
  });

  it('al cargar, expande automáticamente solo la incidencia más reciente (primera de la lista)', () => {
    const { component, secretaria } = createComponent();
    secretaria.getIncidencias.and.returnValue(of({ incidencias: [incidencia({ id: '2' }), incidencia({ id: '1' })] }));
    component.ngOnChanges();
    expect(component.isExpanded({ id: '2' } as Incidencia)).toBeTrue();
    expect(component.isExpanded({ id: '1' } as Incidencia)).toBeFalse();
  });

  it('el composer de nueva incidencia se muestra siempre que la lista está vacía, sin pulsar "+"', () => {
    const { component } = createComponent();
    component.incidencias = [];
    expect(component.mostrarComposerNuevo).toBeTrue();
  });

  it('el composer de nueva incidencia queda oculto por defecto cuando ya hay incidencias, hasta pulsar "+"', () => {
    const { component } = createComponent();
    component.incidencias = [incidencia()];
    expect(component.mostrarComposerNuevo).toBeFalse();
    component.mostrarNuevaIncidencia = true;
    expect(component.mostrarComposerNuevo).toBeTrue();
  });

  it('abrir el dialog de cierre no cierra la incidencia hasta confirmar', () => {
    const { component, secretaria } = createComponent();
    const item = incidencia();
    component.abrirCierre(item, 'subsanada');
    expect(component.cierrePendiente).toEqual({ incidencia: item, estado: 'subsanada' });
    expect(secretaria.cerrarIncidencia).not.toHaveBeenCalled();
  });

  it('cancelar el dialog de cierre no ejecuta ninguna llamada', () => {
    const { component, secretaria } = createComponent();
    component.abrirCierre(incidencia(), 'cerrada');
    component.cierrePendiente = null;
    expect(secretaria.cerrarIncidencia).not.toHaveBeenCalled();
  });

  it('confirmar el cierre envía el motivo (opcional) y el tipo correcto, y recarga tras éxito', () => {
    const { component, secretaria } = createComponent();
    secretaria.cerrarIncidencia.and.returnValue(of(incidencia({ estado: 'subsanada' })));
    const item = incidencia({ id: '7' });
    component.abrirCierre(item, 'subsanada');
    component.confirmarCierre('Documentación aportada');
    expect(secretaria.cerrarIncidencia).toHaveBeenCalledWith('7', 'Documentación aportada', 'subsanada');
    expect(component.cierrePendiente).toBeNull();
  });

  it('confirmar sin motivo envía una cadena vacía, sin exigirlo como obligatorio', () => {
    const { component, secretaria } = createComponent();
    secretaria.cerrarIncidencia.and.returnValue(of(incidencia({ estado: 'cerrada' })));
    component.abrirCierre(incidencia({ id: '7' }), 'cerrada');
    component.confirmarCierre('');
    expect(secretaria.cerrarIncidencia).toHaveBeenCalledWith('7', '', 'cerrada');
  });

  it('distingue el tipo de cierre según el botón que abrió el dialog', () => {
    const { component, secretaria } = createComponent();
    secretaria.cerrarIncidencia.and.returnValue(of(incidencia()));
    component.abrirCierre(incidencia({ id: '9' }), 'cerrada');
    component.confirmarCierre('motivo');
    expect(secretaria.cerrarIncidencia).toHaveBeenCalledWith('9', 'motivo', 'cerrada');
  });

  describe('Devolver a asociación mediante dialog (0.43.1#ESMERALDA)', () => {
    it('abrir el dialog de devolución no ejecuta ninguna llamada hasta confirmar', () => {
      const { component, secretaria } = createComponent();
      const item = incidencia({ id: '3', estado: 'respondida' });
      component.abrirDevolucion(item);
      expect(component.devolucionPendiente).toBe(item);
      expect(secretaria.reabrirIncidencia).not.toHaveBeenCalled();
    });

    it('cancelar el dialog de devolución no ejecuta ninguna llamada', () => {
      const { component, secretaria } = createComponent();
      component.abrirDevolucion(incidencia({ id: '3', estado: 'respondida' }));
      component.devolucionPendiente = null;
      expect(secretaria.reabrirIncidencia).not.toHaveBeenCalled();
    });

    it('confirmar sin motivo NO devuelve la incidencia: el motivo sigue siendo obligatorio', () => {
      const { component, secretaria } = createComponent();
      component.abrirDevolucion(incidencia({ id: '3', estado: 'respondida' }));
      component.confirmarDevolucion('');
      component.confirmarDevolucion('   ');
      expect(secretaria.reabrirIncidencia).not.toHaveBeenCalled();
      expect(component.devolucionPendiente).not.toBeNull();
    });

    it('confirmar con motivo reutiliza el flujo existente de devolución y recarga tras éxito', () => {
      const { component, secretaria } = createComponent();
      secretaria.reabrirIncidencia.and.returnValue(of(incidencia({ id: '3', estado: 'abierta' })));
      component.abrirDevolucion(incidencia({ id: '3', estado: 'respondida' }));
      component.confirmarDevolucion('Falta documentación adicional');
      expect(secretaria.reabrirIncidencia).toHaveBeenCalledWith('3', 'Falta documentación adicional');
      expect(component.devolucionPendiente).toBeNull();
    });
  });

  describe('Aislamiento de estado entre recursos al cambiar scope/scopeId (0.43.2#ESMERALDA)', () => {
    // Reproduce el escenario real confirmado en la auditoría: Asociados-Gestión y
    // Registro reutilizan la MISMA instancia de IncidenciasPanelComponent al
    // cambiar de solicitud/registro (su *ngIf comprueba solo truthiness, no
    // identidad, así que Angular no destruye el componente). Sin este reset,
    // un adjunto/borrador dejado a medias en el recurso A podía acabar
    // subido contra un evento del recurso B al enviar.
    function simulateScopeChange(component: IncidenciasPanelComponent, scope: 'inscripcion' | 'solicitud' | 'registro', scopeId: string): void {
      component.scope = scope;
      component.scopeId = scopeId;
      component.ngOnChanges();
    }

    it('cambiar de scopeId sin destruir la instancia limpia los adjuntos/borradores de "nueva incidencia" del recurso anterior', () => {
      const { component } = createComponent();
      const archivoA = new File(['a'], 'archivo-de-A.pdf');
      component.nuevoMensaje = 'Mensaje a medias sobre el recurso A';
      component.selectedFiles = [archivoA];
      component.mostrarNuevaIncidencia = true;

      simulateScopeChange(component, 'solicitud', '999'); // recurso B, distinta solicitud/asociación

      expect(component.nuevoMensaje).toBe('');
      expect(component.selectedFiles).toEqual([]);
      expect(component.mostrarNuevaIncidencia).toBeFalse();
    });

    it('cambiar de scopeId limpia los borradores de respuesta/comentario indexados por incidencia del recurso anterior', () => {
      const { component } = createComponent();
      const archivoA = new File(['a'], 'archivo-de-A.pdf');
      component.respuestas['1'] = 'respuesta a medias';
      component.responseFiles['1'] = [archivoA];
      component.comentarios['1'] = 'comentario a medias';
      component.commentFiles['1'] = [archivoA];

      simulateScopeChange(component, 'registro', '888');

      expect(component.respuestas).toEqual({});
      expect(component.responseFiles).toEqual({});
      expect(component.comentarios).toEqual({});
      expect(component.commentFiles).toEqual({});
    });

    it('cambiar de scopeId limpia el acordeón expandido y cualquier dialog de cierre/devolución pendiente del recurso anterior', () => {
      const { component } = createComponent();
      const item = incidencia({ id: '1' });
      component.toggle(item);
      component.abrirCierre(item, 'subsanada');
      expect(component.isExpanded(item)).toBeTrue();
      expect(component.cierrePendiente).not.toBeNull();

      simulateScopeChange(component, 'inscripcion', '20');

      expect(component.isExpanded(item)).toBeFalse();
      expect(component.cierrePendiente).toBeNull();
      expect(component.devolucionPendiente).toBeNull();
    });

    it('dos incidencias distintas nunca comparten adjuntos: los archivos quedan indexados por su propio id', () => {
      const { component } = createComponent();
      const archivoUno = new File(['1'], 'de-la-incidencia-1.pdf');
      const archivoDos = new File(['2'], 'de-la-incidencia-2.pdf');
      component.responseFiles['1'] = [archivoUno];
      component.responseFiles['2'] = [archivoDos];
      expect(component.responseFiles['1'].length).toBe(1);
      expect(component.responseFiles['1'][0].name).toBe('de-la-incidencia-1.pdf');
      expect(component.responseFiles['2'].length).toBe(1);
      expect(component.responseFiles['2'][0].name).toBe('de-la-incidencia-2.pdf');
      expect(component.responseFiles['1'].some(file => file === archivoDos)).toBeFalse();
      expect(component.responseFiles['2'].some(file => file === archivoUno)).toBeFalse();
    });

    it('un mensaje enviado sin adjuntos nunca hereda archivos de un envío anterior en la misma incidencia', () => {
      const { component, secretaria } = createComponent();
      secretaria.responderIncidencia.and.returnValue(of(incidencia({ id: '1', eventos: [{ id: 5, incidenciaId: 1, tipo: 'respuesta_asociacion', actor: 'asociacion', mensaje: 'x', createdAt: '2026-01-01', adjuntos: [] }] })));
      secretaria.subirAdjunto.and.returnValue(of({} as any));
      const item = incidencia({ id: '1' });

      component.responseFiles['1'] = [new File(['a'], 'primer-envio.pdf')];
      component.respuestas['1'] = 'primera respuesta';
      component.responder(item);
      expect(component.responseFiles['1']).toEqual([]);
      expect(secretaria.subirAdjunto).toHaveBeenCalledTimes(1);

      component.respuestas['1'] = 'segunda respuesta, sin adjuntos';
      component.responder(item);
      expect(secretaria.subirAdjunto).toHaveBeenCalledTimes(1);
    });
  });

  describe('Composer de respuesta de Asociación (0.43.2#ESMERALDA: restaurado tras la regresión)', () => {
    let fixture: ComponentFixture<IncidenciasPanelComponent>;
    let secretaria: jasmine.SpyObj<Pick<SecretariaService, 'getIncidencias' | 'responderIncidencia' | 'subirAdjunto'>>;

    async function renderAsAssociation(incidencias: Incidencia[]): Promise<void> {
      secretaria = jasmine.createSpyObj('SecretariaService', ['getIncidencias', 'responderIncidencia', 'subirAdjunto']);
      secretaria.getIncidencias.and.returnValue(of({ incidencias }));
      await TestBed.configureTestingModule({
        imports: [IncidenciasPanelComponent],
        providers: [
          { provide: SecretariaService, useValue: secretaria },
          { provide: AdminAccessService, useValue: { isAdmin: () => false } },
          { provide: PermissionsService, useValue: { hasPermission: () => true } }
        ]
      }).compileComponents();
      fixture = TestBed.createComponent(IncidenciasPanelComponent);
      fixture.componentInstance.scope = 'inscripcion';
      fixture.componentInstance.scopeId = '10';
      fixture.componentInstance.ngOnChanges();
      fixture.detectChanges();
    }

    it('Asociación ve el composer de respuesta en una incidencia abierta y puede enviar (incluye adjuntos)', () => {
      return renderAsAssociation([incidencia({ id: '1', estado: 'abierta' })]).then(() => {
        secretaria.responderIncidencia.and.returnValue(of(incidencia({ id: '1', estado: 'respondida' })));
        secretaria.subirAdjunto.and.returnValue(of({} as any));

        const composer = fixture.nativeElement.querySelector('app-compact-composer');
        expect(composer).withContext('el composer de respuesta debe estar presente para Asociación').toBeTruthy();

        const component = fixture.componentInstance;
        component.respuestas['1'] = 'Aquí tienes el documento solicitado';
        component.responseFiles['1'] = [new File(['x'], 'documento.pdf')];
        component.responder({ id: '1' } as Incidencia);

        expect(secretaria.responderIncidencia).toHaveBeenCalledWith('1', 'Aquí tienes el documento solicitado');
      });
    });

    it('Asociación NO ve ninguna acción administrativa (marcar subsanada/cerrar/devolver)', () => {
      return renderAsAssociation([incidencia({ id: '1', estado: 'abierta' })]).then(() => {
        const html: string = fixture.nativeElement.textContent;
        expect(html).not.toContain('Marcar subsanada');
        expect(html).not.toContain('Cerrar sin subsanar');
        expect(html).not.toContain('Devolver a asociación');
      });
    });
  });

  describe('Acciones administrativas se mantienen intactas para Administración (0.43.2#ESMERALDA: sin regresión)', () => {
    it('Administración conserva comentar, marcar subsanada, cerrar sin subsanar y devolver a asociación', async () => {
      const secretaria = jasmine.createSpyObj('SecretariaService', ['getIncidencias']);
      secretaria.getIncidencias.and.returnValue(of({ incidencias: [incidencia({ id: '1', estado: 'respondida' })] }));
      await TestBed.configureTestingModule({
        imports: [IncidenciasPanelComponent],
        providers: [
          { provide: SecretariaService, useValue: secretaria },
          { provide: AdminAccessService, useValue: { isAdmin: () => true } },
          { provide: PermissionsService, useValue: { hasPermission: () => true } }
        ]
      }).compileComponents();
      const fixture = TestBed.createComponent(IncidenciasPanelComponent);
      fixture.componentInstance.scope = 'inscripcion';
      fixture.componentInstance.scopeId = '10';
      fixture.componentInstance.ngOnChanges();
      fixture.detectChanges();
      const html: string = fixture.nativeElement.textContent;
      expect(html).toContain('Marcar subsanada');
      expect(html).toContain('Cerrar sin subsanar');
      expect(html).toContain('Devolver a asociación');
      expect(fixture.nativeElement.querySelectorAll('app-compact-composer').length).toBeGreaterThanOrEqual(1);
    });
  });
});
