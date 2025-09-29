import { Component, OnInit, Output, EventEmitter } from '@angular/core';
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
          <button class="btn btn-danger" (click)="deleteProject(p)">Eliminar</button>
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
  `,
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  @Output() needsRefresh = new EventEmitter<void>();

  projects: Project[] = [];
  editing: Project | null = null;
  detailId: number | null = null;
  loading = false;

  constructor(private svc: ProjectService) {}

  ngOnInit() { this.refresh(); }

  refresh() {
  this.loading = true;
  this.svc.getAllProjects().subscribe({
    next: (r:any) => {
      this.loading = false;
      if (r?.success && Array.isArray(r.data)) {
        const rows = (r.data as any[]);
        this.projects = rows
          .map(row => ({
            project_id: row.id_project || row.project_id,
            title: row.title || row.titulo || 'Sin título',
            start_date: row.start_date || row.inicio || row.start || null,
            end_date: row.end_date || row.fin || row.end || null,
            visibility: row.visibility || row.estado || null, // ← NUEVO
          }))
          .filter(p => (p.visibility ?? 'PUBLIC') !== 'ARCHIVED'); // ← excluye archivados
      } else {
        this.projects = this.localFallback();
      }
    },
    error: () => { this.loading = false; this.projects = this.localFallback(); }
  });
}


  localFallback(): Project[] {
    try { return JSON.parse(localStorage.getItem('projects') || '[]'); }
    catch { return []; }
  }

  editProject(p: Project) { this.editing = p; }
  onEdited() { this.editing = null; this.refresh(); }

  openDetails(p: Project) { this.detailId = p.project_id ?? null; }

  deleteProject(p: Project) {
  if (!p?.project_id) {
    alert('Proyecto inválido');
    return;
  }
  const ok = confirm(`¿Eliminar el proyecto "${p.title}"?\nSe archivará y no se mostrará en la lista.`);
  if (!ok) return;

  this.svc.updateProject({
    project_id: p.project_id,
    visibility: 'ARCHIVED'
  }).subscribe({
    next: (res:any) => {
      if (res?.success) {
        // refresca lista (ya filtra ARCHIVED)
        this.refresh();
      } else {
        alert(res?.message || 'No se pudo eliminar (archivar) el proyecto.');
      }
    },
    error: (e) => {
      console.error(e);
      alert('Error al eliminar (archivar) el proyecto.');
    }
  });
}

}
