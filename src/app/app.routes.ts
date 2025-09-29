import { Routes } from '@angular/router';

import { Auth } from './auth/auth';
import { Home } from '@/home/home';
import { Task } from '@/task/task';
import { BackendTest } from './backend-test/backend-test';

export const routes: Routes = [
  { path: 'auth', component: Auth },
  { path: 'projects', loadComponent: () => import('./projects/project.page').then(m => m.ProjectsPage) },
  { path: 'task', component: Task },
  { path: 'backend-test', component: BackendTest },

  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
    // canActivate: [AdminGuard] // TODO: investigar que es, como crear 'guards'?
  },

  { path: 'home', redirectTo: '/projects' },
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: '**', redirectTo: '/projects' },
];
