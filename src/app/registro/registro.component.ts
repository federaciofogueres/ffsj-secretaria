import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { AdminAccessService } from '../core/admin-access.service';
import { Asociacion, RegistroSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

type RegistroMode = 'documentacion' | 'comunicacion' | null;
type DocumentacionBandeja = 'presentada' | 'solicitada' | 'nuevas';
type ComunicacionBandeja = 'realizadas' | 'recibidas' | 'nuevas';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent implements OnInit {
  mode: RegistroMode = null;
  formMode: Exclude<RegistroMode, null> | null = null;
  detailMode: Exclude<RegistroMode, null> | null = null;
  docBandeja: DocumentacionBandeja = 'presentada';

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
  commBandeja: ComunicacionBandeja = 'realizadas';
  asociaciones: Asociacion[] = [];
  respuestaComunicacion = '';
  loadingRegistros = false;
  errorRegistros = '';

  submittingDoc = false;
  submittingComm = false;
  updatingEstado = false;
  docLocked = false;
  commLocked = false;
  readonly estadosRegistro: RegistroSecretaria['estado'][] = ['enviada', 'recibido', 'leido', 'validado', 'incidencia', 'rechazado', 'finalizada'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly secretariaService: SecretariaService,
    private readonly censoService: CensoService,
    private readonly adminAccess: AdminAccessService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.commBandeja = this.isAdminMode ? 'recibidas' : 'realizadas';
    this.applyRouteState();
    this.cargarRegistros();
    if (this.isAdminMode) {
      this.censoService.getAsociaciones().subscribe(asociaciones => {
        this.asociaciones = asociaciones.sort((a, b) => this.asociacionNombre(a).localeCompare(this.asociacionNombre(b), 'es'));
      });
    } else if (this.censoService.asociacionId) {
      this.censoService.getAsociacion(this.censoService.asociacionId).subscribe(asociacion => {
        this.asociaciones = [asociacion];
      });
    }
  }

  setMode(mode: Exclude<RegistroMode, null>): void {
    this.router.navigate(['/registro', mode]);
  }

  resetMode(): void {
    if (this.formMode) {
      this.formMode = null;
      this.router.navigate(['/registro', this.mode], { queryParams: {} });
      return;
    }
    if (this.detailMode) {
      this.detailMode = null;
      this.docResultado = null;
      this.commResultado = null;
      return;
    }
    this.router.navigate(['/registro']);
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

  get isFormView(): boolean {
    return this.formMode === this.mode && this.mode !== null;
  }

  get isDetailView(): boolean {
    return this.detailMode === this.mode && this.mode !== null;
  }

  get actorActual(): 'asociacion' | 'administracion' {
    return this.isAdminMode ? 'administracion' : 'asociacion';
  }

  get documentacionNuevaCount(): number {
    return this.registros.filter(registro => registro.tipo === 'documentacion' && this.esRegistroNuevo(registro)).length;
  }

  get comunicacionesNuevasCount(): number {
    return this.registros.filter(registro => registro.tipo === 'comunicacion' && this.esRegistroNuevo(registro)).length;
  }

  get docRefs(): RegistroSecretaria[] {
    return this.registros.filter(registro => {
      if (registro.tipo !== 'documentacion') return false;
      if (this.docBandeja === 'nuevas') return this.esRegistroNuevo(registro);
      if (this.docBandeja === 'presentada') return registro.origen === this.actorActual;
      return registro.origen !== this.actorActual && registro.estado !== 'enviada';
    });
  }

  get commRefs(): RegistroSecretaria[] {
    return this.registros.filter(registro => {
      if (registro.tipo !== 'comunicacion') return false;
      if (this.commBandeja === 'nuevas') return this.esRegistroNuevo(registro);
      if (this.commBandeja === 'realizadas') return registro.origen === this.actorActual;
      return registro.origen !== this.actorActual && registro.estado !== 'enviada';
    });
  }

  get docEmptyMessage(): string {
    return this.docBandeja === 'presentada'
      ? 'No hay documentacion presentada.'
      : 'No hay documentacion solicitada.';
  }

  get commEmptyMessage(): string {
    if (this.commBandeja === 'nuevas') {
      return 'No hay comunicaciones nuevas.';
    }
    return this.commBandeja === 'realizadas'
      ? 'No hay comunicaciones realizadas.'
      : 'No hay comunicaciones recibidas.';
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
        this.docBandeja = 'presentada';
        this.docResultado = registro;
        this.formMode = null;
        this.detailMode = 'documentacion';
        this.prependRegistro(registro);
        this.lockDocForm();
        this.docAdjuntos = [];
        this.submittingDoc = false;
        this.router.navigate(['/registro/documentacion'], { replaceUrl: true });
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
        this.formMode = null;
        this.detailMode = 'comunicacion';
        this.prependRegistro(registro);
        this.lockCommForm();
        this.commAdjuntos = [];
        this.submittingComm = false;
        this.router.navigate(['/registro/comunicacion'], { replaceUrl: true });
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
    this.formMode = null;
    this.detailMode = mode;
    this.secretariaService.getRegistro(ref.id).subscribe(registro => {
      this.prependRegistro(registro);
      if (mode === 'documentacion') {
        this.docResultado = registro;
        this.docForm.patchValue({
          responsable: '',
          titulo: registro.titulo,
          mensaje: registro.mensaje || ''
        }, { emitEvent: false });
        this.lockDocForm();
      } else {
        this.commResultado = registro;
        this.commForm.patchValue({
          responsable: '',
          titulo: registro.titulo,
          mensaje: registro.mensaje || ''
        }, { emitEvent: false });
        this.lockCommForm();
      }
    });
  }

  isCurrentRef(ref: RegistroSecretaria, mode: Exclude<RegistroMode, null>): boolean {
    return mode === 'documentacion' ? ref.id === this.docResultado?.id : ref.id === this.commResultado?.id;
  }

  enableDocEdit(): void {
    this.formMode = 'documentacion';
    this.detailMode = null;
    this.docResultado = null;
    this.docForm.reset();
    this.docAdjuntos = [];
    this.docLocked = false;
    this.docForm.enable({ emitEvent: false });
  }

  enableCommEdit(): void {
    this.formMode = 'comunicacion';
    this.detailMode = null;
    this.commResultado = null;
    this.commForm.reset();
    this.commAdjuntos = [];
    this.commLocked = false;
    this.commForm.enable({ emitEvent: false });
  }

  setDocBandeja(bandeja: DocumentacionBandeja): void {
    this.docBandeja = bandeja;
    this.detailMode = null;
    this.docResultado = this.docRefs[0] || null;
  }

  setCommBandeja(bandeja: ComunicacionBandeja): void {
    this.commBandeja = bandeja;
    this.detailMode = null;
    this.commResultado = this.commRefs[0] || null;
  }

  estadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      enviada: 'Enviada',
      recibido: 'Recibido',
      leido: 'Leido',
      validado: 'Validado',
      incidencia: 'Incidencia',
      rechazado: 'Rechazado',
      finalizada: 'Finalizada',
      nueva: 'Nueva',
      contestada: 'Contestada'
    };
    return labels[estado] || estado;
  }

  estadoClass(estado: string): string {
    return estado === 'leido' ? 'leido' : estado;
  }

  estadoComunicacionLabel(registro: RegistroSecretaria): string {
    return this.estadoLabel(this.estadoVisibleComunicacion(registro));
  }

  estadoComunicacionClass(registro: RegistroSecretaria): string {
    return this.estadoClass(this.estadoVisibleComunicacion(registro));
  }

  receptorRegistro(registro: RegistroSecretaria): string {
    if (registro.origen === 'asociacion') {
      return 'Administracion';
    }
    return this.asociacionNombreById(registro.asociacionId);
  }

  fechaCreacionRegistro(registro: RegistroSecretaria): string {
    return registro.fechaCreacion || registro.fechaEntrada;
  }

  fechaActualizacionRegistro(registro: RegistroSecretaria): string {
    const mensajes = registro.mensajes || [];
    return registro.fechaActualizacion || mensajes[mensajes.length - 1]?.createdAt || registro.fechaEntrada;
  }

  puedeCerrarComunicacion(registro: RegistroSecretaria): boolean {
    return registro.tipo === 'comunicacion'
      && registro.origen === this.actorActual
      && registro.estado !== 'finalizada'
      && this.permissions.hasPermission('registro:write');
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
    if (!this.commResultado || this.commResultado.estado === 'finalizada' || !this.respuestaComunicacion.trim() || !this.permissions.hasPermission('registro:write')) {
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

  cerrarComunicacion(registro: RegistroSecretaria): void {
    if (!this.puedeCerrarComunicacion(registro) || this.submittingComm) {
      return;
    }
    this.submittingComm = true;
    this.secretariaService.finalizarRegistro(registro.id).subscribe({
      next: updated => {
        this.commResultado = updated;
        this.prependRegistro(updated);
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
        this.selectInitialRegistro();
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

  private applyRouteState(): void {
    const path = this.route.snapshot.routeConfig?.path || '';
    if (path.endsWith('documentacion')) {
      this.mode = 'documentacion';
    } else if (path.endsWith('comunicacion')) {
      this.mode = 'comunicacion';
    } else {
      this.mode = null;
    }

    const bandeja = this.route.snapshot.queryParamMap.get('bandeja');
    if (bandeja === 'solicitada' || bandeja === 'presentada' || bandeja === 'nuevas') {
      this.docBandeja = bandeja;
    }
    if (bandeja === 'recibidas' || bandeja === 'realizadas' || bandeja === 'nuevas') {
      this.commBandeja = bandeja;
    }
    if (this.route.snapshot.queryParamMap.get('filtro') === 'nuevas') {
      this.docBandeja = 'nuevas';
      this.commBandeja = 'nuevas';
    }

    this.formMode = null;
    if (this.route.snapshot.queryParamMap.get('nuevo') === '1') {
      if (this.mode === 'documentacion') {
        this.enableDocEdit();
      }
      if (this.mode === 'comunicacion') {
        this.enableCommEdit();
      }
    }
  }

  private selectInitialRegistro(): void {
    if (this.isFormView || this.isDetailView) return;
    if (this.mode === 'documentacion') this.docResultado = this.docRefs[0] || null;
    if (this.mode === 'comunicacion') this.commResultado = this.commRefs[0] || null;
  }

  private esRegistroNuevo(registro: RegistroSecretaria): boolean {
    return registro.estado === 'enviada' && registro.origen !== this.actorActual;
  }

  asociacionNombre(asociacion: Asociacion): string {
    return asociacion.nombre || asociacion.name || `Asociacion ${asociacion.id}`;
  }

  private estadoVisibleComunicacion(registro: RegistroSecretaria): string {
    if (registro.estado === 'finalizada') {
      return 'finalizada';
    }

    const mensajes = registro.mensajes || [];
    const lastActor = mensajes[mensajes.length - 1]?.actor || registro.origen;
    const esPrimerEnvioEntrante = registro.estado === 'enviada'
      && registro.origen !== this.actorActual
      && mensajes.length <= 1;

    if (esPrimerEnvioEntrante) {
      return 'nueva';
    }

    return lastActor === this.actorActual ? 'enviada' : 'contestada';
  }

  private asociacionNombreById(asociacionId: number): string {
    const asociacion = this.asociaciones.find(item => Number(item.id) === Number(asociacionId));
    return asociacion ? this.asociacionNombre(asociacion) : `Asociacion ${asociacionId}`;
  }
}
