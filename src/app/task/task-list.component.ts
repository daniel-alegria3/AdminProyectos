import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core'; // <--- Agregamos ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router'; // <--- Agregamos ActivatedRoute para leer la URL
import { Tarea } from './models';
import { TaskService } from './task.service';

@Component({
  selector: 'task-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-list-container">
      <div class="panel-header">
        <h2>Panel de Tareas</h2>
        <div class="connection-status" *ngIf="loading">
           <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
           <span class="ms-2">Cargando...</span>
        </div>
        <div class="backend-info" *ngIf="!loading">
           ✏️ {{ tareasFiltradas.length }} Tareas Encontradas
           <span *ngIf="projectId" class="badge bg-secondary ms-2">Proyecto #{{ projectId }}</span>
        </div>
      </div>

      <div class="filters">
        <div class="filter-section">
          <label>Filtrar por Usuario:</label>
          <div class="filter-buttons">
            <button class="filter-btn" 
                    [class.active]="filtroUsuario === ''" 
                    (click)="aplicarFiltro('')">
              Todos
            </button>
            
            <button class="filter-btn" 
                    [class.active]="filtroUsuario === usuario" 
                    *ngFor="let usuario of usuariosUnicos" 
                    (click)="aplicarFiltro(usuario)">
              👤 {{ usuario }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && tareasFiltradas.length === 0" class="no-tasks">
        📋 No hay tareas que coincidan con el filtro.
      </div>

      <div *ngFor="let tarea of tareasFiltradas" class="task-item shadow-sm">
        
        <div class="task-content" (click)="verDetalles(tarea)" style="cursor: pointer;">
          
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="task-title h5 mb-0">{{ tarea.titulo }}</div>
            
            <span class="badge rounded-pill"
                  [ngClass]="{
                    'bg-warning text-dark': tarea.estado === 'PENDING',
                    'bg-primary': tarea.estado === 'IN_PROGRESS',
                    'bg-success': tarea.estado === 'COMPLETED'
                  }">
              {{ tarea.estado === 'PENDING' ? '⏳ Pendiente' : 
                 tarea.estado === 'IN_PROGRESS' ? '🔄 En Progreso' : 
                 '✅ Completada' }}
            </span>
          </div>

          <div class="task-user text-muted small mb-2">
            👤 {{ tarea.usuarioNombre }}
          </div>
          
          <div class="task-description mb-2">
            {{ tarea.descripcion }}
          </div>

          <div class="task-footer d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
            <div class="task-dates small text-muted">
              📅 {{ tarea.fechaInicio | date:'shortDate' }} - {{ tarea.fechaFin | date:'shortDate' }}
            </div>
            
            <div class="task-files" *ngIf="tarea.archivos.length > 0">
              <span class="badge bg-light text-dark border">📎 {{ tarea.archivos.length }} archivos</span>
            </div>
          </div>
        </div>

        <div class="task-actions mt-3 d-flex justify-content-end gap-2">
          <button class="btn btn-sm btn-outline-primary" (click)="verDetalles(tarea); $event.stopPropagation()">
            🔍 Ver Detalles
          </button>
          <button class="btn btn-sm btn-outline-danger" (click)="confirmarEliminarTarea(tarea, $event)">
            🗑️ Eliminar
          </button>
        </div>

      </div>
    </div>

    <div class="confirmation-modal-overlay" *ngIf="mostrarConfirmacion" (click)="cancelarEliminacion()">
      <div class="confirmation-modal-content" (click)="$event.stopPropagation()">
        <div class="confirmation-header text-danger">
          <h3>🗑️ Confirmar Eliminación</h3>
        </div>
        <div class="confirmation-body">
          <p>¿Seguro que deseas eliminar esta tarea permanentemente?</p>
          <p class="task-name fw-bold">"{{ tareaAEliminar?.titulo }}"</p>
        </div>
        <div class="confirmation-actions d-flex justify-content-end gap-2 mt-4">
          <button class="btn btn-secondary" (click)="cancelarEliminacion()">Cancelar</button>
          <button class="btn btn-danger" (click)="confirmarEliminacion()">Sí, Eliminar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-list-container { padding: 20px; }
    .filter-buttons { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    /* Estilos para los botones de filtro */
    .filter-btn { 
      padding: 6px 15px; 
      border: 1px solid #ddd; 
      background: white; 
      border-radius: 20px; 
      cursor: pointer; 
      transition: all 0.2s;
    }
    .filter-btn:hover { background: #f0f0f0; }
    .filter-btn.active { background: #007bff; color: white; border-color: #007bff; }
    
    .task-item { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; border: 1px solid #eee; transition: transform 0.2s; }
    .task-item:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .confirmation-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: center; align-items: center; }
    .confirmation-modal-content { background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 400px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
  `]
})
export class TaskListComponent implements OnInit {
  @Input() projectId: string | null = null;
  @Output() abrirFormulario = new EventEmitter<void>();

  tareas: Tarea[] = [];
  filtroUsuario: string = '';
  usuarios: any[] = [];
  mostrarConfirmacion = false;
  tareaAEliminar: Tarea | null = null;
  loading = false;

  constructor(
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute, // Para leer params de URL
    private cd: ChangeDetectorRef  // Para actualizar la vista
  ) {}

  ngOnInit() {
    // 👇 CAMBIO IMPORTANTE: Leemos la URL antes de cargar
    this.route.queryParams.subscribe(params => {
      const urlProjectId = params['project_id']; // Captura ?project_id=3
      
      if (urlProjectId) {
        console.log('🔗 Detectado ID desde URL:', urlProjectId);
        this.projectId = urlProjectId;
        this.cargarTareas();
      } else if (this.projectId) {
        // Si viene por Input (selector)
        this.cargarTareas();
      } else {
        // Carga global (Mis Tareas)
        this.cargarTareas();
      }
    });
  }

  // Getter inteligente: Extrae usuarios únicos de las tareas cargadas
  get usuariosUnicos(): string[] {
    const usuarios = this.tareas
      .map((t) => t.usuarioNombre)
      // Filtramos nulos, "Sin asignar" y el texto genérico "x miembros"
      .filter((u) => u && u !== 'Sin asignar' && !u.includes('miembros')); 
    
    // Set elimina duplicados automáticamente
    return [...new Set(usuarios)];
  }

  get tareasFiltradas(): Tarea[] {
    return this.tareas.filter((t) =>
      this.filtroUsuario ? t.usuarioNombre === this.filtroUsuario : true,
    );
  }

  // Función para cambiar filtro y actualizar vista
  aplicarFiltro(usuario: string) {
    this.filtroUsuario = usuario;
    this.cd.detectChanges();
  }

  cargarTareas() {
    this.loading = true;
    this.tareas = []; 
    this.cd.detectChanges(); // Mostrar spinner inmediatamente

    let getTasksObservable;
    
    if (this.projectId) {
      getTasksObservable = this.taskService.getAllProjectTasks(Number(this.projectId));
    } else {
      getTasksObservable = this.taskService.getUserTasks();
    }

    getTasksObservable.subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response?.success && response?.data) {
          this.tareas = response.data.map((task: any) => {
            
            let nombreUsuario = 'Sin asignar';
            // Lógica robusta para sacar el nombre del usuario
            if (task.members) {
               try {
                 const members = typeof task.members === 'string' ? JSON.parse(task.members) : task.members;
                 if (members.length > 0) nombreUsuario = members[0].name;
                 // Opcional: Si quieres mostrar "+1" si hay más, descomenta esto:
                 // if (members.length > 1) nombreUsuario += ` (+${members.length - 1})`;
               } catch(e) {}
            } else if (task.member_count) {
               nombreUsuario = `${task.member_count} miembros`;
            }

            return {
              id: task.id_task || task.id,
              titulo: task.title,
              descripcion: task.description,
              fechaInicio: task.start_date,
              fechaFin: task.end_date,
              estado: task.progress_status || 'PENDING', 
              usuarioNombre: nombreUsuario,
              proyecto: task.project_title || `Proyecto ${task.id_project}`,
              archivos: typeof task.files === 'string' ? JSON.parse(task.files) : (task.files || [])
            };
          });
          console.log(`✅ ${this.tareas.length} tareas cargadas.`);
        } else {
          this.tareas = [];
        }
        // 🔥 ESTO SOLUCIONA QUE TENGAS QUE DAR CLIC
        this.cd.detectChanges(); 
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error cargando tareas:', error);
        this.cd.detectChanges();
      }
    });
  }

  verDetalles(tarea: Tarea) {
    this.router.navigate(['/task', tarea.id]);
  }

  confirmarEliminarTarea(tarea: Tarea, event: Event) {
    event.stopPropagation();
    this.tareaAEliminar = tarea;
    this.mostrarConfirmacion = true;
  }

  cancelarEliminacion() {
    this.mostrarConfirmacion = false;
    this.tareaAEliminar = null;
  }

  confirmarEliminacion() {
    if (!this.tareaAEliminar?.id) return;

    this.taskService.deleteTask(this.tareaAEliminar.id).subscribe({
      next: (res) => {
        if (res.success) {
           this.tareas = this.tareas.filter(t => t.id !== this.tareaAEliminar!.id);
           this.mostrarConfirmacion = false;
           this.tareaAEliminar = null;
           this.cd.detectChanges(); // Actualizar visualmente
        } else {
           alert('Error al eliminar: ' + res.message);
        }
      },
      error: (err) => {
        console.error(err);
        alert('Error de conexión al eliminar');
        this.mostrarConfirmacion = false;
      }
    });
  }

  abrirFormularioTarea() {
    this.abrirFormulario.emit();
  }
}