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

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: '' }, // TODO: create 404 page
];
