import { Routes } from '@angular/router';

import { AsociacionComponent } from './asociacion/asociacion.component';
import { AsociadosGestionComponent } from './asociados/asociados-gestion.component';
import { AsociadosComponent } from './asociados/asociados.component';
import { HomeComponent } from './home/home.component';
import { InscripcionesComponent } from './inscripciones/inscripciones.component';
import { RegistroComponent } from './registro/registro.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Inicio'
  },
  {
    path: 'asociados',
    component: AsociadosComponent,
    title: 'Asociados',
    data: {
      moduleName: 'Asociados',
      moduleDescription:
        'GestiИn de altas, modificaciones y bajas de los miembros de cada asociaciИn federada.'
    }
  },
  {
    path: 'asociados/gestion',
    component: AsociadosGestionComponent,
    title: 'Gestión de asociados',
    data: {
      moduleName: 'Gestión de asociados',
      moduleDescription: 'Altas, modificaciones y bajas de los miembros de la asociación.'
    }
  },
  {
    path: 'asociacion',
    component: AsociacionComponent,
    title: 'AsociaciИn',
    data: {
      moduleName: 'AsociaciИn',
      moduleDescription: 'AdministraciИn de los datos oficiales de la asociaciИn.'
    }
  },
  {
    path: 'inscripciones',
    component: InscripcionesComponent,
    title: 'Inscripciones',
    data: {
      moduleName: 'Inscripciones',
      moduleDescription:
        'Permite apuntar a asociados de la entidad en eventos y actividades ya existentes.'
    }
  },
  {
    path: 'registro',
    component: RegistroComponent,
    title: 'Registro',
    data: {
      moduleName: 'Registro',
      moduleDescription:
        'Subida de documentos para registro de entrada y comunicaciones directas con la FederaciИn.'
    }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
