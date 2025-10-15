import { Component, ViewEncapsulation, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskListComponent } from './task-list.component';
import { TaskFormComponent } from './task-form.component';

@Component({
  selector: 'app-task',
  imports: [CommonModule, FormsModule, TaskListComponent, TaskFormComponent],
  templateUrl: './task.html',
  styleUrl: './task.css',
  encapsulation: ViewEncapsulation.ShadowDom
})

export class Task {
  projectId: string | null = null;
  mostrarFormulario = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.projectId = params['project_id'] || null;
    });
  }

  abrirFormulario() {
    this.mostrarFormulario = true;
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
  }

  onTareaCreada() {
    this.mostrarFormulario = false;
    // La recarga de tareas se maneja automáticamente en TaskListComponent
  }
}
