import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';

export const ADMIN_CARGO_ID = 16;

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  constructor(private readonly auth: AuthService) {}

  isAdmin(): boolean {
    return this.hasAdminCargo(this.auth.getCargos());
  }

  hasAdminCargo(cargos: unknown[]): boolean {
    return cargos.some((cargo: any) => Number(cargo?.idCargo ?? cargo?.id_cargo ?? cargo?.id) === ADMIN_CARGO_ID);
  }
}
