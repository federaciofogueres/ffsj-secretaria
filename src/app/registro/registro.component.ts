import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { PermissionsService } from '../core/permissions.service';
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
    private readonly secretariaService: SecretariaService,
    private readonly censoService: CensoService,
    readonly permissions: PermissionsService
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
    return this.permissions.hasPermission('registro:write') && this.docForm.enabled && this.docForm.valid && this.docAdjuntos.length > 0 && !this.submittingDoc;
  }

  get canSubmitComm(): boolean {
    return this.permissions.hasPermission('registro:write') && this.commForm.enabled && this.commForm.valid && !this.submittingComm;
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
      asociacionId: this.censoService.asociacionId,
      tipo: 'documentacion',
      titulo: this.docForm.value.titulo,
      mensaje: this.docForm.value.mensaje,
      adjuntos: this.docAdjuntos.map(file => ({ name: file.name, size: file.size, type: file.type }))
    }).pipe(
      switchMap(registro => this.docAdjuntos.length
        ? forkJoin(this.docAdjuntos.map(file => this.secretariaService.subirAdjunto('registro', registro.id, file))).pipe(switchMap(() => of(registro)))
        : of(registro)
      )
    ).subscribe({
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
      asociacionId: this.censoService.asociacionId,
      tipo: 'comunicacion',
      titulo: this.commForm.value.titulo,
      mensaje: this.commForm.value.mensaje,
      adjuntos: this.commAdjuntos.map(file => ({ name: file.name, size: file.size, type: file.type }))
    }).pipe(
      switchMap(registro => this.commAdjuntos.length
        ? forkJoin(this.commAdjuntos.map(file => this.secretariaService.subirAdjunto('registro', registro.id, file))).pipe(switchMap(() => of(registro)))
        : of(registro)
      )
    ).subscribe({
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
    this.descargarJustificante('registro', this.docResultado.numero);
  }

  printComm(): void {
    if (!this.commResultado) return;
    this.descargarJustificante('registro', this.commResultado.numero);
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

  private descargarJustificante(scope: string, scopeId: string): void {
    this.secretariaService.generarJustificante(scope, scopeId).subscribe({
      next: justificante => window.open(justificante.url, '_blank'),
      error: () => undefined
    });
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
