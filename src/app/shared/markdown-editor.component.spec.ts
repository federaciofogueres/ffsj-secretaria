import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { MarkdownEditorComponent } from './markdown-editor.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MarkdownEditorComponent],
  template: `<app-markdown-editor [formControl]="control" label="Instrucciones"></app-markdown-editor>`
})
class HostComponent {
  control = new FormControl('');
}

describe('MarkdownEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function editor(): MarkdownEditorComponent {
    return fixture.debugElement.children[0].componentInstance as MarkdownEditorComponent;
  }

  it('escribir en el textarea actualiza el FormControl enlazado (ControlValueAccessor)', () => {
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = '## Instrucciones\n\nTrae el DNI.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBe('## Instrucciones\n\nTrae el DNI.');
  });

  it('un cambio externo del FormControl se refleja en el editor (writeValue)', () => {
    fixture.componentInstance.control.setValue('Contenido externo');
    fixture.detectChanges();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(textarea.value).toBe('Contenido externo');
  });

  it('la vista previa renderiza el Markdown de forma segura y elimina scripts', () => {
    fixture.componentInstance.control.setValue('**Aviso**<script>window.__pwn = true;</script>');
    fixture.detectChanges();
    editor().setMode('vista-previa');
    fixture.detectChanges();
    const preview: HTMLElement = fixture.nativeElement.querySelector('.markdown-editor-preview .markdown-body');
    expect(preview.innerHTML).toContain('<strong>Aviso</strong>');
    expect(preview.innerHTML).not.toContain('<script');
    expect((window as any).__pwn).toBeUndefined();
  });

  it('la vista previa no muestra un bloque vacío cuando no hay contenido', () => {
    fixture.componentInstance.control.setValue('');
    fixture.detectChanges();
    editor().setMode('vista-previa');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.markdown-editor-preview .markdown-body')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sin contenido para previsualizar.');
  });
});
