import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, FfsjAlertComponent } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged, filter } from 'rxjs';
import { AdminAccessService } from './core/admin-access.service';
import { PermissionsService } from './core/permissions.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FfsjAlertComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  readonly title = 'ffsj-secretaria';

  readonly navLinks = [
    { path: '/', label: 'Inicio', icon: 'bi-house-fill' },
    { path: '/asociados', label: 'Asociados', icon: 'bi-people-fill', permission: 'asociados:read', associationOnly: true },
    { path: '/asociacion', label: 'Datos', icon: 'bi-building-fill', permission: 'asociacion:read', associationOnly: true },
    { path: '/calendario', label: 'Calendario', icon: 'bi-calendar-event-fill', permission: 'inscripciones:read' },
    { path: '/inscripciones', label: 'Inscripciones', icon: 'bi-clipboard-check-fill', permission: 'inscripciones:read' },
    { path: '/formularios', label: 'Formularios', icon: 'bi-ui-checks-grid', permission: 'inscripciones:write', adminOnly: true },
    { path: '/registro', label: 'Registro', icon: 'bi-inbox-fill', permission: 'registro:read' },
    { path: '/solicitudes', label: 'Solicitudes', icon: 'bi-file-earmark-check-fill', permission: 'solicitudes:validate' },
    { path: '/admin', label: 'Permisos', icon: 'bi-shield-lock-fill', adminOnly: true }
  ];

  menuOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  associationName = '';
  currentUrl = '/';
  private loginSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private contextSubscription?: Subscription;

  constructor(
    readonly auth: AuthService,
    readonly adminAccess: AdminAccessService,
    private readonly permissions: PermissionsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.isAdmin = this.isLoggedIn && this.adminAccess.isAdmin();
    if (this.isLoggedIn) {
      this.permissions.loadContext().subscribe();
    }
    this.contextSubscription = this.permissions.contextChanges.subscribe(context => {
      this.associationName = context?.asociacionNombre || context?.nombre || '';
    });
    this.loginSubscription = this.auth.loginStatusObservable.pipe(distinctUntilChanged()).subscribe(isLogged => {
      this.isLoggedIn = isLogged;
      this.isAdmin = isLogged && this.adminAccess.isAdmin();
      if (isLogged) {
        this.permissions.loadContext().subscribe();
      } else {
        this.permissions.clear();
      }
    });
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.currentUrl = event.urlAfterRedirects;
        this.closeMenu();
      });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
    this.contextSubscription?.unsubscribe();
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

  canShowLink(link: { permission?: string; adminOnly?: boolean }): boolean {
    if (link.adminOnly) {
      return this.isAdmin;
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
}
