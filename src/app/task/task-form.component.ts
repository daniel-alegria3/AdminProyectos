import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarea } from './models';
import { TaskService } from './task.service';
import { switchMap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="cerrar()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="form-container">
          <div class="form-header">
            <h2>{{ modoEdicion ? 'Editar Tarea' : 'Crear Tarea' }}</h2>
            <button type="button" class="btn-cerrar" (click)="cerrar()">✕</button>
          </div>

          <form (ngSubmit)="guardarTarea()" #form="ngForm">
            <div class="form-group">
              <label>Título:</label>
              <input type="text" name="titulo" [(ngModel)]="tarea.titulo" required placeholder="Ej: Revisión de base de datos">
            </div>
            <div class="form-group">
              <label>Descripción:</label>
              <textarea name="descripcion" [(ngModel)]="tarea.descripcion" required placeholder="Detalles de la tarea..."></textarea>
            </div>
            <div class="form-group">
              <label>Fecha Inicio:</label>
              <input type="date" name="fechaInicio" [(ngModel)]="tarea.fechaInicio" required>
            </div>
            <div class="form-group">
              <label>Fecha Fin:</label>
              <input type="date" name="fechaFin" [(ngModel)]="tarea.fechaFin" required>
            </div>
            
            <!-- SELECTOR MÚLTIPLE DE MIEMBROS -->
            <div class="form-group">
              <label>Miembros Asignados:</label>
              <div class="members-container">
                <div *ngFor="let usuario of usuariosDisponibles" class="member-checkbox">
                  <input type="checkbox" 
                         [id]="'member_' + usuario.id"
                         [checked]="miembrosSeleccionados.includes(usuario.id)"
                         (change)="toggleMiembro(usuario.id)">
                  <label [for]="'member_' + usuario.id">👤 {{ usuario.name }}</label>
                </div>
                <div *ngIf="usuariosDisponibles.length === 0" class="text-muted small">
                  No hay miembros disponibles en este proyecto
                </div>
              </div>
              <small class="text-muted">Seleccionados: {{ miembrosSeleccionados.length }}</small>
            </div>
            
            <div class="form-group">
              <label>Archivos:</label>
              <input type="file" name="archivos" (change)="onFileChange($event)" multiple accept=".pdf,.doc,.docx,.jpg,.png">
            </div>
            <button type="submit" class="btn" [disabled]="loading || miembrosSeleccionados.length === 0">
              {{ loading ? 'Guardando...' : (modoEdicion ? 'Actualizar Tarea' : 'Crear Tarea') }}
            </button>
          </form>
          <div *ngIf="mensaje" class="success-message" [ngClass]="{'error-msg': mensaje.includes('Error')}">
            {{mensaje}}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
    .modal-content { background: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .btn-cerrar { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
    
    .form-group { margin-bottom: 15px; position: relative; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
    
    .members-container { 
      max-height: 150px; 
      overflow-y: auto; 
      border: 1px solid #ddd; 
      border-radius: 4px; 
      padding: 10px; 
      background: #f9f9f9;
    }
    .member-checkbox { 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      padding: 5px 0; 
      border-bottom: 1px solid #eee;
    }
    .member-checkbox:last-child { border-bottom: none; }
    .member-checkbox input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
    .member-checkbox label { cursor: pointer; margin: 0; font-weight: normal; }
    
    input[type="text"], textarea, input[type="date"], input[type="file"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    textarea { height: 100px; resize: vertical; }
    
    .btn { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-size: 1rem; margin-top: 10px;}
    .btn:hover { background-color: #0056b3; }
    .btn:disabled { background-color: #ccc; cursor: not-allowed; }
    
    .success-message { background-color: #d4edda; color: #155724; padding: 10px; margin-top: 15px; border-radius: 4px; text-align: center; }
    .error-msg { background-color: #f8d7da; color: #721c24; }
    .text-muted { color: #6c757d; }
    .small { font-size: 0.875rem; }
  `]
})
export class TaskFormComponent implements OnChanges {
  @Input() projectId: number | string | null = null;
  @Input() tareaEditar: Tarea | null = null;
  @Output() cerrarFormulario = new EventEmitter<void>();
  @Output() tareaCreada = new EventEmitter<void>();

  tarea: Tarea = {
    titulo: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    usuario: 0,
    usuarioNombre: '',
    archivos: [],
    proyecto: ''
  };
  
  mensaje = '';
  usuariosDisponibles: Array<{ id: number; name: string }> = [];
  miembrosSeleccionados: number[] = [];
  loading = false;
  selectedFiles: FileList | null = null;
  modoEdicion = false;

  constructor(
    private taskService: TaskService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // Cargar usuarios cuando cambia el proyecto
    if (changes['projectId'] && this.projectId) {
      console.log('🔄 Detectado cambio de Proyecto ID:', this.projectId);
      this.cargarMiembrosDelProyecto();
    }
    
    // Si viene una tarea para editar, rellenar el formulario
    if (changes['tareaEditar'] && this.tareaEditar) {
      console.log('📝 Cargando tarea para edición:', this.tareaEditar);
      this.modoEdicion = true;
      this.tarea = {
        ...this.tareaEditar,
        fechaInicio: this.tareaEditar.fechaInicio ? this.tareaEditar.fechaInicio.split('T')[0] : '',
        fechaFin: this.tareaEditar.fechaFin ? this.tareaEditar.fechaFin.split('T')[0] : ''
      };
      // Marcar miembros existentes como seleccionados
      if (this.tareaEditar.miembros) {
        this.miembrosSeleccionados = this.tareaEditar.miembros.map(m => m.id);
      }
      this.cd.detectChanges();
    } else if (changes['tareaEditar'] && !this.tareaEditar) {
      this.modoEdicion = false;
      this.resetFormulario();
    }
  }

  cargarMiembrosDelProyecto() {
    if (!this.projectId) {
      console.warn('⚠️ No hay projectId.');
      return;
    }

    console.log('🔄 Solicitando miembros para Proyecto ID:', this.projectId);

    this.taskService.getProjectDetails(Number(this.projectId)).subscribe({
      next: (response) => {
        console.log('📦 Respuesta cruda del backend:', response);
        const rawData = response.data || response;
        const projectData = Array.isArray(rawData) ? rawData[0] : rawData;

        if (projectData && projectData.members) {
          let miembrosReales = [];
          try {
            miembrosReales = typeof projectData.members === 'string' 
              ? JSON.parse(projectData.members) 
              : projectData.members;
          } catch (e) {
            console.error('Error parseando JSON de miembros:', e);
            miembrosReales = [];
          }

          this.usuariosDisponibles = miembrosReales.map((m: any) => ({
            id: m.user_id,
            name: m.name
          }));
          
          console.log(`✅ ¡Éxito! ${this.usuariosDisponibles.length} miembros cargados.`);
          this.cd.detectChanges();
        } else {
          console.warn('⚠️ El proyecto no tiene campo "members" o está vacío.');
          this.usuariosDisponibles = [];
        }
      },
      error: (error) => {
        console.error('❌ Error HTTP al cargar miembros:', error);
        this.usuariosDisponibles = [];
      }
    });
  }

  toggleMiembro(userId: number) {
    const index = this.miembrosSeleccionados.indexOf(userId);
    if (index === -1) {
      this.miembrosSeleccionados.push(userId);
    } else {
      this.miembrosSeleccionados.splice(index, 1);
    }
    console.log('👥 Miembros seleccionados:', this.miembrosSeleccionados);
  }

  onFileChange(event: any) {
    const files = event.target.files;
    this.selectedFiles = files;
    this.tarea.archivos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.tarea.archivos.push({
        id: 0,
        nombre: file.name,
        tipo: this.obtenerTipoArchivo(file.name),
        size: file.size,
        url: ''
      });
    }
  }

  obtenerTipoArchivo(nombre: string): 'pdf' | 'doc' | 'docx' | 'jpg' | 'otro' {
    const ext = nombre.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc') return 'doc';
    if (ext === 'docx') return 'docx';
    if (ext === 'jpg') return 'jpg';
    return 'otro';
  }

  // ========== FLUJO WATERFALL: GUARDAR TAREA ==========
  guardarTarea() {
    // VALIDACIONES PREVIAS
    if (this.miembrosSeleccionados.length === 0) {
      alert('Por favor, seleccione al menos un miembro');
      return;
    }
    
    if (!this.projectId) {
      alert('Error crítico: No se ha identificado el proyecto ID.');
      console.error('❌ projectId es null/undefined:', this.projectId);
      return;
    }

    if (!this.tarea.titulo || this.tarea.titulo.trim() === '') {
      alert('El título es obligatorio');
      return;
    }

    // 1. ACTIVAR LOADING
    this.loading = true;
    this.mensaje = 'Creando tarea...';
    console.log('🟢 INICIANDO PROCESO DE GUARDADO');

    // Preparar payload con conversiones explícitas
    const projectIdNumero = Number(this.projectId);
    const userIdNumero = Number(this.miembrosSeleccionados[0]);

    // Payload con todos los campos requeridos por el backend
    const payloadBackend = {
      project_id: projectIdNumero,
      title: this.tarea.titulo.trim(),
      description: this.tarea.descripcion?.trim() || '',
      start_date: this.tarea.fechaInicio || null,
      end_date: this.tarea.fechaFin || null,
      user_id: userIdNumero,
      role: 'OWNER'
    };

    // DEBUG: Ver exactamente qué estamos enviando
    console.log('📤 DEBUG - Payload a enviar:', JSON.stringify(payloadBackend, null, 2));
    console.log('📤 DEBUG - projectId original:', this.projectId, '-> convertido:', projectIdNumero);
    console.log('📤 DEBUG - user_id original:', this.miembrosSeleccionados[0], '-> convertido:', userIdNumero);

    // Validar que los números sean válidos
    if (isNaN(projectIdNumero) || projectIdNumero <= 0) {
      alert('Error: ID de proyecto inválido');
      this.loading = false;
      return;
    }

    if (isNaN(userIdNumero) || userIdNumero <= 0) {
      alert('Error: ID de usuario inválido');
      this.loading = false;
      return;
    }

    console.log('📤 PASO 1: Creando tarea...');

    // 2. FLUJO CON FINALIZE (garantiza desbloqueo)
    this.taskService.createTask(payloadBackend as any).pipe(
      // PASO 2: Asignar miembros adicionales
      switchMap((response: any) => {
        if (!response?.success || !response.data?.task_id) {
          throw new Error(response?.message || 'Error al crear tarea');
        }
        
        const taskId = response.data.task_id;
        console.log('✅ Tarea creada con ID:', taskId);
        this.mensaje = 'Asignando miembros...';

        // Miembros adicionales (el primero ya es OWNER)
        const miembrosAdicionales = this.miembrosSeleccionados.slice(1);
        
        if (miembrosAdicionales.length > 0) {
          const asignaciones = miembrosAdicionales.map(userId => ({
            user_id: userId,
            role: 'MEMBER'
          }));
          console.log('📤 PASO 2: Asignando', asignaciones.length, 'miembros...');
          
          return this.taskService.createTaskAssignation(taskId, asignaciones).pipe(
            catchError(err => {
              console.warn('⚠️ Error asignando miembros (continuando):', err);
              return of(null); // Continuar aunque falle
            }),
            switchMap(() => of(taskId)) // Pasar el taskId al siguiente paso
          );
        }
        
        return of(taskId); // No hay miembros adicionales
      }),

      // PASO 3: Subir archivos
      switchMap((taskId: number) => {
        if (this.selectedFiles && this.selectedFiles.length > 0) {
          console.log('📤 PASO 3: Subiendo', this.selectedFiles.length, 'archivos...');
          this.mensaje = 'Subiendo archivos...';
          
          return this.taskService.uploadTaskFiles(taskId, this.selectedFiles).pipe(
            catchError(err => {
              console.warn('⚠️ Error subiendo archivos (continuando):', err);
              return of(null); // Continuar aunque falle
            })
          );
        }
        
        console.log('📤 PASO 3: Sin archivos para subir');
        return of(null); // No hay archivos
      }),

      // FINALIZE: SIEMPRE se ejecuta (éxito o error)
      finalize(() => {
        console.log('🏁 FINALIZE: Desbloqueando botón');
        this.loading = false;
        this.cd.detectChanges();
      })
    ).subscribe({
      next: () => {
        console.log('✅ PROCESO COMPLETO - ÉXITO');
        this.mensaje = '¡Tarea guardada exitosamente!';
        
        // Emitir evento y cerrar modal
        setTimeout(() => {
          this.tareaCreada.emit();
          this.cerrar();
        }, 800);
      },
      error: (error) => {
        console.error('❌ ERROR EN EL PROCESO:', error);
        this.mensaje = 'Error: ' + (error?.message || 'Fallo en el proceso');
        alert('Error al guardar la tarea: ' + (error?.message || 'Revisa la consola'));
      }
    });
  }

  resetFormulario() {
    this.tarea = {
      titulo: '',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      usuario: 0,
      usuarioNombre: '',
      archivos: [],
      proyecto: ''
    };
    this.miembrosSeleccionados = [];
    this.selectedFiles = null;
    this.mensaje = '';
  }

  cerrar() {
    this.resetFormulario();
    this.modoEdicion = false;
    this.cerrarFormulario.emit();
  }
}