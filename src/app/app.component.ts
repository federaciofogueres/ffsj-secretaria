import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, FfsjAlertComponent } from 'ffsj-web-components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FfsjAlertComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly title = 'ffsj-secretaria';

  readonly navLinks = [
    { path: '/asociados', label: 'Asociados', icon: 'bi-people-fill' },
    { path: '/asociacion', label: 'Asociacion', icon: 'bi-building-fill' },
    { path: '/inscripciones', label: 'Inscripciones', icon: 'bi-clipboard-check-fill' },
    { path: '/registro', label: 'Registro', icon: 'bi-inbox-fill' }
  ];

  menuOpen = false;

  constructor(readonly auth: AuthService) {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.auth.logout();
  }
}
