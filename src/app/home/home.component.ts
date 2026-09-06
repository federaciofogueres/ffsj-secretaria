import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminAccessService } from '../core/admin-access.service';
import { DashboardAdminResumen, DashboardAsociacionResumen } from '../core/models';
import { DashboardSummaryService } from '../core/dashboard-summary.service';
import { PermissionsService } from '../core/permissions.service';

interface ModuleTile {
  title: string;
  description: string;
  path: string;
  accent: string;
  icon: string;
  permission: string;
}

interface TaskCard {
  title: string;
  value: string;
  icon: string;
  tone: string;
  path: string;
  count?: number;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  readonly isAdmin: boolean;
  dashboardLoading = false;
  dashboardError = false;
  associationSummary: DashboardAsociacionResumen = {
    solicitudesConIncidencia: 0,
    inscripcionesAbiertas: 0,
    comunicacionesNuevas: 0,
    autorizacionesAltaPendientes: 0
  };
  adminSummary: DashboardAdminResumen = {
    solicitudesPendientes: 0,
    incidenciasRespondidas: 0,
    comunicacionesPendientes: 0,
    documentacionRecibida: 0
  };

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
    readonly adminAccess: AdminAccessService,
    private readonly dashboardSummary: DashboardSummaryService
  ) {
    this.isAdmin = this.adminAccess.isAdmin();
  }

  ngOnInit(): void {
    this.dashboardSummary.associationChanges.subscribe(summary => this.associationSummary = summary);
    this.dashboardSummary.adminChanges.subscribe(summary => this.adminSummary = summary);
    this.dashboardSummary.loadingChanges.subscribe(loading => this.dashboardLoading = loading);
    this.dashboardSummary.errorChanges.subscribe(error => this.dashboardError = error);

    if (this.isAdmin) {
      this.dashboardSummary.loadAdmin();
    } else {
      const asociacionId = this.permissions.contextSnapshot?.asociacionId;
      if (asociacionId) {
        this.dashboardSummary.loadAssociation(asociacionId);
      }
    }
  }

  get taskCards(): TaskCard[] {
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

  get associationTasks(): TaskCard[] {
    return [
      {
        title: 'Solicitudes con incidencia',
        value: this.formatCount(this.associationSummary.solicitudesConIncidencia, 'solicitud', 'solicitudes'),
        count: this.associationSummary.solicitudesConIncidencia,
        icon: 'bi-exclamation-triangle-fill',
        tone: 'orange',
        path: '/asociados/gestion',
        queryParams: { tab: 'solicitudes', filtro: 'incidencias' }
      },
      {
        title: 'Altas pendientes de firma',
        value: this.formatCount(this.associationSummary.autorizacionesAltaPendientes || 0, 'pendiente', 'pendientes'),
        count: this.associationSummary.autorizacionesAltaPendientes || 0,
        icon: 'bi-pen-fill',
        tone: 'orange',
        path: '/asociados/gestion',
        queryParams: { tab: 'solicitudes' }
      },
      {
        title: 'Inscripciones abiertas',
        value: this.formatCount(this.associationSummary.inscripcionesAbiertas, 'abierta', 'abiertas'),
        count: this.associationSummary.inscripcionesAbiertas,
        icon: 'bi-clipboard-check-fill',
        tone: 'blue',
        path: '/inscripciones'
      },
      {
        title: 'Comunicaciones nuevas',
        value: this.formatCount(this.associationSummary.comunicacionesNuevas, 'nueva', 'nuevas'),
        count: this.associationSummary.comunicacionesNuevas,
        icon: 'bi-envelope-fill',
        tone: 'gray',
        path: '/registro/comunicacion',
        queryParams: { bandeja: 'recibidas', filtro: 'nuevas' }
      }
    ];
  }

  get adminTasks(): TaskCard[] {
    return [
      {
        title: 'Solicitudes pendientes',
        value: this.formatCount(this.adminSummary.solicitudesPendientes, 'pendiente', 'pendientes'),
        count: this.adminSummary.solicitudesPendientes,
        icon: 'bi-file-earmark-check-fill',
        tone: 'blue',
        path: '/solicitudes'
      },
      {
        title: 'Incidencias respondidas',
        value: this.formatCount(this.adminSummary.incidenciasRespondidas, 'respondida', 'respondidas'),
        count: this.adminSummary.incidenciasRespondidas,
        icon: 'bi-chat-dots-fill',
        tone: 'orange',
        path: '/solicitudes'
      },
      {
        title: 'Comunicaciones pendientes',
        value: this.formatCount(this.adminSummary.comunicacionesPendientes, 'pendiente', 'pendientes'),
        count: this.adminSummary.comunicacionesPendientes,
        icon: 'bi-envelope-fill',
        tone: 'gray',
        path: '/registro/comunicacion'
      },
      {
        title: 'Documentacion recibida',
        value: this.formatCount(this.adminSummary.documentacionRecibida, 'recibida', 'recibidas'),
        count: this.adminSummary.documentacionRecibida,
        icon: 'bi-inbox-fill',
        tone: 'blue',
        path: '/registro/documentacion'
      }
    ];
  }

  private formatCount(value: number, singular: string, plural: string): string {
    if (this.dashboardLoading) {
      return 'Cargando...';
    }
    if (this.dashboardError) {
      return 'No disponible';
    }
    return `${value} ${value === 1 ? singular : plural}`;
  }
}
