import { Component, EventEmitter, Output, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from './project.service';
import { UserLite } from './model';

@Component({
  selector: 'create-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center p-4" (click)="close()">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl" (click)="$event.stopPropagation()">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-xl font-semibold">Crear Proyecto</h2>
        <button class="text-gray-500 hover:text-gray-800" (click)="close()">✕</button>
      </div>

      <!-- Form -->
      <form class="p-4 space-y-4" (ngSubmit)="onCreate()">
        <div>
          <label class="block text-sm font-medium mb-1">Título <span class="text-red-600">*</span></label>
          <input class="w-full rounded-lg border px-3 py-2" type="text" [(ngModel)]="title" name="title" required />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Descripción</label>
          <textarea class="w-full rounded-lg border px-3 py-2" rows="3" [(ngModel)]="description" name="description"
                    placeholder="Resumen del proyecto (solo UI; backend aún no lo guarda)"></textarea>
          <p class="text-xs text-amber-600 mt-1">Nota: el backend /project no recibe descripción; la guardaremos en memoria UI por ahora.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Fecha inicio</label>
            <input class="w-full rounded-lg border px-3 py-2" type="date" [(ngModel)]="start_date" name="start_date" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Fecha fin</label>
            <input class="w-full rounded-lg border px-3 py-2" type="date" [(ngModel)]="end_date" name="end_date" />
          </div>
        </div>

       <!-- Responsables -->
        <div>
        <label class="block text-sm font-medium mb-2">Asignar responsables</label>
        <div class="flex flex-wrap gap-2 mb-2">
            <ng-container *ngFor="let u of users">
            <label class="inline-flex items-center gap-2 border rounded-full px-3 py-1 cursor-pointer">
                <input
                type="checkbox"
                [checked]="selectedUserIds.has(u.user_id)"
                (change)="toggleUser(u.user_id, $any($event.target).checked)"
                />
                <span class="text-sm">{{ u.name || u.email }}</span>
            </label>
            </ng-container>
        </div>
        <p class="text-xs text-gray-500">
            Se enviará el rol <code>MEMBER</code> por compatibilidad con el backend.
        </p>
        </div>

        <!-- Archivos -->
        <div>
          <label class="block text-sm font-medium mb-2">Adjuntar archivos (PDF, DOC/DOCX, JPG/PNG)</label>
          <input type="file" multiple (change)="onFiles($event)"
                 accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                 class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                        file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200"/>
          <p class="text-xs text-gray-500 mt-1">Límite por archivo: 10 MB.</p>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button type="button" class="px-4 py-2 rounded-lg border" (click)="close()">Cancelar</button>
          <button type="submit" [disabled]="submitting || !title"
                  class="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
            {{ submitting ? 'Creando...' : 'Crear proyecto' }}
          </button>
        </div>

        <div *ngIf="message" class="text-sm mt-2"
             [class.text-green-700]="success" [class.text-red-700]="!success">
          {{ message }}
        </div>
      </form>
    </div>
  </div>
  `
})
export class CreateProjectComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  title = '';
  description = '';        // UI-only por ahora
  start_date = '';
  end_date = '';

  users: UserLite[] = [];
  selectedUserIds = new Set<number>();
  files: FileList | null = null;

  message = '';
  success = false;
  submitting = false;

  constructor(
    private projectSvc: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.fetchUsers();
  }

  fetchUsers() {
    this.projectSvc.getAllUsers().subscribe({
      next: (r) => {
        if (r?.success && Array.isArray(r.data)) {
          this.users = r.data as any;
          this.cdr.markForCheck();
        }
      },
      error: (e) => {
        console.error('No se pudieron cargar usuarios', e);
        this.cdr.markForCheck();
      }
    });
  }

  toggleUser(userId: number, checked: boolean) {
    if (checked) this.selectedUserIds.add(userId);
    else this.selectedUserIds.delete(userId);
    this.cdr.markForCheck();
  }

  onFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.files = input.files;
    // Validación sencilla de tamaño
    if (this.files) {
      for (let i = 0; i < this.files.length; i++) {
        if (this.files[i].size > 10 * 1024 * 1024) {
          this.message = `El archivo "${this.files[i].name}" supera 10MB.`;
          this.success = false;
          this.cdr.markForCheck();
          input.value = '';
          this.files = null;
          break;
        }
      }
    }
  }

  onCreate() {
    this.message = '';
    this.success = false;
    this.submitting = true;
    this.cdr.markForCheck();

    this.projectSvc.createProject({
      title: this.title.trim(),
      start_date: this.start_date || undefined,
      end_date: this.end_date || undefined
    }).subscribe({
      next: (res) => {
        if (!res?.success || !res?.data) {
          this.handleLocalFallback();
          return;
        }

        const project_id = res.data.project_id ?? res.data.id ?? res.data?.project?.project_id;
        if (!project_id) {
          this.handleLocalFallback('Proyecto creado pero sin ID en respuesta');
          return;
        }

        // 1) Subir archivos (si hay)
        const upload$ = this.files
          ? this.projectSvc.uploadProjectFiles(project_id, this.files)
          : null;

        const afterUpload = () => {
          // 2) Asignar responsables seleccionados (rol: MEMBER por compatibilidad)
          const ids = Array.from(this.selectedUserIds);
          if (ids.length === 0) {
            this.finishOk('Proyecto creado correctamente');
            return;
          }

          let done = 0;
          let failed = 0;
          ids.forEach((uid) => {
            this.projectSvc.assignUserToProject(project_id, uid, 'MEMBER').subscribe({
              next: (r2) => { done++; checkFinish(); },
              error: () => { failed++; checkFinish(); }
            });
          });

          const checkFinish = () => {
            if (done + failed === ids.length) {
              const extra = failed > 0 ? ` (fallaron ${failed} asignaciones)` : '';
              this.finishOk('Proyecto creado y responsables asignados' + extra);
            }
          };
        };

        if (upload$) {
          upload$.subscribe({
            next: () => afterUpload(),
            error: () => {
              // Continuar aunque falle la subida
              this.message = 'Proyecto creado; error al subir algunos archivos.';
              this.cdr.markForCheck();
              afterUpload();
            }
          });
        } else {
          afterUpload();
        }
      },
      error: () => this.handleLocalFallback('Backend no disponible')
    });
  }

  private handleLocalFallback(extraMsg?: string) {
    try {
      const local = JSON.parse(localStorage.getItem('projects') || '[]');
      local.push({
        title: this.title,
        description: this.description,
        start_date: this.start_date,
        end_date: this.end_date,
        members: Array.from(this.selectedUserIds).map(id => ({ user_id: id }))
      });
      localStorage.setItem('projects', JSON.stringify(local));
      this.finishOk('Proyecto guardado localmente' + (extraMsg ? ` (${extraMsg})` : ''));
    } catch {
      this.submitting = false;
      this.success = false;
      this.message = 'No se pudo guardar localmente.';
      this.cdr.markForCheck();
    }
  }

  private finishOk(msg: string) {
    this.submitting = false;
    this.success = true;
    this.message = msg;
    this.cdr.markForCheck();
    this.created.emit();
    setTimeout(() => this.close(), 800);
  }

  close() {
    this.closed.emit();
  }
}

