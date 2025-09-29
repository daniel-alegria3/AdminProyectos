import { Component, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectListComponent } from './project-list.component';
import { CreateProjectComponent } from './create-project.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ProjectListComponent, CreateProjectComponent],
  templateUrl: './projects.html',
  styleUrls: ['./projects.css'],
})
export class ProjectsPage {
  protected readonly title = signal('Gestión de Proyectos');
  showCreate = false;

  openCreate() { this.showCreate = true; }
  closeCreate() { this.showCreate = false; }

  onCreated() {
    this.showCreate = false;
    // La lista escucha su propio refresh; aquí no hace falta nada más
  }
}
