import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminAccessService } from '../core/admin-access.service';
import { PermissionsService } from '../core/permissions.service';

interface ModuleTile {
  title: string;
  description: string;
  path: string;
  accent: string;
  icon: string;
  permission: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  readonly isAdmin: boolean;

  readonly modules: ModuleTile[] = [
    {
      title: 'Asociados',
      description: 'Altas, modificaciones y bajas de los miembros de la asociacion.',
      path: '/asociados',
      accent: '#f9c74f',
      icon: 'bi-people-fill',
      permission: 'asociados:read'
    },
    {
      title: 'Asociacion',
      description: 'Actualizacion de los datos oficiales de la entidad federada.',
      path: '/asociacion',
      accent: '#90be6d',
      icon: 'bi-building-fill',
      permission: 'asociacion:read'
    },
    {
      title: 'Inscripciones',
      description: 'Apunta a las personas asociadas a eventos y actividades disponibles.',
      path: '/inscripciones',
      accent: '#00b4d8',
      icon: 'bi-clipboard-check-fill',
      permission: 'inscripciones:read'
    },
    {
      title: 'Registro',
      description: 'Sube documentos para obtener un numero de registro o envia comunicaciones.',
      path: '/registro',
      accent: '#f3722c',
      icon: 'bi-inbox-fill',
      permission: 'registro:read'
    },
    {
      title: 'Solicitudes',
      description: 'Revision y validacion de solicitudes enviadas por las asociaciones.',
      path: '/solicitudes',
      accent: '#c4141c',
      icon: 'bi-file-earmark-check-fill',
      permission: 'solicitudes:validate'
    }
  ];

  constructor(
    readonly permissions: PermissionsService,
    readonly adminAccess: AdminAccessService
  ) {
    this.isAdmin = this.adminAccess.isAdmin();
  }

  readonly associationTasks = [
    { title: 'Solicitudes con incidencia', value: 'Revisar', icon: 'bi-exclamation-triangle-fill', tone: 'orange', path: '/asociados/gestion' },
    { title: 'Inscripciones abiertas', value: 'Ver plazos', icon: 'bi-clipboard-check-fill', tone: 'blue', path: '/inscripciones' },
    { title: 'Comunicaciones nuevas', value: 'Leer', icon: 'bi-envelope-fill', tone: 'gray', path: '/registro' }
  ];

  readonly adminTasks = [
    { title: 'Solicitudes pendientes', value: 'Validar', icon: 'bi-file-earmark-check-fill', tone: 'blue', path: '/solicitudes' },
    { title: 'Incidencias respondidas', value: 'Revisar', icon: 'bi-chat-dots-fill', tone: 'orange', path: '/solicitudes' },
    { title: 'Registros recibidos', value: 'Gestionar', icon: 'bi-inbox-fill', tone: 'gray', path: '/registro' }
  ];

  get taskCards(): typeof this.associationTasks {
    return this.isAdmin ? this.adminTasks : this.associationTasks;
  }

  get heading(): string {
    return this.isAdmin ? 'Mesa de trabajo administrativa' : 'Que necesitas hacer';
  }

  get subheading(): string {
    return this.isAdmin
      ? 'Revisa solicitudes, incidencias, registros y configuracion desde un unico punto.'
      : 'Accede rapido a los tramites habituales de tu asociacion.';
  }
}
