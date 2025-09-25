import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskListComponent } from '../task-list.component';
import { TaskFormComponent } from '../task-form.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, TaskListComponent, TaskFormComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  protected readonly title = signal('AdminProyectos');
  mostrarFormulario = false;

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
