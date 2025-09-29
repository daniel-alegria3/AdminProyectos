import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: 'users',
    loadComponent: () => import('./user-management/user-management').then(m => m.UserManagement),
    title: 'Gestión de Usuarios'
  },

  { path: '', redirectTo: 'users', pathMatch: 'full' },
];
