import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from './project.service';
import { TaskService } from '../task/task.service'; // reutilizamos tu servicio de tareas

type TabKey = 'datos' | 'miembros' | 'archivos' | 'tareas';

@Component({
  selector: 'edit-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="ep-overlay" (click)="close()">
    <div class="ep-modal" (click)="$event.stopPropagation()">
      <div class="ep-header">
        <div class="ep-title">
          <h2>Editar Proyecto</h2>
          <span class="ep-id">#{{ project_id }}</span>
        </div>
        <button class="ep-close" (click)="close()">✕</button>
      </div>

      <div class="ep-tabs">
        <button class="ep-tab" [class.active]="tab==='datos'" (click)="tab='datos'">Datos</button>
        <button class="ep-tab" [class.active]="tab==='miembros'" (click)="tab='miembros'">Miembros</button>
        <button class="ep-tab" [class.active]="tab==='archivos'" (click)="tab='archivos'">Archivos</button>
        <button class="ep-tab" [class.active]="tab==='tareas'" (click)="tab='tareas'">Tareas</button>
      </div>

      <div class="ep-body" *ngIf="!loading; else loadingTpl">

        <!-- TAB: DATOS -->
        <form *ngIf="tab==='datos'" class="ep-section" (ngSubmit)="saveDatos()">
          <div class="ep-field">
            <label>Título</label>
            <input type="text" [(ngModel)]="title" name="title" required />
          </div>

          <div class="ep-row">
            <div class="ep-field">
              <label>Inicio</label>
              <input type="date" [(ngModel)]="start_date" name="start_date" />
            </div>
            <div class="ep-field">
              <label>Fin</label>
              <input type="date" [(ngModel)]="end_date" name="end_date" />
            </div>
          </div>

          <div class="ep-actions">
            <button type="button" class="btn btn-ghost" (click)="close()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
          </div>

          <div class="ep-msg" [class.ok]="ok" *ngIf="msg">{{ msg }}</div>
        </form>

        <!-- TAB: MIEMBROS -->
        <div *ngIf="tab==='miembros'" class="ep-section">
          <div class="ep-subheader">
            <div>
              <h3>Miembros del proyecto</h3>
              <p class="hint">Puedes <b>asignar</b> nuevos miembros. (Quitar miembros requiere endpoint backend)</p>
            </div>
            <div>
              <button class="btn btn-outline" (click)="refreshMembers()">Actualizar</button>
            </div>
          </div>

          <div class="chips" *ngIf="members?.length; else noMembers">
            <span class="chip" *ngFor="let m of members">
              👤 {{ m.name || m.email || ('ID ' + (m.user_id ?? '')) }}
              <small *ngIf="m.role" class="role">· {{ m.role }}</small>
            </span>
          </div>
          <ng-template #noMembers><p class="ep-note">Este proyecto aún no tiene miembros asignados.</p></ng-template>

          <hr class="sep" />

          <div class="ep-field">
            <label>Asignar usuarios</label>
            <div class="user-list">
              <label class="user-item" *ngFor="let u of allUsers">
                <input type="checkbox"
                       [checked]="pendingAssign.has(u.user_id)"
                       (change)="toggleAssign(u.user_id, $any($event.target).checked)" />
                <span>{{ u.name || u.email }}</span>
              </label>
            </div>
          </div>

          <div class="ep-actions">
            <button class="btn btn-primary" (click)="assignSelected()" [disabled]="assigning || pendingAssign.size===0">
              {{ assigning ? 'Asignando…' : 'Asignar seleccionados' }}
            </button>
          </div>

          <div class="ep-msg" [class.ok]="okAssign" *ngIf="msgAssign">{{ msgAssign }}</div>
        </div>

        <!-- TAB: ARCHIVOS -->
        <div *ngIf="tab==='archivos'" class="ep-section">
          <div class="ep-subheader">
            <h3>Archivos del proyecto</h3>
            <button class="btn btn-outline" (click)="refreshFiles()">Actualizar</button>
          </div>

          <div class="files" *ngIf="files?.length; else noFiles">
            <div class="file" *ngFor="let f of files">
              <div class="file-name">📎 {{ f.filename || f.name }}</div>
              <div class="file-actions">
                <a [href]="fileUrl(f.file_id)" target="_blank" rel="noopener">Descargar</a>
                <button class="btn btn-ghost" disabled title="Eliminar requiere endpoint backend">Eliminar</button>
              </div>
            </div>
          </div>
          <ng-template #noFiles><p class="ep-note">Sin archivos adjuntos.</p></ng-template>

          <hr class="sep" />

          <div class="ep-field">
            <label>Subir nuevos archivos</label>
            <input type="file" multiple (change)="onFiles($event)" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
            <p class="hint">Permitidos: PDF, DOC/DOCX, JPG/PNG. Máx 10MB c/u.</p>
          </div>

          <div class="ep-actions">
            <button class="btn btn-primary" (click)="upload()" [disabled]="!filesToUpload || uploading">
              {{ uploading ? 'Subiendo…' : 'Subir' }}
            </button>
          </div>

          <div class="ep-msg" [class.ok]="okUpload" *ngIf="msgUpload">{{ msgUpload }}</div>
        </div>

        <!-- TAB: TAREAS -->
        <div *ngIf="tab==='tareas'" class="ep-section">
          <div class="ep-subheader">
            <h3>Tareas del proyecto</h3>
            <button class="btn btn-outline" (click)="refreshTasks()">Actualizar</button>
          </div>

          <div class="tasks" *ngIf="tasks?.length; else noTasks">
            <div class="task" *ngFor="let t of tasks">
              <div class="task-title">🗂️ {{ t.title || t.titulo }}</div>
              <div class="task-meta">
                <span *ngIf="t.start_date || t.fechaInicio">Inicio: <b>{{ t.start_date || t.fechaInicio }}</b></span>
                <span *ngIf="t.end_date || t.fechaFin">Fin: <b>{{ t.end_date || t.fechaFin }}</b></span>
                <span *ngIf="t.assigned_user_name || t.usuario">Asignado: <b>{{ t.assigned_user_name || t.usuario }}</b></span>
                <span *ngIf="t.progress_status">Estado: <b>{{ t.progress_status }}</b></span>
              </div>

              <div class="task-actions">
                <!-- Cambiar estado -->
                <select [(ngModel)]="t._nextStatus" name="next_status_{{t.task_id || t.id}}" class="sel">
                  <option [ngValue]="undefined" disabled>— Cambiar estado —</option>
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="DONE">DONE</option>
                </select>
                <button class="btn btn-primary" (click)="updateStatus(t)" [disabled]="!t._nextStatus">Guardar</button>

                <!-- Reasignar -->
                <select [(ngModel)]="t._nextUserId" name="next_user_{{t.task_id || t.id}}" class="sel">
                  <option [ngValue]="undefined" disabled>— Reasignar a —</option>
                  <option *ngFor="let u of allUsers" [value]="u.user_id">{{ u.name || u.email }}</option>
                </select>
                <button class="btn btn-outline" (click)="reassignTask(t)" [disabled]="!t._nextUserId">Reasignar</button>
              </div>
            </div>
          </div>
          <ng-template #noTasks><p class="ep-note">No hay tareas para este proyecto.</p></ng-template>

          <div class="ep-msg" [class.ok]="okTask" *ngIf="msgTask">{{ msgTask }}</div>
        </div>

      </div>

      <ng-template #loadingTpl>
        <div class="ep-loading">🔄 Cargando…</div>
      </ng-template>
    </div>
  </div>
  `,
  styles: [`
  .ep-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;z-index:60}
  .ep-modal{background:#fff;border:1px solid #eceff5;border-radius:16px;box-shadow:0 8px 24px rgba(23,34,59,.12);width:100%;max-width:980px;max-height:90vh;overflow:auto}
  .ep-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eceff5}
  .ep-title{display:flex;align-items:center;gap:8px}
  .ep-title h2{margin:0;color:#17223b}
  .ep-id{font-size:12px;color:#64748b}
  .ep-close{border:0;background:transparent;font-size:18px;cursor:pointer;color:#334155}

  .ep-tabs{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid #eceff5}
  .ep-tab{border:1px solid #eceff5;background:#f6f7fb;color:#17223b;border-radius:999px;padding:6px 10px;cursor:pointer;font-weight:600}
  .ep-tab.active{background:#eaf4ff;border-color:#aedaff}

  .ep-body{padding:16px;display:grid;gap:16px}
  .ep-section{background:#fff;border:1px solid #eceff5;border-radius:12px;padding:12px;display:grid;gap:12px}
  .ep-subheader{display:flex;align-items:center;justify-content:space-between}
  .hint{color:#64748b;font-size:13px;margin:4px 0 0}

  .ep-field label{display:block;font-weight:600;margin-bottom:6px;color:#17223b}
  .ep-field input,.sel{width:100%;border:1px solid #eceff5;border-radius:10px;padding:8px 10px;font-size:14px}
  .ep-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:#f6f7fb;border:1px solid #eceff5;border-radius:999px;padding:6px 10px;color:#17223b;font-weight:600}
  .chip .role{font-weight:500;color:#64748b}

  .user-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
  .user-item{display:flex;align-items:center;gap:8px;border:1px solid #eceff5;border-radius:10px;padding:6px 8px}

  .files{display:grid;gap:8px}
  .file{display:flex;align-items:center;justify-content:space-between;border:1px solid #eceff5;border-radius:10px;padding:8px 10px}
  .file-name{color:#17223b;font-weight:600}
  .file-actions{display:flex;gap:8px}
  .file-actions a{color:#1f6ed4;text-decoration:none}
  .file-actions a:hover{text-decoration:underline}

  .tasks{display:grid;gap:10px}
  .task{border:1px solid #eceff5;border-radius:12px;padding:10px}
  .task-title{font-weight:700;color:#17223b}
  .task-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#334155;margin-top:4px}
  .task-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}

  .ep-actions{display:flex;justify-content:flex-end;gap:8px}
  .btn{border:0;border-radius:10px;padding:8px 12px;font-weight:600;cursor:pointer}
  .btn-ghost{background:#f6f7fb;color:#17223b}
  .btn-ghost:hover{background:#eaf4ff}
  .btn-primary{background:linear-gradient(135deg,#2f8cff,#5aaeff);color:#fff;box-shadow:0 2px 8px rgba(23,34,59,.08)}
  .btn-primary:hover{box-shadow:0 8px 24px rgba(23,34,59,.12);transform:translateY(-1px)}
  .btn-outline{background:#fff;border:1px solid #aedaff;color:#1f6ed4}
  .btn-outline:hover{background:#d7ebff}

  .ep-msg{font-size:13px;color:#334155}
  .ep-msg.ok{color:#1f6ed4}
  .ep-loading{padding:18px;color:#334155}
  .sep{border:0;border-top:1px solid #eceff5;margin:6px 0}
  `]
})
export class EditProjectComponent implements OnInit {
  @Input() project_id!: number;
  @Input() initialTitle = '';
  @Input() initialStart = '';
  @Input() initialEnd = '';
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  tab: TabKey = 'datos';

  // datos
  title = '';
  start_date = '';
  end_date = '';
  saving = false;
  msg = ''; ok = false;

  // carga general
  loading = false;

  // miembros
  allUsers: any[] = [];
  members: any[] = [];
  pendingAssign = new Set<number>();
  assigning = false;
  msgAssign = ''; okAssign = false;

  // archivos
  files: any[] = [];
  filesToUpload: FileList | null = null;
  uploading = false;
  msgUpload = ''; okUpload = false;

  // tareas
  tasks: any[] = [];
  msgTask = ''; okTask = false;

  constructor(private projects: ProjectService, private tasksSvc: TaskService) {}

  ngOnInit() {
    this.title = this.initialTitle;
    this.start_date = this.initialStart || '';
    this.end_date = this.initialEnd || '';
    this.fetchAll();
  }

  // ---- carga inicial
  fetchAll() {
    this.loading = true;
    // usuarios para miembros/tareas
    this.projects.getAllUsers().subscribe({
      next: (r:any) => { if (r?.success) this.allUsers = r.data || []; },
      error: () => {}
    });

    // detalles (para miembros/archivos básicos)
    this.projects.getProjectDetails(this.project_id).subscribe({
      next: (r:any) => {
        const data = Array.isArray(r?.data) ? r.data : [];
        // miembros
        this.members = data.filter((x:any) =>
          'user_id' in x || 'member_user_id' in x || x?.name || x?.email
        ).map((m:any) => ({
          user_id: m.user_id ?? m.member_user_id ?? null,
          name: m.name ?? null,
          email: m.email ?? null,
          role: m.role ?? m.member_role ?? null
        }));
        // archivos
        this.files = data.filter((x:any) =>
          'file_id' in x || 'filename' in x || 'name' in x
        ).map((f:any) => ({
          file_id: f.file_id ?? f.id ?? null,
          filename: f.filename ?? f.name ?? 'archivo'
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    // tareas del proyecto
    this.refreshTasks(false);
  }

  // ---- DATOS
  saveDatos() {
    this.saving = true; this.msg = ''; this.ok = false;
    this.projects.updateProject({
      project_id: this.project_id,
      title: this.title.trim(),
      start_date: this.start_date || undefined,
      end_date: this.end_date || undefined
    }).subscribe({
      next: (r:any) => {
        this.saving = false;
        if (r?.success) {
          this.ok = true; this.msg = 'Proyecto actualizado';
          this.saved.emit();
        } else {
          this.msg = r?.message || 'No se pudo actualizar';
        }
      },
      error: () => { this.saving = false; this.msg = 'Error al actualizar'; }
    });
  }

  // ---- MIEMBROS
  toggleAssign(userId: number, checked: boolean) {
    if (checked) this.pendingAssign.add(userId);
    else this.pendingAssign.delete(userId);
  }

  assignSelected() {
    if (this.pendingAssign.size === 0) return;
    this.assigning = true; this.msgAssign = ''; this.okAssign = false;

    const ids = Array.from(this.pendingAssign);
    let done = 0, failed = 0;

    ids.forEach(uid => {
      this.projects.assignUserToProject(this.project_id, uid, 'MEMBER').subscribe({
        next: () => { done++; check(); },
        error: () => { failed++; check(); }
      });
    });

    const check = () => {
      if (done + failed === ids.length) {
        this.assigning = false;
        this.okAssign = failed === 0;
        this.msgAssign = failed === 0
          ? 'Usuarios asignados correctamente'
          : `Asignados con errores (fallas: ${failed})`;
        this.pendingAssign.clear();
        this.refreshMembers();
      }
    };
  }

  refreshMembers() {
    this.projects.getProjectDetails(this.project_id).subscribe({
      next: (r:any) => {
        const data = Array.isArray(r?.data) ? r.data : [];
        this.members = data.filter((x:any) =>
          'user_id' in x || 'member_user_id' in x || x?.name || x?.email
        ).map((m:any) => ({
          user_id: m.user_id ?? m.member_user_id ?? null,
          name: m.name ?? null,
          email: m.email ?? null,
          role: m.role ?? m.member_role ?? null
        }));
      }
    });
  }

  // ---- ARCHIVOS
  onFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.filesToUpload = input.files;
  }

  upload() {
    if (!this.filesToUpload) return;
    this.uploading = true; this.msgUpload = ''; this.okUpload = false;

    this.projects.uploadProjectFiles(this.project_id, this.filesToUpload).subscribe({
      next: () => {
        this.uploading = false; this.okUpload = true; this.msgUpload = 'Archivos subidos';
        this.refreshFiles();
      },
      error: () => { this.uploading = false; this.msgUpload = 'Error al subir archivos'; }
    });
  }

  refreshFiles() {
    this.projects.getProjectDetails(this.project_id).subscribe({
      next: (r:any) => {
        const data = Array.isArray(r?.data) ? r.data : [];
        this.files = data.filter((x:any) =>
          'file_id' in x || 'filename' in x || 'name' in x
        ).map((f:any) => ({
          file_id: f.file_id ?? f.id ?? null,
          filename: f.filename ?? f.name ?? 'archivo'
        }));
      }
    });
  }

  fileUrl(id: number) { return this.projects.buildFileDownloadUrl(id); }

  // ---- TAREAS
  refreshTasks(showMsg: boolean = true) {
    this.tasksSvc ? this.tasksSvc.getUserTasks() : null; // para tree-shaking del import, no hace nada
    this.projects.getProjectTasks(this.project_id).subscribe({
      next: (r:any) => {
        const rows = Array.isArray(r?.data) ? r.data : [];
        this.tasks = rows.map((t:any) => ({ ...t, _nextStatus: undefined, _nextUserId: undefined }));
        if (showMsg) { this.msgTask = 'Tareas actualizadas'; this.okTask = true; setTimeout(()=>this.msgTask='', 1200); }
      },
      error: () => { if (showMsg) { this.msgTask = 'Error al cargar tareas'; this.okTask = false; } }
    });
  }

  updateStatus(t: any) {
    if (!t?._nextStatus) return;
    this.msgTask = ''; this.okTask = false;
    const taskId = t.task_id ?? t.id;
    this.tasksSvc.updateTaskStatus(taskId, t._nextStatus).subscribe({
      next: () => { this.okTask = true; this.msgTask = 'Estado actualizado'; this.refreshTasks(false); },
      error: () => { this.msgTask = 'Error al actualizar estado'; }
    });
  }

  reassignTask(t: any) {
    if (!t?._nextUserId) return;
    this.msgTask = ''; this.okTask = false;
    const taskId = t.task_id ?? t.id;
    this.tasksSvc.assignUserToTask(taskId, t._nextUserId).subscribe({
      next: () => { this.okTask = true; this.msgTask = 'Tarea reasignada'; this.refreshTasks(false); },
      error: () => { this.msgTask = 'Error al reasignar tarea'; }
    });
  }

  close(){ this.closed.emit(); }
}
