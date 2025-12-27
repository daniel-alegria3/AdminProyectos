import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; 
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../task/task.service';
import { Tarea, Archivo } from '../../task/models';
import { TaskFormComponent } from '../../task/task-form.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TaskFormComponent], 
  template: `
    <div class="container py-4 mb-5">

      <div *ngIf="loading" class="text-center py-5 mt-5">
        <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
        <p class="mt-3 text-muted fw-bold">Cargando detalles...</p>
      </div>

      <div *ngIf="error && !loading" class="alert alert-danger shadow-sm">
        ⚠️ {{ error }} <button class="btn btn-link p-0 align-baseline" (click)="volver()">Volver</button>
      </div>

      <div *ngIf="tarea && !loading" class="animate-fade-in">
        
        <div class="d-flex justify-content-between align-items-start mb-5 position-relative">
          
          <div class="w-100">
            <button class="btn btn-link text-decoration-none p-0 mb-3 text-secondary fw-bold" (click)="volver()">
              ⬅ Volver a la lista
            </button>
            
            <div class="d-flex justify-content-between align-items-start">
              <div class="pe-4"> <h1 class="task-main-title text-dark mb-3">{{ tarea.titulo }}</h1>
                
                <div class="text-muted fw-medium fs-5 mb-3">
                  Proyecto: <span class="text-primary fw-bold">{{ tarea.proyecto || 'General' }}</span>
                </div>

                <span class="badge rounded-pill px-3 py-2 fs-6 shadow-sm d-inline-flex align-items-center" 
                      [ngClass]="{
                        'bg-warning text-dark': tarea.estado === 'PENDING',
                        'bg-primary': tarea.estado === 'IN_PROGRESS',
                        'bg-success': tarea.estado === 'COMPLETED'
                      }">
                  <span class="me-2 opacity-75">Estado:</span>
                  <span class="fw-bold">
                    {{ tarea.estado === 'PENDING' ? '⏳ Pendiente' : 
                       tarea.estado === 'IN_PROGRESS' ? '🔄 En Progreso' : 
                       '✅ Completada' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          <button class="btn btn-outline-primary px-4 py-2 fw-bold shadow-sm position-absolute top-0 end-0" style="margin-top: 40px;" (click)="editar()">
            ✏️ Editar
          </button>
        </div>

        <div class="row g-5"> <div class="col-lg-8">
            
            <div class="card section-card mb-5 shadow-sm border-0"> <div class="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 class="fw-bolder text-dark mb-0 d-flex align-items-center gap-2 fs-5">
                  📄 Descripción
                </h5>
              </div>
              <div class="card-body p-4">
                <div class="description-box text-dark">
                  {{ tarea.descripcion || 'Sin descripción detallada.' }}
                </div>
              </div>
            </div>

            <div class="card section-card shadow-sm border-0 mb-5"> <div class="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 class="fw-bolder text-dark mb-0 d-flex align-items-center gap-2 fs-5">
                  📌 Archivos Adjuntos
                </h5>
              </div>
              <div class="card-body p-4">
                <div *ngIf="tarea.archivos && tarea.archivos.length > 0" class="d-flex flex-column gap-3">
                  <div *ngFor="let archivo of tarea.archivos" class="file-item p-3 rounded border d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3">
                      <div class="file-icon fs-3">{{ getIconoArchivo(archivo.tipo) }}</div>
                      <div>
                        <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">{{ archivo.nombre }}</div>
                        <small class="text-muted">{{ archivo.size }} bytes</small>
                      </div>
                    </div>
                    <button class="btn btn-light text-primary border fw-bold px-3" (click)="descargarArchivo(archivo)">⬇ Descargar</button>
                  </div>
                </div>

                <div *ngIf="!tarea.archivos || tarea.archivos.length === 0" class="text-center py-3 border rounded border-dashed bg-light text-muted fw-medium">
                  No hay archivos adjuntos en esta tarea.
                </div>
              </div>
            </div>

          </div>

          <div class="col-lg-4">
            
            <div class="card section-card shadow-sm border-0 h-100">
              <div class="card-body p-4 d-flex flex-column gap-5"> <div>
                  <h6 class="fw-bolder text-uppercase text-secondary small mb-3 border-bottom pb-2 ls-1">📅 Cronograma</h6>
                  
                  <div class="mb-3">
                    <span class="d-block text-muted small fw-bold text-uppercase mb-1">Inicio:</span>
                    <div class="p-2 bg-light rounded border fw-bold text-dark">
                       {{ tarea.fechaInicio | date:'dd MMM yyyy' }}
                    </div>
                  </div>

                  <div>
                    <span class="d-block text-muted small fw-bold text-uppercase mb-1">Vencimiento:</span>
                    <div class="p-2 bg-light rounded border fw-bold text-dark">
                       {{ tarea.fechaFin | date:'dd MMM yyyy' }}
                    </div>
                  </div>
                </div>

                <div>
                  <h6 class="fw-bolder text-uppercase text-secondary small mb-3 border-bottom pb-2 ls-1">👥 Equipo Asignado</h6>
                  
                  <div *ngIf="tarea.miembros && tarea.miembros.length > 0" class="d-flex flex-column gap-3">
                    <div *ngFor="let miembro of tarea.miembros" class="p-3 bg-light rounded border">
                      <span class="d-block fw-bold text-dark fs-6 mb-1">{{ miembro.nombre_completo }}</span>
                      <span class="d-block text-muted small">{{ miembro.email || ' - Miembro del equipo' }}</span>
                    </div>
                  </div>

                  <div *ngIf="!tarea.miembros || tarea.miembros.length === 0" class="text-center text-muted py-3 bg-light rounded fw-medium">
                    Sin miembros asignados
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- Modal de Edición -->
    <task-form 
      *ngIf="mostrarFormularioEdicion && tarea"
      [tareaEditar]="tarea"
      (cerrarFormulario)="cerrarFormularioEdicion()"
      (tareaActualizada)="onTareaActualizada()">
    </task-form>
  `,
  styles: [`
    .container { max-width: 1150px; margin: 0 auto; }

    .task-main-title {
        font-size: 2.8rem; /* Un poco más grande aún */
        font-weight: 800;
        letter-spacing: -1.5px;
        line-height: 1.1;
        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .section-card {
      border-radius: 16px;
      overflow: hidden;
      background: white;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .section-card:hover {
        box-shadow: 0 10px 20px rgba(0,0,0,.08) !important;
    }

    .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.25, 0.8, 0.25, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .description-box {
      background-color: #f8f9fa;
      padding: 25px; /* Más padding interno */
      border-radius: 12px;
      border: 1px solid #e9ecef;
      white-space: pre-wrap;
      line-height: 1.8;
      font-size: 1.05rem;
    }

    .file-item {
      background: #fff;
      border-color: #e9ecef !important;
      transition: all 0.2s;
    }
    .file-item:hover {
      background: #f1f3f5;
      border-color: #dee2e6 !important;
    }

    .border-dashed { border-style: dashed !important; border-width: 2px !important; }
    .ls-1 { letter-spacing: 1px; }
  `]
})
export class TaskDetailComponent implements OnInit { 
  tarea: Tarea | null = null;
  loading: boolean = true;
  error: string = '';
  mostrarFormularioEdicion: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private cd: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarDetalles(+id);
    } else {
      this.error = 'ID inválido';
      this.loading = false;
    }
  }

  cargarDetalles(id: number): void {
    this.loading = true;
    this.taskService.getTaskDetails(id).subscribe({
      next: (data) => {
        this.tarea = data;
        this.loading = false;
        console.log('✅ Detalles cargados:', this.tarea);
        this.cd.detectChanges(); 
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.error = 'No se pudo cargar la tarea.';
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  descargarArchivo(archivo: Archivo): void {
    const idDescarga = archivo.id || (archivo as any).file_id; 
    if (!idDescarga) {
        console.error("No hay ID de archivo para descargar");
        return;
    }

    this.taskService.downloadFile(idDescarga).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = archivo.nombre; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error descarga:', err)
    });
  }

  getIconoArchivo(tipo: string): string {
    const iconos: {[key: string]: string} = {
      'pdf': '📕', 'doc': '📘', 'docx': '📘', 'jpg': '🖼️', 'png': '🖼️'
    };
    return iconos[tipo?.toLowerCase()] || '📄';
  }

  volver(): void {
    this.location.back();
  }

  editar(): void {
    this.mostrarFormularioEdicion = true;
  }

  cerrarFormularioEdicion(): void {
    this.mostrarFormularioEdicion = false;
  }

  onTareaActualizada(): void {
    this.mostrarFormularioEdicion = false;
    // Recargar los detalles de la tarea
    if (this.tarea?.id) {
      this.cargarDetalles(this.tarea.id);
    }
  }
}