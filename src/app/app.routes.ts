import { Routes } from '@angular/router';

import { Auth } from './auth/auth';
import { Home } from '@/home/home';
import { Task } from '@/task/task';
import { BackendTest } from './backend-test/backend-test';

export const routes: Routes = [
  { path: 'auth', component: Auth },
  { path: 'home', component: Home },
  { path: 'task', component: Task },

  { path: 'backend-test', component: BackendTest },

  { path: 'projects', loadComponent: () => import('./projects/project.page').then(m => m.ProjectsPage) },

  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: '**', redirectTo: '/projects' },
];
