import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
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

  describe('Condición de carrera al cambiar de recurso con una petición en vuelo (0.43.5#ESMERALDA)', () => {
    // 0.43.2#ESMERALDA reseteaba el estado en ngOnChanges, pero crear()/
    // responder()/comentar() releían this.selectedFiles/this.responseFiles/
    // this.commentFiles DENTRO del switchMap, es decir DESPUÉS del
    // round-trip HTTP. Con observables síncronos (of(...)) esto nunca se
    // manifestaba en los tests anteriores porque no hay ninguna ventana real
    // entre el envío y la respuesta. Aquí se usa un Subject para simular esa
    // ventana: el recurso cambia (y se empieza un borrador nuevo) MIENTRAS
    // la petición anterior sigue en vuelo, antes de que responda.
    it('crear(): una respuesta tardía no sube el adjunto nuevo (del recurso B) contra el evento del recurso A, ni pisa el borrador de B', () => {
      const { component, secretaria } = createComponent();
      const crearSubject = new Subject<Incidencia>();
      secretaria.crearIncidencia.and.returnValue(crearSubject.asObservable());
      secretaria.subirAdjunto.and.returnValue(of({} as any));
      secretaria.getIncidencias.and.returnValue(of({ incidencias: [] }));

      const fileA = new File(['a'], 'de-A.pdf');
      const fileB = new File(['b'], 'de-B.pdf');
      component.nuevoMensaje = 'Incidencia del recurso A';
      component.selectedFiles = [fileA];
      component.mostrarNuevaIncidencia = true;
      component.crear(); // en vuelo: aún no ha respondido crearSubject

      // Mientras tanto, el admin cambia a OTRO recurso (dispara el reset de
      // 0.43.2) y empieza un borrador nuevo sin relación con A.
      component.scope = 'solicitud';
      component.scopeId = '999';
      component.ngOnChanges();
      component.nuevoMensaje = 'Incidencia del recurso B';
      component.selectedFiles = [fileB];
      component.mostrarNuevaIncidencia = true;

      // Ahora responde (tarde) la petición de A, con su propio evento.
      crearSubject.next(incidencia({
        id: '1', scope: 'inscripcion', scopeId: '10',
        eventos: [{ id: 42, incidenciaId: 1, tipo: 'creada', actor: 'administracion', mensaje: 'x', createdAt: '2026-01-01', adjuntos: [] }]
      }));
      crearSubject.complete();

      // jasmine.toHaveBeenCalledWith compara File por igualdad estructural
      // (sin propiedades enumerables, dos File distintos "parecen" iguales),
      // así que se comprueba por referencia exacta sobre calls.allArgs().
      const llamadas: any[][] = secretaria.subirAdjunto.calls.allArgs();
      expect(llamadas.some(args => args[0] === 'incidencia_evento' && args[1] === 42 && args[2] === fileA)).withContext('debe subir el adjunto de A contra el evento de A').toBeTrue();
      expect(llamadas.some(args => args[2] === fileB)).withContext('el adjunto de B nunca debe subirse contra el evento de A').toBeFalse();
      expect(component.nuevoMensaje).withContext('el borrador de B no debe perderse por la respuesta tardía de A').toBe('Incidencia del recurso B');
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).withContext('los adjuntos de B no deben perderse por la respuesta tardía de A').toBe(fileB);
    });

    it('responder(): una respuesta tardía no sube los adjuntos actuales del composer si el recurso ya cambió', () => {
      const { component, secretaria } = createComponent();
      const responderSubject = new Subject<Incidencia>();
      secretaria.responderIncidencia.and.returnValue(responderSubject.asObservable());
      secretaria.subirAdjunto.and.returnValue(of({} as any));
      secretaria.getIncidencias.and.returnValue(of({ incidencias: [] }));

      const fileA = new File(['a'], 'respuesta-A.pdf');
      const fileC = new File(['c'], 'archivo-ajeno-que-llego-despues.pdf');
      const item = incidencia({ id: '1' });
      component.respuestas['1'] = 'Respuesta al recurso A';
      component.responseFiles['1'] = [fileA];
      component.responder(item); // en vuelo

      // Cambio de recurso mientras la petición de A sigue pendiente.
      component.scope = 'registro';
      component.scopeId = '777';
      component.ngOnChanges();
      // Coincidencia de claves: si un composer de OTRA incidencia con el
      // mismo id '1' se rellenara ahora en el recurso nuevo, no debe verse
      // afectado por la respuesta tardía de A.
      component.responseFiles['1'] = [fileC];

      responderSubject.next(incidencia({ id: '1', eventos: [{ id: 55, incidenciaId: 1, tipo: 'respuesta_asociacion', actor: 'asociacion', mensaje: 'x', createdAt: '2026-01-01', adjuntos: [] }] }));
      responderSubject.complete();

      const llamadas: any[][] = secretaria.subirAdjunto.calls.allArgs();
      expect(llamadas.some(args => args[0] === 'incidencia_evento' && args[1] === 55 && args[2] === fileA)).withContext('debe subir el adjunto de A contra el evento de A').toBeTrue();
      expect(llamadas.some(args => args[2] === fileC)).withContext('el adjunto que llegó después nunca debe subirse contra el evento de A').toBeFalse();
      expect(component.responseFiles['1'].length).toBe(1);
      expect(component.responseFiles['1'][0]).withContext('el adjunto del nuevo recurso no debe perderse').toBe(fileC);
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

  describe('Estado activo/terminal como fuente de verdad única (0.43.3#ESMERALDA)', () => {
    it('esActiva: "abierta" y "respondida" son activas; "subsanada" y "cerrada" son terminales', () => {
      const { component } = createComponent();
      expect(component.esActiva(incidencia({ estado: 'abierta' }))).toBeTrue();
      expect(component.esActiva(incidencia({ estado: 'respondida' }))).toBeTrue();
      expect(component.esActiva(incidencia({ estado: 'subsanada' }))).toBeFalse();
      expect(component.esActiva(incidencia({ estado: 'cerrada' }))).toBeFalse();
    });

    it('el contador de abiertas cuenta exactamente las incidencias activas (misma fuente de verdad que esActiva)', () => {
      const { component } = createComponent();
      component.incidencias = [
        incidencia({ id: '1', estado: 'abierta' }),
        incidencia({ id: '2', estado: 'respondida' }),
        incidencia({ id: '3', estado: 'subsanada' }),
        incidencia({ id: '4', estado: 'cerrada' })
      ];
      expect(component.abiertas).toBe(2);
    });

    it('un estado terminal no permite gestión administrativa (canAdminManage usa la misma fuente de verdad)', () => {
      const { component } = createComponent(true);
      expect(component.canAdminManage(incidencia({ estado: 'abierta' }))).toBeTrue();
      expect(component.canAdminManage(incidencia({ estado: 'respondida' }))).toBeTrue();
      expect(component.canAdminManage(incidencia({ estado: 'subsanada' }))).toBeFalse();
      expect(component.canAdminManage(incidencia({ estado: 'cerrada' }))).toBeFalse();
    });

    it('el composer de Asociación no aparece en el DOM para una incidencia en estado terminal', async () => {
      const secretaria = jasmine.createSpyObj('SecretariaService', ['getIncidencias']);
      secretaria.getIncidencias.and.returnValue(of({ incidencias: [incidencia({ id: '1', estado: 'subsanada' })] }));
      await TestBed.configureTestingModule({
        imports: [IncidenciasPanelComponent],
        providers: [
          { provide: SecretariaService, useValue: secretaria },
          { provide: AdminAccessService, useValue: { isAdmin: () => false } },
          { provide: PermissionsService, useValue: { hasPermission: () => true } }
        ]
      }).compileComponents();
      const fixture = TestBed.createComponent(IncidenciasPanelComponent);
      const component = fixture.componentInstance;
      component.scope = 'inscripcion';
      component.scopeId = '10';
      component.ngOnChanges();
      // La incidencia está en estado terminal, por lo que no se auto-expande el
      // acordeón; forzamos su expansión para comprobar que, aun visible, el
      // composer de respuesta no aparece.
      component.toggle({ id: '1' } as Incidencia);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-compact-composer')).toBeNull();
    });
  });

  describe('Respuesta continua de Asociación mientras la incidencia siga activa (0.43.3#ESMERALDA)', () => {
    it('abierta → Asociación responde → respondida → Asociación sigue viendo el composer → vuelve a responder', async () => {
      const secretaria = jasmine.createSpyObj('SecretariaService', ['getIncidencias', 'responderIncidencia', 'subirAdjunto']);
      const abiertaItem = incidencia({ id: '1', estado: 'abierta' });
      const respondidaItem = incidencia({ id: '1', estado: 'respondida' });
      secretaria.getIncidencias.and.returnValues(
        of({ incidencias: [abiertaItem] }),
        of({ incidencias: [respondidaItem] }),
        of({ incidencias: [respondidaItem] })
      );
      secretaria.responderIncidencia.and.returnValue(of(respondidaItem));

      await TestBed.configureTestingModule({
        imports: [IncidenciasPanelComponent],
        providers: [
          { provide: SecretariaService, useValue: secretaria },
          { provide: AdminAccessService, useValue: { isAdmin: () => false } },
          { provide: PermissionsService, useValue: { hasPermission: () => true } }
        ]
      }).compileComponents();
      const fixture = TestBed.createComponent(IncidenciasPanelComponent);
      const component = fixture.componentInstance;
      component.scope = 'inscripcion';
      component.scopeId = '10';
      component.ngOnChanges();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-compact-composer')).withContext('composer visible con la incidencia abierta').toBeTruthy();

      component.respuestas['1'] = 'Primera respuesta';
      component.responder(abiertaItem);
      fixture.detectChanges();

      expect(component.incidencias[0].estado).toBe('respondida');
      expect(component.abiertas).withContext('sigue contando como abierta/activa tras responder').toBe(1);
      expect(fixture.nativeElement.querySelector('app-compact-composer')).withContext('el composer sigue visible tras pasar a "respondida"').toBeTruthy();

      component.respuestas['1'] = 'Segunda respuesta, la incidencia sigue activa';
      component.responder(respondidaItem);
      fixture.detectChanges();

      expect(secretaria.responderIncidencia).toHaveBeenCalledTimes(2);
      expect(secretaria.responderIncidencia.calls.argsFor(1)[0]).toBe('1');
      expect(secretaria.responderIncidencia.calls.argsFor(1)[1]).toBe('Segunda respuesta, la incidencia sigue activa');
    });

    it('una incidencia cerrada/subsanada (terminal) no permite que Asociación responda de nuevo', async () => {
      const secretaria = jasmine.createSpyObj('SecretariaService', ['getIncidencias', 'responderIncidencia']);
      secretaria.getIncidencias.and.returnValue(of({ incidencias: [incidencia({ id: '1', estado: 'subsanada' })] }));

      await TestBed.configureTestingModule({
        imports: [IncidenciasPanelComponent],
        providers: [
          { provide: SecretariaService, useValue: secretaria },
          { provide: AdminAccessService, useValue: { isAdmin: () => false } },
          { provide: PermissionsService, useValue: { hasPermission: () => true } }
        ]
      }).compileComponents();
      const fixture = TestBed.createComponent(IncidenciasPanelComponent);
      const component = fixture.componentInstance;
      component.scope = 'inscripcion';
      component.scopeId = '10';
      component.ngOnChanges();
      component.toggle({ id: '1' } as Incidencia);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-compact-composer')).toBeNull();
      expect(component.abiertas).toBe(0);
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
