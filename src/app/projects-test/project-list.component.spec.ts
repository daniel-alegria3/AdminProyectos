import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ProjectListComponent } from '../projects/project-list.component'; // ajusta ruta
import { ProjectService } from '../projects/project.service';             // ajusta ruta

describe('ProjectListComponent', () => {
  let fixture: ComponentFixture<ProjectListComponent>;
  let component: ProjectListComponent;

  let svc: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<ProjectService>('ProjectService', [
      'getAllMyProjects',
      'updateProject',
    ]);

    // Por defecto: carga vacía OK
    svc.getAllMyProjects.and.returnValue(of({ success: true, data: [] } as any));
    svc.updateProject.and.returnValue(of({ success: true } as any));

    await TestBed.configureTestingModule({
      imports: [ProjectListComponent],
      providers: [{ provide: ProjectService, useValue: svc }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit -> refresh()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should call refresh()', () => {
    expect(svc.getAllMyProjects).toHaveBeenCalledTimes(1);
  });

  it('refresh() should map backend rows and filter out ARCHIVED', () => {
    const backendRows = [
      {
        id_project: 1,
        title: 'A',
        start_date: '2025-01-01',
        end_date: '2025-01-10',
        visibility: 'PUBLIC',
      },
      {
        project_id: 2,
        titulo: 'B',
        inicio: '2025-02-01',
        fin: '2025-02-10',
        estado: 'ARCHIVED',
      },
      {
        project_id: 3,
        titulo: null,
        start: '2025-03-01',
        end: '2025-03-10',
        visibility: null, // se asume PUBLIC
      },
    ];

    svc.getAllMyProjects.and.returnValue(of({ success: true, data: backendRows } as any));

    component.refresh();

    expect(component.loading).toBeFalse();
    // debe filtrar el ARCHIVED (id 2)
    expect(component.projects.length).toBe(2);

    expect(component.projects[0]).toEqual({
      project_id: 1,
      title: 'A',
      start_date: '2025-01-01',
      end_date: '2025-01-10',
      visibility: 'PUBLIC',
    } as any);

    // titulo null -> "Sin título"
    expect(component.projects[1].project_id).toBe(3);
    expect(component.projects[1].title).toBe('Sin título');
    expect(component.projects[1].start_date).toBe('2025-03-01');
    expect(component.projects[1].end_date).toBe('2025-03-10');
  });

  it('refresh() should fallback to localStorage when success=false or invalid data', () => {
    spyOn(localStorage, 'getItem').and.returnValue(
      JSON.stringify([{ project_id: 99, title: 'Local' }])
    );

    svc.getAllMyProjects.and.returnValue(of({ success: false } as any));

    component.refresh();

    expect(component.projects).toEqual([{ project_id: 99, title: 'Local' }] as any);
  });

  it('refresh() should fallback to localStorage when request errors', () => {
    spyOn(localStorage, 'getItem').and.returnValue(
      JSON.stringify([{ project_id: 7, title: 'Offline' }])
    );

    svc.getAllMyProjects.and.returnValue(throwError(() => new Error('network')));

    component.refresh();

    expect(component.projects).toEqual([{ project_id: 7, title: 'Offline' }] as any);
  });

  it('localFallback() should return [] if localStorage has invalid JSON', () => {
    spyOn(localStorage, 'getItem').and.returnValue('NOT_JSON');
    expect(component.localFallback()).toEqual([]);
  });

  it('openDetails() should set detailId', () => {
    component.openDetails({ project_id: 10, title: 'X' } as any);
    expect(component.detailId).toBe(10);

    component.openDetails({ title: 'NoId' } as any);
    expect(component.detailId).toBeNull();
  });

  it('editProject() should set editing', () => {
    const p = { project_id: 1, title: 'A' } as any;
    component.editProject(p);
    expect(component.editing).toBe(p);
  });

  it('onEdited() should clear editing, refresh list and show toast', fakeAsync(() => {
    const refreshSpy = spyOn(component, 'refresh').and.callThrough();

    component.editing = { project_id: 1, title: 'A' } as any;
    component.onEdited();

    expect(component.editing).toBeNull();
    expect(refreshSpy).toHaveBeenCalled();

    expect(component.toast.show).toBeTrue();
    expect(component.toast.ok).toBeTrue();
    expect(component.toast.text).toContain('Proyecto actualizado');

    // toast auto-hide 1800ms
    tick(1800);
    expect(component.toast.show).toBeFalse();
  }));

  it('askDelete() should open confirm modal and set confirmProject', () => {
    const p = { project_id: 5, title: 'Del' } as any;
    component.askDelete(p);

    expect(component.confirmOpen).toBeTrue();
    expect(component.confirmProject).toBe(p);
  });

  it('closeConfirm() should close confirm modal and clear confirmProject', () => {
    component.confirmOpen = true;
    component.confirmProject = { project_id: 1, title: 'X' } as any;

    component.closeConfirm();

    expect(component.confirmOpen).toBeFalse();
    expect(component.confirmProject).toBeNull();
  });

  it('confirmDelete() should show error toast if project is invalid', () => {
    component.confirmProject = { title: 'NoId' } as any;

    component.confirmDelete();

    expect(svc.updateProject).not.toHaveBeenCalled();
    expect(component.toast.show).toBeTrue();
    expect(component.toast.ok).toBeFalse();
    expect(component.toast.text).toContain('Proyecto inválido');
  });

  it('confirmDelete() success should call updateProject ARCHIVED, closeConfirm and refresh', () => {
    const refreshSpy = spyOn(component, 'refresh').and.callThrough();
    const closeSpy = spyOn(component, 'closeConfirm').and.callThrough();

    component.confirmProject = { project_id: 10, title: 'A' } as any;
    svc.updateProject.and.returnValue(of({ success: true } as any));

    component.confirmDelete();

    expect(svc.updateProject).toHaveBeenCalledWith({ project_id: 10, visibility: 'ARCHIVED' } as any);
    expect(closeSpy).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalled();

    expect(component.toast.ok).toBeTrue();
    expect(component.toast.text).toContain('archivado');
  });

  it('confirmDelete() should show backend message when success=false', () => {
    component.confirmProject = { project_id: 10, title: 'A' } as any;
    svc.updateProject.and.returnValue(of({ success: false, message: 'Nope' } as any));

    component.confirmDelete();

    expect(component.toast.ok).toBeFalse();
    expect(component.toast.text).toBe('Nope');
  });

  it('confirmDelete() should handle error', () => {
    component.confirmProject = { project_id: 10, title: 'A' } as any;
    svc.updateProject.and.returnValue(throwError(() => new Error('fail')));

    component.confirmDelete();

    expect(component.toast.ok).toBeFalse();
    expect(component.toast.text).toContain('Error al eliminar');
  });

  it('showToast() should display toast and auto-hide after 1800ms', fakeAsync(() => {
    component.showToast('Hola', true);

    expect(component.toast.show).toBeTrue();
    expect(component.toast.text).toBe('Hola');
    expect(component.toast.ok).toBeTrue();

    tick(1799);
    expect(component.toast.show).toBeTrue();

    tick(1);
    expect(component.toast.show).toBeFalse();
  }));
});
