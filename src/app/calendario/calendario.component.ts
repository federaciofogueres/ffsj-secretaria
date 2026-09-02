import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AdminAccessService } from '../core/admin-access.service';
import { ActividadSecretaria, InscripcionSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { EstadoBadgeComponent } from '../shared/estado-badge.component';

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  actividades: ActividadSecretaria[];
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, ConfirmDialogComponent, EstadoBadgeComponent],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {
  actividades: ActividadSecretaria[] = [];
  inscripciones: InscripcionSecretaria[] = [];
  days: CalendarDay[] = [];
  selected: ActividadSecretaria | null = null;
  selectedDate: Date | null = null;
  showCreateDialog = false;
  confirmDelete = false;
  loading = false;
  error = '';
  success = '';
  filtroEstado = '';
  filtroVisibilidad = '';
  incluirArchivadas = false;

  actividadForm = this.fb.group({
    titulo: ['', Validators.required],
    responsable: ['Secretaria'],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    descripcion: ['']
    , visiblePublico: [true]
  });

  editActividadForm = this.fb.group({
    titulo: ['', Validators.required],
    responsable: [''],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    descripcion: ['']
    , visiblePublico: [true]
  });

  linkInscripcionForm = this.fb.group({
    inscripcionId: ['']
  });

  nuevaInscripcionForm = this.fb.group({
    titulo: ['', Validators.required],
    fechaPublicacion: [new Date().toISOString().slice(0, 10), Validators.required],
    fechaLimite: ['', Validators.required],
    adultos: [true],
    infantiles: [true]
  });

  private monthCursor = new Date();

  constructor(
    private readonly fb: FormBuilder,
    private readonly secretariaService: SecretariaService,
    private readonly adminAccess: AdminAccessService,
    readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get monthLabel(): string {
    return this.monthCursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  get isAdminMode(): boolean {
    return this.adminAccess.isAdmin();
  }

  get selectedDayActividades(): ActividadSecretaria[] {
    if (!this.selectedDate) return [];
    return this.actividades.filter(actividad => this.isActividadOnDate(actividad, this.selectedDate as Date));
  }

  get availableInscripciones(): InscripcionSecretaria[] {
    if (!this.selected) return [];
    const linkedIds = new Set((this.selected.inscripciones || []).map(inscripcion => inscripcion.id));
    return this.inscripciones.filter(inscripcion => !linkedIds.has(inscripcion.id));
  }

  previousMonth(): void {
    this.monthCursor = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.monthCursor = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() + 1, 1);
    this.buildCalendar();
  }

  select(actividad: ActividadSecretaria, date: Date | null = null): void {
    if (date) {
      this.selectedDate = date;
    }
    const hydrated = this.actividades.find(item => item.id === actividad.id) || actividad;
    this.selected = hydrated;
    this.error = '';
    this.success = '';
    this.editActividadForm.patchValue({
      titulo: hydrated.titulo,
      responsable: hydrated.responsable || '',
      fechaInicio: this.toDateInput(hydrated.fechaInicio),
      fechaFin: this.toDateInput(hydrated.fechaFin),
      descripcion: hydrated.descripcion || ''
      , visiblePublico: hydrated.visiblePublico !== false
    });
    this.linkInscripcionForm.reset({ inscripcionId: '' });
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate = day.date;
    this.selected = null;
    if (this.isAdminMode && this.permissions.hasPermission('inscripciones:write')) {
      const date = this.formatDate(day.date);
      this.actividadForm.patchValue({ fechaInicio: date, fechaFin: date });
    }
  }

  abrirCrearActividad(date: Date | null = this.selectedDate): void {
    const target = date || new Date();
    this.selectedDate = target;
    const formatted = this.formatDate(target);
    this.actividadForm.reset({
      titulo: '',
      responsable: 'Secretaria',
      fechaInicio: formatted,
      fechaFin: formatted,
      descripcion: ''
    });
    this.showCreateDialog = true;
  }

  cerrarCrearActividad(): void {
    this.showCreateDialog = false;
  }

  crearActividad(): void {
    if (this.actividadForm.invalid) {
      this.actividadForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.crearActividad(this.actividadForm.value).subscribe({
      next: actividad => {
        this.showCreateDialog = false;
        this.recargarTrasCrear(actividad.id);
      },
      error: () => {
        this.error = 'No se ha podido crear la actividad.';
        this.loading = false;
      }
    });
  }

  guardarActividad(): void {
    if (!this.selected) return;
    if (this.editActividadForm.invalid) {
      this.editActividadForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.actualizarActividad(this.selected.id, {
      ...this.editActividadForm.value,
      estado: this.selected.estado || 'activa'
    }).subscribe({
      next: actividad => this.actualizarActividadLocal(actividad, 'Actividad actualizada correctamente.'),
      error: () => {
        this.error = 'No se ha podido actualizar la actividad.';
        this.loading = false;
      }
    });
  }

  cambiarEstadoActividad(estado: 'activa' | 'cerrada' | 'cancelada'): void {
    if (!this.selected) return;
    const actionLabel = estado === 'cerrada' ? 'desactivar' : estado === 'cancelada' ? 'archivar' : 'reactivar';
    const successMessage = estado === 'cerrada'
      ? 'Actividad desactivada correctamente.'
      : estado === 'activa'
      ? 'Actividad reactivada correctamente.'
      : 'Actividad archivada correctamente.';
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.actualizarActividad(this.selected.id, {
      ...this.editActividadForm.value,
      estado
    }).subscribe({
      next: actividad => {
        if (estado === 'cancelada') {
          this.actividades = this.actividades.filter(item => item.id !== actividad.id);
          this.selected = null;
          this.success = 'Actividad archivada correctamente.';
          this.buildCalendar();
          this.loading = false;
          return;
        }
        this.actualizarActividadLocal(actividad, successMessage);
      },
      error: () => {
        this.error = `No se ha podido ${actionLabel} la actividad.`;
        this.loading = false;
      }
    });
  }

  borrarActividad(): void {
    if (!this.selected) return;
    this.confirmDelete = true;
  }

  confirmarBorradoActividad(): void {
    if (!this.selected) return;
    this.confirmDelete = false;
    const deletedId = this.selected.id;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.borrarActividad(deletedId).subscribe({
      next: () => {
        this.actividades = this.actividades.filter(item => item.id !== deletedId);
        this.selected = null;
        this.success = 'Actividad borrada definitivamente.';
        this.buildCalendar();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido borrar la actividad.';
        this.loading = false;
      }
    });
  }

  vincularInscripcion(): void {
    if (!this.selected || !this.linkInscripcionForm.value.inscripcionId) return;
    const inscripcion = this.inscripciones.find(item => item.id === this.linkInscripcionForm.value.inscripcionId);
    if (!inscripcion) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.actualizarInscripcion(inscripcion.id, this.buildInscripcionPayload(inscripcion, this.selected.id)).subscribe({
      next: updated => {
        this.inscripciones = [updated, ...this.inscripciones.filter(item => item.id !== updated.id)];
        this.actualizarInscripcionEnActividad(updated, 'Inscripcion vinculada correctamente.');
      },
      error: () => {
        this.error = 'No se ha podido vincular la inscripcion.';
        this.loading = false;
      }
    });
  }

  crearInscripcionVinculada(): void {
    if (!this.selected) return;
    if (this.nuevaInscripcionForm.invalid) {
      this.nuevaInscripcionForm.markAllAsTouched();
      return;
    }
    const tiposPermitidos = [
      this.nuevaInscripcionForm.value.adultos ? 'adulto' : null,
      this.nuevaInscripcionForm.value.infantiles ? 'infantil' : null
    ].filter(Boolean);
    if (!tiposPermitidos.length) {
      this.error = 'Selecciona al menos un tipo de participante.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.crearInscripcion({
      titulo: this.nuevaInscripcionForm.value.titulo,
      actividadId: this.selected.id,
      estado: 'abierta',
      fechaPublicacion: this.nuevaInscripcionForm.value.fechaPublicacion,
      fechaLimite: this.nuevaInscripcionForm.value.fechaLimite,
      tiposPermitidos
    }).subscribe({
      next: created => {
        this.inscripciones = [created, ...this.inscripciones.filter(item => item.id !== created.id)];
        this.nuevaInscripcionForm.reset({
          titulo: '',
          fechaPublicacion: new Date().toISOString().slice(0, 10),
          fechaLimite: '',
          adultos: true,
          infantiles: true
        });
        this.actualizarInscripcionEnActividad(created, 'Inscripcion creada y vinculada correctamente.');
      },
      error: () => {
        this.error = 'No se ha podido crear la inscripcion vinculada.';
        this.loading = false;
      }
    });
  }

  estadoLabel(estado: string): string {
    if (estado === 'cerrada') return 'Desactivada';
    if (estado === 'cancelada') return 'Archivada';
    return 'Activa';
  }

  aplicarFiltros(): void {
    this.cargar();
  }

  private recargarTrasCrear(createdId: string): void {
    this.secretariaService.getActividades(this.isAdminMode, {
      includeArchived: this.isAdminMode && this.incluirArchivadas,
      estado: this.filtroEstado || undefined,
      visibilidad: this.filtroVisibilidad || undefined
    }).subscribe({
      next: response => {
        this.actividades = response.actividades;
        this.selected = this.actividades.find(actividad => String(actividad.id) === String(createdId)) || this.actividades[0] || null;
        this.success = 'Actividad creada correctamente.';
        this.actividadForm.reset({ responsable: 'Secretaria' });
        if (this.selectedDate) {
          const date = this.formatDate(this.selectedDate);
          this.actividadForm.patchValue({ fechaInicio: date, fechaFin: date });
        }
        this.buildCalendar();
        this.loading = false;
      },
      error: () => {
        this.error = 'La actividad se ha creado, pero no se ha podido recargar el calendario.';
        this.loading = false;
      }
    });
  }

  private cargar(): void {
    this.loading = true;
    this.secretariaService.getActividades(this.isAdminMode).subscribe({
      next: response => {
        this.actividades = response.actividades;
        this.selected = null;
        this.cargarInscripciones();
      },
      error: () => {
        this.error = 'No se ha podido cargar el calendario.';
        this.loading = false;
      }
    });
  }

  private cargarInscripciones(): void {
    if (!this.isAdminMode) {
      this.inscripciones = [];
      this.buildCalendar();
      this.loading = false;
      return;
    }
    this.secretariaService.getInscripciones(-1).subscribe({
      next: response => {
        this.inscripciones = response.inscripciones;
        this.syncInscripcionesEnActividades();
        this.buildCalendar();
        this.loading = false;
      },
      error: () => {
        this.inscripciones = [];
        this.buildCalendar();
        this.loading = false;
      }
    });
  }

  private buildCalendar(): void {
    const year = this.monthCursor.getFullYear();
    const month = this.monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);

    this.days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        currentMonth: date.getMonth() === month,
        actividades: this.actividades.filter(actividad => this.isActividadOnDate(actividad, date))
      };
    });
  }

  private isActividadOnDate(actividad: ActividadSecretaria, date: Date): boolean {
    const start = this.parseDate(actividad.fechaInicio);
    if (!start) return false;
    const end = this.parseDate(actividad.fechaFin) || start;
    const target = this.onlyDate(date).getTime();
    return target >= this.onlyDate(start).getTime() && target <= this.onlyDate(end).getTime();
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private onlyDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  private actualizarActividadLocal(actividad: ActividadSecretaria, message: string): void {
    this.actividades = [actividad, ...this.actividades.filter(item => item.id !== actividad.id)];
    this.select(actividad);
    this.success = message;
    this.buildCalendar();
    this.loading = false;
  }

  private buildInscripcionPayload(inscripcion: InscripcionSecretaria, actividadId: string): unknown {
    return {
      titulo: inscripcion.titulo,
      actividadId,
      estado: inscripcion.estado || 'abierta',
      fechaPublicacion: this.toDateInput(inscripcion.fechaPublicacion) || new Date().toISOString().slice(0, 10),
      fechaLimite: this.toDateInput(inscripcion.fechaLimite) || null,
      tiposPermitidos: inscripcion.tiposPermitidos,
      campos: inscripcion.campos
    };
  }

  private actualizarInscripcionEnActividad(inscripcion: InscripcionSecretaria, message: string): void {
    if (!this.selected) return;
    const actividad = {
      ...this.selected,
      inscripciones: [inscripcion, ...(this.selected.inscripciones || []).filter(item => item.id !== inscripcion.id)]
    };
    this.actividades = this.actividades.map(item => item.id === actividad.id ? actividad : item);
    this.select(actividad);
    this.success = message;
    this.buildCalendar();
    this.loading = false;
  }

  private syncInscripcionesEnActividades(): void {
    const byActividad = this.inscripciones.reduce<Record<string, InscripcionSecretaria[]>>((acc, inscripcion) => {
      if (!inscripcion.actividadId) return acc;
      const key = String(inscripcion.actividadId);
      acc[key] = acc[key] || [];
      acc[key].push(inscripcion);
      return acc;
    }, {});
    this.actividades = this.actividades.map(actividad => ({
      ...actividad,
      inscripciones: byActividad[actividad.id] || actividad.inscripciones || []
    }));
  }
}
