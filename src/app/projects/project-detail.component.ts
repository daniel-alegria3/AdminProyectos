import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from './project.service';

@Component({
  selector: 'project-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="pd-overlay" (click)="close()">
    <div class="pd-modal" (click)="$event.stopPropagation()">
      <div class="pd-header">
        <div class="pd-title">
          <h2>Detalle de Proyecto</h2>
          <span class="pd-id">#{{ project_id }}</span>
        </div>
        <button class="pd-close" (click)="close()">✕</button>
      </div>

      <div class="pd-body" *ngIf="!loading; else loadingTpl">
        <!-- Resumen -->
        <section class="pd-section">
          <h3>Resumen</h3>
          <div class="pd-kv">
            <div><span class="k">Título</span><span class="v">{{ details?.title || '—' }}</span></div>
            <div><span class="k">Inicio</span><span class="v">{{ details?.start_date || '—' }}</span></div>
            <div><span class="k">Fin</span><span class="v">{{ details?.end_date || '—' }}</span></div>
            <div *ngIf="details?.visibility"><span class="k">Visibilidad</span><span class="v">{{ details?.visibility }}</span></div>
          </div>
          <p class="pd-note" *ngIf="!details">No se recibió información de resumen desde el backend.</p>
        </section>

        <!-- Responsables / Miembros -->
        <section class="pd-section">
          <h3>Miembros</h3>
          <div class="chips" *ngIf="members?.length; else noMembers">
            <span class="chip" *ngFor="let m of members">
              👤 {{ m.name || m.email || ('ID ' + (m.user_id ?? '')) }}
              <small *ngIf="m.role" class="role">· {{ m.role }}</small>
            </span>
          </div>
          <ng-template #noMembers>
            <p class="pd-note">Este proyecto aún no tiene miembros asignados.</p>
          </ng-template>
        </section>

        <!-- Archivos -->
        <section class="pd-section">
          <h3>Archivos</h3>
          <div class="files" *ngIf="files?.length; else noFiles">
            <div class="file" *ngFor="let f of files">
              <div class="file-name">📎 {{ f.filename || f.name }}</div>
              <div class="file-actions">
                <a [href]="fileUrl(f.file_id)" target="_blank" rel="noopener">Descargar</a>
              </div>
            </div>
          </div>
          <ng-template #noFiles>
            <p class="pd-note">Sin archivos adjuntos.</p>
          </ng-template>
        </section>

        <!-- Tareas -->
        <section class="pd-section">
          <h3>Tareas</h3>
          <div class="tasks" *ngIf="tasks?.length; else noTasks">
            <div class="task" *ngFor="let t of tasks">
              <div class="task-title">🗂️ {{ t.title || t.titulo }}</div>
              <div class="task-meta">
                <span *ngIf="t.start_date || t.fechaInicio">Inicio: <b>{{ t.start_date || t.fechaInicio }}</b></span>
                <span *ngIf="t.end_date || t.fechaFin">Fin: <b>{{ t.end_date || t.fechaFin }}</b></span>
                <span *ngIf="t.assigned_user_name || t.usuario">Asignado: <b>{{ t.assigned_user_name || t.usuario }}</b></span>
                <span *ngIf="t.progress_status">Estado: <b>{{ t.progress_status }}</b></span>
              </div>
              <div class="task-desc" *ngIf="t.description || t.descripcion">{{ t.description || t.descripcion }}</div>
            </div>
          </div>
          <ng-template #noTasks>
            <p class="pd-note">No hay tareas para este proyecto.</p>
          </ng-template>
        </section>
      </div>

      <ng-template #loadingTpl>
        <div class="pd-loading">🔄 Cargando detalle…</div>
      </ng-template>
    </div>
  </div>
  `,
  styles: [`
  .pd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;z-index:60}
  .pd-modal{background:#fff;border:1px solid #eceff5;border-radius:16px;box-shadow:0 8px 24px rgba(23,34,59,.12);width:100%;max-width:880px;max-height:90vh;overflow:auto}
  .pd-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eceff5}
  .pd-title{display:flex;align-items:center;gap:8px}
  .pd-title h2{margin:0;color:#17223b}
  .pd-id{font-size:12px;color:#64748b}
  .pd-close{border:0;background:transparent;font-size:18px;cursor:pointer;color:#334155}
  .pd-body{padding:16px;display:grid;gap:16px}
  .pd-section{background:#fff;border:1px solid #eceff5;border-radius:12px;padding:12px}
  .pd-section h3{margin:0 0 8px 0;color:#17223b}
  .pd-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
  .pd-kv .k{display:block;font-size:12px;color:#64748b}
  .pd-kv .v{display:block;font-weight:600;color:#17223b}
  .pd-note{font-size:13px;color:#334155}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:#f6f7fb;border:1px solid #eceff5;border-radius:999px;padding:6px 10px;color:#17223b;font-weight:600}
  .chip .role{font-weight:500;color:#64748b}
  .files{display:grid;gap:8px}
  .file{display:flex;align-items:center;justify-content:space-between;border:1px solid #eceff5;border-radius:10px;padding:8px 10px}
  .file-name{color:#17223b;font-weight:600}
  .file-actions a{color:#1f6ed4;text-decoration:none}
  .file-actions a:hover{text-decoration:underline}
  .tasks{display:grid;gap:10px}
  .task{border:1px solid #eceff5;border-radius:12px;padding:10px}
  .task-title{font-weight:700;color:#17223b}
  .task-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#334155;margin-top:4px}
  .task-desc{margin-top:6px;color:#334155}
  .pd-loading{padding:18px;color:#334155}
  `]
})
export class ProjectDetailComponent implements OnInit {
  @Input() project_id!: number;
  @Output() closed = new EventEmitter<void>();

  loading = false;
  details: any = null;
  members: any[] = [];
  files: any[] = [];
  tasks: any[] = [];

  constructor(private svc: ProjectService) {}

  ngOnInit() {
    if (!this.project_id) return;
    this.fetchAll();
  }

  fetchAll() {
    this.loading = true;

    this.svc.getProjectDetails(this.project_id).subscribe({
      next: (r: any) => {
        // Tu SP GetProjectDetails retorna en r.data[0]? o r.data?
        const data = Array.isArray(r?.data) ? r.data : [];
        // Heurística: primera fila = resumen (si viene), y tablas separadas para members/files en índices siguientes
        // Como no tenemos estructura exacta, tomamos objetos por claves comunes:
        const first = data?.[0] || null;
        this.details = {
          title: first?.title ?? first?.project_title ?? first?.titulo ?? null,
          start_date: first?.start_date ?? first?.inicio ?? null,
          end_date: first?.end_date ?? first?.fin ?? null,
          visibility: first?.visibility ?? null
        };

        // Miembros (busca propiedades típicas)
        this.members = data.filter((x:any) =>
          'user_id' in x || 'member_user_id' in x || x?.name || x?.email
        ).map((m:any) => ({
          user_id: m.user_id ?? m.member_user_id ?? null,
          name: m.name ?? null,
          email: m.email ?? null,
          role: m.role ?? m.member_role ?? null
        }));

        // Archivos (por convención: file_id + filename)
        this.files = data.filter((x:any) =>
          'file_id' in x || 'filename' in x || 'name' in x
        ).map((f:any) => ({
          file_id: f.file_id ?? f.id ?? null,
          filename: f.filename ?? f.name ?? 'archivo'
        }));

        // Luego de detalles, pedimos tareas:
        this.fetchTasks();
      },
      error: (e) => {
        console.error('Error detalles proyecto', e);
        this.loading = false;
        this.fetchTasks(); // igual intentamos tareas
      }
    });
  }

  fetchTasks() {
    this.svc.getProjectTasks(this.project_id).subscribe({
      next: (r:any) => {
        this.loading = false;
        const rows = Array.isArray(r?.data) ? r.data : [];
        this.tasks = rows;
      },
      error: (e) => {
        console.error('Error tareas proyecto', e);
        this.loading = false;
      }
    });
  }

  fileUrl(id: number) { return this.svc.buildFileDownloadUrl(id); }

  close(){ this.closed.emit(); }
}
