import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, FfsjAlertComponent } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged } from 'rxjs';
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
    { path: '/asociados', label: 'Asociados', icon: 'bi-people-fill', permission: 'asociados:read' },
    { path: '/asociacion', label: 'Asociacion', icon: 'bi-building-fill', permission: 'asociacion:read' },
    { path: '/calendario', label: 'Calendario', icon: 'bi-calendar-event-fill', permission: 'inscripciones:read' },
    { path: '/inscripciones', label: 'Inscripciones', icon: 'bi-clipboard-check-fill', permission: 'inscripciones:read' },
    { path: '/formularios', label: 'Formularios', icon: 'bi-ui-checks-grid', permission: 'inscripciones:write', adminOnly: true },
    { path: '/registro', label: 'Registro', icon: 'bi-inbox-fill', permission: 'registro:read' },
    { path: '/solicitudes', label: 'Solicitudes', icon: 'bi-file-earmark-check-fill', permission: 'solicitudes:validate' },
    { path: '/admin', label: 'Admin', icon: 'bi-shield-lock-fill', adminOnly: true }
  ];

  menuOpen = false;
  isLoggedIn = false;
  private loginSubscription?: Subscription;

  constructor(
    readonly auth: AuthService,
    readonly adminAccess: AdminAccessService,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    if (this.isLoggedIn) {
      this.permissions.loadContext().subscribe();
    }
    this.loginSubscription = this.auth.loginStatusObservable.pipe(distinctUntilChanged()).subscribe(isLogged => {
      this.isLoggedIn = isLogged;
      if (isLogged) {
        this.permissions.loadContext().subscribe();
      } else {
        this.permissions.clear();
      }
    });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
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
      return this.adminAccess.isAdmin();
    }
    return !link.permission || this.permissions.hasPermission(link.permission);
  }
}
