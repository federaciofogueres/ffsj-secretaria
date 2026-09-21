import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subscription, switchMap } from 'rxjs';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { FfsjSpinnerComponent } from 'ffsj-web-components';

import { AdminAccessService } from '../core/admin-access.service';
import { ApiUrlService } from '../core/api-url.service';
import { CensoService } from '../core/censo.service';
import { ActividadSecretaria, AdjuntoSecretaria, Asociacion, Asociado, CampoInscripcion, FormularioInscripcion, InscripcionEntradaSecretaria, InscripcionSecretaria, PaginacionSecretaria, ResponsableInscripcion } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { EjercicioService } from '../core/ejercicio.service';
import { IncidenciasPanelComponent } from '../shared/incidencias-panel.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { EstadoBadgeComponent } from '../shared/estado-badge.component';
import { MarkdownEditorComponent } from '../shared/markdown-editor.component';
import { MarkdownPipe } from '../shared/markdown.pipe';
import { FormulariosComponent } from '../formularios/formularios.component';
import { InscripcionDraftState, InscripcionDraftStateService } from './inscripcion-draft-state.service';
import { buildFormDiagnostics, FormDiagnosticFieldMeta } from '../rubi/form-diagnostics.util';
import { RubiFormDiagnosticIssue, RubiFormDiagnostics } from '../rubi/rubi-api.service';
import { RubiScreenContextService } from '../rubi/rubi-screen-context.service';

// G (form-diagnostics): unicos codigos de backend "de formulario" para el
// envio de una inscripcion (el resto de errores de submitInscripcion, p.ej.
// permisos o datos malformados, no aportan nada corregible en el propio
// formulario dinamico).
const SERVER_DIAGNOSTIC_CODES = new Set([
  'INSCRIPCION_CERRADA', 'INSCRIPCION_PLAZO_CERRADO', 'INSCRIPCION_EJERCICIO_NO_ACTIVO',
  'ACTIVIDAD_NO_DISPONIBLE', 'INSCRIPCION_ENTRADA_BLOQUEADA'
]);

type ParticipantType = 'adulto' | 'infantil';
type AdminTab = 'documentacion' | 'gestion' | 'inscritos';
type AssociationTab = 'documentacion' | 'formulario' | 'asociados';
type AssociationMode = 'edit' | 'view' | 'summary';

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IncidenciasPanelComponent, ConfirmDialogComponent, EstadoBadgeComponent, FormulariosComponent, FfsjSpinnerComponent, MarkdownEditorComponent, MarkdownPipe],
  templateUrl: './inscripciones.component.html',
  styleUrls: ['./inscripciones.component.scss']
})
export class InscripcionesComponent implements OnInit, OnDestroy {
  actividades: ActividadSecretaria[] = [];
  formularios: FormularioInscripcion[] = [];
  inscripciones: InscripcionSecretaria[] = [];
  filtroDisponibilidad = ''; filtroEstado = ''; busquedaInscripciones = ''; ordenInscripciones = 'plazo_asc'; paginaInscripciones = 1;
  paginacionInscripciones: PaginacionSecretaria = { page: 1, pageSize: 20, total: 0, totalPages: 1 };
  selectedInscription: InscripcionSecretaria | null = null;
  entradas: InscripcionEntradaSecretaria[] = [];
  selectedEntrada: InscripcionEntradaSecretaria | null = null;
  miEntrada: InscripcionEntradaSecretaria | null = null;
  entradaAsociados: Record<number, Asociado[]> = {};
  asociados: Asociado[] = [];
  adjuntos: AdjuntoSecretaria[] = [];
  adjuntosEntrada: AdjuntoSecretaria[] = [];
  adjuntosInscripcionSeleccionados: File[] = [];
  responsablesInscripcion: ResponsableInscripcion[] = [];
  form: FormGroup = this.fb.group({});
  selectedParticipants = new Set<string>();
  asociadoSearchTerms: Record<string, string> = {};
  submitted = false;
  private asociadosCargados = false;
  private lastServerIssue: RubiFormDiagnosticIssue | null = null;
  private formDiagnosticsSub?: Subscription;
  loading = false;
  error = '';
  success = '';
  editingInscription = false;
  detailMode = false;
  createMode = false;
  confirmDelete = false;
  confirmDeleteEntry = false;
  showFormularioDialog = false;
  showExportDialog = false;
  exportFormat: 'xlsx' | 'pdf' = 'xlsx';
  exportInscription: InscripcionSecretaria | null = null;
  exportColumnKeys = new Set<string>();
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
    propietarioId: ['', Validators.required],
    informacion: [''],
    adultos: [false],
    infantiles: [false]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly secretariaService: SecretariaService,
    private readonly censoService: CensoService,
    private readonly apiUrl: ApiUrlService,
    private readonly adminAccess: AdminAccessService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly permissions: PermissionsService,
    readonly ejercicioService: EjercicioService,
    private readonly draftState: InscripcionDraftStateService,
    private readonly rubiScreenContext: RubiScreenContextService
  ) {}

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    const query = this.route.snapshot.queryParamMap;
    this.filtroDisponibilidad = query.get('disponibilidad') || '';
    this.filtroEstado = query.get('estado') || '';
    this.busquedaInscripciones = query.get('busqueda') || '';
    this.ordenInscripciones = query.get('orden') || 'plazo_asc';
    this.paginaInscripciones = Math.max(1, Number(query.get('pagina')) || 1);
    this.createMode = this.isCreateRoute();
    this.detailMode = this.createMode || Boolean(routeId || this.route.snapshot.queryParamMap.get('inscripcionId'));
    this.cargarDatos();
    // A (post-auditoria 1.8.1#RUBI): distingue listado de detalle, y expone el
    // id de la inscripcion seleccionada (ya validado como allowlist de
    // caracteres seguros por el backend) sin ningun dato del formulario.
    this.syncRubiScreenContext();
  }

  ngOnDestroy(): void {
    this.formDiagnosticsSub?.unsubscribe();
    this.rubiScreenContext.clear('inscripciones');
  }

  // G (form-diagnostics): unico punto que publica el contexto de Rubi para
  // este modulo; recalcula el diagnostico del formulario activo (si lo hay) a
  // partir de las validaciones que Angular ya ha ejecutado, nunca de
  // `form.value`. Se invoca en cada cambio relevante (formulario, ejercicio,
  // participantes, envio) para que Rubi nunca vea un estado obsoleto.
  private syncRubiScreenContext(): void {
    const routeId = this.selectedInscription?.id || this.route.snapshot.paramMap.get('id');
    const diagnostics = this.currentFormDiagnostics();
    this.rubiScreenContext.set({
      version: 1, module: 'inscripciones', view: this.detailMode ? 'detalle' : 'listado',
      ...((routeId || diagnostics) ? {
        state: {
          ...(routeId ? { selectedInscriptionId: routeId } : {}),
          ...(diagnostics ? { formDiagnostics: diagnostics } : {})
        }
      } : {})
    });
  }

  private currentFormDiagnostics(): RubiFormDiagnostics | undefined {
    if (!this.detailMode || !this.selectedInscription || this.associationMode !== 'edit') return undefined;
    const fieldMeta: Record<string, FormDiagnosticFieldMeta> = {};
    (this.selectedInscription.campos || []).forEach(field => {
      fieldMeta[field.key] = { label: field.label, max: field.maxSelections };
    });
    const extraIssues: RubiFormDiagnosticIssue[] = [];
    if (this.requiresParticipants && !this.selectedParticipants.size) {
      extraIssues.push({ field: 'participantes', label: 'Participantes', code: 'minItems', source: 'client', required: 1, current: 0 });
    }
    if (!this.isInscripcionDisponible(this.selectedInscription)) {
      extraIssues.push({ code: 'INSCRIPCION_PLAZO_CERRADO', source: 'client' });
    }
    if (this.lastServerIssue) extraIssues.push(this.lastServerIssue);
    return buildFormDiagnostics(this.form, { submitted: this.submitted, fieldMeta, extraIssues });
  }

  private watchFormDiagnostics(): void {
    this.formDiagnosticsSub?.unsubscribe();
    this.formDiagnosticsSub = this.form.valueChanges.subscribe(() => this.syncRubiScreenContext());
    this.syncRubiScreenContext();
  }

  private diagnosticIssueFor(error: unknown): RubiFormDiagnosticIssue | null {
    const code = String((error as { error?: { details?: { code?: string } } })?.error?.details?.code || '');
    return SERVER_DIAGNOSTIC_CODES.has(code) ? { code, source: 'server' } : null;
  }

  get isAdminMode(): boolean {
    return this.adminAccess.isAdmin();
  }

  get accionesAsociacionBloqueadasPorEjercicio(): boolean {
    return !this.isAdminMode && !this.ejercicioService.isSelectedActive;
  }

  get mensajeEjercicioNoActivo(): string {
    const selected = this.ejercicioService.selectedSnapshot;
    return selected
      ? `Estas consultando el ejercicio ${selected.ejercicio}. Para presentar o modificar inscripciones debes seleccionar el ejercicio activo.`
      : 'Para presentar o modificar inscripciones debes seleccionar el ejercicio activo.';
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
    return this.canAttemptSubmit &&
      this.form.valid;
  }

  get canAttemptSubmit(): boolean {
    return !this.isAdminMode &&
      this.permissions.hasPermission('inscripciones:write') &&
      this.associationMode === 'edit' &&
      Boolean(this.selectedInscription && this.isInscripcionDisponible(this.selectedInscription)) &&
      (!this.requiresParticipants || this.selectedParticipants.size > 0);
  }

  disponibilidadLabel(inscripcion: InscripcionSecretaria): string { return this.isInscripcionDisponible(inscripcion) ? 'Activa' : 'Plazo cerrado'; }
  motivoNoDisponible(inscripcion: InscripcionSecretaria): string { return this.mensajeDisponibilidadInscripcion(inscripcion) || (inscripcion.inscrito ? 'Tu asociación ya está inscrita.' : 'La inscripción no admite nuevas participaciones.'); }
  cargarPaginaInscripciones(reset = false): void { if (reset) this.paginaInscripciones = 1; this.cargarFormulariosEInscripciones(); }
  cambiarPaginaInscripciones(delta: number): void { const page = this.paginaInscripciones + delta; if (page >= 1 && page <= this.paginacionInscripciones.totalPages) { this.paginaInscripciones = page; this.cargarFormulariosEInscripciones(); } }

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
    this.guardarBorradorActual();
    this.selectedInscription = inscription;
    this.selectedParticipants.clear();
    this.miEntrada = null;
    this.adjuntosEntrada = [];
    this.associationMode = this.isAdminMode ? 'edit' : 'edit';
    this.success = '';
    this.error = '';
    this.submitted = false;
    this.lastServerIssue = null;
    const draft = this.draftState.getOrCreate(inscription.id, () => this.createDraft(inscription));
    this.form = draft.form;
    this.selectedParticipants = draft.participantes;
    this.asociadoSearchTerms = draft.busquedasAsociados;
    this.watchFormDiagnostics();
    this.cargarAdjuntos(inscription.id);
    if (this.isAdminMode) {
      this.cargarEntradas(inscription.id);
    } else if (this.asociadosCargados) {
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
        propietarioId: inscription.propietarioId ? String(inscription.propietarioId) : '',
        informacion: inscription.informacion || '',
        adultos: inscription.tiposPermitidos.includes('adulto'),
        infantiles: inscription.tiposPermitidos.includes('infantil')
      });
    }
  }

  isRequiredField(field: CampoInscripcion): boolean {
    return Boolean(field.required);
  }

  fieldControl(field: CampoInscripcion): FormControl {
    const control = this.form.get(field.key);
    if (!(control instanceof FormControl)) {
      throw new Error(`No existe el control del campo de inscripcion ${field.key}`);
    }
    return control;
  }

  fieldInputId(field: CampoInscripcion): string {
    return `inscripcion-campo-${String(field.key).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  fieldErrorId(field: CampoInscripcion): string {
    return `${this.fieldInputId(field)}-error`;
  }

  isFieldInvalid(field: CampoInscripcion): boolean {
    const control = this.form.get(field.key);
    return Boolean(control?.touched && control.invalid);
  }

  isMultipleChoice(field: CampoInscripcion): boolean {
    return field.type === 'select' && field.selectionMode === 'multiple';
  }

  isMultipleAsociado(field: CampoInscripcion): boolean {
    return this.isAsociadoField(field) && field.selectionMode === 'multiple';
  }

  selectedAsociadosForField(field: CampoInscripcion): Asociado[] {
    const value = this.form.get(field.key)?.value;
    const ids = Array.isArray(value) ? value.map(item => String(item)) : [];
    return ids
      .map(id => this.asociadosForField(field).find(person => String(person.id) === id))
      .filter((person): person is Asociado => Boolean(person));
  }

  addAsociadoToField(field: CampoInscripcion): void {
    const search = String(this.asociadoSearchTerms[field.key] || '').trim();
    const asociado = this.asociadosForField(field).find(person =>
      String(person.id) === search || this.asociadoLabel(person) === search
    );
    if (!asociado) {
      this.error = 'Selecciona un asociado de la lista antes de añadirlo.';
      return;
    }
    const control = this.form.get(field.key);
    const selected = Array.isArray(control?.value) ? control.value.map((id: unknown) => String(id)) : [];
    const id = String(asociado.id);
    if (!selected.includes(id)) control?.setValue([...selected, id]);
    control?.markAsTouched();
    control?.markAsDirty();
    this.asociadoSearchTerms[field.key] = '';
    this.error = '';
  }

  removeAsociadoFromField(field: CampoInscripcion, asociadoId: string | number): void {
    const control = this.form.get(field.key);
    const selected = Array.isArray(control?.value) ? control.value.map((id: unknown) => String(id)) : [];
    control?.setValue(selected.filter(id => id !== String(asociadoId)));
    control?.markAsTouched();
    control?.markAsDirty();
  }

  syncAsociadoField(field: CampoInscripcion, value: string): void {
    const control = this.form.get(field.key);
    if (!control) return;
    control.setValue(value);
    control.markAsDirty();
    control.updateValueAndValidity();
    this.error = '';
  }

  inputType(field: CampoInscripcion): string {
    return field.type === 'datetime' ? 'datetime-local' : field.type;
  }

  fieldErrorMessage(field: CampoInscripcion): string {
    const errors = this.form.get(field.key)?.errors;
    if (errors?.['maxSelections']) return `Selecciona como máximo ${field.maxSelections || 1} opciones.`;
    if (errors?.['asociadoInvalido']) return 'Selecciona un asociado de la lista.';
    return 'Este campo es obligatorio.';
  }

  invalidFieldLabels(): string[] {
    return (this.selectedInscription?.campos || [])
      .filter(field => this.form.get(field.key)?.invalid)
      .map(field => field.label);
  }

  openInscription(inscription: InscripcionSecretaria): void {
    this.router.navigate(['/inscripciones', inscription.id], { queryParams: this.contextoListadoInscripciones() });
  }

  crearNuevaInscripcion(): void {
    // El botón sólo se muestra a administración autorizada. El formulario se
    // activa localmente antes de navegar, de forma que un guard asíncrono o
    // una navegación cancelada no pueda dejar la acción sin respuesta.
    this.createMode = true;
    this.detailMode = true;
    this.nuevaInscripcion();
    this.router.navigate(['/inscripciones/nueva']).catch(() => undefined);
  }

  volverAlListado(): void {
    this.borrarBorrador(this.selectedInscription?.id);
    this.router.navigate(['/inscripciones'], { queryParams: this.contextoListadoInscripciones() });
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
      propietarioId: '',
      informacion: '',
      adultos: false,
      infantiles: false
    });
    this.adjuntosInscripcionSeleccionados = [];
  }

  crearInscripcion(): void {
    this.error = '';
    this.success = '';
    if (this.inscripcionAdminForm.invalid) {
      this.inscripcionAdminForm.markAllAsTouched();
      this.error = 'Completa los campos obligatorios antes de crear la inscripción.';
      return;
    }
    const tiposPermitidos = [
      this.inscripcionAdminForm.value.adultos ? 'adulto' : null,
      this.inscripcionAdminForm.value.infantiles ? 'infantil' : null
    ].filter((tipo): tipo is ParticipantType => Boolean(tipo));
    this.loading = true;
    const payload = this.editingInscription && this.selectedInscription ? this.buildAdminPayload(this.selectedInscription.estado || 'abierta') : {
      titulo: this.inscripcionAdminForm.value.titulo,
      formularioId: this.inscripcionAdminForm.value.formularioId || null,
      actividadId: this.inscripcionAdminForm.value.actividadId || null,
      estado: 'abierta',
      fechaPublicacion: this.inscripcionAdminForm.value.fechaPublicacion,
      fechaLimite: this.inscripcionAdminForm.value.fechaLimite,
      propietarioId: Number(this.inscripcionAdminForm.value.propietarioId),
      informacion: this.inscripcionAdminForm.value.informacion || '',
      tiposPermitidos
    };
    const request = this.editingInscription && this.selectedInscription
      ? this.secretariaService.actualizarInscripcion(this.selectedInscription.id, payload)
      : this.secretariaService.crearInscripcion(payload);

    request.pipe(switchMap(inscripcion => this.adjuntosInscripcionSeleccionados.length
      ? forkJoin(this.adjuntosInscripcionSeleccionados.map(file => this.secretariaService.subirAdjuntoInscripcion(inscripcion.id, file))).pipe(switchMap(() => of(inscripcion)))
      : of(inscripcion)
    )).subscribe({
      next: inscripcion => {
        this.inscripciones = [inscripcion, ...this.inscripciones.filter(item => item.id !== inscripcion.id)];
        this.selectInscription(inscripcion);
        this.router.navigate(['/inscripciones', inscripcion.id]);
        this.success = this.editingInscription ? 'Inscripcion actualizada correctamente.' : 'Inscripcion creada correctamente.';
        this.adjuntosInscripcionSeleccionados = [];
        this.loading = false;
      },
      error: error => {
        this.error = error?.error?.message || (this.editingInscription ? 'No se ha podido actualizar la inscripcion.' : 'No se ha podido crear la inscripcion.');
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

  toggleParticipant(participant: Asociado): void {
    const id = String(participant.id);
    this.selectedParticipants.has(id)
      ? this.selectedParticipants.delete(id)
      : this.selectedParticipants.add(id);
    this.syncRubiScreenContext();
  }

  isParticipantSelected(participant: Asociado): boolean {
    return this.selectedParticipants.has(String(participant.id));
  }

  asociadosForField(field: { type: string }): Asociado[] {
    if (field.type === 'responsable') {
      return this.asociados.filter(person => person.tipo === 'adulto').sort((a, b) => this.fullName(a).localeCompare(this.fullName(b)));
    }
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

  asociadoForFieldValue(field: CampoInscripcion): Asociado | undefined {
    const rawValue = this.form.get(field.key)?.value;
    const value = Array.isArray(rawValue) ? String(rawValue[0] || '').trim() : String(rawValue || '').trim();
    return this.asociadosForField(field).find(person => String(person.id) === value || this.asociadoLabel(person) === value);
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
      this.syncRubiScreenContext();
      return;
    }
    participants.forEach(person => this.selectedParticipants.add(String(person.id)));
    this.syncRubiScreenContext();
  }

  abrirDocumento(adjunto: AdjuntoSecretaria): void {
    this.secretariaService.descargarAdjunto(adjunto.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        if (adjunto.mimeType === 'application/pdf' || (adjunto.mimeType || '').startsWith('image/')) {
          window.open(url, '_blank', 'noopener');
          window.setTimeout(() => URL.revokeObjectURL(url), 60000);
          return;
        }
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = adjunto.originalName || adjunto.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error = 'No se ha podido abrir el documento adjunto.'
    });
  }

  cambiarEstadoEntrada(entrada: InscripcionEntradaSecretaria, estado: InscripcionEntradaSecretaria['estado']): void {
    if (!this.isAdminMode || entrada.estado === estado) return;
    this.loading = true;
    this.secretariaService.actualizarEstadoInscripcionEntrada(entrada.id, estado).subscribe({
      next: updated => {
        this.entradas = this.entradas.map(item => item.id === updated.id ? { ...item, ...updated } : item);
        this.selectedEntrada = this.selectedEntrada?.id === updated.id ? { ...this.selectedEntrada, ...updated } : this.selectedEntrada;
        this.loading = false;
      },
      error: response => { this.error = response?.error?.message || 'No se ha podido actualizar el estado.'; this.loading = false; }
    });
  }

  descargarJustificanteEntrada(entrada: InscripcionEntradaSecretaria): void {
    this.secretariaService.descargarJustificantePdf('inscripcion', entrada.id).subscribe({
      next: ({ blob, justificante }) => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = justificante.fileName || `${entrada.numero}.pdf`; anchor.click(); URL.revokeObjectURL(url); },
      error: () => this.error = 'No se ha podido generar el justificante de inscripción.'
    });
  }

  setAdminTab(tab: AdminTab): void {
    this.adminTab = tab;
  }

  setAssociationTab(tab: AssociationTab): void {
    this.guardarBorradorActual();
    this.associationTab = tab;
  }

  goAssociationStep(step: 1 | 2 | 3 | 4 | 5): void {
    this.guardarBorradorActual();
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
      if (!this.requiresParticipants) {
        this.associationTab = 'formulario';
        return;
      }
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
    this.cargarAdjuntosEntrada(entrada.id);
  }

  onAdjuntosEntradaChange(event: Event, entrada: InscripcionEntradaSecretaria): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    this.loading = true;
    this.error = '';
    let pendientes = files.length;
    const finalizar = () => {
      pendientes -= 1;
      if (pendientes) return;
      input.value = '';
      this.loading = false;
      this.cargarAdjuntosEntrada(entrada.id);
    };
    files.forEach(file => this.secretariaService.subirAdjunto('inscripcion_entrada', entrada.id, file).subscribe({
      next: () => finalizar(),
      error: () => {
        this.error = 'No se ha podido adjuntar uno de los documentos de la inscripción.';
        finalizar();
      }
    }));
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

  abrirExportacion(inscripcion: InscripcionSecretaria, format: 'xlsx' | 'pdf'): void {
    if (!this.isAdminMode || !this.permissions.hasPermission('inscripciones:read')) return;
    this.exportInscription = inscripcion;
    this.exportFormat = format;
    this.exportColumnKeys = new Set(this.columnasExportacion(inscripcion).map(columna => columna.key));
    this.showExportDialog = true;
  }

  confirmarBorradoInscripcion(): void {
    // La retirada de una inscripción se realiza únicamente mediante archivado.
    this.confirmDelete = false;
  }

  cerrarExportacion(): void {
    this.showExportDialog = false;
    this.exportInscription = null;
    this.exportColumnKeys.clear();
  }

  cambiarColumnaExportacion(key: string, checked: boolean): void {
    if (checked) this.exportColumnKeys.add(key);
    else this.exportColumnKeys.delete(key);
  }

  seleccionarTodasColumnasExportacion(): void {
    this.exportColumnKeys = new Set(this.columnasExportacion(this.exportInscription).map(columna => columna.key));
  }

  exportarInscritos(): void {
    const inscripcion = this.exportInscription;
    const columnas = this.columnasExportacion(inscripcion).filter(columna => this.exportColumnKeys.has(columna.key));
    if (!inscripcion || !columnas.length) {
      this.error = 'Selecciona al menos una columna para exportar.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.withEntradas(inscripcion, entradas => {
      this.hidratarEntradasParaExport(entradas, hydrated => {
        const rows = hydrated.map(entrada => Object.fromEntries(columnas.map(columna => [columna.label, this.valorColumnaExportacion(entrada, columna.key, inscripcion)])));
        const baseName = `inscritos-${this.safeFileName(inscripcion.titulo)}`;
        if (this.exportFormat === 'xlsx') {
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Inscritos');
          XLSX.writeFile(workbook, `${baseName}.xlsx`);
        } else {
          this.generarPdfInscritos(inscripcion.titulo, columnas.map(columna => columna.label), rows, `${baseName}.pdf`);
        }
        this.loading = false;
        this.cerrarExportacion();
      });
    });
  }

  entradaDatoLabel(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) return value.join(', ');
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
    this.submitted = true;
    this.lastServerIssue = null;
    if (this.accionesAsociacionBloqueadasPorEjercicio) {
      this.error = this.mensajeEjercicioNoActivo;
      return;
    }
    const disponibilidad = this.mensajeDisponibilidadInscripcion(this.selectedInscription);
    if (disponibilidad) {
      this.error = disponibilidad;
      this.syncRubiScreenContext();
      return;
    }
    if (!this.canAttemptSubmit) {
      if (!this.permissions.hasPermission('inscripciones:write')) {
        this.error = 'No tienes permiso para enviar inscripciones.';
      } else if (this.requiresParticipants && !this.selectedParticipants.size) {
        this.error = 'Selecciona al menos un asociado para continuar.';
        this.syncRubiScreenContext();
      }
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidFields = this.invalidFieldLabels();
      this.error = invalidFields.length
        ? `Revisa los campos obligatorios o inválidos: ${invalidFields.join(', ')}.`
        : 'Revisa los campos obligatorios o inválidos antes de enviar la inscripción.';
      this.syncRubiScreenContext();
      return;
    }
    const invalidAsociados = this.invalidAsociadoFields();
    if (invalidAsociados.length) {
      invalidAsociados.forEach(field => {
        const control = this.form.get(field.key);
        control?.setErrors({ ...(control.errors || {}), asociadoInvalido: true });
        control?.markAsTouched();
      });
      this.error = `Selecciona un asociado válido de la lista: ${invalidAsociados.map(field => field.label).join(', ')}.`;
      this.syncRubiScreenContext();
      return;
    }
    this.secretariaService.enviarInscripcion({
      asociacionId: this.censoService.asociacionId,
      formularioId: this.selectedInscription.id,
      datos: this.buildDatosFormulario(),
      participantes: [...this.selectedParticipants]
    }).subscribe({
      next: entry => {
        this.borrarBorrador(this.selectedInscription?.id);
        this.miEntrada = entry as InscripcionEntradaSecretaria;
        this.associationMode = 'summary';
        this.success = 'Inscripcion enviada correctamente.';
        this.syncRubiScreenContext();
      },
      error: error => {
        this.error = error?.error?.message || 'No se ha podido enviar la inscripción.';
        this.lastServerIssue = this.diagnosticIssueFor(error);
        this.syncRubiScreenContext();
      }
    });
  }

  modificarMiInscripcion(): void {
    if (this.accionesAsociacionBloqueadasPorEjercicio) {
      this.error = this.mensajeEjercicioNoActivo;
      return;
    }
    if (!this.puedeModificarMiEntrada()) {
      this.error = this.miEntrada?.estado === 'validada' ? 'La inscripción está validada y no se puede modificar.' : 'El plazo de inscripcion esta cerrado.';
      return;
    }
    this.associationMode = 'edit';
    this.success = '';
    this.error = '';
    this.syncRubiScreenContext();
  }

  cancelarEdicionAsociacion(): void {
    if (!this.selectedInscription) return;
    this.borrarBorrador(this.selectedInscription.id);
    const draft = this.draftState.getOrCreate(this.selectedInscription.id, () => this.createDraft(this.selectedInscription!));
    this.form = draft.form;
    this.selectedParticipants = draft.participantes;
    this.asociadoSearchTerms = draft.busquedasAsociados;
    this.submitted = false;
    this.lastServerIssue = null;
    if (this.miEntrada) {
      this.patchEntradaForm(this.miEntrada);
      this.associationMode = 'view';
      this.watchFormDiagnostics();
      return;
    }
    this.associationMode = 'edit';
    this.watchFormDiagnostics();
  }

  puedeModificarMiEntrada(): boolean {
    return Boolean(this.miEntrada && this.selectedInscription && this.miEntrada.estado !== 'validada' && this.miEntrada.estado !== 'retirada_solicitada' && this.miEntrada.estado !== 'retirada' && this.isWithinDeadline(this.selectedInscription));
  }

  solicitarBorradoMiEntrada(): void {
    if (!this.puedeModificarMiEntrada() || this.loading) return;
    this.confirmDeleteEntry = true;
  }

  confirmarBorradoMiEntrada(): void {
    if (!this.miEntrada || !this.puedeModificarMiEntrada()) return;
    this.confirmDeleteEntry = false;
    this.loading = true;
    this.secretariaService.borrarMiEntradaInscripcion(this.miEntrada.id).subscribe({
      next: () => {
        this.borrarBorrador(this.selectedInscription?.id);
        this.miEntrada = null;
        this.adjuntosEntrada = [];
        this.associationMode = 'edit';
        this.success = 'Inscripción eliminada.';
        this.loading = false;
      },
      error: error => { this.error = error?.error?.message || 'No se ha podido borrar la inscripción.'; this.loading = false; }
    });
  }

  abrirFormularioContextual(): void {
    if (!this.isAdminMode || !this.selectedInscription || this.loading) return;
    this.error = '';
    this.success = '';
    this.showFormularioDialog = true;
  }

  cerrarFormularioContextual(): void {
    if (!this.loading) {
      this.showFormularioDialog = false;
    }
  }

  formularioContextual(): FormularioInscripcion | null {
    return this.formularios.find(item => item.id === this.inscripcionAdminForm.value.formularioId) || null;
  }

  camposFormularioContextual(): CampoInscripcion[] {
    return this.formularioContextual() ? [] : this.selectedInscription?.campos || [];
  }

  asociarFormularioGuardado(formulario: FormularioInscripcion): void {
    if (!this.isAdminMode || !this.selectedInscription || this.loading) return;
    this.loading = true;
    this.error = '';
    this.formularios = [formulario, ...this.formularios.filter(item => item.id !== formulario.id)];
    this.inscripcionAdminForm.patchValue({ formularioId: formulario.id });
    this.showFormularioDialog = false;
    this.secretariaService.actualizarInscripcion(this.selectedInscription.id, this.buildAdminPayload(this.selectedInscription.estado || 'abierta')).subscribe({
      next: inscripcion => {
        this.inscripciones = [inscripcion, ...this.inscripciones.filter(item => item.id !== inscripcion.id)];
        this.selectInscription(inscripcion);
        this.success = 'Formulario guardado y asociado a la inscripcion.';
        this.loading = false;
      },
      error: error => {
        this.error = error?.error?.message || 'El formulario se ha guardado, pero no se ha podido asociar a la inscripcion.';
        this.loading = false;
      }
    });
  }

  cerrarResumen(): void {
    this.router.navigate(['/inscripciones']);
  }

  private cargarDatos(): void {
    this.loading = true;
    this.secretariaService.getActividades(this.isAdminMode).subscribe({
      next: actividadesResponse => {
        this.actividades = actividadesResponse.actividades;
        if (this.isAdminMode) {
          this.secretariaService.getResponsablesInscripcion().subscribe({
            next: response => { this.responsablesInscripcion = response.responsables; },
            error: () => { this.error = 'No se han podido cargar los responsables de inscripción.'; }
          });
        }
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
      this.secretariaService.getInscripciones(this.censoService.asociacionId, this.isAdminMode, { page: this.paginaInscripciones, pageSize: 20, orden: this.ordenInscripciones, disponibilidad: this.filtroDisponibilidad, estado: this.filtroEstado, busqueda: this.busquedaInscripciones }).subscribe({
        next: inscripcionesResponse => {
          this.inscripciones = inscripcionesResponse.inscripciones;
          this.paginacionInscripciones = inscripcionesResponse.paginacion || { page: 1, pageSize: 20, total: this.inscripciones.length, totalPages: 1 };
          if (this.paginaInscripciones > this.paginacionInscripciones.totalPages) {
            this.paginaInscripciones = this.paginacionInscripciones.totalPages;
            this.cargarFormulariosEInscripciones();
            return;
          }
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
    this.createMode = this.isCreateRoute();
    this.detailMode = this.createMode || Boolean(requestedId);
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

  private isCreateRoute(): boolean {
    return this.route.routeConfig?.path === 'inscripciones/nueva';
  }

  private cargarAsociados(): void {
    if (this.isAdminMode) {
      this.loading = false;
      return;
    }
    this.asociadosCargados = false;
    this.censoService.getAsociadosByAsociacion(
      this.censoService.asociacionId,
      this.ejercicioService.selectedEjercicio ?? undefined
    ).subscribe({
      next: asociados => {
        this.asociados = asociados;
        this.asociadosCargados = true;
        if (this.selectedInscription) {
          this.cargarMiEntrada(this.selectedInscription);
        }
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
    this.secretariaService.getAdjuntosInscripcion(inscripcionId).subscribe({
      next: response => {
        this.adjuntos = response.adjuntos;
      },
      error: () => {
        this.adjuntos = [];
      }
    });
  }

  private cargarAdjuntosEntrada(entradaId: number): void {
    this.adjuntosEntrada = [];
    this.secretariaService.getAdjuntos('inscripcion_entrada', entradaId).subscribe({
      next: response => this.adjuntosEntrada = response.adjuntos,
      error: () => this.adjuntosEntrada = []
    });
  }

  private cargarMiEntrada(inscription: InscripcionSecretaria): void {
    this.secretariaService.getMiEntradaInscripcion(inscription.id).subscribe({
      next: entrada => {
        if (this.selectedInscription?.id !== inscription.id || this.form.dirty) {
          return;
        }
        this.miEntrada = entrada;
        this.cargarAdjuntosEntrada(entrada.id);
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
      if (this.isMultipleAsociado(field)) {
        const ids = (Array.isArray(value) ? value : [value])
          .map(item => String(item || '').trim())
          .filter(id => this.asociadosForField(field).some(person => String(person.id) === id));
        values[field.key] = ids;
        return;
      }
      if (['asociado', 'asociado_adulto', 'asociado_infantil', 'responsable'].includes(field.type)) {
        const id = value && typeof value === 'object'
          ? String((value as Record<string, unknown>)['id'] || '')
          : String(value || '');
        const asociado = this.asociadosForField(field).find(person => String(person.id) === id);
        values[field.key] = asociado ? this.asociadoLabel(asociado) : id;
      } else {
        values[field.key] = value;
      }
    });
    this.form.patchValue(values);
    this.selectedParticipants = new Set((entrada.participantes || []).map(id => String(id)));
    this.guardarBorradorActual();
  }

  private guardarBorradorActual(): void {
    if (this.isAdminMode || !this.selectedInscription || this.associationMode !== 'edit') {
      return;
    }
    this.draftState.save(this.selectedInscription.id, {
      form: this.form,
      participantes: this.selectedParticipants,
      busquedasAsociados: this.asociadoSearchTerms
    });
  }

  private borrarBorrador(inscripcionId?: string): void {
    this.draftState.clear(inscripcionId);
  }

  private createDraft(inscription: InscripcionSecretaria): InscripcionDraftState {
    const group: Record<string, FormControl> = {};
    inscription.campos.forEach(field => {
      const validators: ValidatorFn[] = [];
      if (this.isRequiredField(field)) validators.push(Validators.required);
      if (this.isMultipleChoice(field)) validators.push(this.maxSelectionsValidator(field));
      group[field.key] = this.fb.control(this.isMultipleValueField(field) ? [] : '', validators.length ? validators : undefined);
    });

    return {
      form: this.fb.group(group),
      participantes: new Set<string>(),
      busquedasAsociados: {}
    };
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
      this.censoService.getAsociadosByAsociacion(
        asociacionId,
        this.ejercicioService.selectedEjercicio ?? undefined
      ).subscribe({
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
      this.censoService.getAsociadosByAsociacion(
        asociacionId,
        this.ejercicioService.selectedEjercicio ?? undefined
      ).subscribe({
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
      if (!['asociado', 'asociado_adulto', 'asociado_infantil', 'responsable'].includes(field.type)) {
        return;
      }
      if (this.isMultipleAsociado(field)) {
        const selected = this.selectedAsociadosForField(field).map(asociado => String(asociado.id));
        datos[field.key] = selected;
        return;
      }
      const asociado = this.asociadoForFieldValue(field);
      if (asociado) {
        datos[field.key] = field.type === 'responsable' ? {
          id: asociado.id,
          nombre: `${asociado.nombre} ${asociado.apellidos}`.trim(),
          telefono: asociado.telefono || '',
          email: asociado.email || '',
          cargo: asociado.cargo || ''
        } : String(asociado.id);
      }
    });
    return datos;
  }

  private invalidAsociadoFields(): CampoInscripcion[] {
    return (this.selectedInscription?.campos || []).filter(field =>
      this.isAsociadoField(field) &&
      !this.isMultipleAsociado(field) &&
      Boolean(this.form.get(field.key)?.value) &&
      !this.asociadoForFieldValue(field)
    );
  }

  private maxSelectionsValidator(field: CampoInscripcion): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const values = Array.isArray(control.value) ? control.value : [];
      const maxSelections = Number(field.maxSelections);
      if (!Number.isInteger(maxSelections) || maxSelections < 1) return null;
      return values.length > maxSelections ? { maxSelections: true } : null;
    };
  }

  private isMultipleValueField(field: CampoInscripcion): boolean {
    return this.isMultipleChoice(field) || this.isMultipleAsociado(field);
  }

  private isAsociadoField(field: CampoInscripcion): boolean {
    return ['asociado', 'asociado_adulto', 'asociado_infantil', 'responsable'].includes(field.type);
  }

  isWithinDeadline(inscription: InscripcionSecretaria): boolean {
    if (!inscription.fechaLimite) {
      return true;
    }
    return String(inscription.fechaLimite).slice(0, 10) >= this.fechaHoyLocal();
  }

  isInscripcionDisponible(inscription: InscripcionSecretaria): boolean {
    return !this.mensajeDisponibilidadInscripcion(inscription);
  }

  mensajeDisponibilidadInscripcion(inscription: InscripcionSecretaria): string | null {
    const today = this.fechaHoyLocal();
    const publicacion = String(inscription.fechaPublicacion || '').slice(0, 10);
    const limite = String(inscription.fechaLimite || '').slice(0, 10);
    if (publicacion && publicacion > today) return `La inscripción se abrirá el ${this.fechaLegible(publicacion)}.`;
    if (limite && limite < today) return `El plazo de presentación finalizó el ${this.fechaLegible(limite)}. No es posible enviar la inscripción.`;
    return null;
  }

  puedeSolicitarRetirada(entrada: InscripcionEntradaSecretaria): boolean {
    return entrada.estado === 'validada' || !this.isWithinDeadline(this.selectedInscription!);
  }

  solicitarRetirada(entrada: InscripcionEntradaSecretaria): void {
    if (this.loading || !this.puedeSolicitarRetirada(entrada)) return;
    this.loading = true;
    this.secretariaService.solicitarRetiradaInscripcion(entrada.id).subscribe({
      next: updated => { this.miEntrada = updated; this.success = 'Solicitud de retirada enviada a administración.'; this.loading = false; },
      error: error => { this.error = error?.error?.message || 'No se ha podido solicitar la retirada.'; this.loading = false; }
    });
  }

  resolverRetirada(entrada: InscripcionEntradaSecretaria, aprobar: boolean): void {
    if (!this.isAdminMode || this.loading || entrada.estado !== 'retirada_solicitada') return;
    this.loading = true;
    this.secretariaService.resolverRetiradaInscripcion(entrada.id, aprobar).subscribe({
      next: updated => {
        this.entradas = this.entradas.map(item => item.id === updated.id ? { ...item, ...updated } : item);
        this.selectedEntrada = this.selectedEntrada?.id === updated.id ? { ...this.selectedEntrada, ...updated } : this.selectedEntrada;
        this.success = aprobar ? 'Retirada aprobada.' : 'Solicitud de retirada rechazada.';
        this.loading = false;
      },
      error: error => { this.error = error?.error?.message || 'No se ha podido resolver la retirada.'; this.loading = false; }
    });
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
      propietarioId: Number(this.inscripcionAdminForm.value.propietarioId),
      informacion: this.inscripcionAdminForm.value.informacion || '',
      tiposPermitidos: [
        this.inscripcionAdminForm.value.adultos ? 'adulto' : null,
        this.inscripcionAdminForm.value.infantiles ? 'infantil' : null
      ].filter(Boolean),
      campos: formularioSeleccionado?.campos || this.selectedInscription?.campos || undefined
    };
  }

  onAdjuntosInscripcionChange(event: Event, inscripcion: InscripcionSecretaria): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    this.loading = true;
    this.error = '';
    let pendientes = files.length;
    const finalizar = () => {
      pendientes -= 1;
      if (pendientes) return;
      input.value = '';
      this.loading = false;
      this.cargarAdjuntos(inscripcion.id);
    };
    files.forEach(file => this.secretariaService.subirAdjuntoInscripcion(inscripcion.id, file).subscribe({
      next: () => finalizar(),
      error: () => {
        this.error = 'No se ha podido adjuntar uno de los documentos de la inscripción.';
        finalizar();
      }
    }));
  }

  seleccionarAdjuntosNuevaInscripcion(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    if (!files.length) return;
    if (this.adjuntosInscripcionSeleccionados.length + files.length > 5) {
      this.error = 'Puedes adjuntar un máximo de 5 archivos por inscripción.';
      return;
    }
    this.adjuntosInscripcionSeleccionados = [...this.adjuntosInscripcionSeleccionados, ...files];
  }

  quitarAdjuntoNuevaInscripcion(index: number): void {
    this.adjuntosInscripcionSeleccionados = this.adjuntosInscripcionSeleccionados.filter((_, current) => current !== index);
  }

  imagenPropietario(inscripcion: InscripcionSecretaria): string | null {
    return inscripcion.propietarioImagen ? `${this.apiUrl.filesBasePath}${inscripcion.propietarioImagen}` : null;
  }

  columnasExportacion(inscripcion = this.exportInscription): { key: string; label: string }[] {
    if (!inscripcion) return [];
    return [
      { key: 'numero', label: 'Número de inscripción' },
      { key: 'asociacion', label: 'Asociación' },
      { key: 'estado', label: 'Estado' },
      { key: 'fechaEntrada', label: 'Fecha de inscripción' },
      { key: 'participantes', label: 'Participantes' },
      ...inscripcion.campos.map(field => ({ key: `campo:${field.key}`, label: field.label }))
    ];
  }

  private valorColumnaExportacion(entrada: InscripcionEntradaSecretaria, key: string, inscripcion: InscripcionSecretaria): string {
    if (key === 'numero') return entrada.numero;
    if (key === 'asociacion') return entrada.asociacionNombre || `Asociación ${entrada.asociacionId}`;
    if (key === 'estado') return entrada.estado;
    if (key === 'fechaEntrada') return entrada.fechaEntrada;
    if (key === 'participantes') return this.entradaParticipantesLabel(entrada);
    const field = inscripcion.campos.find(item => `campo:${item.key}` === key);
    return field ? this.entradaCampoLabel(entrada, field) : '-';
  }

  private generarPdfInscritos(title: string, headers: string[], rows: Record<string, string>[], fileName: string): void {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
    const margin = 36;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    const columnWidth = width / Math.max(1, headers.length);
    let y = 42;
    pdf.setFontSize(16);
    pdf.text(`Inscritos · ${title}`, margin, y);
    y += 24;
    const drawRow = (values: string[], bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = values.map(value => pdf.splitTextToSize(String(value || '-'), columnWidth - 8));
      const height = Math.max(18, ...lines.map(line => line.length * 11 + 7));
      if (y + height > pdf.internal.pageSize.getHeight() - margin) { pdf.addPage(); y = margin; }
      lines.forEach((line, index) => pdf.text(line, margin + columnWidth * index + 4, y + 12));
      pdf.setDrawColor(210); pdf.line(margin, y + height, margin + width, y + height);
      y += height;
    };
    drawRow(headers, true);
    rows.forEach(row => drawRow(headers.map(header => row[header] || '-')));
    pdf.save(fileName);
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
    if (!this.requiresParticipants) return;
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

  private fechaLegible(value: string): string {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  private fechaHoyLocal(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  private contextoListadoInscripciones(): Record<string, string | number> {
    const context: Record<string, string | number> = { orden: this.ordenInscripciones, pagina: this.paginaInscripciones };
    if (this.filtroDisponibilidad) context.disponibilidad = this.filtroDisponibilidad;
    if (this.filtroEstado) context.estado = this.filtroEstado;
    if (this.busquedaInscripciones) context.busqueda = this.busquedaInscripciones;
    return context;
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }
}
