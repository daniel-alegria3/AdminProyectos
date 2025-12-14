import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
  Signal,
} from '@angular/core';
import {
  Router,
  NavigationEnd,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@/auth/auth.service';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly currentUrl: Signal<string> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly showNavbar = computed(() =>
    this.authService.isLoggedIn() && !this.currentUrl().startsWith('/auth'),
  );

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigateByUrl('/auth', { replaceUrl: true });
      },
      error: () => {
        this.router.navigateByUrl('/auth', { replaceUrl: true });
      },
    });
  }
}
