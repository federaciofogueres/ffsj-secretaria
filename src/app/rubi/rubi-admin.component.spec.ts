import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { PermissionsService } from '../core/permissions.service';
import { RubiAdminComponent } from './rubi-admin.component';
import { RubiAdminAnalytics, RubiAdminService } from './rubi-admin.service';

// 1.10.0#RUBI: factory con todos los bloques nuevos (flujos/feedback
// extendido/reformulaciones/usoAcciones/conversacional/calidad/
// comparacionPeriodoAnterior) para no repetir el objeto completo en cada
// test; cada test sobreescribe solo lo que necesita.
function analyticsFixture(overrides: Partial<RubiAdminAnalytics> = {}): RubiAdminAnalytics {
  const rate = { rate: null, n: 0 };
  return {
    periodo: { desde: '', hasta: '' },
    operacion: { llamadas: 3, exitosas: 3, fallidas: 0, actoresUnicos: 1, asociacionesUnicas: 1, latenciaMediaMs: null, porTool: [], fallosPorCodigo: [], porAsociacion: [] },
    provider: { llamadas: 0, inputTokens: 10, outputTokens: 5, costeUsd: 0.01 },
    flujos: [],
    feedback: { helpful: 0, notHelpful: 0, porMotivo: [], porIntent: [], porTool: [], motivoPorIntent: [], motivoPorTool: [], motivoPorFlow: [] },
    reformulaciones: { posibles: 0 },
    usoAcciones: { navigation: { ofrecidas: 0, usadas: 0 }, flow: { ofrecidas: 0, usadas: 0 } },
    conversacional: { porIntent: [], porTool: [], porSource: [] },
    calidad: {
      conversacion: { resolutionProxyRate: rate, possibleReformulationRate: rate, unknownIntentRate: rate, helpfulRate: rate, notUnderstoodRate: rate },
      workflows: { flowCompletionRate: rate, flowCancellationRate: rate, flowFailureRate: rate, preparedToConfirmedRate: rate },
      provider: { providerUsageRate: rate, averageCostPerProviderCall: null, tokensPerCall: null, providerLatencyMs: { value: null, n: 0 } }
    },
    comparacionPeriodoAnterior: {
      periodo: { desde: '', hasta: '' }, unknownIntentRate: { actual: rate, anterior: rate, deltaPuntosPorcentuales: null },
      cancelacionPorFlow: [], satisfaccionPorIntent: [],
      latenciaProvider: { actual: { value: null, n: 0 }, anterior: { value: null, n: 0 }, deltaPorcentual: null }
    },
    ...overrides
  };
}

describe('RubiAdminComponent', () => {
  let fixture: ComponentFixture<RubiAdminComponent>;
  let component: RubiAdminComponent;
  let api: jasmine.SpyObj<RubiAdminService>;
  let permissions: jasmine.SpyObj<PermissionsService>;

  const configResponse = {
    global: { enabled: true, realProviderEnabled: true, transactionalEnabled: true, federationAuthorized: false },
    provider: { killSwitchEnabled: true, provider: 'gemini', model: 'test', realProviderRequested: true, credentialConfigured: true, transactionalEnabled: true },
    budget: { dailyBudgetUsd: 0, dailyUsedUsd: 0, dailyPercent: null, dailyLimitReached: false, monthlyBudgetUsd: 0, monthlyUsedUsd: 0, monthlyPercent: null, monthlyLimitReached: false }
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<RubiAdminService>('RubiAdminService', ['getConfig', 'updateConfig', 'listAssociations', 'setAssociationAuthorized', 'getAnalytics', 'getTools', 'setToolBlocked']);
    api.getConfig.and.returnValue(of(configResponse));
    api.listAssociations.and.returnValue(of({ total: 2, items: [{ id: 1, nombre: 'Doctor Bergez - Carolinas', authorized: true }, { id: 2, nombre: 'Pio XII', authorized: false }] }));
    api.getAnalytics.and.returnValue(of(analyticsFixture()));
    api.getTools.and.returnValue(of({
      tools: [
        { name: 'start_baja', description: 'Abre el flujo de baja.', domain: 'personas', available: true, blockedByAdmin: false, blockedByInfra: false },
        { name: 'get_calendario', description: 'Consulta el calendario.', domain: 'actividades', available: false, blockedByAdmin: false, blockedByInfra: true }
      ]
    }));
    api.setToolBlocked.and.returnValue(of({ blockedTools: ['start_baja'] }));
    permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['hasPermission']);
    permissions.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [RubiAdminComponent],
      providers: [I18nService,
        { provide: RubiAdminService, useValue: api },
        { provide: PermissionsService, useValue: permissions }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RubiAdminComponent);
    component = fixture.componentInstance;
  });

  it('hides the panel for a user without admin:rubi permission', () => {
    permissions.hasPermission.and.returnValue(false);
    fixture.detectChanges();
    expect(component.allowed).toBeFalse();
    expect(api.getConfig).not.toHaveBeenCalled();
  });

  it('loads config, associations and analytics on init', () => {
    fixture.detectChanges();
    expect(component.global).toEqual(configResponse.global);
    expect(component.asociaciones.length).toBe(2);
    expect(component.analytics?.operacion.llamadas).toBe(3);
  });

  it('toggles the global enabled flag optimistically and rolls back on error', () => {
    fixture.detectChanges();
    api.updateConfig.and.returnValue(throwError(() => new Error('fail')));
    component.toggleGlobal('enabled', false);
    expect(component.global?.enabled).toBe(true);
    expect(component.error).toBe('rubi.admin.error.save');
  });

  it('applies the update result when toggling the global flag succeeds', () => {
    fixture.detectChanges();
    api.updateConfig.and.returnValue(of({ global: { enabled: false, realProviderEnabled: true, transactionalEnabled: true, federationAuthorized: false } }));
    component.toggleGlobal('enabled', false);
    expect(component.global?.enabled).toBe(false);
  });

  it('RUBI-20 toggles federationAuthorized independently from the other global flags', () => {
    fixture.detectChanges();
    expect(component.global?.federationAuthorized).toBe(false);
    api.updateConfig.and.returnValue(of({ global: { enabled: true, realProviderEnabled: true, transactionalEnabled: true, federationAuthorized: true } }));
    component.toggleGlobal('federationAuthorized', true);
    expect(api.updateConfig).toHaveBeenCalledWith({ federationAuthorized: true });
    expect(component.global?.federationAuthorized).toBe(true);
    expect(component.global?.enabled).toBe(true);
  });

  it('toggles a single association and rolls back on error', () => {
    fixture.detectChanges();
    const asociacion = component.asociaciones[0];
    api.setAssociationAuthorized.and.returnValue(throwError(() => new Error('fail')));
    component.toggleAsociacion(asociacion, false);
    expect(asociacion.authorized).toBe(true);
    expect(component.asociacionesError).toBe('rubi.admin.error.associationSave');
  });

  it('reloads analytics when switching the period', () => {
    fixture.detectChanges();
    component.setAnalyticsDias(30);
    expect(api.getAnalytics).toHaveBeenCalledTimes(2);
    expect(component.analyticsDias).toBe(30);
  });

  describe('E (post-auditoria 1.8.1#RUBI): desglose operativo', () => {
    it('filters analytics by association id when provided', () => {
      fixture.detectChanges();
      component.analyticsAsociacionId = '25';
      component.loadAnalytics();
      expect(api.getAnalytics.calls.mostRecent().args[0]?.asociacionId).toBe(25);
    });

    it('ignores a non-numeric or empty association filter', () => {
      fixture.detectChanges();
      component.analyticsAsociacionId = '';
      component.loadAnalytics();
      expect(api.getAnalytics.calls.mostRecent().args[0]?.asociacionId).toBeUndefined();
    });

    it('renders the breakdown by tool, failure code and association', () => {
      api.getAnalytics.and.returnValue(of(analyticsFixture({
        operacion: {
          llamadas: 5, exitosas: 4, fallidas: 1, actoresUnicos: 1, asociacionesUnicas: 1, latenciaMediaMs: 200,
          porTool: [{ tool: 'list_actividades', llamadas: 4, fallidas: 0 }],
          fallosPorCodigo: [{ codigo: 'RUBI_TOOL_NOT_AUTHORIZED', llamadas: 1 }],
          porAsociacion: [{ asociacionId: 25, llamadas: 5 }]
        },
        provider: { llamadas: 0, inputTokens: 1, outputTokens: 1, costeUsd: 0 }
      })));
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('list_actividades');
      expect(text).toContain('RUBI_TOOL_NOT_AUTHORIZED');
      expect(text).toContain('#25');
    });

    // 1.10.0#RUBI: cobertura minima de las secciones nuevas (funnel,
    // conversacional, feedback con motivo, calidad, tendencias), reutilizando
    // el mismo patron de la suite existente.
    it('renders the funnel by workflow with absolute numbers and percentages', () => {
      api.getAnalytics.and.returnValue(of(analyticsFixture({
        flujos: [{
          flow: 'alta', iniciados: 10, preparados: 8, completados: 6, confirmados: 6, cancelados: 3, fallidos: 1,
          derivadosFlujoNormal: 0, expirados: 0,
          preparationRate: 0.8, completionRate: 0.6, cancellationRate: 0.3, failureRate: 0.1, normalFlowRedirectRate: 0
        }]
      })));
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('alta');
      expect(text).toContain('10');
      expect(text).toContain('6');
    });

    it('renders conversational analytics by intent/tool/source and feedback reason breakdown', () => {
      api.getAnalytics.and.returnValue(of(analyticsFixture({
        conversacional: {
          porIntent: [{ intent: 'help', llamadas: 20, latenciaMediaMs: 100, feedbackPositivo: 15, feedbackNegativo: 2, posiblesReformulaciones: 1 }],
          porTool: [{ tool: 'search_help', llamadas: 20, fallidas: 1, feedbackPositivo: 15, feedbackNegativo: 2, failureRate: 0.05, helpfulRate: 0.88 }],
          porSource: [{ source: 'deterministic', llamadas: 18, latenciaMediaMs: 10, feedbackPositivo: 14, feedbackNegativo: 1 }]
        },
        feedback: {
          helpful: 15, notHelpful: 2, porMotivo: [{ motivo: 'not_understood', total: 2 }],
          porIntent: [], porTool: [],
          motivoPorIntent: [{ intent: 'help', motivo: 'not_understood', total: 2 }],
          motivoPorTool: [{ tool: 'search_help', motivo: 'not_understood', total: 2 }],
          motivoPorFlow: []
        }
      })));
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('help');
      expect(text).toContain('search_help');
      expect(text).toContain('deterministic');
      expect(text).toContain('not_understood');
    });

    it('renders quality metrics always with their sample size (n), never a bare rate', () => {
      api.getAnalytics.and.returnValue(of(analyticsFixture({
        calidad: {
          conversacion: {
            resolutionProxyRate: { rate: 0.9, n: 100 }, possibleReformulationRate: { rate: 0.1, n: 100 },
            unknownIntentRate: { rate: 0.05, n: 100 }, helpfulRate: { rate: 0.85, n: 40 }, notUnderstoodRate: { rate: 0.2, n: 5 }
          },
          workflows: {
            flowCompletionRate: { rate: 0.6, n: 10 }, flowCancellationRate: { rate: 0.3, n: 10 },
            flowFailureRate: { rate: 0.1, n: 10 }, preparedToConfirmedRate: { rate: 0.75, n: 8 }
          },
          provider: { providerUsageRate: { rate: 0.2, n: 100 }, averageCostPerProviderCall: 0.05, tokensPerCall: 120, providerLatencyMs: { value: 800, n: 20 } }
        }
      })));
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('n=100');
      expect(text).toContain('n=10');
    });

    it('renders trends comparing the current period against the immediately previous one, with both absolute samples', () => {
      api.getAnalytics.and.returnValue(of(analyticsFixture({
        comparacionPeriodoAnterior: {
          periodo: { desde: '2026-01-01T00:00:00Z', hasta: '2026-01-08T00:00:00Z' },
          unknownIntentRate: { actual: { rate: 0.1, n: 100 }, anterior: { rate: 0.05, n: 90 }, deltaPuntosPorcentuales: 5 },
          cancelacionPorFlow: [{ flow: 'alta', actual: { rate: 0.3, n: 10 }, anterior: { rate: 0.1, n: 9 }, deltaPuntosPorcentuales: 20 }],
          satisfaccionPorIntent: [{ intent: 'help', actual: { rate: 0.9, n: 20 }, anterior: { rate: 0.7, n: 18 }, deltaPuntosPorcentuales: 20 }],
          latenciaProvider: { actual: { value: 900, n: 10 }, anterior: { value: 700, n: 8 }, deltaPorcentual: 28.57 }
        }
      })));
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('alta');
      expect(text).toContain('+20 pp');
    });

    it('shows a "no data yet" message when there are no funnels for the period, instead of an empty table', () => {
      fixture.detectChanges();
      const i18n = TestBed.inject(I18nService);
      expect(fixture.nativeElement.textContent).toContain(i18n.t('rubi.admin.analytics.noData'));
    });
  });

  it('shows the disabled Sugerencias stub with the exact roadmap message, without fabricating any suggestion', () => {
    fixture.detectChanges();
    const i18n = TestBed.inject(I18nService);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain(i18n.t('rubi.admin.suggestions.title'));
    expect(text).toContain(i18n.t('rubi.admin.suggestions.disabled'));
  });

  it('provides the new admin labels in ES, VA and EN', () => {
    fixture.detectChanges();
    const i18n = TestBed.inject(I18nService);
    for (const language of ['es', 'va', 'en'] as const) {
      i18n.setLanguage(language);
      expect(i18n.t('rubi.admin.status.title')).not.toBe('rubi.admin.status.title');
      expect(i18n.t('rubi.admin.associations.title')).not.toBe('rubi.admin.associations.title');
      expect(i18n.t('rubi.admin.analytics.title')).not.toBe('rubi.admin.analytics.title');
      expect(i18n.t('rubi.admin.tools.title')).not.toBe('rubi.admin.tools.title');
    }
  });

  describe('D (post-auditoria 1.8.1#RUBI): administracion de tools', () => {
    it('loads the real tool catalogue on init', () => {
      fixture.detectChanges();
      expect(api.getTools).toHaveBeenCalled();
      expect(component.tools.length).toBe(2);
    });

    it('blocks a tool via admin and reflects it optimistically', () => {
      fixture.detectChanges();
      const tool = component.tools.find(item => item.name === 'start_baja')!;
      component.toggleTool(tool, true);
      expect(api.setToolBlocked).toHaveBeenCalledWith('start_baja', true);
      expect(tool.blockedByAdmin).toBe(true);
      expect(tool.available).toBe(false);
    });

    it('rolls back the toggle if the save fails', () => {
      fixture.detectChanges();
      const tool = component.tools.find(item => item.name === 'start_baja')!;
      api.setToolBlocked.and.returnValue(throwError(() => new Error('fail')));
      component.toggleTool(tool, true);
      expect(tool.blockedByAdmin).toBe(false);
      expect(component.toolsError).toBe('rubi.admin.error.toolSave');
    });

    it('never lets the UI unblock a tool blocked by infrastructure', () => {
      fixture.detectChanges();
      const infraTool = component.tools.find(item => item.name === 'get_calendario')!;
      expect(infraTool.blockedByInfra).toBe(true);
      component.toggleTool(infraTool, false);
      expect(api.setToolBlocked).not.toHaveBeenCalled();
    });

    it('renders the infra-blocked badge instead of an editable toggle', () => {
      fixture.detectChanges();
      const rows = fixture.nativeElement.querySelectorAll('table tbody tr');
      const infraRow = Array.from(rows).find((row: any) => row.textContent.includes('get_calendario')) as HTMLElement;
      expect(infraRow.querySelector('input[type="checkbox"]')).toBeNull();
      expect(infraRow.textContent).toContain(TestBed.inject(I18nService).t('rubi.admin.tools.blockedByInfra'));
    });
  });
});
