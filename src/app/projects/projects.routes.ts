import { Routes } from '@angular/router';
import { ProjectsPage } from './project.page';

export const PROJECTS_ROUTES: Routes = [
  { path: '', component: ProjectsPage },            // /projects
  // si luego quieres detalles: /projects/:id
  // { path: ':id', loadComponent: () => import('./project-detail.page').then(m => m.ProjectDetailPage) },
];
