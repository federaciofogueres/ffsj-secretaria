import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { ModulePageComponent } from './shared/module-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Inicio'
  },
  {
    path: 'asociados',
    component: ModulePageComponent,
    title: 'Asociados',
    data: {
      moduleName: 'Asociados',
      moduleDescription:
        'Gestión de altas, modificaciones y bajas de los miembros de cada asociación federada.'
    }
  },
  {
    path: 'asociacion',
    component: ModulePageComponent,
    title: 'Asociación',
    data: {
      moduleName: 'Asociación',
      moduleDescription: 'Administración de los datos oficiales de la asociación.'
    }
  },
  {
    path: 'inscripciones',
    component: ModulePageComponent,
    title: 'Inscripciones',
    data: {
      moduleName: 'Inscripciones',
      moduleDescription:
        'Permite apuntar a asociados de la entidad en eventos y actividades ya existentes.'
    }
  },
  {
    path: 'registro',
    component: ModulePageComponent,
    title: 'Registro',
    data: {
      moduleName: 'Registro',
      moduleDescription:
        'Subida de documentos para registro de entrada y comunicaciones directas con la Federación.'
    }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
