import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent (0.42.1#ESMERALDA: motivo opcional)', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
  });

  it('no muestra el campo de motivo por defecto (compatibilidad con usos existentes)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confirm-reason')).toBeNull();
  });

  it('confirmar sin campo de motivo emite una cadena vacía', () => {
    fixture.detectChanges();
    spyOn(component.confirmed, 'emit');
    component.onConfirm();
    expect(component.confirmed.emit).toHaveBeenCalledWith('');
  });

  it('muestra el campo de motivo cuando showReasonField es true y no lo exige para confirmar', () => {
    component.showReasonField = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confirm-reason')).toBeTruthy();
    spyOn(component.confirmed, 'emit');
    component.onConfirm();
    expect(component.confirmed.emit).toHaveBeenCalledWith('');
  });

  it('confirmar con motivo escrito lo emite recortado de espacios', () => {
    component.showReasonField = true;
    component.reason = '  Documentación aportada  ';
    spyOn(component.confirmed, 'emit');
    component.onConfirm();
    expect(component.confirmed.emit).toHaveBeenCalledWith('Documentación aportada');
  });

  it('cancelar emite el evento cancel', () => {
    fixture.detectChanges();
    spyOn(component.cancel, 'emit');
    fixture.nativeElement.querySelector('.confirm-backdrop').click();
    expect(component.cancel.emit).toHaveBeenCalled();
  });
});
