import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EjercicioInicioResultado, EjercicioSecretaria } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';

@Component({
  selector: 'app-ejercicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ejercicios.component.html',
  styleUrls: ['./ejercicios.component.scss']
})
export class EjerciciosComponent implements OnInit {
  ejercicios: EjercicioSecretaria[] = [];
  ejercicioForm: Partial<EjercicioSecretaria> = {};
  ejercicioInicioResultado?: EjercicioInicioResultado;
  loading = false;
  error = '';

  constructor(private readonly secretariaService: SecretariaService) {}

  ngOnInit(): void {
    this.load();
  }

  get ejercicioActivoLabel(): string {
    const activo = this.ejercicios.find(ejercicio => ejercicio.activo);
    return activo ? String(activo.ejercicio) : '-';
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.getEjercicios().subscribe({
      next: response => {
        this.ejercicios = response.ejercicios;
        this.resetEjercicioForm();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se han podido cargar los ejercicios.';
        this.loading = false;
      }
    });
  }

  editarEjercicio(ejercicio: EjercicioSecretaria): void {
    this.ejercicioForm = { ...ejercicio };
  }

  resetEjercicioForm(): void {
    const activo = this.ejercicios.find(item => item.activo);
    const nextYear = activo ? activo.ejercicio + 1 : new Date().getFullYear() + 1;
    this.ejercicioForm = {
      ejercicio: nextYear,
      fechaInicio: `${nextYear - 1}-07-01`,
      fechaFin: `${nextYear}-06-30`,
      activo: false
    };
  }

  guardarEjercicio(): void {
    if (!this.ejercicioForm.ejercicio || !this.ejercicioForm.fechaInicio || !this.ejercicioForm.fechaFin) {
      this.error = 'Indica ejercicio, fecha de inicio y fecha de fin.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.secretariaService.crearOActualizarEjercicio(this.ejercicioForm).subscribe({
      next: ejercicio => {
        const exists = this.ejercicios.some(item => item.id === ejercicio.id);
        this.ejercicios = (exists
          ? this.ejercicios.map(item => item.id === ejercicio.id ? ejercicio : item)
          : [...this.ejercicios, ejercicio]
        ).sort((a, b) => b.ejercicio - a.ejercicio);
        this.resetEjercicioForm();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido guardar el ejercicio.';
        this.loading = false;
      }
    });
  }

  activarEjercicio(ejercicio: EjercicioSecretaria): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.activarEjercicio(ejercicio.id).subscribe({
      next: updated => {
        this.ejercicios = this.ejercicios.map(item => ({ ...item, activo: item.id === updated.id }));
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido activar el ejercicio.';
        this.loading = false;
      }
    });
  }

  iniciarEjercicio(ejercicio: EjercicioSecretaria): void {
    const confirmed = window.confirm(
      `Se importaran al ejercicio ${ejercicio.ejercicio} los asociados activos del ejercicio anterior. Esta accion no duplicara registros existentes.`
    );
    if (!confirmed) return;

    this.loading = true;
    this.error = '';
    this.ejercicioInicioResultado = undefined;
    this.secretariaService.iniciarEjercicio(ejercicio.id).subscribe({
      next: resultado => {
        this.ejercicioInicioResultado = resultado;
        this.ejercicios = this.ejercicios.map(item =>
          item.id === resultado.ejercicio.id
            ? { ...item, iniciado: true, iniciadoAt: resultado.ejercicio.iniciadoAt || new Date().toISOString() }
            : item
        );
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido iniciar el ejercicio.';
        this.loading = false;
      }
    });
  }
}
