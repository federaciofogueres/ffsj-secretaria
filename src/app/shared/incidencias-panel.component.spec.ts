import { of } from 'rxjs';
import { Incidencia } from '../core/models';
import { IncidenciasPanelComponent } from './incidencias-panel.component';

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
});
