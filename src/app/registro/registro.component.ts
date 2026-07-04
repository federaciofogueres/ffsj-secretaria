import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { AdminAccessService } from '../core/admin-access.service';
import { RegistroSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

type RegistroMode = 'documentacion' | 'comunicacion' | null;

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent implements OnInit {
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
    asociacionId: [''],
    responsable: ['', Validators.required],
    titulo: ['', Validators.required],
    mensaje: ['', [Validators.required, Validators.minLength(10)]]
  });

  docAdjuntos: File[] = [];
  commAdjuntos: File[] = [];
  respuestaAdjuntos: File[] = [];

  docResultado: RegistroSecretaria | null = null;
  commResultado: RegistroSecretaria | null = null;
  registros: RegistroSecretaria[] = [];
  commBandeja: 'realizadas' | 'recibidas' = 'realizadas';
  respuestaComunicacion = '';
  loadingRegistros = false;
  errorRegistros = '';

  submittingDoc = false;
  submittingComm = false;
  updatingEstado = false;
  docLocked = false;
  commLocked = false;
  readonly estadosRegistro: RegistroSecretaria['estado'][] = ['recibido', 'leido', 'validado', 'incidencia', 'rechazado'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly secretariaService: SecretariaService,
    private readonly censoService: CensoService,
    private readonly adminAccess: AdminAccessService,
    readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.commBandeja = this.isAdminMode ? 'recibidas' : 'realizadas';
    this.cargarRegistros();
  }

  setMode(mode: Exclude<RegistroMode, null>): void {
    this.mode = mode;
    const latest = mode === 'documentacion' ? this.docRefs[0] : this.commRefs[0];
    if (latest) {
      this.openReferencia(latest, mode);
    }
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

  onRespuestaFiles(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    this.respuestaAdjuntos = Array.from(files);
  }

  get canSubmitDoc(): boolean {
    return this.canCreateRegistros && this.docForm.enabled && this.docForm.valid && this.docAdjuntos.length > 0 && !this.submittingDoc;
  }

  get canSubmitComm(): boolean {
    const hasTarget = !this.isAdminMode || Number(this.commForm.value.asociacionId) > 0;
    return this.canCreateComm && hasTarget && this.commForm.enabled && this.commForm.valid && !this.submittingComm;
  }

  get isAdminMode(): boolean {
    return this.adminAccess.isAdmin();
  }

  get canCreateRegistros(): boolean {
    return !this.isAdminMode && this.permissions.hasPermission('registro:write');
  }

  get canCreateComm(): boolean {
    return this.permissions.hasPermission('registro:write');
  }

  get docRefs(): RegistroSecretaria[] {
    return this.registros.filter(registro => registro.tipo === 'documentacion');
  }

  get commRefs(): RegistroSecretaria[] {
    const origen = this.commBandeja === 'realizadas'
      ? this.isAdminMode ? 'administracion' : 'asociacion'
      : this.isAdminMode ? 'asociacion' : 'administracion';
    return this.registros.filter(registro => registro.tipo === 'comunicacion' && registro.origen === origen);
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
        this.docResultado = registro;
        this.prependRegistro(registro);
        this.lockDocForm();
        this.docAdjuntos = [];
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
      asociacionId: this.isAdminMode ? Number(this.commForm.value.asociacionId) : this.censoService.asociacionId,
      tipo: 'comunicacion',
      origen: this.isAdminMode ? 'administracion' : 'asociacion',
      responsable: this.commForm.value.responsable,
      titulo: this.commForm.value.titulo,
      mensaje: this.commForm.value.mensaje,
      adjuntos: this.commAdjuntos.map(file => ({ name: file.name, size: file.size, type: file.type }))
    }).pipe(
      switchMap(registro => this.commAdjuntos.length
        ? forkJoin(this.commAdjuntos.map(file => this.secretariaService.subirAdjunto('registro_mensaje', this.lastMensajeId(registro) || registro.id, file))).pipe(switchMap(() => of(registro)))
        : of(registro)
      ),
      switchMap(registro => this.secretariaService.getRegistro(registro.id))
    ).subscribe({
      next: registro => {
        this.commBandeja = 'realizadas';
        this.commResultado = registro;
        this.prependRegistro(registro);
        this.lockCommForm();
        this.commAdjuntos = [];
        this.submittingComm = false;
      },
      error: () => {
        this.submittingComm = false;
      }
    });
  }

  printDoc(): void {
    if (!this.docResultado) return;
    this.descargarJustificante('registro', this.docResultado.id);
  }

  printComm(): void {
    if (!this.commResultado) return;
    this.descargarJustificante('registro', this.commResultado.id);
  }

  openReferencia(ref: RegistroSecretaria, mode: Exclude<RegistroMode, null>): void {
    if (mode === 'documentacion') {
      this.docResultado = ref;
      this.docForm.patchValue({
        responsable: '',
        titulo: ref.titulo,
        mensaje: ref.mensaje || ''
      }, { emitEvent: false });
      this.lockDocForm();
    } else {
      this.commResultado = ref;
      this.commForm.patchValue({
        responsable: '',
        titulo: ref.titulo,
        mensaje: ref.mensaje || ''
      }, { emitEvent: false });
      this.lockCommForm();
    }
  }

  isCurrentRef(ref: RegistroSecretaria, mode: Exclude<RegistroMode, null>): boolean {
    return mode === 'documentacion' ? ref.id === this.docResultado?.id : ref.id === this.commResultado?.id;
  }

  enableDocEdit(): void {
    this.docResultado = null;
    this.docForm.reset();
    this.docAdjuntos = [];
    this.docLocked = false;
    this.docForm.enable({ emitEvent: false });
  }

  enableCommEdit(): void {
    this.commResultado = null;
    this.commForm.reset();
    this.commAdjuntos = [];
    this.commLocked = false;
    this.commForm.enable({ emitEvent: false });
  }

  setCommBandeja(bandeja: 'realizadas' | 'recibidas'): void {
    this.commBandeja = bandeja;
    this.commResultado = this.commRefs[0] || null;
    if (this.commResultado) {
      this.openReferencia(this.commResultado, 'comunicacion');
    } else {
      this.enableCommEdit();
    }
  }

  estadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      recibido: 'Recibido',
      leido: 'Leido',
      validado: 'Validado',
      incidencia: 'Incidencia',
      rechazado: 'Rechazado'
    };
    return labels[estado] || estado;
  }

  estadoClass(estado: string): string {
    return estado === 'leido' ? 'leido' : estado;
  }

  descargarAdjunto(url: string): void {
    window.open(url, '_blank');
  }

  cambiarEstado(registro: RegistroSecretaria, estado: RegistroSecretaria['estado']): void {
    if (!this.isAdminMode || !this.permissions.hasPermission('registro:write') || registro.estado === estado) {
      return;
    }
    this.updatingEstado = true;
    this.secretariaService.actualizarEstadoRegistro(registro.id, estado).subscribe({
      next: updated => {
        this.prependRegistro(updated);
        if (this.docResultado?.id === updated.id) {
          this.docResultado = updated;
        }
        if (this.commResultado?.id === updated.id) {
          this.commResultado = updated;
        }
        this.updatingEstado = false;
      },
      error: () => this.updatingEstado = false
    });
  }

  responderComunicacion(): void {
    if (!this.commResultado || !this.respuestaComunicacion.trim() || !this.permissions.hasPermission('registro:write')) {
      return;
    }
    this.submittingComm = true;
    this.secretariaService.crearMensajeRegistro(this.commResultado.id, this.respuestaComunicacion.trim()).pipe(
      switchMap(mensaje => this.respuestaAdjuntos.length
        ? forkJoin(this.respuestaAdjuntos.map(file => this.secretariaService.subirAdjunto('registro_mensaje', mensaje.id, file))).pipe(switchMap(() => of(mensaje)))
        : of(mensaje)
      ),
      switchMap(() => this.secretariaService.getRegistro(this.commResultado!.id))
    ).subscribe({
      next: registro => {
        this.respuestaComunicacion = '';
        this.respuestaAdjuntos = [];
        this.commResultado = registro;
        this.prependRegistro(registro);
        this.submittingComm = false;
      },
      error: () => this.submittingComm = false
    });
  }

  private cargarRegistros(): void {
    if (!this.permissions.hasPermission('registro:read')) {
      return;
    }
    this.loadingRegistros = true;
    this.errorRegistros = '';
    const filters = this.isAdminMode ? {} : { asociacionId: this.censoService.asociacionId };
    this.secretariaService.getRegistros(filters).subscribe({
      next: response => {
        this.registros = response.registros;
        this.loadingRegistros = false;
      },
      error: () => {
        this.errorRegistros = 'No se ha podido cargar el historico de registros.';
        this.loadingRegistros = false;
      }
    });
  }

  private prependRegistro(registro: RegistroSecretaria): void {
    this.registros = [registro, ...this.registros.filter(item => item.id !== registro.id)];
  }

  private lastMensajeId(registro: RegistroSecretaria): number | null {
    const mensajes = registro.mensajes || [];
    return mensajes.length ? mensajes[mensajes.length - 1].id : null;
  }

  private descargarJustificante(scope: string, scopeId: string | number): void {
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
