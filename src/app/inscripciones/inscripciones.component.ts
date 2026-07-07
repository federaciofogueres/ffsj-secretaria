import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminAccessService } from '../core/admin-access.service';
import { CensoService } from '../core/censo.service';
import { ActividadSecretaria, AdjuntoSecretaria, Asociacion, Asociado, FormularioInscripcion, InscripcionEntradaSecretaria, InscripcionSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

type ParticipantType = 'adulto' | 'infantil';
type AdminTab = 'documentacion' | 'gestion' | 'inscritos';
type AssociationTab = 'documentacion' | 'formulario' | 'asociados';
type AssociationMode = 'edit' | 'view' | 'summary';

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './inscripciones.component.html',
  styleUrls: ['./inscripciones.component.scss']
})
export class InscripcionesComponent implements OnInit {
  actividades: ActividadSecretaria[] = [];
  formularios: FormularioInscripcion[] = [];
  inscripciones: InscripcionSecretaria[] = [];
  selectedInscription: InscripcionSecretaria | null = null;
  entradas: InscripcionEntradaSecretaria[] = [];
  selectedEntrada: InscripcionEntradaSecretaria | null = null;
  miEntrada: InscripcionEntradaSecretaria | null = null;
  entradaAsociados: Record<number, Asociado[]> = {};
  asociados: Asociado[] = [];
  adjuntos: AdjuntoSecretaria[] = [];
  form: FormGroup = this.fb.group({});
  selectedParticipants = new Set<string>();
  loading = false;
  error = '';
  success = '';
  editingInscription = false;
  detailMode = false;
  createMode = false;
  adminTab: AdminTab = 'gestion';
  associationTab: AssociationTab = 'formulario';
  associationMode: AssociationMode = 'edit';
  participantTab: ParticipantType = 'adulto';
  participantSearch = '';
  participantSort: 'nombre-asc' | 'nombre-desc' | 'cargo-asc' = 'nombre-asc';
  participantPage = 1;
  participantPageSize = 10;
  readonly participantPageSizes = [10, 25, 50, 100];

  inscripcionAdminForm = this.fb.group({
    titulo: ['', Validators.required],
    formularioId: [''],
    actividadId: [''],
    fechaPublicacion: [new Date().toISOString().slice(0, 10), Validators.required],
    fechaLimite: ['', Validators.required],
    adultos: [true],
    infantiles: [true]
  });

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
    const routeId = this.route.snapshot.paramMap.get('id');
    this.createMode = routeId === 'nueva';
    this.detailMode = Boolean(routeId || this.route.snapshot.queryParamMap.get('inscripcionId'));
    this.cargarDatos();
  }

  get isAdminMode(): boolean {
    return this.adminAccess.isAdmin();
  }

  get availableParticipants(): Asociado[] {
    if (!this.selectedInscription) return [];
    const allowed = this.selectedInscription.tiposPermitidos;
    return this.asociados.filter(p => allowed.includes(p.tipo));
  }

  get tabParticipants(): Asociado[] {
    return this.availableParticipants.filter(p => p.tipo === this.participantTab);
  }

  get filteredParticipants(): Asociado[] {
    const search = this.normalize(this.participantSearch);
    const filtered = this.tabParticipants.filter(person => {
      if (!search) return true;
      return this.normalize(`${person.nombre} ${person.apellidos} ${person.cargo} ${person.dni || ''}`).includes(search);
    });
    return filtered.sort((a, b) => this.compareParticipants(a, b));
  }

  get pagedParticipants(): Asociado[] {
    const start = (this.participantPage - 1) * this.participantPageSize;
    return this.filteredParticipants.slice(start, start + this.participantPageSize);
  }

  get participantTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredParticipants.length / this.participantPageSize));
  }

  get participantRangeStart(): number {
    return this.filteredParticipants.length ? (this.participantPage - 1) * this.participantPageSize + 1 : 0;
  }

  get participantRangeEnd(): number {
    return Math.min(this.participantPage * this.participantPageSize, this.filteredParticipants.length);
  }

  get allTabParticipantsSelected(): boolean {
    const participants = this.filteredParticipants;
    return participants.length > 0 && participants.every(person => this.selectedParticipants.has(String(person.id)));
  }

  get requiresParticipants(): boolean {
    return Boolean(this.selectedInscription?.tiposPermitidos?.length);
  }

  get canSubmit(): boolean {
    return !this.isAdminMode &&
      this.permissions.hasPermission('inscripciones:write') &&
      this.associationMode === 'edit' &&
      this.form.valid &&
      (!this.requiresParticipants || this.selectedParticipants.size > 0);
  }

  get associationStep(): 1 | 2 | 3 | 4 | 5 {
    if (this.associationMode === 'summary') return 5;
    if (this.associationMode === 'view') return 4;
    if (this.associationTab === 'documentacion') return 1;
    if (this.associationTab === 'asociados') return 3;
    return 2;
  }

  actividadDe(inscripcion: InscripcionSecretaria): ActividadSecretaria | undefined {
    return this.actividades.find(actividad => actividad.id === inscripcion.actividadId);
  }

  selectInscription(inscription: InscripcionSecretaria): void {
    this.selectedInscription = inscription;
    this.selectedParticipants.clear();
    this.miEntrada = null;
    this.associationMode = this.isAdminMode ? 'edit' : 'edit';
    this.success = '';
    this.error = '';
    const group: Record<string, FormControl> = {};
    inscription.campos.forEach(field => {
      group[field.key] = this.fb.control('', field.required ? Validators.required : undefined);
    });
    this.form = this.fb.group(group);
    this.cargarAdjuntos(inscription.id);
    if (this.isAdminMode) {
      this.cargarEntradas(inscription.id);
    } else {
      this.cargarMiEntrada(inscription);
    }
    this.ensureAllowedParticipantTab();
    this.resetParticipantPage();

    if (this.isAdminMode) {
      this.editingInscription = true;
      this.inscripcionAdminForm.patchValue({
        titulo: inscription.titulo,
        formularioId: inscription.formularioId || '',
        actividadId: inscription.actividadId || '',
        fechaPublicacion: this.toDateInput(inscription.fechaPublicacion) || new Date().toISOString().slice(0, 10),
        fechaLimite: this.toDateInput(inscription.fechaLimite) || '',
        adultos: inscription.tiposPermitidos.includes('adulto'),
        infantiles: inscription.tiposPermitidos.includes('infantil')
      });
    }
  }

  openInscription(inscription: InscripcionSecretaria): void {
    this.router.navigate(['/inscripciones', inscription.id]);
  }

  crearNuevaInscripcion(): void {
    this.router.navigate(['/inscripciones/nueva']);
  }

  volverAlListado(): void {
    this.router.navigate(['/inscripciones']);
  }

  nuevaInscripcion(): void {
    this.selectedInscription = null;
    this.editingInscription = false;
    this.success = '';
    this.error = '';
    this.inscripcionAdminForm.reset({
      titulo: '',
      formularioId: '',
      actividadId: '',
      fechaPublicacion: new Date().toISOString().slice(0, 10),
      fechaLimite: '',
      adultos: true,
      infantiles: true
    });
  }

  crearInscripcion(): void {
    if (this.inscripcionAdminForm.invalid) {
      this.inscripcionAdminForm.markAllAsTouched();
      return;
    }
    const tiposPermitidos = [
      this.inscripcionAdminForm.value.adultos ? 'adulto' : null,
      this.inscripcionAdminForm.value.infantiles ? 'infantil' : null
    ].filter((tipo): tipo is ParticipantType => Boolean(tipo));
    if (!tiposPermitidos.length) {
      this.error = 'Selecciona al menos un tipo de participante.';
      return;
    }
    this.loading = true;
    const payload = this.editingInscription && this.selectedInscription ? this.buildAdminPayload(this.selectedInscription.estado || 'abierta') : {
      titulo: this.inscripcionAdminForm.value.titulo,
      formularioId: this.inscripcionAdminForm.value.formularioId || null,
      actividadId: this.inscripcionAdminForm.value.actividadId || null,
      estado: 'abierta',
      fechaPublicacion: this.inscripcionAdminForm.value.fechaPublicacion,
      fechaLimite: this.inscripcionAdminForm.value.fechaLimite,
      tiposPermitidos
    };
    const request = this.editingInscription && this.selectedInscription
      ? this.secretariaService.actualizarInscripcion(this.selectedInscription.id, payload)
      : this.secretariaService.crearInscripcion(payload);

    request.subscribe({
      next: inscripcion => {
        this.inscripciones = [inscripcion, ...this.inscripciones.filter(item => item.id !== inscripcion.id)];
        this.selectInscription(inscripcion);
        this.router.navigate(['/inscripciones', inscripcion.id]);
        this.success = this.editingInscription ? 'Inscripcion actualizada correctamente.' : 'Inscripcion creada correctamente.';
        this.loading = false;
      },
      error: () => {
        this.error = this.editingInscription ? 'No se ha podido actualizar la inscripcion.' : 'No se ha podido crear la inscripcion.';
        this.loading = false;
      }
    });
  }

  cambiarEstadoInscripcion(estado: 'abierta' | 'cerrada' | 'archivada'): void {
    if (!this.selectedInscription || !this.isAdminMode) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.actualizarInscripcion(this.selectedInscription.id, this.buildAdminPayload(estado)).subscribe({
      next: inscripcion => {
        if (estado === 'archivada') {
          this.inscripciones = this.inscripciones.filter(item => item.id !== inscripcion.id);
          this.selectedInscription = null;
          this.router.navigate(['/inscripciones']);
        } else {
          this.inscripciones = [inscripcion, ...this.inscripciones.filter(item => item.id !== inscripcion.id)];
          this.selectInscription(inscripcion);
        }
        this.success = estado === 'abierta' ? 'Inscripcion activada correctamente.' : estado === 'cerrada' ? 'Inscripcion desactivada correctamente.' : 'Inscripcion archivada correctamente.';
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido cambiar el estado de la inscripcion.';
        this.loading = false;
      }
    });
  }

  borrarInscripcion(): void {
    if (!this.selectedInscription || !this.isAdminMode) {
      return;
    }
    if (!window.confirm('Esta accion borrara definitivamente la inscripcion. No se puede deshacer.')) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.borrarInscripcion(this.selectedInscription.id).subscribe({
      next: () => {
        const deletedId = this.selectedInscription?.id;
        this.inscripciones = this.inscripciones.filter(item => item.id !== deletedId);
        this.selectedInscription = null;
        this.nuevaInscripcion();
        this.router.navigate(['/inscripciones']);
        this.success = 'Inscripcion borrada correctamente.';
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido borrar la inscripcion. Comprueba que no tenga entradas presentadas.';
        this.loading = false;
      }
    });
  }

  toggleParticipant(participant: Asociado): void {
    const id = String(participant.id);
    this.selectedParticipants.has(id)
      ? this.selectedParticipants.delete(id)
      : this.selectedParticipants.add(id);
  }

  isParticipantSelected(participant: Asociado): boolean {
    return this.selectedParticipants.has(String(participant.id));
  }

  asociadosForField(field: { type: string }): Asociado[] {
    if (field.type === 'asociado_adulto') {
      return this.asociados.filter(person => person.tipo === 'adulto').sort((a, b) => this.fullName(a).localeCompare(this.fullName(b)));
    }
    if (field.type === 'asociado_infantil') {
      return this.asociados.filter(person => person.tipo === 'infantil').sort((a, b) => this.fullName(a).localeCompare(this.fullName(b)));
    }
    return [...this.asociados].sort((a, b) => this.fullName(a).localeCompare(this.fullName(b)));
  }

  asociadoLabel(person: Asociado): string {
    return `${person.nombre} ${person.apellidos}${person.cargo ? ` - ${person.cargo}` : ''}`;
  }

  setParticipantTab(tab: ParticipantType): void {
    this.participantTab = tab;
    this.resetParticipantPage();
  }

  onParticipantSearchChange(): void {
    this.resetParticipantPage();
  }

  onParticipantSortChange(): void {
    this.resetParticipantPage();
  }

  onParticipantPageSizeChange(): void {
    this.participantPage = 1;
  }

  previousParticipantPage(): void {
    this.participantPage = Math.max(1, this.participantPage - 1);
  }

  nextParticipantPage(): void {
    this.participantPage = Math.min(this.participantTotalPages, this.participantPage + 1);
  }

  toggleAllTabParticipants(): void {
    const participants = this.filteredParticipants;
    if (this.allTabParticipantsSelected) {
      participants.forEach(person => this.selectedParticipants.delete(String(person.id)));
      return;
    }
    participants.forEach(person => this.selectedParticipants.add(String(person.id)));
  }

  documentUrl(adjunto: AdjuntoSecretaria): string {
    return this.secretariaService.adjuntoDownloadUrl(adjunto.id);
  }

  setAdminTab(tab: AdminTab): void {
    this.adminTab = tab;
  }

  setAssociationTab(tab: AssociationTab): void {
    this.associationTab = tab;
  }

  goAssociationStep(step: 1 | 2 | 3 | 4 | 5): void {
    if (step === 1) {
      this.associationTab = 'documentacion';
      return;
    }

    if (step === 2) {
      this.associationTab = 'formulario';
      if (this.associationMode === 'view' && this.miEntrada) {
        return;
      }
      this.associationMode = 'edit';
      return;
    }

    if (step === 3) {
      this.associationTab = 'asociados';
      return;
    }

    if (step === 4) {
      this.associationTab = 'formulario';
      if (this.miEntrada) {
        this.associationMode = 'view';
      }
      return;
    }

    this.associationTab = 'formulario';
  }

  verEntrada(entrada: InscripcionEntradaSecretaria): void {
    this.selectedEntrada = entrada;
  }

  imprimirEntrada(entrada: InscripcionEntradaSecretaria): void {
    this.hidratarEntradasParaExport([entrada], entradas => {
      this.printHtml(`Inscripcion ${entrada.numero}`, this.renderEntradasHtml(entradas));
    });
  }

  imprimirTodas(inscripcion: InscripcionSecretaria): void {
    this.withEntradas(inscripcion, entradas => {
      this.printHtml(`Inscripciones ${inscripcion.titulo}`, this.renderEntradasHtml(entradas, inscripcion));
    });
  }

  descargarEntrada(entrada: InscripcionEntradaSecretaria, format: 'csv' | 'pdf'): void {
    if (format === 'pdf') {
      this.imprimirEntrada(entrada);
      return;
    }
    this.hidratarEntradasParaExport([entrada], entradas => {
      this.downloadCsv(entradas, `inscripcion-${entrada.numero}.csv`);
    });
  }

  descargarTodas(inscripcion: InscripcionSecretaria, format: 'csv' | 'pdf'): void {
    if (format === 'pdf') {
      this.imprimirTodas(inscripcion);
      return;
    }
    this.withEntradas(inscripcion, entradas => {
      this.downloadCsv(entradas, `inscripciones-${this.safeFileName(inscripcion.titulo)}.csv`, inscripcion);
    });
  }

  entradaDatoLabel(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      const item = value as Record<string, unknown>;
      return String(item['nombre'] || JSON.stringify(value));
    }
    return String(value);
  }

  entradaCampoLabel(entrada: InscripcionEntradaSecretaria, field: { key: string; type: string }): string {
    const value = entrada.datos?.[field.key];
    if (field.type === 'asociado' || field.type === 'asociado_adulto' || field.type === 'asociado_infantil') {
      return this.idsToAsociadoLabels(entrada, value);
    }
    if (field.type === 'responsable' && typeof value === 'string') {
      return this.idsToAsociadoLabels(entrada, value);
    }
    return this.entradaDatoLabel(value);
  }

  entradaParticipantesLabel(entrada: InscripcionEntradaSecretaria): string {
    return this.idsToAsociadoLabels(entrada, entrada.participantes || []);
  }

  submit(): void {
    if (!this.selectedInscription) return;
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.secretariaService.enviarInscripcion({
      asociacionId: this.censoService.asociacionId,
      formularioId: this.selectedInscription.id,
      datos: this.buildDatosFormulario(),
      participantes: [...this.selectedParticipants]
    }).subscribe({
      next: entry => {
        this.miEntrada = entry as InscripcionEntradaSecretaria;
        this.associationMode = 'summary';
        this.success = 'Inscripcion enviada correctamente.';
      },
      error: () => {
        this.error = 'No se ha podido enviar la inscripcion.';
      }
    });
  }

  modificarMiInscripcion(): void {
    if (!this.selectedInscription || !this.isWithinDeadline(this.selectedInscription)) {
      this.error = 'El plazo de inscripcion esta cerrado.';
      return;
    }
    this.associationMode = 'edit';
    this.success = '';
    this.error = '';
  }

  cerrarResumen(): void {
    this.router.navigate(['/inscripciones']);
  }

  private cargarDatos(): void {
    this.loading = true;
    this.secretariaService.getActividades(this.isAdminMode).subscribe({
      next: actividadesResponse => {
        this.actividades = actividadesResponse.actividades;
        this.cargarFormulariosEInscripciones();
      },
      error: () => {
        this.error = 'No se han podido cargar las actividades.';
        this.loading = false;
      }
    });
  }

  private cargarFormulariosEInscripciones(): void {
    const cargarInscripciones = () => {
      this.secretariaService.getInscripciones(this.censoService.asociacionId, this.isAdminMode).subscribe({
        next: inscripcionesResponse => {
          this.inscripciones = inscripcionesResponse.inscripciones;
          this.seleccionarInicial();
          this.cargarAsociados();
        },
        error: () => {
          this.error = 'No se han podido cargar las inscripciones.';
          this.loading = false;
        }
      });
    };

    if (!this.isAdminMode) {
      cargarInscripciones();
      return;
    }

    this.secretariaService.getFormularios(true).subscribe({
      next: response => {
        this.formularios = response.formularios;
        cargarInscripciones();
      },
      error: () => {
        this.error = 'No se han podido cargar los formularios.';
        this.loading = false;
      }
    });
  }

  private seleccionarInicial(): void {
    const requestedId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('inscripcionId');
    this.createMode = requestedId === 'nueva';
    this.detailMode = Boolean(requestedId);
    if (this.createMode) {
      this.nuevaInscripcion();
      return;
    }
    const selected = requestedId
      ? this.inscripciones.find(item => item.id === requestedId)
      : null;
    if (selected) {
      this.selectInscription(selected);
      return;
    }
    if (requestedId) {
      this.error = 'No se ha encontrado la inscripcion solicitada.';
      return;
    }
    if (this.isAdminMode && this.inscripciones[0]) {
      this.selectedInscription = null;
    }
  }

  private cargarAsociados(): void {
    if (this.isAdminMode) {
      this.loading = false;
      return;
    }
    this.censoService.getAsociadosByAsociacion(this.censoService.asociacionId).subscribe({
      next: asociados => {
        this.asociados = asociados;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se han podido cargar los asociados.';
        this.loading = false;
      }
    });
  }

  private cargarAdjuntos(inscripcionId: string): void {
    this.adjuntos = [];
    this.secretariaService.getAdjuntos('inscripcion', inscripcionId).subscribe({
      next: response => {
        this.adjuntos = response.adjuntos;
      },
      error: () => {
        this.adjuntos = [];
      }
    });
  }

  private cargarMiEntrada(inscription: InscripcionSecretaria): void {
    this.secretariaService.getMiEntradaInscripcion(inscription.id).subscribe({
      next: entrada => {
        this.miEntrada = entrada;
        this.patchEntradaForm(entrada);
        this.associationMode = 'view';
      },
      error: error => {
        if (error?.status !== 404) {
          this.error = 'No se ha podido comprobar si ya estabas inscrito.';
        }
        this.associationMode = 'edit';
      }
    });
  }

  private patchEntradaForm(entrada: InscripcionEntradaSecretaria): void {
    const values: Record<string, unknown> = {};
    (this.selectedInscription?.campos || []).forEach(field => {
      const value = entrada.datos?.[field.key];
      if (field.type === 'responsable' && value && typeof value === 'object') {
        values[field.key] = String((value as Record<string, unknown>)['id'] || '');
      } else {
        values[field.key] = value;
      }
    });
    this.form.patchValue(values);
    this.selectedParticipants = new Set((entrada.participantes || []).map(id => String(id)));
  }

  private cargarEntradas(inscripcionId: string): void {
    this.entradas = [];
    this.selectedEntrada = null;
    this.entradaAsociados = {};
    this.secretariaService.getInscripcionEntradas(inscripcionId).subscribe({
      next: response => {
        this.entradas = response.entradas;
        this.hidratarEntradas();
      },
      error: () => {
        this.entradas = [];
      }
    });
  }

  private withEntradas(inscripcion: InscripcionSecretaria, action: (entradas: InscripcionEntradaSecretaria[]) => void): void {
    if (this.selectedInscription?.id === inscripcion.id) {
      this.hidratarEntradasParaExport(this.entradas, action);
      return;
    }
    this.secretariaService.getInscripcionEntradas(inscripcion.id).subscribe({
      next: response => this.hidratarEntradasParaExport(response.entradas, action),
      error: () => {
        this.error = 'No se han podido cargar las entradas de la inscripcion.';
      }
    });
  }

  private hidratarEntradasParaExport(
    entries: InscripcionEntradaSecretaria[],
    action: (entradas: InscripcionEntradaSecretaria[]) => void
  ): void {
    const asociaciones = [...new Set(entries.map(entrada => entrada.asociacionId).filter(Boolean))];
    if (!asociaciones.length) {
      action(entries);
      return;
    }

    let pending = asociaciones.length * 2;
    let hydratedEntries = [...entries];
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        action(hydratedEntries);
      }
    };

    asociaciones.forEach(asociacionId => {
      this.censoService.getAsociadosByAsociacion(asociacionId).subscribe({
        next: asociados => {
          this.entradaAsociados = { ...this.entradaAsociados, [asociacionId]: asociados };
          done();
        },
        error: () => {
          this.entradaAsociados = { ...this.entradaAsociados, [asociacionId]: [] };
          done();
        }
      });

      this.censoService.getAsociacion(asociacionId).subscribe({
        next: asociacion => {
          const nombre = asociacion.nombre || asociacion.name || `Asociacion ${asociacionId}`;
          hydratedEntries = hydratedEntries.map(entrada =>
            entrada.asociacionId === asociacionId ? { ...entrada, asociacionNombre: nombre } : entrada
          );
          done();
        },
        error: () => {
          hydratedEntries = hydratedEntries.map(entrada =>
            entrada.asociacionId === asociacionId ? { ...entrada, asociacionNombre: `Asociacion ${asociacionId}` } : entrada
          );
          done();
        }
      });
    });
  }

  private hidratarEntradas(): void {
    const pendientes = [...new Set(this.entradas.map(entrada => entrada.asociacionId).filter(Boolean))];
    pendientes.forEach(asociacionId => {
      this.censoService.getAsociacion(asociacionId).subscribe({
        next: (asociacion: Asociacion) => {
          const nombre = asociacion.nombre || asociacion.name || `Asociacion ${asociacionId}`;
          this.entradas = this.entradas.map(entrada =>
            entrada.asociacionId === asociacionId ? { ...entrada, asociacionNombre: nombre } : entrada
          );
          if (this.selectedEntrada?.asociacionId === asociacionId) {
            this.selectedEntrada = { ...this.selectedEntrada, asociacionNombre: nombre };
          }
        },
        error: () => {
          this.entradas = this.entradas.map(entrada =>
            entrada.asociacionId === asociacionId ? { ...entrada, asociacionNombre: `Asociacion ${asociacionId}` } : entrada
          );
        }
      });
      this.censoService.getAsociadosByAsociacion(asociacionId).subscribe({
        next: asociados => {
          this.entradaAsociados = {
            ...this.entradaAsociados,
            [asociacionId]: asociados
          };
        },
        error: () => {
          this.entradaAsociados = {
            ...this.entradaAsociados,
            [asociacionId]: []
          };
        }
      });
    });
  }

  private buildDatosFormulario(): Record<string, unknown> {
    const datos: Record<string, unknown> = { ...this.form.value };
    (this.selectedInscription?.campos || []).forEach(field => {
      if (field.type !== 'responsable') {
        return;
      }
      const asociado = this.asociados.find(person => String(person.id) === String(this.form.value[field.key]));
      if (asociado) {
        datos[field.key] = {
          id: asociado.id,
          nombre: `${asociado.nombre} ${asociado.apellidos}`.trim(),
          telefono: asociado.telefono || '',
          email: asociado.email || '',
          cargo: asociado.cargo || ''
        };
      }
    });
    return datos;
  }

  isWithinDeadline(inscription: InscripcionSecretaria): boolean {
    if (!inscription.fechaLimite) {
      return true;
    }
    return new Date(String(inscription.fechaLimite).slice(0, 10)) >= new Date(new Date().toISOString().slice(0, 10));
  }

  private buildAdminPayload(estado = this.selectedInscription?.estado || 'abierta'): unknown {
    const formularioSeleccionado = this.formularios.find(item => item.id === this.inscripcionAdminForm.value.formularioId);
    return {
      titulo: this.inscripcionAdminForm.value.titulo,
      formularioId: this.inscripcionAdminForm.value.formularioId || null,
      actividadId: this.inscripcionAdminForm.value.actividadId || null,
      estado,
      fechaPublicacion: this.inscripcionAdminForm.value.fechaPublicacion,
      fechaLimite: this.inscripcionAdminForm.value.fechaLimite,
      tiposPermitidos: [
        this.inscripcionAdminForm.value.adultos ? 'adulto' : null,
        this.inscripcionAdminForm.value.infantiles ? 'infantil' : null
      ].filter(Boolean),
      campos: formularioSeleccionado?.campos || this.selectedInscription?.campos || undefined
    };
  }

  private downloadCsv(entries: InscripcionEntradaSecretaria[], fileName: string, inscripcion = this.selectedInscription): void {
    const fields = inscripcion?.campos || [];
    const headers = ['Numero', 'Asociacion', 'Estado', 'Fecha entrada', 'Participantes', ...fields.map(field => field.label)];
    const rows = entries.map(entrada => [
      entrada.numero,
      entrada.asociacionNombre || `Asociacion ${entrada.asociacionId}`,
      entrada.estado,
      entrada.fechaEntrada,
      this.entradaParticipantesLabel(entrada),
      ...fields.map(field => this.entradaCampoLabel(entrada, field))
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    this.downloadBlob(csv, fileName, 'text/csv;charset=utf-8');
  }

  private downloadBlob(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([`\ufeff${content}`], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private printHtml(title: string, body: string): void {
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      this.error = 'No se ha podido abrir la ventana de impresion.';
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>${this.escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { color: #c4141c; font-size: 22px; }
            h2 { font-size: 18px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f4f6f8; }
          </style>
        </head>
        <body>${body}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  private renderEntradasHtml(entries: InscripcionEntradaSecretaria[], inscripcion = this.selectedInscription): string {
    const fields = inscripcion?.campos || [];
    const title = inscripcion?.titulo || 'Inscripcion';
    return `
      <h1>${this.escapeHtml(title)}</h1>
      ${entries.map(entrada => `
        <h2>${this.escapeHtml(entrada.numero)} - ${this.escapeHtml(entrada.asociacionNombre || `Asociacion ${entrada.asociacionId}`)}</h2>
        <table>
          <tr><th>Estado</th><td>${this.escapeHtml(entrada.estado)}</td></tr>
          <tr><th>Fecha entrada</th><td>${this.escapeHtml(String(entrada.fechaEntrada || '-'))}</td></tr>
          <tr><th>Participantes</th><td>${this.escapeHtml(this.entradaParticipantesLabel(entrada))}</td></tr>
          ${fields.map(field => `
            <tr><th>${this.escapeHtml(field.label)}</th><td>${this.escapeHtml(this.entradaCampoLabel(entrada, field))}</td></tr>
          `).join('')}
        </table>
      `).join('')}
    `;
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private safeFileName(value: string): string {
    return this.normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'inscripciones';
  }

  private idsToAsociadoLabels(entrada: InscripcionEntradaSecretaria, value: unknown): string {
    const values = Array.isArray(value) ? value : [value];
    const ids = values
      .flatMap(item => String(item ?? '').split(','))
      .map(item => item.trim())
      .filter(Boolean);
    if (!ids.length) {
      return '-';
    }
    const asociados = this.entradaAsociados[entrada.asociacionId]?.length
      ? this.entradaAsociados[entrada.asociacionId]
      : this.asociados;
    return ids.map(id => {
      const asociado = asociados.find(person => String(person.id) === String(id));
      return asociado ? `${asociado.nombre} ${asociado.apellidos}`.trim() : `ID ${id}`;
    }).join(', ');
  }

  private ensureAllowedParticipantTab(): void {
    if (!this.selectedInscription?.tiposPermitidos.includes(this.participantTab)) {
      this.participantTab = this.selectedInscription?.tiposPermitidos.includes('adulto') ? 'adulto' : 'infantil';
    }
  }

  private resetParticipantPage(): void {
    this.participantPage = 1;
  }

  private compareParticipants(a: Asociado, b: Asociado): number {
    if (this.participantSort === 'cargo-asc') {
      return this.normalize(a.cargo).localeCompare(this.normalize(b.cargo)) ||
        this.fullName(a).localeCompare(this.fullName(b));
    }
    const result = this.fullName(a).localeCompare(this.fullName(b));
    return this.participantSort === 'nombre-desc' ? -result : result;
  }

  private fullName(person: Asociado): string {
    return this.normalize(`${person.nombre} ${person.apellidos}`);
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }
}
