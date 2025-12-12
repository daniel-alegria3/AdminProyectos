import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tarea } from './models';
import { TaskService } from './task.service';

@Component({
  selector: 'task-list',
  imports: [CommonModule],
  template: `
    <div class="task-list-container">
      <div class="panel-header">
        <h2>Panel de Tareas</h2>
        <div class="connection-status" *ngIf="loading">
          🔄 Cargando desde base de datos...
        </div>
        <div class="backend-info" *ngIf="!loading">
          🔗 Datos desde: Backend (MariaDB)
        </div>
      </div>
      <div class="filters">
        <div class="filter-section">
          <label>Usuario:</label>
          <div class="filter-buttons">
            <button
              class="filter-btn"
              [class.active]="filtroUsuario === ''"
              (click)="filtroUsuario = ''">
              Todos
            </button>
            <button
              class="filter-btn"
              [class.active]="filtroUsuario === usuario"
              *ngFor="let usuario of usuariosUnicos"
              (click)="filtroUsuario = usuario">
              👤 {{ usuario }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && tareasFiltradas.length === 0" class="no-tasks">
        📋 No hay tareas en la base de datos. ¡Crea tu primera tarea!
      </div>
      
      <div *ngIf="loading" class="loading-tasks">
        🔄 Cargando tareas desde el backend...
      </div>

      <div *ngFor="let tarea of tareasFiltradas" class="task-item">
        <div class="task-content">
          <div class="task-title">{{ tarea.titulo }}</div>
          <div class="task-user">Asignado a: {{ tarea.usuario }}</div>
          <div class="task-description">{{ tarea.descripcion }}</div>
          <div class="task-project"><strong>Proyecto:</strong> {{ tarea.proyecto }}</div>
          <div class="task-dates">
            <strong>Inicio:</strong> {{ tarea.fechaInicio }} | <strong>Fin:</strong> {{ tarea.fechaFin }}
          </div>
          <div class="task-files" *ngIf="tarea.archivos.length > 0">
            <strong>Archivos adjuntos:</strong>
            <ul>
              <li *ngFor="let archivo of tarea.archivos">{{ archivo.nombre }}</li>
            </ul>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-editar" (click)="editarTarea(tarea)">
            Editar
          </button>
          <button class="btn-eliminar" (click)="confirmarEliminarTarea(tarea)">
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar -->
    <div class="confirmation-modal-overlay" *ngIf="mostrarConfirmacion" (click)="cancelarEliminacion()">
      <div class="confirmation-modal-content" (click)="$event.stopPropagation()">
        <div class="confirmation-header">
          <h3>Confirmar Eliminación</h3>
        </div>
        <div class="confirmation-body">
          <p>¿Está seguro de que desea eliminar la tarea:</p>
          <p class="task-name">"{{ tareaAEliminar?.titulo }}"</p>
          <p class="warning-text">Esta acción no se puede deshacer.</p>
        </div>
        <div class="confirmation-actions">
          <button class="btn-cancel" (click)="cancelarEliminacion()">
            Cancelar
          </button>
          <button class="btn-confirm" (click)="confirmarEliminacion()">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  `
})

export class TaskListComponent implements OnInit {
  @Input() projectId: string | null = null;
  @Output() abrirFormulario = new EventEmitter<void>();

  tareas: Tarea[] = [];
  filtroUsuario: string | number = '';
  mostrarConfirmacion = false;
  tareaAEliminar: Tarea | null = null;
  loading = false;

  constructor(private taskService: TaskService) {
    // Recargar tareas cada 30 segundos para sincronizar con backend

    /* NOTA de daniel: esto se ejecuta incluso cuando no se esta en la pagina de tareas, dejar el tema de syncronizacion para mas tarde.
    setInterval(() => {
      this.cargarTareas();
    }, 30000);
    */
  }

  get usuariosUnicos(): (string | number)[] {
    const usuarios = this.tareas.map(t => t.usuario).filter(u => u);
    return [...new Set(usuarios)];
  }

  get tareasFiltradas(): Tarea[] {
    return this.tareas.filter(t =>
      (this.filtroUsuario ? t.usuario === this.filtroUsuario : true)
    );
  }

  ngOnInit() {
    this.cargarTareas();
    this.tareasFiltradas; // Al cargar la pagina, mostrar las tareas cargadas
  }

  cargarTareas() {
    this.loading = true;
    this.tareas = []; // Limpiar tareas existentes

    // Cargar SOLO desde el backend
    let getTasks;
    if (this.projectId !== null) {
      getTasks = this.taskService.getAllProjectTasks(Number(this.projectId));
    } else {
      getTasks = this.taskService.getUserTasks();
    }

    getTasks.subscribe({
      next: (response) => {
        this.loading = false;
        console.log('Respuesta del backend:', response);
        
        // Mapear los datos del backend al formato del frontend
        if (response?.success && response?.data) {
           this.tareas = response.data.map((task: any) => ({
             id: task.id_task || task.id,
             titulo: task.title || task.titulo || 'Sin título',
             descripcion: task.description || task.descripcion || 'Sin descripción',
             fechaInicio: task.start_date || task.fechaInicio || '',
             fechaFin: task.end_date || task.fechaFin || '',
             usuario: task.assigned_user_name || task.assigned_user || 'Sin asignar',
             proyecto: task.project_title || task.proyecto || 'Proyecto General',
             archivos: task.files || task.archivos || [],
             estado: task.progress_status || task.estado || 'Pendiente'
           }));
          
          console.log(`✅ ${this.tareas.length} tareas cargadas desde el backend`);
        } else {
          console.log('⚠️ Backend respondió pero sin datos de tareas');
          this.tareas = [];
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al conectar con backend:', error);
        console.error('🔧 Verifica que el backend esté ejecutándose en http://localhost:5000');
        this.tareas = [];
      }
    });
  }



  editarTarea(tarea: Tarea) {
    // Por ahora solo mostrar un alert, luego se puede implementar un modal de edición
    alert(`Editar tarea: ${tarea.titulo}`);
  }

  confirmarEliminarTarea(tarea: Tarea) {
    this.tareaAEliminar = tarea;
    this.mostrarConfirmacion = true;
  }

  cancelarEliminacion() {
    this.mostrarConfirmacion = false;
    this.tareaAEliminar = null;
  }

  confirmarEliminacion() {
    if (this.tareaAEliminar) {
      this.eliminarTarea(this.tareaAEliminar);
    }
    this.mostrarConfirmacion = false;
    this.tareaAEliminar = null;
  }

  eliminarTarea(tarea: any) {
    if (!tarea.id) {
      console.error('No se puede eliminar: tarea sin ID');
      alert('Error: No se puede eliminar esta tarea');
      return;
    }

    // TODO: Implementar eliminación en el backend cuando esté disponible
    // Por ahora solo eliminar localmente
    const index = this.tareas.findIndex(t => t.id === tarea.id);
    if (index !== -1) {
      this.tareas.splice(index, 1);
      console.log(`🗑️ Tarea ${tarea.titulo} eliminada localmente`);
      alert('Tarea eliminada (solo del frontend)');
    }
  }

  abrirFormularioTarea() {
    this.abrirFormulario.emit();
  }
}
