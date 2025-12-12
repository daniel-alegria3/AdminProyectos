import { Component, Input, OnInit, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectService } from './project.service';

@Component({
  selector: 'project-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
          <div class="pd-actions">
            <button class="btn btn-outline" (click)="goTasks()">Ver tareas</button>
          </div>
        </section>

        <!-- Miembros -->
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
  .pd-section{background:#fff;border:1px solid #eceff5;border-radius:12px;padding:12px;display:grid;gap:12px}
  .pd-section h3{margin:0;color:#17223b}
  .pd-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
  .pd-kv .k{display:block;font-size:12px;color:#64748b}
  .pd-kv .v{display:block;font-weight:600;color:#17223b}
  .pd-actions{display:flex;gap:8px;justify-content:flex-end}
  .pd-note{font-size:13px;color:#334155}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:#f6f7fb;border:1px solid #eceff5;border-radius:999px;padding:6px 10px;color:#17223b;font-weight:600}
  .chip .role{font-weight:500;color:#64748b}
  .files{display:grid;gap:8px}
  .file{display:flex;align-items:center;justify-content:space-between;border:1px solid #eceff5;border-radius:10px;padding:8px 10px}
  .file-name{color:#17223b;font-weight:600}
  .file-actions a{color:#1f6ed4;text-decoration:none}
  .file-actions a:hover{text-decoration:underline}
  .pd-loading{padding:18px;color:#334155}
  .btn{border:0;border-radius:10px;padding:8px 12px;font-weight:600;cursor:pointer}
  .btn-outline{background:#fff;border:1px solid #aedaff;color:#1f6ed4}
  .btn-outline:hover{background:#d7ebff}
  `]
})
export class ProjectDetailComponent implements OnInit {
  @Input() project_id!: number;
  @Output() closed = new EventEmitter<void>();

  loading = false;
  details: any = null;
  members: any[] = [];
  files: any[] = [];

  constructor(
    private svc: ProjectService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.project_id) return;
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.cdr.markForCheck();

    this.svc.getProjectDetails(this.project_id).subscribe({
      next: (r:any) => {
        const parsed = this.svc.parseProjectDetailsResponse(r);
        this.details = {
          title: parsed.title ?? null,
          start_date: parsed.start_date ?? null,
          end_date: parsed.end_date ?? null,
          visibility: parsed.visibility ?? null
        };
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

  fileUrl(id: number) { return this.svc.buildFileDownloadUrl(id); }
  goTasks() { this.router.navigate(['/task'], { queryParams: { project_id: this.project_id } }); }
  close(){ this.closed.emit(); }
}

