import { Routes } from '@angular/router';
import { AuthGuard } from 'ffsj-web-components';

import { AsociacionComponent } from './asociacion/asociacion.component';
import { AsociadosGestionComponent } from './asociados/asociados-gestion.component';
import { AsociadosComponent } from './asociados/asociados.component';
import { HomeComponent } from './home/home.component';
import { InscripcionesComponent } from './inscripciones/inscripciones.component';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login'
  },
  {
    path: '',
    component: HomeComponent,
    title: 'Inicio',
    canActivate: [AuthGuard]
  },
  {
    path: 'asociados',
    component: AsociadosComponent,
    title: 'Asociados',
    canActivate: [AuthGuard],
    data: {
      moduleName: 'Asociados',
      moduleDescription: 'Gestion de altas, modificaciones y bajas de los miembros de cada asociacion federada.'
    }
  },
  {
    path: 'asociados/gestion',
    component: AsociadosGestionComponent,
    title: 'Gestion de asociados',
    canActivate: [AuthGuard],
    data: {
      moduleName: 'Gestion de asociados',
      moduleDescription: 'Altas, modificaciones y bajas de los miembros de la asociacion.'
    }
  },
  {
    path: 'asociacion',
    component: AsociacionComponent,
    title: 'Asociacion',
    canActivate: [AuthGuard],
    data: {
      moduleName: 'Asociacion',
      moduleDescription: 'Administracion de los datos oficiales de la asociacion.'
    }
  },
  {
    path: 'inscripciones',
    component: InscripcionesComponent,
    title: 'Inscripciones',
    canActivate: [AuthGuard],
    data: {
      moduleName: 'Inscripciones',
      moduleDescription: 'Permite apuntar a asociados de la entidad en eventos y actividades ya existentes.'
    }
  },
  {
    path: 'registro',
    component: RegistroComponent,
    title: 'Registro',
    canActivate: [AuthGuard],
    data: {
      moduleName: 'Registro',
      moduleDescription: 'Subida de documentos para registro de entrada y comunicaciones directas con la Federacion.'
    }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
