import { Routes } from '@angular/router';
import { AuthGuard } from 'ffsj-web-components';

import { AdminComponent } from './admin/admin.component';
import { AsociacionComponent } from './asociacion/asociacion.component';
import { AsociadosGestionComponent } from './asociados/asociados-gestion.component';
import { AsociadosComponent } from './asociados/asociados.component';
import { CalendarioComponent } from './calendario/calendario.component';
import { FormulariosComponent } from './formularios/formularios.component';
import { HomeComponent } from './home/home.component';
import { InscripcionesComponent } from './inscripciones/inscripciones.component';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';
import { SolicitudesComponent } from './solicitudes/solicitudes.component';
import { adminGuard } from './core/admin.guard';
import { permissionGuard } from './core/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login'
  },
  {
    path: 'admin',
    component: AdminComponent,
    title: 'Administracion'
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
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'asociados:read',
      moduleName: 'Asociados',
      moduleDescription: 'Gestion de altas, modificaciones y bajas de los miembros de cada asociacion federada.'
    }
  },
  {
    path: 'asociados/gestion',
    component: AsociadosGestionComponent,
    title: 'Gestion de asociados',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'solicitudes:write',
      moduleName: 'Gestion de asociados',
      moduleDescription: 'Altas, modificaciones y bajas de los miembros de la asociacion.'
    }
  },
  {
    path: 'asociacion',
    component: AsociacionComponent,
    title: 'Asociacion',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'asociacion:read',
      moduleName: 'Asociacion',
      moduleDescription: 'Administracion de los datos oficiales de la asociacion.'
    }
  },
  {
    path: 'calendario',
    component: CalendarioComponent,
    title: 'Calendario',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'inscripciones:read',
      moduleName: 'Calendario',
      moduleDescription: 'Calendario visual de actividades de secretaria e inscripciones vinculadas.'
    }
  },
  {
    path: 'inscripciones',
    component: InscripcionesComponent,
    title: 'Inscripciones',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'inscripciones:read',
      moduleName: 'Inscripciones',
      moduleDescription: 'Permite apuntar a asociados de la entidad en eventos y actividades ya existentes.'
    }
  },
  {
    path: 'formularios',
    component: FormulariosComponent,
    title: 'Formularios',
    canActivate: [AuthGuard, permissionGuard, adminGuard],
    data: {
      permission: 'inscripciones:write',
      moduleName: 'Formularios',
      moduleDescription: 'Constructor de plantillas de formulario reutilizables para inscripciones.'
    }
  },
  {
    path: 'inscripciones/nueva',
    component: InscripcionesComponent,
    title: 'Crear inscripcion',
    canActivate: [AuthGuard, permissionGuard, adminGuard],
    data: {
      permission: 'inscripciones:write',
      moduleName: 'Inscripciones',
      moduleDescription: 'Creacion de una nueva inscripcion.'
    }
  },
  {
    path: 'inscripciones/:id',
    component: InscripcionesComponent,
    title: 'Detalle de inscripcion',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'inscripciones:read',
      moduleName: 'Inscripciones',
      moduleDescription: 'Detalle de una inscripcion para gestion o presentacion.'
    }
  },
  {
    path: 'registro',
    component: RegistroComponent,
    title: 'Registro',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'registro:read',
      moduleName: 'Registro',
      moduleDescription: 'Subida de documentos para registro de entrada y comunicaciones directas con la Federacion.'
    }
  },
  {
    path: 'registro/documentacion',
    component: RegistroComponent,
    title: 'Registro',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'registro:read',
      moduleName: 'Registro',
      moduleDescription: 'Listado de documentacion presentada o solicitada y presentacion de nueva documentacion.'
    }
  },
  {
    path: 'registro/comunicacion',
    component: RegistroComponent,
    title: 'Registro',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'registro:read',
      moduleName: 'Registro',
      moduleDescription: 'Listado de comunicaciones realizadas y recibidas.'
    }
  },
  {
    path: 'solicitudes',
    component: SolicitudesComponent,
    title: 'Solicitudes',
    canActivate: [AuthGuard, permissionGuard],
    data: {
      permission: 'solicitudes:validate',
      moduleName: 'Solicitudes',
      moduleDescription: 'Revision y validacion de solicitudes enviadas por las asociaciones.'
    }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
