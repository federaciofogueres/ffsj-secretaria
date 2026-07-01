import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SecretariaService } from '../core/secretaria.service';

type RegistroEstado = 'Recibido' | 'Leido' | 'Validado';
type RegistroMode = 'documentacion' | 'comunicacion' | null;

interface RegistroResultado {
  numero: string;
  estado: RegistroEstado;
  mensaje: string;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent {
  mode: RegistroMode = null;

  readonly responsables = [
    { id: 'sec', label: 'Secretaria' },
    { id: 'pres', label: 'Presidencia' },
    { id: 'inf', label: 'Delegacion de Infantiles' },
    { id: 'act', label: 'Actividades' }
  ];

  docForm = this.fb.group({
    responsable: ['', Validators.required],
    titulo: ['', Validators.required],
    mensaje: ['', [Validators.required, Validators.minLength(10)]]
  });

  commForm = this.fb.group({
    responsable: ['', Validators.required],
    titulo: ['', Validators.required],
    mensaje: ['', [Validators.required, Validators.minLength(10)]]
  });

  docAdjuntos: File[] = [];
  commAdjuntos: File[] = [];

  docActual: RegistroResultado | null = null;
  commActual: RegistroResultado | null = null;
  docResultado: RegistroResultado | null = null;
  commResultado: RegistroResultado | null = null;
  docReferencias: RegistroResultado[] = [];
  commReferencias: RegistroResultado[] = [];

  submittingDoc = false;
  submittingComm = false;
  docLocked = false;
  commLocked = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly secretariaService: SecretariaService
  ) {}

  setMode(mode: Exclude<RegistroMode, null>): void {
    this.mode = mode;
  }

  resetMode(): void {
    this.mode = null;
  }

  onDocFiles(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    this.docAdjuntos = Array.from(files);
  }

  onCommFiles(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    this.commAdjuntos = Array.from(files);
  }

  get canSubmitDoc(): boolean {
    return this.docForm.enabled && this.docForm.valid && this.docAdjuntos.length > 0 && !this.submittingDoc;
  }

  get canSubmitComm(): boolean {
    return this.commForm.enabled && this.commForm.valid && !this.submittingComm;
  }

  get docRefs(): RegistroResultado[] {
    return this.docActual ? [this.docActual, ...this.docReferencias] : [];
  }

  get commRefs(): RegistroResultado[] {
    return this.commActual ? [this.commActual, ...this.commReferencias] : [];
  }

  submitDoc(): void {
    if (!this.canSubmitDoc) {
      this.docForm.markAllAsTouched();
      return;
    }

    this.submittingDoc = true;
    this.secretariaService.crearRegistro({
      asociacionId: 10,
      tipo: 'documentacion',
      titulo: this.docForm.value.titulo,
      mensaje: this.docForm.value.mensaje,
      adjuntos: this.docAdjuntos.map(file => ({ name: file.name, size: file.size, type: file.type }))
    }).subscribe({
      next: registro => {
        if (this.docActual) {
          this.docReferencias.unshift(this.docActual);
        }
        this.docActual = {
          numero: registro.id,
          estado: 'Recibido',
          mensaje: 'Documentacion enviada correctamente a la Federacion.'
        };
        this.docResultado = this.docActual;
        this.lockDocForm();
        this.submittingDoc = false;
      },
      error: () => {
        this.submittingDoc = false;
      }
    });
  }

  submitComm(): void {
    if (!this.canSubmitComm) {
      this.commForm.markAllAsTouched();
      return;
    }

    this.submittingComm = true;
    this.secretariaService.crearRegistro({
      asociacionId: 10,
      tipo: 'comunicacion',
      titulo: this.commForm.value.titulo,
      mensaje: this.commForm.value.mensaje,
      adjuntos: this.commAdjuntos.map(file => ({ name: file.name, size: file.size, type: file.type }))
    }).subscribe({
      next: registro => {
        if (this.commActual) {
          this.commReferencias.unshift(this.commActual);
        }
        this.commActual = {
          numero: registro.id,
          estado: 'Recibido',
          mensaje: 'Comunicacion enviada correctamente.'
        };
        this.commResultado = this.commActual;
        this.lockCommForm();
        this.submittingComm = false;
      },
      error: () => {
        this.submittingComm = false;
      }
    });
  }

  printDoc(): void {
    if (!this.docResultado) return;
    this.printSummary('Presentacion de documentacion', this.docForm.value, this.docAdjuntos, this.docResultado);
  }

  printComm(): void {
    if (!this.commResultado) return;
    this.printSummary('Comunicacion', this.commForm.value, this.commAdjuntos, this.commResultado);
  }

  openReferencia(ref: RegistroResultado, mode: Exclude<RegistroMode, null>): void {
    if (mode === 'documentacion') {
      this.docResultado = ref;
      this.lockDocForm();
    } else {
      this.commResultado = ref;
      this.lockCommForm();
    }
  }

  isCurrentRef(ref: RegistroResultado, mode: Exclude<RegistroMode, null>): boolean {
    return mode === 'documentacion' ? ref === this.docActual : ref === this.commActual;
  }

  enableDocEdit(): void {
    this.docLocked = false;
    this.docForm.enable({ emitEvent: false });
  }

  enableCommEdit(): void {
    this.commLocked = false;
    this.commForm.enable({ emitEvent: false });
  }

  private printSummary(
    titulo: string,
    formValue: unknown,
    adjuntos: File[],
    resultado: RegistroResultado
  ): void {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const adjuntosList = adjuntos.map(file => `<li>${file.name}</li>`).join('');
    win.document.write(`
      <html>
        <head>
          <title>${titulo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { color: #c4141c; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; background: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>${titulo}</h1>
          <p><strong>Registro de entrada:</strong> ${resultado.numero}</p>
          <p><strong>Estado:</strong> ${resultado.estado}</p>
          <p><strong>Datos enviados:</strong></p>
          <pre>${JSON.stringify(formValue, null, 2)}</pre>
          <p><strong>Adjuntos:</strong></p>
          <ul>${adjuntosList || '<li>Sin adjuntos</li>'}</ul>
          <p class="badge">${resultado.mensaje}</p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  private lockDocForm(): void {
    this.docLocked = true;
    this.docForm.disable({ emitEvent: false });
  }

  private lockCommForm(): void {
    this.commLocked = true;
    this.commForm.disable({ emitEvent: false });
  }
}
