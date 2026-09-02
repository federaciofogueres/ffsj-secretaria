import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

Object.assign(globalThis, { __FFSJ_CENSO_API_BASE_PATH__: environment.CENSO_API_BASE_PATH });

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
