import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/auth']);
  return false;
};

export const authRedirectGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    /// DEBUG
    console.log('not logged in according to authService');

    let res = await fetch('http://localhost:5000/user/is_logged_in', {
      method: 'GET',
      credentials: 'include', // include cookies/session if your auth uses them
    })
      .then(async (res) => {
        console.log('Status:', res.status);
        let data;
        try {
          data = await res.json();
          return data;
        } catch (err) {
          console.log('Response is not JSON.');
          data = await res.text();
        }
        console.log('Response:', data);
      })
      .catch((err) => console.error('Fetch error:', err));
    console.log('Direct Fetch says: ', res);
    /// END DEBUG
    return true;
  }

  /// DEBUG
  console.log('logged in according to authService');
  let res = await fetch('http://localhost:5000/user/is_logged_in', {
    method: 'GET',
    credentials: 'include', // include cookies/session if your auth uses them
  })
    .then(async (res) => {
      console.log('Status:', res.status);
      let data;
      try {
        data = await res.json();
        return data;
      } catch (err) {
        console.log('Response is not JSON.');
        data = await res.text();
      }
      console.log('Response:', data);
    })
    .catch((err) => console.error('Fetch error:', err));
  console.log('Direct Fetch says: ', res);
  /// END DEBUG

  router.navigate(['/projects']);
  return false;
};
