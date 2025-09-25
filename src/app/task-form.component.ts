import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarea, Archivo } from './models';
import { TaskService } from './task.service';

@Component({
  selector: 'task-form',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="cerrar()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="form-container">
          <div class="form-header">
            <h2>Crear Tarea</h2>
            <button type="button" class="btn-cerrar" (click)="cerrar()">✕</button>
          </div>
          
          <form (ngSubmit)="crearTarea()" #form="ngForm">
        <div class="form-group">
          <label>Título:</label>
          <input type="text" name="titulo" [(ngModel)]="tarea.titulo" required>
        </div>
        <div class="form-group">
          <label>Descripción:</label>
          <textarea name="descripcion" [(ngModel)]="tarea.descripcion" required></textarea>
        </div>
        <div class="form-group">
          <label>Fecha Inicio:</label>
          <input type="date" name="fechaInicio" [(ngModel)]="tarea.fechaInicio" required>
        </div>
        <div class="form-group">
          <label>Fecha Fin:</label>
          <input type="date" name="fechaFin" [(ngModel)]="tarea.fechaFin" required>
        </div>
        <div class="form-group">
          <label>Usuario Asignado:</label>
          <div class="user-selector-container">
            <input type="text" name="usuario" [(ngModel)]="tarea.usuario" [value]="usuarioActual" readonly placeholder="Seleccione un usuario">
            <button type="button" class="user-selector-btn" (click)="mostrarSelectorUsuario = !mostrarSelectorUsuario">
              👤 {{ usuarioActual || 'Seleccionar' }}
            </button>
            <div class="user-dropdown" *ngIf="mostrarSelectorUsuario">
              <div class="user-option" 
                   *ngFor="let usuario of usuariosDisponibles" 
                   (click)="seleccionarUsuario(usuario)">
                👤 {{ usuario }}
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Archivos:</label>
          <input type="file" name="archivos" (change)="onFileChange($event)" multiple accept=".pdf,.doc,.docx,.jpg">
        </div>
        <button type="submit" class="btn">Crear Tarea</button>
      </form>
      <div *ngIf="mensaje" class="success-message">{{mensaje}}</div>
        </div>
      </div>
    </div>
  `
})
export class TaskFormComponent {
  @Output() cerrarFormulario = new EventEmitter<void>();
  @Output() tareaCreada = new EventEmitter<void>();
  
  tarea: Tarea = {
    titulo: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    usuario: '',
    archivos: [],
    proyecto: ''
  };
  mensaje = '';
  mostrarSelectorUsuario = false;
  usuarioActual = '';
  usuariosDisponibles = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martín', 'Luis Rodríguez'];
  loading = false;
  selectedFiles: FileList | null = null;

  constructor(private taskService: TaskService) {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    // Intentar cargar usuarios del backend
    this.taskService.getAllUsers().subscribe({
      next: (response) => {
        if (response?.success && response?.data) {
          this.usuariosDisponibles = response.data.map((user: any) => user.name || user.email);
        }
        // Si no hay usuarios del backend, mantiene los predeterminados
      },
      error: (error) => {
        console.error('Error al cargar usuarios del backend, usando lista predeterminada:', error);
        // Mantiene los usuarios predeterminados ya definidos arriba
      }
    });
  }

  onFileChange(event: any) {
    const files = event.target.files;
    this.selectedFiles = files;
    this.tarea.archivos = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.tarea.archivos.push({ nombre: file.name, url: '' });
    }
  }

  seleccionarUsuario(usuario: string) {
    this.usuarioActual = usuario;
    this.tarea.usuario = usuario;
    this.mostrarSelectorUsuario = false;
  }

  crearTarea() {
    if (!this.usuarioActual) {
      alert('Por favor, seleccione un usuario antes de crear la tarea');
      return;
    }

    this.loading = true;
    this.mensaje = '';
    this.tarea.proyecto = 'Proyecto General';

    // Intentar crear en el backend primero
    this.taskService.createTask(this.tarea).subscribe({
      next: (response) => {
        console.log('Respuesta del backend:', response);
        
        if (response?.success) {
          this.mensaje = 'Tarea creada en el backend correctamente';
          
          // Si hay archivos y tenemos un task_id, subirlos
          if (this.selectedFiles && this.selectedFiles.length > 0 && response.data?.task_id) {
            this.taskService.uploadTaskFiles(response.data.task_id, this.selectedFiles).subscribe({
              next: (uploadResponse) => {
                this.loading = false;
                this.mensaje += '. Archivos subidos exitosamente.';
                this.resetForm();
                this.tareaCreada.emit(); // Notificar para recargar lista
              },
              error: (error) => {
                this.loading = false;
                console.error('Error al subir archivos:', error);
                this.mensaje += '. Error al subir archivos.';
                this.resetForm();
                this.tareaCreada.emit();
              }
            });
          } else {
            this.loading = false;
            this.resetForm();
            this.tareaCreada.emit();
          }
        } else {
          // Si el backend responde pero no es exitoso, usar localStorage
          this.guardarEnLocalStorage();
        }
      },
      error: (error) => {
        console.error('Error al conectar con backend, guardando localmente:', error);
        // Si hay error de conexión, guardar en localStorage
        this.guardarEnLocalStorage();
      }
    });
  }

  guardarEnLocalStorage() {
    this.loading = false;
    const tareas = JSON.parse(localStorage.getItem('tareas') || '[]');
    tareas.push({...this.tarea});
    localStorage.setItem('tareas', JSON.stringify(tareas));
    this.mensaje = 'Tarea guardada localmente (backend no disponible)';
    this.resetForm();
    this.tareaCreada.emit();
  }

  resetForm() {
    this.tarea = {
      titulo: '',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      usuario: this.usuarioActual,
      archivos: [],
      proyecto: 'Proyecto General'
    };
    this.selectedFiles = null;
    setTimeout(() => this.mensaje = '', 3000);
  }

  cerrar() {
    this.cerrarFormulario.emit();
  }
}
