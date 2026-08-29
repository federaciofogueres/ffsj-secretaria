import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

import { EjercicioSecretaria } from './models';
import { PermissionsService } from './permissions.service';
import { SecretariaService } from './secretaria.service';

@Injectable({ providedIn: 'root' })
export class EjercicioService {
  private readonly ejercicios$ = new BehaviorSubject<EjercicioSecretaria[]>([]);
  private readonly selected$ = new BehaviorSubject<EjercicioSecretaria | null>(null);

  constructor(
    private readonly permissions: PermissionsService,
    private readonly secretaria: SecretariaService
  ) {
    this.permissions.contextChanges.subscribe(context => {
      const ejercicios = context?.ejercicios ?? [];
      if (ejercicios.length) {
        this.ejercicios$.next(ejercicios);
        const activo = context?.ejercicioActivo ?? ejercicios.find(item => item.activo) ?? ejercicios[0];
        const current = this.selected$.value;
        this.setSelected(current && ejercicios.some(item => item.id === current.id) ? current : activo);
      }
    });
  }

  get ejerciciosChanges(): Observable<EjercicioSecretaria[]> {
    return this.ejercicios$.asObservable();
  }

  get selectedChanges(): Observable<EjercicioSecretaria | null> {
    return this.selected$.asObservable();
  }

  get selectedSnapshot(): EjercicioSecretaria | null {
    return this.selected$.value;
  }

  get selectedEjercicio(): number | null {
    return this.selected$.value?.ejercicio ?? null;
  }

  get isSelectedActive(): boolean {
    return Boolean(this.selected$.value?.activo);
  }

  load(): void {
    this.secretaria.getEjercicios().subscribe({
      next: response => {
        this.ejercicios$.next(response.ejercicios);
        const current = this.selected$.value;
        const selected = current && response.ejercicios.some(item => item.id === current.id)
          ? response.ejercicios.find(item => item.id === current.id) ?? null
          : response.ejercicios.find(item => item.activo) ?? response.ejercicios[0] ?? null;
        this.setSelected(selected);
      }
    });
  }

  select(ejercicioId: number): void {
    const selected = this.ejercicios$.value.find(item => item.id === Number(ejercicioId)) ?? null;
    this.setSelected(selected);
  }

  label(): Observable<string> {
    return this.selectedChanges.pipe(map(ejercicio => ejercicio ? `Ejercicio ${ejercicio.ejercicio}` : 'Ejercicio'));
  }

  private setSelected(selected: EjercicioSecretaria | null): void {
    this.selected$.next(selected);
    try {
      if (selected) {
        localStorage.setItem('ffsj-secretaria-ejercicio', String(selected.ejercicio));
      }
    } catch {
      // LocalStorage puede no estar disponible en algunos contextos de test.
    }
  }
}
