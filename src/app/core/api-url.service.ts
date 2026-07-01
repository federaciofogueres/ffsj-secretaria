import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  readonly censoBasePath = environment.CENSO_API_BASE_PATH;
  readonly secretariaBasePath = environment.SECRETARIA_API_BASE_PATH;
  readonly filesBasePath = environment.FILES_BASE_PATH;
}
