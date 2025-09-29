import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from './model';
import { ProjectService } from './project.service';
import { EditProjectComponent } from './edit-project.component';
import { ProjectDetailComponent } from './project-detail.component';

@Component({
  selector: 'project-list',
  standalone: true,
  imports: [CommonModule, EditProjectComponent, ProjectDetailComponent],
  template: `
  <div class="list-wrap">
    <div class="list-header">
      <h2>Proyectos</h2>
      <div class="loading" *ngIf="loading">🔄 Cargando…</div>
    </div>

    <div class="empty" *ngIf="projects.length === 0">
      No hay proyectos. Crea el primero.
      <div class="hint">Usa el botón “+ Nuevo Proyecto”.</div>
    </div>

    <div class="grid">
      <div class="card" *ngFor="let p of projects">
        <div class="card-top">
          <div>
            <div class="card-title">{{ p.title }}</div>
            <div class="card-desc" *ngIf="p.description">{{ p.description }}</div>
          </div>
          <span class="card-id">#{{ p.project_id || '—' }}</span>
        </div>

        <div class="dates">
          <span *ngIf="p.start_date">📅 Inicio: <b>{{ p.start_date }}</b></span>
          <span *ngIf="p.end_date">⏳ Fin: <b>{{ p.end_date }}</b></span>
        </div>

        <div class="card-actions">
          <button class="btn btn-ghost" (click)="openDetails(p)">Detalles</button>
          <button class="btn btn-outline" (click)="editProject(p)">Editar</button>
          <button class="btn btn-danger" (click)="askDelete(p)">Eliminar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal editar -->
  <edit-project
    *ngIf="editing"
    [project_id]="editing.project_id!"
    [initialTitle]="editing.title"
    [initialStart]="editing.start_date || ''"
    [initialEnd]="editing.end_date || ''"
    (closed)="editing = null"
    (saved)="onEdited()">
  </edit-project>

  <!-- Modal detalle -->
  <project-detail
    *ngIf="detailId !== null"
    [project_id]="detailId!"
    (closed)="detailId = null">
  </project-detail>

  <!-- Modal de confirmación -->
  <div class="modal-overlay" *ngIf="confirmOpen" (click)="closeConfirm()">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h3>Confirmar eliminación</h3>
        <button class="x" (click)="closeConfirm()">✕</button>
      </div>
      <div class="modal-body">
        <p>¿Seguro que deseas eliminar (archivar) el proyecto:</p>
        <p class="modal-strong">“{{ confirmProject?.title }}”</p>
        <p class="modal-note">Esta acción lo ocultará de la lista (se marca como <b>ARCHIVED</b>).</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" (click)="closeConfirm()">Cancelar</button>
        <button class="btn btn-danger" (click)="confirmDelete()">Eliminar</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" [class.show]="toast.show" [class.ok]="toast.ok">
    {{ toast.text }}
  </div>
  `,
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  @Output() needsRefresh = new EventEmitter<void>();

  projects: Project[] = [];
  editing: Project | null = null;
  detailId: number | null = null;
  loading = false;

  // confirm
  confirmOpen = false;
  confirmProject: Project | null = null;

  // toast
  toast = { show: false, text: '', ok: true };
  private toastTimer: any;

  constructor(private svc: ProjectService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.refresh(); }

  refresh() {
    this.loading = true;
    this.svc.getAllProjects().subscribe({
      next: (r:any) => {
        this.loading = false;
        if (r?.success && Array.isArray(r.data)) {
          const rows = r.data as any[];
          this.projects = rows
            .map(row => ({
              project_id: row.id_project || row.project_id,
              title: row.title || row.titulo || 'Sin título',
              start_date: row.start_date || row.inicio || row.start || null,
              end_date: row.end_date || row.fin || row.end || null,
              visibility: row.visibility || row.estado || null,
            }))
            .filter(p => (p.visibility ?? 'PUBLIC') !== 'ARCHIVED');
        } else {
          this.projects = this.localFallback();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.projects = this.localFallback();
        this.cdr.detectChanges();
      }
    });
  }

  localFallback(): Project[] {
    try { return JSON.parse(localStorage.getItem('projects') || '[]'); }
    catch { return []; }
  }

  openDetails(p: Project) { this.detailId = p.project_id ?? null; }
  editProject(p: Project) { this.editing = p; }
  onEdited() { this.editing = null; this.refresh(); this.showToast('Proyecto actualizado', true); }

  askDelete(p: Project) {
    this.confirmProject = p;
    this.confirmOpen = true;
  }

  closeConfirm() {
    this.confirmOpen = false;
    this.confirmProject = null;
  }

  confirmDelete() {
    const p = this.confirmProject;
    if (!p?.project_id) { this.showToast('Proyecto inválido', false); return; }

    this.svc.updateProject({ project_id: p.project_id, visibility: 'ARCHIVED' })
      .subscribe({
        next: (res:any) => {
          if (res?.success) {
            this.showToast('Proyecto eliminado (archivado)', true);
            this.closeConfirm();
            this.refresh();
          } else {
            this.showToast(res?.message || 'No se pudo eliminar', false);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.showToast('Error al eliminar', false);
          this.cdr.detectChanges();
        }
      });
  }

  showToast(text: string, ok: boolean) {
    this.toast.text = text;
    this.toast.ok = ok;
    this.toast.show = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.show = false, 1800);
  }
}
