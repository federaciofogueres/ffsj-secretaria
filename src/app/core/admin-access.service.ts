import { Injectable } from '@angular/core';
import { PermissionsService } from './permissions.service';

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  constructor(private readonly permissions: PermissionsService) {}

  isAdmin(): boolean {
    return this.permissions.hasPermission('admin:access');
  }
}
