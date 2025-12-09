import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Asociado {
  id: number;
  nombre: string;
  apellidos: string;
  cargo: string;
  tipo: 'adulto' | 'infantil';
}

@Injectable({
  providedIn: 'root'
})
export class AsociadosService {
  private readonly mockAsociados: Asociado[] = [
    { id: 1, nombre: 'María', apellidos: 'García López', cargo: 'Presidenta', tipo: 'adulto' },
    { id: 2, nombre: 'Juan', apellidos: 'Pérez Sánchez', cargo: 'Vicepresidente', tipo: 'adulto' },
    { id: 3, nombre: 'Lucía', apellidos: 'Martínez Ruiz', cargo: 'Secretaria', tipo: 'adulto' },
    { id: 4, nombre: 'Carlos', apellidos: 'Hernández Torres', cargo: 'Tesorero', tipo: 'adulto' },
    { id: 5, nombre: 'Laura', apellidos: 'Gómez Díaz', cargo: 'Vocal', tipo: 'adulto' },
    { id: 6, nombre: 'Pedro', apellidos: 'Serrano Navarro', cargo: 'Vocal', tipo: 'adulto' },
    { id: 7, nombre: 'Julia', apellidos: 'Rodríguez Molina', cargo: 'Coordinadora', tipo: 'adulto' },
    { id: 8, nombre: 'Sofía', apellidos: 'Crespo Ríos', cargo: 'Delegada', tipo: 'adulto' },
    { id: 9, nombre: 'Diego', apellidos: 'Alonso Muñoz', cargo: 'Delegado', tipo: 'adulto' },
    { id: 10, nombre: 'Marta', apellidos: 'Domínguez Vera', cargo: 'Adjunta', tipo: 'adulto' },
    { id: 101, nombre: 'Paula', apellidos: 'García Ruiz', cargo: 'Infantil', tipo: 'infantil' },
    { id: 102, nombre: 'Álvaro', apellidos: 'Pérez Díaz', cargo: 'Infantil', tipo: 'infantil' },
    { id: 103, nombre: 'Claudia', apellidos: 'Sánchez Torres', cargo: 'Infantil', tipo: 'infantil' },
    { id: 104, nombre: 'Miguel', apellidos: 'Romero Vidal', cargo: 'Infantil', tipo: 'infantil' },
    { id: 105, nombre: 'Nuria', apellidos: 'Vidal Costa', cargo: 'Infantil', tipo: 'infantil' },
    { id: 106, nombre: 'Hugo', apellidos: 'López Mira', cargo: 'Infantil', tipo: 'infantil' }
  ];

  getAdultos(): Observable<Asociado[]> {
    return of(this.mockAsociados.filter(a => a.tipo === 'adulto'));
  }

  getInfantiles(): Observable<Asociado[]> {
    return of(this.mockAsociados.filter(a => a.tipo === 'infantil'));
  }

  getTodos(): Observable<Asociado[]> {
    return of(this.mockAsociados);
  }
}
