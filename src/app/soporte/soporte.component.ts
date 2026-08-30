import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EjercicioService } from '../core/ejercicio.service';
import { SoporteCategoria, SoporteIncidencia } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';

function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

function trimmedLength(minimum: number, maximum: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = String(control.value ?? '').trim().length;
    if (!length) return null;
    if (length < minimum) return { minlength: { requiredLength: minimum, actualLength: length } };
    if (length > maximum) return { maxlength: { requiredLength: maximum, actualLength: length } };
    return null;
  };
}

@Component({ selector: 'app-soporte', standalone: true, imports: [CommonModule, ReactiveFormsModule], templateUrl: './soporte.component.html', styleUrls: ['./soporte.component.scss'] })
export class SoporteComponent implements OnInit {
  categorias: SoporteCategoria[] = [];
  incidencias: SoporteIncidencia[] = [];
  detalle: SoporteIncidencia | null = null;
  loading = true;
  sending = false;
  submitted = false;
  error = '';
  success = '';
  readonly form = this.fb.group({
    categoria: ['', Validators.required],
    asunto: ['', [trimmedRequired, trimmedLength(3, 180)]],
    descripcion: ['', [trimmedRequired, trimmedLength(10, 5000)]]
  });

  constructor(private readonly fb: FormBuilder, private readonly secretaria: SecretariaService, private readonly router: Router, private readonly ejercicios: EjercicioService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.secretaria.getSoporteCategorias().subscribe({ next: response => { this.categorias = response.categorias; this.loadIncidencias(); }, error: () => this.fail('No se ha podido cargar Soporte.') });
  }

  loadIncidencias(): void {
    this.secretaria.getSoporteIncidencias().subscribe({ next: response => { this.incidencias = response.incidencias; this.loading = false; }, error: () => this.fail('No se han podido cargar tus incidencias.') });
  }

  enviar(): void {
    this.submitted = true;
    if (this.form.invalid || this.sending) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending = true; this.error = ''; this.success = '';
    this.secretaria.crearSoporteIncidencia({ ...this.form.getRawValue() as { categoria: string; asunto: string; descripcion: string }, ejercicio: this.ejercicios.selectedEjercicio, ruta: this.router.url, userAgent: navigator.userAgent }).subscribe({
      next: response => {
        this.incidencias = [response.incidencia, ...this.incidencias];
        this.form.reset(); this.submitted = false; this.sending = false;
        this.success = `Incidencia #${response.incidencia.id} creada correctamente.`;
      },
      error: (response: HttpErrorResponse) => {
        this.sending = false;
        this.error = response.error?.message || 'No se ha podido enviar la incidencia. Inténtalo de nuevo.';
      }
    });
  }

  isInvalid(controlName: 'categoria' | 'asunto' | 'descripcion'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted);
  }

  verDetalle(id: number): void { this.secretaria.getSoporteIncidencia(id).subscribe({ next: response => this.detalle = response.incidencia, error: () => this.error = 'No se ha podido cargar el detalle de la incidencia.' }); }
  cerrarDetalle(): void { this.detalle = null; }
  estadoLabel(estado: string): string { return ({ ABIERTA: 'Abierta', EN_PROCESO: 'En proceso', RESUELTA: 'Resuelta', CERRADA: 'Cerrada' } as Record<string, string>)[estado] || estado; }
  private fail(message: string): void { this.loading = false; this.error = message; }
}
