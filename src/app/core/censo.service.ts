import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable, map } from 'rxjs';

import { ApiUrlService } from './api-url.service';
import { Asociacion, Asociado, CargoResumen, HistoricoAsociado } from './models';

@Injectable({ providedIn: 'root' })
export class CensoService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly authService: AuthService
  ) {}

  get asociacionId(): number {
    return this.authService.getIdAsociacion();
  }

  getAsociacion(id: number): Observable<Asociacion> {
    return this.http
      .get<{ asociaciones?: Asociacion[] }>(`${this.apiUrl.censoBasePath}/asociaciones/${id}`, this.authOptions())
      .pipe(map(response => response.asociaciones?.[0] ?? (response as unknown as Asociacion)));
  }

  getAsociaciones(): Observable<Asociacion[]> {
    return this.http
      .get<{ asociaciones?: Asociacion[] } | Asociacion[]>(`${this.apiUrl.censoBasePath}/asociaciones`, this.authOptions())
      .pipe(map(response => Array.isArray(response) ? response : response.asociaciones ?? []));
  }

  updateAsociacion(id: number, asociacion: Asociacion): Observable<Asociacion> {
    return this.http
      .put<{ asociaciones?: Asociacion[] }>(
        `${this.apiUrl.censoBasePath}/asociaciones/${id}`,
        asociacion,
        this.authOptions()
      )
      .pipe(map(response => response.asociaciones?.[0] ?? (response as unknown as Asociacion)));
  }

  getAsociadosByAsociacion(asociacionId: number): Observable<Asociado[]> {
    return this.http
      .get<{ asociados?: unknown[] }>(
        `${this.apiUrl.censoBasePath}/asociaciones/${asociacionId}/asociados`,
        this.authOptions()
      )
      .pipe(map(response => (response.asociados ?? []).map(item => this.mapAsociado(item))));
  }

  getHistoricoByAsociado(asociadoId: number): Observable<HistoricoAsociado[]> {
    return this.http
      .get<{ historico?: unknown[] }>(
        `${this.apiUrl.censoBasePath}/asociados/${asociadoId}/historico`,
        this.authOptions()
      )
      .pipe(map(response => (response.historico ?? []).map(item => this.mapHistoricoAsociado(item))));
  }

  getCargos(): Observable<CargoResumen[]> {
    return this.http
      .get<{ cargos?: CargoResumen[] }>(`${this.apiUrl.censoBasePath}/cargos`, this.authOptions())
      .pipe(map(response => response.cargos ?? []));
  }

  private authOptions(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.authService.getToken()}`
      })
    };
  }

  private mapAsociado(raw: unknown): Asociado {
    const item = raw as Record<string, any>;
    const fechaNacimiento = item.fechaNacimiento ?? item.nacimiento ?? item.fecha_nacimiento ?? item.date_birth ?? item.birthDate;
    const tipoApi = item.tipo ?? item.tipoAsociado ?? item.type;
    return {
      id: Number(item.id),
      nombre: item.nombre ?? item.name ?? '',
      apellidos: item.apellidos ?? item.surnames ?? '',
      cargo: item.cargo ?? item.charge ?? item.cargoNombre ?? item.cargos?.[0]?.nombre ?? '',
      cargoId: Number(item.cargoId ?? item.idCargo ?? item.id_cargo ?? 0) || undefined,
      cargoIds: this.mapNumberList(item.cargoIds ?? item.cargo_ids ?? item.idCargos),
      tipo: this.mapTipoAsociado(tipoApi, item.child, fechaNacimiento),
      dni: item.dni ?? item.nif,
      sip: item.sip,
      estado: item.estado,
      fechaBaja: item.fechaBaja ?? item.fecha_baja,
      fechaAlta: item.fechaAlta ?? item.date_up,
      fechaNacimiento: this.formatDateForInput(fechaNacimiento),
      email: item.email,
      telefono: item.telefono ?? item.phone,
      direccion: item.direccion ?? item.address,
      codigoPostal: item.codigo_postal ?? item.codigoPostal ?? item.cp
    };
  }

  private formatDateForInput(value: unknown): string {
    if (!value) {
      return '';
    }

    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const localMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (localMatch) {
      return `${localMatch[3]}-${localMatch[2].padStart(2, '0')}-${localMatch[1].padStart(2, '0')}`;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  private mapHistoricoAsociado(raw: unknown): HistoricoAsociado {
    const item = raw as Record<string, any>;

    return {
      cargo: item.cargo ?? '',
      ejercicio: item.ejercicio ?? '',
      nombreAsociacion: item.nombreAsociacion ?? item.nombre_asociacion ?? '',
      idCargo: Number(item.idCargo ?? item.id_cargo ?? 0),
      idEjercicio: Number(item.idEjercicio ?? item.id_ejercicio ?? 0),
      idAsociacion: Number(item.idAsociacion ?? item.id_asociacion ?? 0),
      active: item.active ?? false
    };
  }

  private mapNumberList(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value.map(item => Number(item)).filter(Boolean);
    }

    return String(value || '')
      .split(',')
      .map(item => Number(item.trim()))
      .filter(Boolean);
  }

  private mapTipoAsociado(tipoApi: unknown, child: unknown, fechaNacimiento: unknown): Asociado['tipo'] {
    const normalized = String(tipoApi ?? '').toLowerCase();

    if (normalized.includes('infantil') || child === true) {
      return 'infantil';
    }

    if (normalized.includes('adult')) {
      return 'adulto';
    }

    return this.isMenorDeEdad(fechaNacimiento) ? 'infantil' : 'adulto';
  }

  private isMenorDeEdad(value: unknown): boolean {
    if (!value) {
      return false;
    }

    const nacimiento = this.parseDate(value);
    if (Number.isNaN(nacimiento.getTime())) {
      return false;
    }

    const today = new Date(2026, 6, 1);
    let edad = today.getFullYear() - nacimiento.getFullYear();
    const monthDiff = today.getMonth() - nacimiento.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < nacimiento.getDate())) {
      edad -= 1;
    }

    return edad < 18;
  }

  private parseDate(value: unknown): Date {
    const raw = String(value).trim();
    const localMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (localMatch) {
      return new Date(Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1]));
    }

    return new Date(raw);
  }
}
