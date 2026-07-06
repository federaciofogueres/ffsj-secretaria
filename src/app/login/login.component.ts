import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, FfsjLoginAsociacionesComponent } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FfsjLoginAsociacionesComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
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
