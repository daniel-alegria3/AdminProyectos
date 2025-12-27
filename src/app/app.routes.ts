import { Routes } from '@angular/router';

import { Auth } from './auth/auth';
import { Task } from '@/task/task';
import { BackendTest } from './backend-test/backend-test';
import { authGuard, guestGuard } from '@/auth/auth.guard';
import { TaskDetailComponent } from './components/task-detail/task-detail';
 
export const routes: Routes = [
  { path: 'task/:id', component: TaskDetailComponent },
  { path: 'auth', component: Auth, canActivate: [guestGuard] },
  {
    path: 'projects',
    loadComponent: () => import('./projects/project.page').then((m) => m.ProjectsPage),
    canActivate: [authGuard],
  },
  { path: 'task', component: Task, canActivate: [authGuard] },
  { path: 'backend-test', component: BackendTest },

  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes),
    // canActivate: [AdminGuard], // TODO
  },

  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: '**', redirectTo: '/projects' }, // TODO: 404 page, url not found
];
