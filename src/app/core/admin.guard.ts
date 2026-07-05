import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminAccessService } from './admin-access.service';

export const adminGuard: CanActivateFn = () => {
  const adminAccess = inject(AdminAccessService);
  const router = inject(Router);

  return adminAccess.isAdmin() ? true : router.createUrlTree(['/']);
};
