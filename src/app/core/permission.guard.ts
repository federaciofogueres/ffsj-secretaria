import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { PermissionsService } from './permissions.service';

export const permissionGuard: CanActivateFn = route => {
  const permission = route.data?.['permission'] as string | undefined;
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  if (!permission) {
    return true;
  }

  return permissions.can(permission).pipe(
    map(canAccess => {
      if (canAccess) {
        return true;
      }
      return router.createUrlTree(['/']);
    })
  );
};
