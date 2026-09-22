import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';

describe('ToastComponent (0.43.4#ESMERALDA)', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let component: ToastComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
  });

  it('muestra el mensaje recibido', () => {
    component.message = 'No se han podido cargar las solicitudes.';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se han podido cargar las solicitudes.');
  });

  it('cerrar con el aspa emite closed', () => {
    fixture.detectChanges();
    spyOn(component.closed, 'emit');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.ffsj-toast-close');
    boton.click();
    expect(component.closed.emit).toHaveBeenCalledTimes(1);
  });

  it('hacer click en cualquier parte del toast también emite closed', () => {
    fixture.detectChanges();
    spyOn(component.closed, 'emit');
    const toast: HTMLElement = fixture.nativeElement.querySelector('.ffsj-toast');
    toast.click();
    expect(component.closed.emit).toHaveBeenCalledTimes(1);
  });

  it('el aspa no dispara el cierre por duplicado al hacer click (stopPropagation)', () => {
    fixture.detectChanges();
    spyOn(component.closed, 'emit');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.ffsj-toast-close');
    boton.click();
    expect(component.closed.emit).toHaveBeenCalledTimes(1);
  });

  it('el aspa tiene un aria-label accesible', () => {
    fixture.detectChanges();
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.ffsj-toast-close');
    expect(boton.getAttribute('aria-label')).toBe('Cerrar notificación');
  });

  it('type "error" (por defecto) aplica la clase de error', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ffsj-toast-error')).toBeTruthy();
  });
});
