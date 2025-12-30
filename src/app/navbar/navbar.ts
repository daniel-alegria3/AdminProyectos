import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@/auth/auth.service';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService)

  isAdmin = signal(false);

  currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  showNavbar = computed(() => {
    return !this.currentUrl().startsWith('/auth');
  });

  ngOnInit() {
    this.checkAdminStatus();
  }

  async checkAdminStatus() {
    const admin = await this.authService.isAdmin();
    this.isAdmin.set(admin);
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/auth']);
    });
  }
}
