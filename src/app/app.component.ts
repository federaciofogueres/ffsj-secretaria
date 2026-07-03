import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, FfsjAlertComponent } from 'ffsj-web-components';
import { AdminAccessService } from './core/admin-access.service';
import { PermissionsService } from './core/permissions.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FfsjAlertComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  readonly title = 'ffsj-secretaria';

  readonly navLinks = [
    { path: '/asociados', label: 'Asociados', icon: 'bi-people-fill', permission: 'asociados:read' },
    { path: '/asociacion', label: 'Asociacion', icon: 'bi-building-fill', permission: 'asociacion:read' },
    { path: '/inscripciones', label: 'Inscripciones', icon: 'bi-clipboard-check-fill', permission: 'inscripciones:read' },
    { path: '/registro', label: 'Registro', icon: 'bi-inbox-fill', permission: 'registro:read' },
    { path: '/admin', label: 'Admin', icon: 'bi-shield-lock-fill', adminOnly: true }
  ];

  menuOpen = false;

  constructor(
    readonly auth: AuthService,
    readonly adminAccess: AdminAccessService,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.permissions.loadContext().subscribe();
    }
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
