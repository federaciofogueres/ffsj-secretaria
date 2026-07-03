import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
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
    }
  ];

  constructor(readonly permissions: PermissionsService) {}
}
