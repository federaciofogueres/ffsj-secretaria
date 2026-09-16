import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { RubiApiService, RubiResponse } from './rubi-api.service';
import { RubiConversationService } from './rubi-conversation.service';
import { RubiPanelComponent } from './rubi-panel.component';

describe('RubiPanelComponent', () => {
  let fixture: ComponentFixture<RubiPanelComponent>;
  let component: RubiPanelComponent;
  let api: jasmine.SpyObj<RubiApiService>;
  let router: Router;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RubiApiService>('RubiApiService', ['message']);
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, RubiPanelComponent],
      providers: [
        I18nService, RubiConversationService,
        { provide: RubiApiService, useValue: api }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RubiPanelComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    TestBed.inject(I18nService).setLanguage('es');
    fixture.detectChanges();
  });

  it('opens and closes without clearing the session conversation', () => {
    component.show();
    expect(component.open).toBeTrue();
    expect(component.messages.length).toBe(1);
    component.close();
    expect(component.open).toBeFalse();
    expect(component.messages.length).toBe(1);
  });

  it('sends a quick action and renders a safe response action', () => {
    const response: RubiResponse = { message: 'Puedes abrir el registro.', intent: 'navigate', actions: [{ type: 'navigate', destination: 'registro', route: '/registro' }], errors: [], metadata: { success: true } };
    api.message.and.returnValue(of(response));
    component.show();
    component.sendQuickAction('rubi.quick.documents');
    expect(api.message).toHaveBeenCalledWith('Enviar documentacion', 'es', 'home', [], { version: 1, module: 'home', view: 'inicio' });
    expect(component.messages[component.messages.length - 1].actions).toEqual(response.actions);
  });

  it('prevents duplicate sends while a request is in progress', () => {
    api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
    component.loading = true;
    component.draft = 'Hola';
    component.send();
    expect(api.message).not.toHaveBeenCalled();
  });

  it('keeps the draft and explains a rate limit response', () => {
    api.message.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.draft = 'Ayuda';
    component.send();
    expect(component.draft).toBe('Ayuda');
    expect(component.messages[component.messages.length - 1].text).toContain('limite temporal');
  });

  it('marks Rubi unavailable when the Gateway is disabled', () => {
    api.message.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { errors: [{ code: 'RUBI_DISABLED' }] } })));
    component.draft = 'Ayuda';
    component.send();
    expect(component.unavailable).toBeTrue();
  });

  it('uses only the approved route for start_alta', () => {
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'alta', route: 'https://invalid.example' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/asociados/gestion');
  });

  it('uses the current language for subsequent Gateway calls', () => {
    api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
    TestBed.inject(I18nService).setLanguage('en');
    component.draft = 'Help';
    component.send();
    expect(api.message).toHaveBeenCalledWith('Help', 'en', 'home', [], { version: 1, module: 'home', view: 'inicio' });
  });

  it('renders Gateway text as text rather than HTML', () => {
    api.message.and.returnValue(of({ message: '<img src=x onerror=alert(1)>', intent: null, actions: [], errors: [], metadata: { success: true } }));
    component.show();
    component.draft = 'Ayuda';
    component.send();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rubi-message img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
