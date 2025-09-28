import { Routes } from '@angular/router';
import { Home } from '@/home/home';
import { Task } from '@/task/task';

import { BackendTest } from './backend-test/backend-test';

export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'task', component: Task },
  { path: 'backend-test', component: BackendTest },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
    // canActivate: [AdminGuard] // TODO: investigar que es, como crear 'guards'?
  },

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: '' }, // TODO: create 404 page
];
