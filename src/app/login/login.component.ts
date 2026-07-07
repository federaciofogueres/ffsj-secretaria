import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly cif = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly password = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  loading = false;
  error = '';
  private loginSubscription?: Subscription;
  private hasNavigated = false;

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loginSubscription = this.auth.loginStatusObservable.pipe(distinctUntilChanged()).subscribe(logged => {
      if (logged) {
        this.goHome();
      }
    });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
  }

  onLogStatus(logged: boolean): void {
    if (logged) {
      this.goHome();
    }
  }

  async login(): Promise<void> {
    this.error = '';
    this.cif.markAsTouched();
    this.password.markAsTouched();

    if (this.cif.invalid || this.password.invalid || this.loading) {
      this.error = 'Introduce el CIF de la asociacion y la contrasena.';
      return;
    }

    this.loading = true;
    const result = await this.auth.loginAsociacion(this.cif.value.trim(), this.password.value);
    this.loading = false;

    if (result.code === 200) {
      this.goHome();
      return;
    }

    this.error = 'No hemos podido iniciar sesion. Revisa el CIF y la contrasena.';
  }

  private goHome(): void {
    if (this.hasNavigated) {
      return;
    }
    this.hasNavigated = true;
    this.zone.run(() => {
      this.router.navigateByUrl('/');
    });
  }
}
