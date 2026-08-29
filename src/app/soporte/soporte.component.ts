import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EjercicioService } from '../core/ejercicio.service';
import { SoporteCategoria, SoporteIncidencia } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';

@Component({ selector: 'app-soporte', standalone: true, imports: [CommonModule, ReactiveFormsModule], templateUrl: './soporte.component.html', styleUrls: ['./soporte.component.scss'] })
export class SoporteComponent implements OnInit {
  categorias: SoporteCategoria[] = [];
  incidencias: SoporteIncidencia[] = [];
  detalle: SoporteIncidencia | null = null;
  loading = true;
  sending = false;
  error = '';
  success = '';
  readonly form = this.fb.group({ categoria: ['', Validators.required], asunto: ['', [Validators.required, Validators.maxLength(180)]], descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]] });

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
    if (this.form.invalid || this.sending) { this.form.markAllAsTouched(); return; }
    this.sending = true; this.error = ''; this.success = '';
    this.secretaria.crearSoporteIncidencia({ ...this.form.getRawValue() as { categoria: string; asunto: string; descripcion: string }, ejercicio: this.ejercicios.selectedEjercicio, ruta: this.router.url, userAgent: navigator.userAgent }).subscribe({
      next: response => { this.incidencias = [response.incidencia, ...this.incidencias]; this.form.reset(); this.sending = false; this.success = `Incidencia #${response.incidencia.id} creada correctamente.`; },
      error: () => { this.sending = false; this.error = 'No se ha podido enviar la incidencia. Inténtalo de nuevo.'; }
    });
  }

  verDetalle(id: number): void { this.secretaria.getSoporteIncidencia(id).subscribe({ next: response => this.detalle = response.incidencia, error: () => this.error = 'No se ha podido cargar el detalle de la incidencia.' }); }
  cerrarDetalle(): void { this.detalle = null; }
  estadoLabel(estado: string): string { return ({ ABIERTA: 'Abierta', EN_PROCESO: 'En proceso', RESUELTA: 'Resuelta', CERRADA: 'Cerrada' } as Record<string, string>)[estado] || estado; }
  private fail(message: string): void { this.loading = false; this.error = message; }
}
