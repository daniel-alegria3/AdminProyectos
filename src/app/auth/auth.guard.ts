import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  console.error("authGuard")
  const authService = inject(AuthService);
  const router = inject(Router);

  if (await authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/auth']);
  return false;
};

export const guestGuard: CanActivateFn = async () => {
  console.info("guestGuard")
  const authService = inject(AuthService);
  const router = inject(Router);

  if (await authService.isLoggedIn()) {
    if (await authService.isAdmin) {
      router.navigate(['/admin']);
    } else {
      router.navigate(['/projects']);
    }
    return false;
  }

  return true;
};

export const adminGuard: CanActivateFn = async () => {
  console.warn("==============================================================")
  const authService = inject(AuthService);
  const router = inject(Router);

  if (await authService.isLoggedIn()) {
    if (await authService.isAdmin()) {
      return true;
    } else {
      router.navigate(['/projects']);
      return false
    }
  }

  router.navigate(['/auth']);
  return false;
};
