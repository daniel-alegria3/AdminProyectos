import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from './project.service';

type TabKey = 'datos' | 'miembros' | 'archivos';


@Component({
  selector: 'edit-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      </div>

      <div class="ep-body" *ngIf="!loading; else loadingTpl">

        <!-- DATOS -->
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
            <button type="button" class="btn btn-outline" (click)="deleteProject()" [disabled]="saving">Eliminar proyecto</button>

            <button type="button" class="btn btn-ghost" (click)="close()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
          </div>

          <div class="ep-msg" [class.ok]="ok" *ngIf="msg">{{ msg }}</div>
        </form>

        <!-- MIEMBROS -->
        <div *ngIf="tab==='miembros'" class="ep-section">
          <div class="ep-subheader">
            <div>
              <h3>Miembros del proyecto</h3>
              <p class="hint">Puedes <b>asignar</b> nuevos miembros.</p>
            </div>
            <div>
              <button class="btn btn-outline" (click)="refreshMembers()">Actualizar</button>
            </div>
          </div>

          <div class="chips" *ngIf="members?.length; else noMembers">
            <span class="chip" *ngFor="let m of members">
            👤 {{ m.name || m.email || ('ID ' + (m.user_id ?? '')) }}
            <small *ngIf="m.role" class="role">· {{ m.role }}</small>

            <button class="chip-x"
                    (click)="removeMember(m); $event.stopPropagation()"
                    title="Quitar del proyecto">
              ✕
            </button>
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

        <!-- ARCHIVOS -->
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
                <button class="btn btn-ghost" (click)="deleteProjectFile(f)">Eliminar</button>
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
  .ep-field input{width:100%;border:1px solid #eceff5;border-radius:10px;padding:8px 10px;font-size:14px}
  .ep-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:#f6f7fb;border:1px solid #eceff5;border-radius:999px;padding:6px 10px;color:#17223b;font-weight:600}
  .chip .role{font-weight:500;color:#64748b}
  
  .chip{position:relative; padding-right:28px;}
  .chip-x{
    position:absolute; right:6px; top:50%;
    transform:translateY(-50%);
    border:0; background:transparent;
    cursor:pointer; font-weight:800;
    color:#64748b;
  }
  .chip-x:hover{color:#ef4444;}


  .user-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
  .user-item{display:flex;align-items:center;gap:8px;border:1px solid #eceff5;border-radius:10px;padding:6px 8px}

  .files{display:grid;gap:8px}
  .file{display:flex;align-items:center;justify-content:space-between;border:1px solid #eceff5;border-radius:10px;padding:8px 10px}
  .file-name{color:#17223b;font-weight:600}
  .file-actions{display:flex;gap:8px}
  .file-actions a{color:#1f6ed4;text-decoration:none}
  .file-actions a:hover{text-decoration:underline}

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

  constructor(
    private projects: ProjectService,
    private cdr: ChangeDetectorRef
  ) {}

private apiErrorMessage(err: any, fallback: string) {
  return err?.error?.message || err?.error?.error || err?.message || fallback;
}

  ngOnInit() {
    this.title = this.initialTitle;
    // Format dates to YYYY-MM-DD if they contain time components
    this.start_date = this.formatDateForInput(this.initialStart);
    this.end_date = this.formatDateForInput(this.initialEnd);
    this.fetchAll();
  }

  private formatDateForInput(dateValue: string): string {
    if (!dateValue) return '';

    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // If it contains time component, extract just the date part
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }

    // Try to parse as Date and format
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    console.log("ima kill: ",dateValue);
    return dateValue;
  }

  // ---- carga inicial
  fetchAll() {
    this.loading = true;
    this.cdr.markForCheck();

    this.projects.getAllUsers().subscribe({
      next: (r:any) => {
        if (r?.success) {
          this.allUsers = r.data || [];
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });

    this.projects.getProjectDetails(this.project_id).subscribe({
      next: (r:any) => {
        const parsed = this.projects.parseProjectDetailsResponse(r);
        this.members = parsed.members;
        this.files = parsed.files;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ---- DATOS

  removeMember(m: any) {
  const userId = m?.user_id;
  if (!userId) return;

  const ok = confirm(`¿Quitar a "${m.name || m.email || 'este usuario'}" del proyecto?`);
  if (!ok) return;

  this.assigning = true;
  this.msgAssign = '';
  this.okAssign = false;
  this.cdr.markForCheck();

  this.projects.removeUserFromProject(this.project_id, userId).subscribe({
    next: (r: any) => {
      this.assigning = false;
      this.okAssign = true;
      this.msgAssign = r?.message || 'Usuario removido del proyecto';
      this.cdr.markForCheck();
      this.refreshMembers();
    },
    error: (err: any) => {
      this.assigning = false;
      this.okAssign = false;
      this.msgAssign = this.apiErrorMessage(err, 'No se pudo quitar al miembro');
      this.cdr.markForCheck();
    }
  });
}

  deleteProjectFile(f: any) {
  const id = f?.file_id;
  if (!id) return;

  const ok = confirm(`¿Eliminar el archivo "${f.filename || f.name || 'archivo'}"?`);
  if (!ok) return;

  this.uploading = true;
  this.msgUpload = '';
  this.okUpload = false;
  this.cdr.markForCheck();

  this.projects.deleteFile(id).subscribe({
    next: (r: any) => {
      this.uploading = false;
      this.okUpload = true;
      this.msgUpload = r?.message || 'Archivo eliminado';
      this.cdr.markForCheck();
      this.refreshFiles();
    },
    error: (err: any) => {
      this.uploading = false;
      this.okUpload = false;
      this.msgUpload = this.apiErrorMessage(err, 'No se pudo eliminar el archivo');
      this.cdr.markForCheck();
    }
  });
}


  deleteProject() {
  const ok = confirm('¿Seguro que deseas eliminar (archivar) este proyecto?');
  if (!ok) return;

  this.saving = true;
  this.msg = '';
  this.ok = false;
  this.cdr.markForCheck();

  this.projects.deleteProject(this.project_id).subscribe({
    next: (r:any) => {
      this.saving = false;
      if (r?.success) {
        this.ok = true;
        this.msg = 'Proyecto eliminado (archivado)';
        this.saved.emit();
        this.close();
      } else {
        this.msg = r?.message || 'No se pudo eliminar';
      }
      this.cdr.markForCheck();
    },
    error: (err: any) => {
      this.saving = false;
      this.ok = false;
      this.msg = this.apiErrorMessage(err, 'Error al eliminar proyecto');
      this.cdr.markForCheck();
    }
  });
}
  saveDatos() {
    this.saving = true;
    this.msg = '';
    this.ok = false;
    this.cdr.markForCheck();

    // Ensure dates are in YYYY-MM-DD format (strip time if present)
    const cleanStartDate = this.start_date ? this.start_date.split('T')[0] : undefined;
    const cleanEndDate = this.end_date ? this.end_date.split('T')[0] : undefined;

    this.projects.updateProject({
      project_id: this.project_id,
      title: this.title.trim(),
      start_date: cleanStartDate,
      end_date: cleanEndDate
    }).subscribe({
      next: (r:any) => {
        this.saving = false;
        if (r?.success) {
          this.ok = true;
          this.msg = 'Proyecto actualizado';
          this.saved.emit();
        } else {
          this.msg = r?.message || 'No se pudo actualizar';
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.saving = false;
        this.msg = this.apiErrorMessage(err, 'Error al actualizar');
        this.ok = false;
        this.cdr.markForCheck();
      }

    });
  }

  // ---- MIEMBROS
  toggleAssign(userId: number, checked: boolean) {
    if (checked) this.pendingAssign.add(userId);
    else this.pendingAssign.delete(userId);
    this.cdr.markForCheck();
  }

  assignSelected() {
  if (this.pendingAssign.size === 0) return;

  this.assigning = true;
  this.msgAssign = '';
  this.okAssign = false;
  this.cdr.markForCheck();

  const ids = Array.from(this.pendingAssign);
  let done = 0, failed = 0;
  let lastErrMsg = '';

  const check = () => {
    if (done + failed === ids.length) {
      this.assigning = false;
      this.okAssign = failed === 0;

      this.msgAssign = failed === 0
        ? 'Usuarios asignados correctamente'
        : (lastErrMsg || `Asignados con errores (fallas: ${failed})`);

      this.pendingAssign.clear();
      this.cdr.markForCheck();
      this.refreshMembers();
    }
  };

  ids.forEach(uid => {
    this.projects.assignUserToProject(this.project_id, uid, 'MEMBER').subscribe({
      next: () => { done++; check(); },
      error: (err: any) => {
        failed++;
        lastErrMsg = this.apiErrorMessage(err, 'Error al asignar');
        check();
      }
    });
  });
}


  refreshMembers() {
    this.projects.getProjectDetails(this.project_id).subscribe({
      next: (r:any) => {
        const parsed = this.projects.parseProjectDetailsResponse(r);
        this.members = parsed.members;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  // ---- ARCHIVOS
  onFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.filesToUpload = input.files;
    this.cdr.markForCheck();
  }

  upload() {
    if (!this.filesToUpload) return;
    this.uploading = true;
    this.msgUpload = '';
    this.okUpload = false;
    this.cdr.markForCheck();

    this.projects.uploadProjectFiles(this.project_id, this.filesToUpload).subscribe({
      next: () => {
        this.uploading = false;
        this.okUpload = true;
        this.msgUpload = 'Archivos subidos';
        this.cdr.markForCheck();
        this.refreshFiles();
      },
      error: (err: any) => {
        this.uploading = false;
        this.okUpload = false;
        this.msgUpload = this.apiErrorMessage(err, 'Error al subir archivos');
        this.cdr.markForCheck();
      }

    });
  }

  refreshFiles() {
    this.projects.getProjectDetails(this.project_id).subscribe({
      next: (r:any) => {
        const parsed = this.projects.parseProjectDetailsResponse(r);
        this.files = parsed.files;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  fileUrl(id: number) { return this.projects.buildFileDownloadUrl(id); }

  close(){ this.closed.emit(); }
}


