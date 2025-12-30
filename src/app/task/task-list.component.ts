import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Tarea } from './models';
import { TaskService } from './task.service';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'task-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-list-container">
      
      <div class="text-center mb-5 pt-3">
        
        <h3
  *ngIf="nombreProyecto"
  class="text-primary fw-normal animate-fade-in text-center"
>
  <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 rounded-pill fs-1">
    📂 {{ nombreProyecto }}
  </span>
</h3>

        
        <h4 *ngIf="!nombreProyecto && !loading" class="text-muted fw-light">
          Vista Global de Mis Tareas
        </h4>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div class="d-flex align-items-center gap-3">
            <h5 class="mb-0 fw-bold text-secondary">Panel de Tareas</h5>
            <span class="badge bg-light text-dark border">{{ tareasFiltradas.length }} Tareas</span>
        </div>
        
        <div *ngIf="loading" class="text-primary d-flex align-items-center">
           <div class="spinner-border spinner-border-sm me-2" role="status"></div>
           <small>Actualizando...</small>
        </div>
      </div>

      <div class="filters mb-4" *ngIf="usuariosUnicos.length > 0">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <span class="small text-muted fw-bold me-2">Filtrar por:</span>
          
          <button class="btn btn-sm rounded-pill px-3 transition-btn" 
                  [ngClass]="filtroUsuario === '' ? 'btn-dark' : 'btn-outline-secondary'"
                  (click)="aplicarFiltro('')">
            Todos
          </button>
          
          <button class="btn btn-sm rounded-pill px-3 transition-btn" 
                  [ngClass]="filtroUsuario === usuario ? 'btn-primary' : 'btn-outline-secondary'"
                  *ngFor="let usuario of usuariosUnicos" 
                  (click)="aplicarFiltro(usuario)">
            👤 {{ usuario }}
          </button>
        </div>
      </div>

      <div *ngIf="!loading && tareasFiltradas.length === 0" class="text-center py-5 bg-light rounded border border-dashed">
        <div class="fs-1 mb-3">📋</div>
        <h5 class="text-muted">No se encontraron tareas</h5>
        <p class="text-muted small mb-0">Intenta cambiar los filtros o crea una nueva tarea.</p>
      </div>

      <div *ngFor="let tarea of tareasFiltradas" class="card shadow-sm mb-3 border-0 task-card">
        <div class="card-body p-3" (click)="verDetalles(tarea)" style="cursor: pointer;">
          
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title fw-bold mb-0 text-dark">{{ tarea.titulo }}</h5>
            <span class="badge rounded-pill px-3"
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

          <div class="mb-2">
            <span class="badge bg-light text-secondary border me-2">
                👤 {{ tarea.usuarioNombre }}
            </span>
          </div>
          
          <p class="card-text text-secondary text-truncate mb-3" style="max-width: 90%;">
            {{ tarea.descripcion }}
          </p>

          <div class="d-flex justify-content-between align-items-center pt-3 border-top mt-2">
            <div class="text-muted small d-flex align-items-center gap-2">
              <span>📅 {{ tarea.fechaInicio | date:'dd/MM' }} - {{ tarea.fechaFin | date:'dd/MM' }}</span>
              <span *ngIf="tarea.archivos && tarea.archivos.length > 0" class="badge bg-light text-dark border ms-2">
                📎 {{ tarea.archivos.length }}
              </span>
            </div>
            
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" 
                      (click)="editarTarea(tarea, $event)">
                ✏️ Editar
              </button>
              <button class="btn btn-sm btn-outline-primary fw-bold" 
                      (click)="verDetalles(tarea); $event.stopPropagation()">
                🔍 Ver
              </button>
              <button class="btn btn-sm btn-outline-danger" 
                      (click)="confirmarEliminarTarea(tarea, $event)">
                🗑️ Eliminar
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div class="confirmation-modal-overlay" *ngIf="mostrarConfirmacion" (click)="cancelarEliminacion()">
      <div class="confirmation-modal-content" (click)="$event.stopPropagation()">
        <div class="text-center mb-4">
            <div class="fs-1 text-danger mb-2">🗑️</div>
            <h4 class="fw-bold">¿Eliminar Tarea?</h4>
            <p class="text-muted">Se eliminará <strong>"{{ tareaAEliminar?.titulo }}"</strong> permanentemente.</p>
        </div>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-secondary px-4" (click)="cancelarEliminacion()">Cancelar</button>
          <button class="btn btn-danger px-4" (click)="confirmarEliminacion()">Sí, Eliminar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-list-container { padding: 20px; max-width: 1000px; margin: 0 auto; }
    
    .task-card { 
        transition: transform 0.2s, box-shadow 0.2s; 
        border: 1px solid #f0f0f0 !important; 
    }
    .task-card:hover { 
        transform: translateY(-3px); 
        box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important; 
        border-color: #0d6efd !important;
    }

    .transition-btn { transition: all 0.2s ease; }
    .bg-primary-subtle { background-color: #cfe2ff; }
    .border-dashed { border-style: dashed !important; }

    .animate-fade-in { animation: fadeIn 0.8s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    .confirmation-modal-overlay { 
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.5); z-index: 1050; 
      display: flex; justify-content: center; align-items: center; 
      backdrop-filter: blur(2px);
    }
    .confirmation-modal-content { 
      background: white; padding: 30px; border-radius: 12px; 
      width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
    }
  `]
})
export class TaskListComponent implements OnInit {
  @Input() projectId: string | null = null;
  @Output() abrirFormulario = new EventEmitter<void>();
  @Output() editarTareaEvent = new EventEmitter<Tarea>();

  tareas: Tarea[] = [];
  filtroUsuario: string = '';
  loading = false;
  
  // Variables para eliminación
  mostrarConfirmacion = false;
  tareaAEliminar: Tarea | null = null;
  
  // Variable para el Título del Proyecto
  nombreProyecto: string = '';

  constructor(
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const urlProjectId = params['project_id'];
      
      // 1. Si hay ID en la URL, lo usamos
      if (urlProjectId) {
        this.projectId = urlProjectId;
        // Cargamos el nombre del proyecto
        this.cargarInfoProyecto(urlProjectId);
      }
      
      // 2. Cargamos las tareas
      this.cargarTareas();
    });
  }

  // 👇 LÓGICA NUEVA: Trae el nombre del proyecto
  cargarInfoProyecto(id: string | number) {
    this.taskService.getProjectDetails(+id).subscribe({
      next: (response) => {
        // La BD devuelve un array a veces (rows), aseguramos tomar el primero
        const data = response.data || response;
        const proyecto = Array.isArray(data) ? data[0] : data;
        
        if (proyecto && proyecto.title) {
          this.nombreProyecto = proyecto.title;
          this.cd.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando info proyecto:', err)
    });
  }

  // Getter: Usuarios únicos para los filtros
  get usuariosUnicos(): string[] {
    const nombres = this.tareas
      .map(t => t.usuarioNombre)
      .filter(n => n && n !== 'Sin asignar' && !n.includes('miembros'));
    return [...new Set(nombres)];
  }

  get tareasFiltradas(): Tarea[] {
    if (!this.filtroUsuario) return this.tareas;
    return this.tareas.filter(t => t.usuarioNombre === this.filtroUsuario);
  }

  aplicarFiltro(usuario: string) {
    this.filtroUsuario = usuario;
    this.cd.detectChanges();
  }

  cargarTareas() {
    this.loading = true;
    this.tareas = [];
    this.cd.detectChanges();

    const obs = this.projectId 
      ? this.taskService.getAllProjectTasks(Number(this.projectId))
      : this.taskService.getUserTasks();

    obs.subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response?.success && response?.data) {
          this.tareas = response.data.map((task: any) => {
            
            // 🛡️ Lógica robusta para detectar miembros (Array o String)
            let listaMiembros = [];
            try {
                if (Array.isArray(task.members)) {
                    listaMiembros = task.members;
                } else if (typeof task.members === 'string') {
                    listaMiembros = JSON.parse(task.members);
                }
            } catch (e) { console.warn('Error parseando miembros', e); }

            // Determinar nombre visual
            let textoVisual = 'Sin asignar';
            if (listaMiembros.length > 0) {
              textoVisual = listaMiembros[0].name;
              if (listaMiembros.length > 1) textoVisual += ` (+${listaMiembros.length - 1})`;
            } else if (task.member_count > 0) {
              textoVisual = `${task.member_count} miembros`;
            }

            // Retornar objeto Tarea
            return {
              id: task.id_task || task.id,
              titulo: task.title,
              descripcion: task.description,
              fechaInicio: task.start_date,
              fechaFin: task.end_date,
              estado: task.progress_status || 'PENDING',
              usuarioNombre: textoVisual, // Para el filtro visual
              // Guardamos la lista real por si acaso
              miembros: listaMiembros.map((m: any) => ({
                 id: m.user_id, nombre_completo: m.name, email: m.email 
              })),
              proyecto: task.project_title || `Proyecto ${task.id_project}`,
              archivos: typeof task.files === 'string' ? JSON.parse(task.files) : (task.files || []),
              usuario: 0, // Campos requeridos por interfaz
              puedo_editar: true
            } as Tarea;
          });
        }
        this.cd.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        console.error(e);
        this.cd.detectChanges();
      }
    });
  }

  verDetalles(tarea: Tarea) {
    if(tarea.id) this.router.navigate(['/task', tarea.id]);
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
    if (!this.tareaAEliminar?.id) {
      console.error('❌ No hay tarea para eliminar');
      return;
    }

    const taskId = this.tareaAEliminar.id;
    
    console.log('='.repeat(50));
    console.log('🟢 INICIANDO ELIMINACIÓN EN CASCADA para tarea:', taskId);
    console.log('='.repeat(50));

    // PASO 1: Obtener detalles frescos de la tarea
    console.log('🟢 PASO 1: Obteniendo detalles frescos...');
    
    this.taskService.getTaskDetails(taskId).pipe(
      switchMap((tareaFresca: any) => {
        console.log('📦 Datos frescos recibidos:', tareaFresca);
        
        const miembros = tareaFresca.miembros || [];
        const archivos = tareaFresca.archivos || [];
        
        console.log('👥 Miembros encontrados:', miembros.length);
        console.log('📁 Archivos encontrados:', archivos.length);

        // PASO 2: Crear operaciones de limpieza
        const operacionesLimpieza: any[] = [];

        // Eliminar asignaciones de miembros
        miembros.forEach((m: any) => {
          if (m.id && m.id > 0) {
            operacionesLimpieza.push(
              this.taskService.deleteTaskAssignation(taskId, m.id).pipe(
                catchError(err => {
                  console.warn(`⚠️ Error eliminando miembro ${m.id}:`, err);
                  return of({ error: true });
                })
              )
            );
          }
        });

        // Eliminar archivos
        archivos.forEach((f: any) => {
          if (f.id && f.id > 0) {
            operacionesLimpieza.push(
              this.taskService.deleteFile(f.id).pipe(
                catchError(err => {
                  console.warn(`⚠️ Error eliminando archivo ${f.id}:`, err);
                  return of({ error: true });
                })
              )
            );
          }
        });

        // PASO 3: Ejecutar limpieza
        console.log(`🟢 PASO 2: Ejecutando ${operacionesLimpieza.length} operaciones de limpieza...`);
        
        if (operacionesLimpieza.length === 0) {
          return of([]);
        }
        
        return forkJoin(operacionesLimpieza);
      }),
      // PASO 4: Eliminar la tarea
      switchMap(() => {
        console.log('🟢 PASO 3: Eliminando tarea principal...');
        return this.taskService.deleteTask(taskId).pipe(
          catchError(err => {
            console.error('❌ Error eliminando tarea:', err);
            throw err;
          })
        );
      })
    ).subscribe({
      next: () => {
        console.log('✅ TAREA ELIMINADA EXITOSAMENTE');
        this.tareas = this.tareas.filter(t => t.id !== taskId);
        this.cancelarEliminacion();
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('❌ ERROR eliminando tarea:', err);
        alert('Error eliminando tarea. Verifica la consola.');
        this.cancelarEliminacion();
        this.cd.detectChanges();
      }
    });
  }

  // Método para editar tarea (emite evento al padre)
  editarTarea(tarea: Tarea, event?: Event) {
    if (event) event.stopPropagation();
    console.log('📝 Editando tarea:', tarea);
    this.editarTareaEvent.emit(tarea);
  }
}