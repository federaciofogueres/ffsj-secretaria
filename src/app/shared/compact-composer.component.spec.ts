import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompactComposerComponent } from './compact-composer.component';

function makeFile(name: string, sizeBytes: number, type = 'text/plain'): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('CompactComposerComponent (0.42.0#ESMERALDA)', () => {
  let fixture: ComponentFixture<CompactComposerComponent>;
  let component: CompactComposerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CompactComposerComponent] }).compileComponents();
    fixture = TestBed.createComponent(CompactComposerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deshabilita el envío sin texto y lo habilita al escribir', () => {
    expect(component.sendDisabled).toBeTrue();
    component.value = 'Describe la incidencia';
    expect(component.sendDisabled).toBeFalse();
  });

  it('no envía cuando está deshabilitado, en loading o sin texto', () => {
    component.value = 'algo';
    component.disabled = true;
    spyOn(component.send, 'emit');
    component.onSend();
    expect(component.send.emit).not.toHaveBeenCalled();

    component.disabled = false;
    component.loading = true;
    component.onSend();
    expect(component.send.emit).not.toHaveBeenCalled();

    component.loading = false;
    component.onSend();
    expect(component.send.emit).toHaveBeenCalled();
  });

  it('rechaza un archivo que supera el tamaño máximo y no lo emite', () => {
    component.maxBytes = 1024;
    spyOn(component.filesChange, 'emit');
    const input = { files: [makeFile('grande.png', 2048)], value: 'x' } as unknown as HTMLInputElement;
    component.onFilesSelected({ target: input } as unknown as Event);
    expect(component.error).toContain('grande.png');
    expect(component.filesChange.emit).not.toHaveBeenCalled();
  });

  it('rechaza superar el máximo de archivos permitidos', () => {
    component.maxFiles = 1;
    component.files = [makeFile('uno.txt', 10)];
    spyOn(component.filesChange, 'emit');
    const input = { files: [makeFile('dos.txt', 10)], value: 'x' } as unknown as HTMLInputElement;
    component.onFilesSelected({ target: input } as unknown as Event);
    expect(component.error).toContain('máximo');
    expect(component.filesChange.emit).not.toHaveBeenCalled();
  });

  it('acepta archivos válidos y los emite deduplicados', () => {
    spyOn(component.filesChange, 'emit');
    const file = makeFile('captura.png', 10);
    const input = { files: [file], value: 'x' } as unknown as HTMLInputElement;
    component.onFilesSelected({ target: input } as unknown as Event);
    expect(component.error).toBe('');
    expect(component.filesChange.emit).toHaveBeenCalledWith([file]);
  });

  it('quitar un archivo emite la lista sin ese índice', () => {
    const uno = makeFile('uno.txt', 10);
    const dos = makeFile('dos.txt', 10);
    component.files = [uno, dos];
    spyOn(component.filesChange, 'emit');
    component.removeFile(0);
    expect(component.filesChange.emit).toHaveBeenCalledWith([dos]);
  });
});
