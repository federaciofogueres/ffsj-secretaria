import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { PermissionsService } from '../core/permissions.service';
import { RubiAdminComponent } from './rubi-admin.component';
import { RubiAdminService } from './rubi-admin.service';

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
    api = jasmine.createSpyObj<RubiAdminService>('RubiAdminService', ['getConfig', 'updateConfig', 'listAssociations', 'setAssociationAuthorized', 'getAnalytics']);
    api.getConfig.and.returnValue(of(configResponse));
    api.listAssociations.and.returnValue(of({ total: 2, items: [{ id: 1, nombre: 'Doctor Bergez - Carolinas', authorized: true }, { id: 2, nombre: 'Pio XII', authorized: false }] }));
    api.getAnalytics.and.returnValue(of({ periodo: { desde: '', hasta: '' }, llamadas: 3, inputTokens: 10, outputTokens: 5, costeUsd: 0.01, fallidas: 0, actoresUnicos: 1, asociacionesUnicas: 1 }));
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
    expect(component.analytics?.llamadas).toBe(3);
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

  it('provides the new admin labels in ES, VA and EN', () => {
    fixture.detectChanges();
    const i18n = TestBed.inject(I18nService);
    for (const language of ['es', 'va', 'en'] as const) {
      i18n.setLanguage(language);
      expect(i18n.t('rubi.admin.status.title')).not.toBe('rubi.admin.status.title');
      expect(i18n.t('rubi.admin.associations.title')).not.toBe('rubi.admin.associations.title');
      expect(i18n.t('rubi.admin.analytics.title')).not.toBe('rubi.admin.analytics.title');
    }
  });
});
