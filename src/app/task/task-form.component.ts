import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarea } from './models';
import { TaskService } from './task.service';

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
            <div class="form-group" *ngIf="!modoEdicion">
              <label>Usuario Asignado:</label>
              <div class="user-selector-container">
                <input type="text" name="usuario" [(ngModel)]="usuarioActual" readonly placeholder="Seleccione un usuario" (click)="mostrarSelectorUsuario = !mostrarSelectorUsuario">
                <button type="button" class="user-selector-btn" (click)="mostrarSelectorUsuario = !mostrarSelectorUsuario">
                  👤
                </button>
                <div class="user-dropdown" *ngIf="mostrarSelectorUsuario">
                  <div class="user-option"
                       *ngFor="let usuario of usuariosDisponibles"
                       (click)="seleccionarUsuario(usuario)">
                    👤 {{ usuario.name }}
                  </div>
                  <div *ngIf="usuariosDisponibles.length === 0" style="padding:10px; color:gray;">
                    No hay usuarios cargados
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group" *ngIf="!modoEdicion">
              <label>Archivos:</label>
              <input type="file" name="archivos" (change)="onFileChange($event)" multiple accept=".pdf,.doc,.docx,.jpg,.png">
            </div>
            <button type="submit" class="btn" [disabled]="loading">
              {{ loading ? (modoEdicion ? 'Guardando...' : 'Creando...') : (modoEdicion ? 'Guardar Cambios' : 'Crear Tarea') }}
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
    
    .user-selector-container { position: relative; display: flex; }
    .user-selector-btn { border: 1px solid #ddd; background: #eee; cursor: pointer; border-left: none; }
    
    /* ESTILOS DEL DROPDOWN */
    .user-dropdown { 
      position: absolute; 
      top: 100%; 
      left: 0; 
      width: 100%; 
      background: white; 
      border: 1px solid #ddd; 
      border-radius: 4px;
      max-height: 200px; 
      overflow-y: auto; 
      z-index: 1000; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    .user-option { padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; }
    .user-option:hover { background-color: #f0f7ff; color: #0056b3; }
    
    input[type="text"], textarea, input[type="date"], input[type="file"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    textarea { height: 100px; resize: vertical; }
    
    .btn { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-size: 1rem; margin-top: 10px;}
    .btn:hover { background-color: #0056b3; }
    .btn:disabled { background-color: #ccc; cursor: not-allowed; }
    
    .success-message { background-color: #d4edda; color: #155724; padding: 10px; margin-top: 15px; border-radius: 4px; text-align: center; }
    .error-msg { background-color: #f8d7da; color: #721c24; }
  `]
})
export class TaskFormComponent implements OnChanges, OnInit {
  @Input() projectId: number | string | null = null;
  @Input() tareaEditar: Tarea | null = null; // Nueva propiedad para modo edición
  @Output() cerrarFormulario = new EventEmitter<void>();
  @Output() tareaCreada = new EventEmitter<void>();
  @Output() tareaActualizada = new EventEmitter<void>(); // Nuevo evento

  modoEdicion = false;

  tarea: Tarea = {
    titulo: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    usuario: NaN,
    usuarioNombre: '',
    archivos: [],
    proyecto: ''
  };
  
  mensaje = '';
  mostrarSelectorUsuario = false;
  usuarioActual = '';
  usuariosDisponibles: Array<{ id: number; name: string }> = [];
  loading = false;
  selectedFiles: FileList | null = null;

  constructor(private taskService: TaskService) {}

  ngOnInit() {
    // Si viene una tarea para editar, entramos en modo edición
    if (this.tareaEditar) {
      this.modoEdicion = true;
      this.tarea = { ...this.tareaEditar };
      // Formatear fechas para el input date (YYYY-MM-DD)
      if (this.tarea.fechaInicio) {
        this.tarea.fechaInicio = this.formatearFecha(this.tarea.fechaInicio);
      }
      if (this.tarea.fechaFin) {
        this.tarea.fechaFin = this.formatearFecha(this.tarea.fechaFin);
      }
    }
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toISOString().split('T')[0];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['projectId'] && this.projectId) {
      console.log('🔄 Detectado cambio de Proyecto ID:', this.projectId);
      this.cargarUsuarios();
    }
    if (changes['tareaEditar'] && this.tareaEditar) {
      this.modoEdicion = true;
      this.tarea = { ...this.tareaEditar };
      if (this.tarea.fechaInicio) {
        this.tarea.fechaInicio = this.formatearFecha(this.tarea.fechaInicio);
      }
      if (this.tarea.fechaFin) {
        this.tarea.fechaFin = this.formatearFecha(this.tarea.fechaFin);
      }
    }
  }

  guardarTarea() {
    if (this.modoEdicion) {
      this.actualizarTarea();
    } else {
      this.crearTarea();
    }
  }

  actualizarTarea() {
    if (!this.tarea.id) {
      this.mensaje = 'Error: No se puede actualizar sin ID de tarea';
      return;
    }

    this.loading = true;
    this.mensaje = '';

    const payload = {
      title: this.tarea.titulo,
      description: this.tarea.descripcion,
      start_date: this.tarea.fechaInicio,
      end_date: this.tarea.fechaFin
    };

    this.taskService.updateTask(this.tarea.id, payload).subscribe({
      next: (response) => {
        if (response?.success) {
          this.mensaje = '¡Tarea actualizada exitosamente!';
          this.loading = false;
          setTimeout(() => {
            this.tareaActualizada.emit();
            this.cerrar();
          }, 1500);
        } else {
          this.mensaje = 'Error al actualizar: ' + (response.message || 'Desconocido');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error:', error);
        this.mensaje = 'Error de conexión con el servidor.';
        this.loading = false;
      }
    });
  }

  cargarUsuarios() {
    if (!this.projectId) {
      console.warn('⚠️ No hay projectId.');
      return;
    }

    console.log('🔄 Solicitando miembros para Proyecto ID:', this.projectId);

    this.taskService.getProjectDetails(Number(this.projectId)).subscribe({
      next: (response) => {
        console.log('📦 Respuesta cruda del backend:', response); // Para debug

        // 1. Extraer el objeto real (Manejo de Array vs Objeto)
        const rawData = response.data || response;
        const projectData = Array.isArray(rawData) ? rawData[0] : rawData;

        // 2. Validar si encontramos el proyecto y sus miembros
        if (projectData && projectData.members) {
          let miembrosReales = [];
          try {
            // El backend envía un String JSON, hay que convertirlo
            miembrosReales = typeof projectData.members === 'string' 
              ? JSON.parse(projectData.members) 
              : projectData.members;
          } catch (e) {
            console.error('Error parseando JSON de miembros:', e);
            miembrosReales = [];
          }

          // 3. Mapear para el dropdown
          this.usuariosDisponibles = miembrosReales.map((m: any) => ({
            id: m.user_id,
            name: m.name,
            email: m.email
          }));
          
          console.log(`✅ ¡Éxito! ${this.usuariosDisponibles.length} miembros cargados.`);
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

  seleccionarUsuario(usuario: { id: number; name: string }) {
    this.usuarioActual = usuario.name;
    this.tarea.usuario = usuario.id;
    this.tarea.usuarioNombre = usuario.name;
    this.mostrarSelectorUsuario = false;
  }

  crearTarea() {
    if (!this.usuarioActual) {
      alert('Por favor, seleccione un usuario antes de crear la tarea');
      return;
    }
    if (!this.projectId) {
      alert('Error crítico: No se ha identificado el proyecto ID.');
      return;
    }

    this.loading = true;
    this.mensaje = '';

    // 1. TRADUCCIÓN: Español (Frontend) -> Inglés (Backend)
    const payloadBackend = {
      project_id: this.projectId,
      title: this.tarea.titulo,
      description: this.tarea.descripcion,
      start_date: this.tarea.fechaInicio,
      end_date: this.tarea.fechaFin,
      user_id: this.tarea.usuario,
      role: 'MEMBER'
    };

    console.log('📤 Enviando al backend:', payloadBackend);

    // 2. Enviar objeto traducido
    this.taskService.createTask(payloadBackend as any).subscribe({
      next: (response) => {
        if (response?.success) {
          this.mensaje = '¡Tarea creada exitosamente!';
          
          if (this.selectedFiles && this.selectedFiles.length > 0 && response.data?.task_id) {
            this.subirArchivos(response.data.task_id);
          } else {
            this.finalizarProceso();
          }
        } else {
          this.mensaje = 'Error al crear: ' + (response.message || 'Desconocido');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error:', error);
        this.mensaje = 'Error de conexión con el servidor.';
        this.loading = false;
      }
    });
  }

  subirArchivos(taskId: number) {
    this.mensaje += ' Subiendo archivos...';
    this.taskService.uploadTaskFiles(taskId, this.selectedFiles!).subscribe({
      next: () => {
        this.mensaje = '¡Tarea y archivos guardados!';
        this.finalizarProceso();
      },
      error: () => {
        this.mensaje = 'Tarea creada, pero falló la subida de archivos.';
        this.finalizarProceso();
      }
    });
  }

  finalizarProceso() {
    this.loading = false;
    setTimeout(() => {
      this.tareaCreada.emit();
      this.cerrar();
    }, 1500);
  }

  cerrar() {
    this.cerrarFormulario.emit();
  }
}