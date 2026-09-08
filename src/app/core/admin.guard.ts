import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AdminAccessService } from './admin-access.service';
import { PermissionsService } from './permissions.service';

export const adminGuard: CanActivateFn = () => {
  const adminAccess = inject(AdminAccessService);
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  if (adminAccess.isAdmin()) {
    return true;
  }
  return permissions.loadContext().pipe(map(() => adminAccess.isAdmin() ? true : router.createUrlTree(['/'])));
};
