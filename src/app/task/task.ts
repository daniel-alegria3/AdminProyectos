import { Component, ViewEncapsulation, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskListComponent } from './task-list.component';
import { TaskFormComponent } from './task-form.component';
import { Tarea } from './models';

@Component({
  selector: 'app-task',
  imports: [CommonModule, FormsModule, TaskListComponent, TaskFormComponent],
  templateUrl: './task.html',
  styleUrl: './task.css',
  encapsulation: ViewEncapsulation.ShadowDom
})

export class Task {
  @ViewChild(TaskListComponent) taskListComponent!: TaskListComponent;
  
  projectId: string | null = null;
  mostrarFormulario = false;
  tareaEnEdicion: Tarea | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.projectId = params['project_id'] || null;
    });
  }

  abrirFormulario() {
    this.tareaEnEdicion = null; // Limpiar para modo creación
    this.mostrarFormulario = true;
  }

  // Método para abrir el formulario en modo edición
  abrirParaEditar(tarea: Tarea) {
    console.log('📝 Abriendo formulario para editar:', tarea);
    this.tareaEnEdicion = tarea;
    this.mostrarFormulario = true;
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.tareaEnEdicion = null;
  }

  onTareaCreada() {
    console.log('✅ Tarea creada/editada - Refrescando lista...');
    this.mostrarFormulario = false;
    this.tareaEnEdicion = null;
    
    // Recargar la lista de tareas
    if (this.taskListComponent) {
      this.taskListComponent.cargarTareas();
    }
  }
}
