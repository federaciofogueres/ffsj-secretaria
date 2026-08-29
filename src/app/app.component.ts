import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, FfsjAlertComponent } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged, filter } from 'rxjs';
import { AdminAccessService } from './core/admin-access.service';
import { PermissionsService } from './core/permissions.service';
import { EjercicioService } from './core/ejercicio.service';
import { DashboardAdminResumen, DashboardAsociacionResumen, EjercicioSecretaria } from './core/models';
import { DashboardSummaryService } from './core/dashboard-summary.service';
import { SecretariaService } from './core/secretaria.service';

interface PendingTask {
  title: string;
  count: number;
  icon: string;
  path: string;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, FfsjAlertComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  readonly title = 'ffsj-secretaria';

  readonly navLinks = [
    { path: '/', label: 'Inicio', icon: 'bi-house-fill' },
    { path: '/asociados', label: 'Asociados', icon: 'bi-people-fill', permission: 'asociados:read', associationOnly: true },
    { path: '/asociacion', label: 'Datos', icon: 'bi-building-fill', permission: 'asociacion:read', associationOnly: true },
    { path: '/soporte', label: 'Soporte', icon: 'bi-headset' },
    { path: '/calendario', label: 'Calendario', icon: 'bi-calendar-event-fill', permission: 'inscripciones:read' },
    { path: '/inscripciones', label: 'Inscripciones', icon: 'bi-clipboard-check-fill', permission: 'inscripciones:read' },
    { path: '/formularios', label: 'Formularios', icon: 'bi-ui-checks-grid', permission: 'inscripciones:write', adminOnly: true },
    { path: '/ejercicios', label: 'Ejercicios', icon: 'bi-calendar2-range-fill', permission: 'admin:permissions', adminOnly: true },
    { path: '/registro', label: 'Registro', icon: 'bi-inbox-fill', permission: 'registro:read' },
    { path: '/solicitudes', label: 'Solicitudes', icon: 'bi-file-earmark-check-fill', permission: 'solicitudes:validate' },
    { path: '/admin', label: 'Permisos', icon: 'bi-shield-lock-fill', permission: 'admin:permissions', adminOnly: true }
    ,{ path: '/admin/soporte', label: 'Soporte', icon: 'bi-headset', adminOnly: true }
  ];

  menuOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  associationName = '';
  associationType = '';
  ejercicios: EjercicioSecretaria[] = [];
  selectedEjercicioId: number | null = null;
  currentUrl = '/';
  ejercicioError = '';
  ejercicioSuccess = '';
  iniciandoEjercicio = false;
  showIniciarEjercicioDialog = false;
  associationSelectorOpen = false;
  exerciseListOpen = false;
  ejercicioSearch = '';
  tareasOpen = false;
  tareasLoading = false;
  tareasError = false;
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
  private loginSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private contextSubscription?: Subscription;
  private ejerciciosSubscription?: Subscription;
  private selectedEjercicioSubscription?: Subscription;
  private tareasSubscription?: Subscription;
  private tareasLoadingSubscription?: Subscription;
  private tareasErrorSubscription?: Subscription;

  constructor(
    readonly auth: AuthService,
    readonly adminAccess: AdminAccessService,
    private readonly permissions: PermissionsService,
    readonly ejerciciosService: EjercicioService,
    private readonly router: Router,
    private readonly secretariaService: SecretariaService,
    private readonly dashboardSummary: DashboardSummaryService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.isAdmin = this.isLoggedIn && this.adminAccess.isAdmin();
    if (this.isLoggedIn) {
      this.permissions.loadContext().subscribe();
    }
    this.contextSubscription = this.permissions.contextChanges.subscribe(context => {
      this.associationName = context?.asociacionNombre || context?.nombre || '';
      this.associationType = context?.asociacionTipo || '';
      if (!context) {
        this.dashboardSummary.clear();
      } else if (this.isAdmin) {
        this.dashboardSummary.loadAdmin();
      } else if (context.asociacionId) {
        this.dashboardSummary.loadAssociation(context.asociacionId);
      }
    });
    this.ejerciciosSubscription = this.ejerciciosService.ejerciciosChanges.subscribe(ejercicios => {
      this.ejercicios = ejercicios;
    });
    this.selectedEjercicioSubscription = this.ejerciciosService.selectedChanges.subscribe(ejercicio => {
      this.selectedEjercicioId = ejercicio?.id ?? null;
    });
    this.tareasSubscription = new Subscription();
    this.tareasSubscription.add(this.dashboardSummary.associationChanges.subscribe(summary => this.associationSummary = summary));
    this.tareasSubscription.add(this.dashboardSummary.adminChanges.subscribe(summary => this.adminSummary = summary));
    this.tareasLoadingSubscription = this.dashboardSummary.loadingChanges.subscribe(loading => this.tareasLoading = loading);
    this.tareasErrorSubscription = this.dashboardSummary.errorChanges.subscribe(error => this.tareasError = error);
    this.loginSubscription = this.auth.loginStatusObservable.pipe(distinctUntilChanged()).subscribe(isLogged => {
      this.isLoggedIn = isLogged;
      this.isAdmin = isLogged && this.adminAccess.isAdmin();
      if (isLogged) {
        this.permissions.loadContext().subscribe();
      } else {
        this.permissions.clear();
        this.dashboardSummary.clear();
      }
    });
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.currentUrl = event.urlAfterRedirects;
        this.closeMenu();
        this.closeHeaderPopovers();
      });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
    this.contextSubscription?.unsubscribe();
    this.ejerciciosSubscription?.unsubscribe();
    this.selectedEjercicioSubscription?.unsubscribe();
    this.tareasSubscription?.unsubscribe();
    this.tareasLoadingSubscription?.unsubscribe();
    this.tareasErrorSubscription?.unsubscribe();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.auth.logout();
  }

  onEjercicioChange(ejercicioId: number | string | null): void {
    if (!ejercicioId) {
      return;
    }
    this.ejerciciosService.select(Number(ejercicioId));
    this.closeHeaderPopovers();
    const url = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigateByUrl(url));
  }

  get ejercicioSinIniciar(): boolean {
    return !this.isAdmin && this.ejerciciosService.isSelectedActive
      && this.ejerciciosService.selectedSnapshot?.estadoAsociacion === 'SIN_INICIAR';
  }

  abrirDialogoIniciarEjercicio(): void {
    const ejercicio = this.ejerciciosService.selectedSnapshot;
    if (!ejercicio || !this.ejercicioSinIniciar || this.iniciandoEjercicio) return;
    this.ejercicioError = '';
    this.ejercicioSuccess = '';
    this.showIniciarEjercicioDialog = true;
  }

  cerrarDialogoIniciarEjercicio(): void {
    if (!this.iniciandoEjercicio) {
      this.showIniciarEjercicioDialog = false;
    }
  }

  iniciarEjercicioAsociacion(): void {
    const ejercicio = this.ejerciciosService.selectedSnapshot;
    if (!ejercicio || !this.ejercicioSinIniciar || this.iniciandoEjercicio) return;

    this.iniciandoEjercicio = true;
    this.ejercicioError = '';
    this.secretariaService.iniciarEjercicio(ejercicio.id).subscribe({
      next: () => {
        this.iniciandoEjercicio = false;
        this.showIniciarEjercicioDialog = false;
        this.ejercicioSuccess = `Ejercicio ${ejercicio.ejercicio} iniciado correctamente.`;
        this.ejerciciosService.load();
      },
      error: () => {
        this.iniciandoEjercicio = false;
        this.ejercicioError = 'No se ha podido iniciar el ejercicio. Intentalo de nuevo.';
      }
    });
  }

  canShowLink(link: { permission?: string; adminOnly?: boolean }): boolean {
    if (link.adminOnly && !this.isAdmin) {
      return false;
    }
    if ('associationOnly' in link && link.associationOnly && this.isAdmin) {
      return false;
    }
    return !link.permission || this.permissions.hasPermission(link.permission);
  }

  get modeLabel(): string {
    return this.isAdmin ? 'Administracion' : this.associationName || 'Asociacion';
  }

  get actorLabel(): string {
    return this.isAdmin ? 'Personal autorizado' : 'Asociacion';
  }

  get visibleMobileLinks(): typeof this.navLinks {
    return this.navLinks.filter(link => this.canShowLink(link)).slice(0, 4);
  }

  get associationDisplayName(): string {
    return this.isAdmin ? 'Administracion FFSJ' : this.associationName || 'Asociacion';
  }

  get associationTypeLabel(): string {
    return this.isAdmin ? 'Personal autorizado' : this.associationType || 'Asociacion federada';
  }

  get selectedEjercicioLabel(): string {
    const ejercicio = this.ejerciciosService.selectedSnapshot;
    return ejercicio ? `Ejercicio ${ejercicio.ejercicio}` : 'Sin ejercicio seleccionado';
  }

  get ejerciciosFiltrados(): EjercicioSecretaria[] {
    const search = this.ejercicioSearch.trim().toLowerCase();
    return this.ejercicios
      .filter(ejercicio => !search || String(ejercicio.ejercicio).includes(search))
      .slice(0, 10);
  }

  get tareasPendientes(): number {
    return this.tareas.reduce((total, task) => total + task.count, 0);
  }

  get tareas(): PendingTask[] {
    if (this.isAdmin) {
      return ([
        { title: 'Solicitudes pendientes', count: this.adminSummary.solicitudesPendientes, icon: 'bi-file-earmark-check-fill', path: '/solicitudes' },
        { title: 'Incidencias respondidas', count: this.adminSummary.incidenciasRespondidas, icon: 'bi-chat-dots-fill', path: '/solicitudes' },
        { title: 'Comunicaciones pendientes', count: this.adminSummary.comunicacionesPendientes, icon: 'bi-envelope-fill', path: '/registro/comunicacion' },
        { title: 'Documentacion recibida', count: this.adminSummary.documentacionRecibida, icon: 'bi-inbox-fill', path: '/registro/documentacion' }
      ] as PendingTask[]).filter(tarea => tarea.count > 0);
    }

    return ([
      { title: 'Solicitudes con incidencia', count: this.associationSummary.solicitudesConIncidencia, icon: 'bi-exclamation-triangle-fill', path: '/asociados/gestion', queryParams: { tab: 'solicitudes', filtro: 'incidencias' } },
      { title: 'Altas pendientes de firma', count: this.associationSummary.autorizacionesAltaPendientes || 0, icon: 'bi-pen-fill', path: '/asociados/gestion', queryParams: { tab: 'solicitudes' } },
      { title: 'Inscripciones abiertas', count: this.associationSummary.inscripcionesAbiertas, icon: 'bi-clipboard-check-fill', path: '/inscripciones' },
      { title: 'Comunicaciones nuevas', count: this.associationSummary.comunicacionesNuevas, icon: 'bi-envelope-fill', path: '/registro/comunicacion', queryParams: { bandeja: 'recibidas', filtro: 'nuevas' } }
    ] as PendingTask[]).filter(tarea => tarea.count > 0);
  }

  toggleAssociationSelector(): void {
    this.associationSelectorOpen = !this.associationSelectorOpen;
    this.tareasOpen = false;
    this.exerciseListOpen = false;
    this.ejercicioSearch = '';
  }

  toggleTareas(): void {
    this.tareasOpen = !this.tareasOpen;
    this.associationSelectorOpen = false;
  }

  openTareasFromMenu(): void {
    this.closeMenu();
    this.tareasOpen = true;
    this.associationSelectorOpen = false;
  }

  closeTareas(): void {
    this.tareasOpen = false;
  }

  toggleExerciseList(): void {
    this.exerciseListOpen = !this.exerciseListOpen;
    this.ejercicioSearch = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest('.association-wrapper')) {
      this.closeHeaderPopovers();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeHeaderPopovers();
  }

  private closeHeaderPopovers(): void {
    this.associationSelectorOpen = false;
    this.tareasOpen = false;
    this.exerciseListOpen = false;
    this.ejercicioSearch = '';
  }
}
