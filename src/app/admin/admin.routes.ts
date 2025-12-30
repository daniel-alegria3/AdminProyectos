import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: 'users',
    loadComponent: () => import('./user-management/user-management').then(m => m.UserManagement),
    title: 'Gestión de Usuarios'
  },
  {
    path: 'logs',
    loadComponent: () => import('./logs-management/logs-management').then(m => m.LogsManagement),
    title: 'Gestión de Logs'
  },

  { path: '', redirectTo: 'users', pathMatch: 'full' },
];
