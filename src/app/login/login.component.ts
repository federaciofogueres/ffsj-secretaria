import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FfsjLoginAsociacionesComponent } from 'ffsj-web-components';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FfsjLoginAsociacionesComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  constructor(private readonly router: Router) {}

  onLogStatus(logged: boolean): void {
    if (logged) {
      this.router.navigateByUrl('/');
    }
  }
}
