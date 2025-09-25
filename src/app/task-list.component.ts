import { Component, OnInit, Output, EventEmitter } from '@angular/core';
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
          🔄 Conectando con backend...
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
      
      <div *ngIf="tareasFiltradas.length === 0" class="no-tasks">
        No hay tareas que mostrar. ¡Crea tu primera tarea!
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
  @Output() abrirFormulario = new EventEmitter<void>();
  
  tareas: Tarea[] = [];
  filtroUsuario = '';
  mostrarConfirmacion = false;
  tareaAEliminar: Tarea | null = null;
  loading = false;

  constructor(private taskService: TaskService) {
    // Recargar tareas cada 30 segundos para sincronizar con backend
    setInterval(() => {
      this.cargarTareas();
    }, 30000);
  }

  get usuariosUnicos(): string[] {
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
  }

  cargarTareas() {
    this.loading = true;

    // Intentar cargar desde el backend
    this.taskService.getUserTasks().subscribe({
      next: (response) => {
        this.loading = false;
        if (response?.success && response?.data) {
          // Mapear los datos del backend al formato del frontend
          this.tareas = response.data.map((task: any) => ({
            titulo: task.title || task.titulo,
            descripcion: task.description || task.descripcion,
            fechaInicio: task.start_date || task.fechaInicio,
            fechaFin: task.due_date || task.fechaFin,
            usuario: task.assigned_user_name || task.assigned_user || task.usuario,
            proyecto: task.project_name || task.proyecto || 'Proyecto General',
            archivos: task.files || task.archivos || []
          }));
        } else {
          // Si no hay respuesta exitosa, usar tareas ficticias como fallback
          this.tareas = this.crearTareasFicticias();
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al conectar con backend, usando datos locales:', error);
        // Si hay error de conexión, usar localStorage o tareas ficticias
        const tareasGuardadas = JSON.parse(localStorage.getItem('tareas') || '[]');
        if (tareasGuardadas.length > 0) {
          this.tareas = tareasGuardadas;
        } else {
          this.tareas = this.crearTareasFicticias();
        }
      }
    });
  }

  crearTareasFicticias(): Tarea[] {
    return [
      {
        titulo: 'Implementar Sistema de Login',
        descripcion: 'Desarrollar el sistema de autenticación de usuarios con validación de credenciales',
        fechaInicio: '2025-09-15',
        fechaFin: '2025-09-25',
        usuario: 'Juan Pérez',
        proyecto: 'Proyecto General',
        archivos: [
          { nombre: 'especificaciones_login.pdf', url: '' },
          { nombre: 'mockups_ui.jpg', url: '' }
        ]
      },
      {
        titulo: 'Diseño de Base de Datos',
        descripcion: 'Crear el diagrama entidad-relación y definir las tablas principales del sistema',
        fechaInicio: '2025-09-10',
        fechaFin: '2025-09-20',
        usuario: 'María García',
        proyecto: 'Proyecto General',
        archivos: [
          { nombre: 'diagrama_er.pdf', url: '' }
        ]
      },
      {
        titulo: 'Pruebas de Integración',
        descripcion: 'Ejecutar pruebas de integración para verificar el correcto funcionamiento de los módulos',
        fechaInicio: '2025-09-22',
        fechaFin: '2025-09-30',
        usuario: 'Carlos López',
        proyecto: 'Proyecto General',
        archivos: []
      },
      {
        titulo: 'Documentación de API',
        descripcion: 'Documentar todos los endpoints de la API REST con ejemplos de uso',
        fechaInicio: '2025-09-18',
        fechaFin: '2025-09-28',
        usuario: 'Ana Martín',
        proyecto: 'Proyecto General',
        archivos: [
          { nombre: 'api_documentation.docx', url: '' }
        ]
      },
      {
        titulo: 'Optimización de Performance',
        descripcion: 'Analizar y optimizar el rendimiento de las consultas a la base de datos',
        fechaInicio: '2025-09-25',
        fechaFin: '2025-10-05',
        usuario: 'Luis Rodríguez',
        proyecto: 'Proyecto General',
        archivos: []
      }
    ];
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

  eliminarTarea(tarea: Tarea) {
    const index = this.tareas.findIndex(t => t === tarea);
    if (index !== -1) {
      this.tareas.splice(index, 1);
      // Actualizar localStorage
      localStorage.setItem('tareas', JSON.stringify(this.tareas));
      alert('Tarea eliminada correctamente');
    }
  }

  abrirFormularioTarea() {
    this.abrirFormulario.emit();
  }
}
