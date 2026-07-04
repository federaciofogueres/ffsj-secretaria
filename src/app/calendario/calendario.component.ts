import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AdminAccessService } from '../core/admin-access.service';
import { ActividadSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  actividades: ActividadSecretaria[];
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {
  actividades: ActividadSecretaria[] = [];
  days: CalendarDay[] = [];
  selected: ActividadSecretaria | null = null;
  selectedDate: Date | null = null;
  loading = false;
  error = '';
  success = '';

  actividadForm = this.fb.group({
    titulo: ['', Validators.required],
    responsable: ['Secretaria'],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    descripcion: ['']
  });

  editActividadForm = this.fb.group({
    titulo: ['', Validators.required],
    responsable: [''],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    descripcion: ['']
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

  previousMonth(): void {
    this.monthCursor = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.monthCursor = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() + 1, 1);
    this.buildCalendar();
  }

  select(actividad: ActividadSecretaria): void {
    this.selected = actividad;
    this.error = '';
    this.success = '';
    this.editActividadForm.patchValue({
      titulo: actividad.titulo,
      responsable: actividad.responsable || '',
      fechaInicio: this.toDateInput(actividad.fechaInicio),
      fechaFin: this.toDateInput(actividad.fechaFin),
      descripcion: actividad.descripcion || ''
    });
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate = day.date;
    if (this.isAdminMode && this.permissions.hasPermission('inscripciones:write')) {
      const date = this.formatDate(day.date);
      this.actividadForm.patchValue({ fechaInicio: date, fechaFin: date });
    }
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
    const confirmed = window.confirm('Esta accion borrara definitivamente la actividad. No se puede deshacer.');
    if (!confirmed) return;
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

  estadoLabel(estado: string): string {
    if (estado === 'cerrada') return 'Desactivada';
    if (estado === 'cancelada') return 'Archivada';
    return 'Activa';
  }

  private recargarTrasCrear(createdId: string): void {
    this.secretariaService.getActividades(this.isAdminMode).subscribe({
      next: response => {
        this.actividades = response.actividades;
        this.selected = this.actividades.find(actividad => actividad.id === createdId) || this.actividades[0] || null;
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
        this.buildCalendar();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido cargar el calendario.';
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
}
