import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { EditProjectComponent } from '../projects/edit-project.component';
import { ProjectService } from '../projects/project.service';

describe('EditProjectComponent', () => {
  let component: EditProjectComponent;
  let fixture: ComponentFixture<EditProjectComponent>;
  let svc: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<ProjectService>('ProjectService', [
      'getAllUsers',
      'getProjectDetails',
      'parseProjectDetailsResponse',
      'updateProject',
      'assignUserToProject',
      'uploadProjectFiles',
      'buildFileDownloadUrl',
      // nuevos que agregaste al componente:
      'removeUserFromProject',
      'deleteFile',
      'deleteProject',
    ]);

    // defaults seguros
    svc.getAllUsers.and.returnValue(of({ success: true, data: [] } as any));
    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({ members: [], files: [] } as any);
    svc.buildFileDownloadUrl.and.callFake((id: number) => `http://localhost:5000/file/${id}`);

    await TestBed.configureTestingModule({
      imports: [EditProjectComponent],
      providers: [{ provide: ProjectService, useValue: svc }],
    }).compileComponents();

    fixture = TestBed.createComponent(EditProjectComponent);
    component = fixture.componentInstance;

    // inputs mínimos
    component.project_id = 99;
    component.initialTitle = 'Titulo inicial';
    component.initialStart = '2025-01-01T00:00:00.000Z';
    component.initialEnd = '2025-12-31T00:00:00.000Z';

    fixture.detectChanges(); // ngOnInit() -> fetchAll()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =========================
  // saveDatos()
  // =========================
  it('saveDatos should handle error (apiErrorMessage prefers err.message)', () => {
    svc.updateProject.and.returnValue(throwError(() => new Error('fail')));

    component.title = '  Nuevo titulo  ';
    component.start_date = '2025-01-01T00:00:00.000Z';
    component.end_date = '2025-12-31T00:00:00.000Z';

    component.saveDatos();

    expect(svc.updateProject).toHaveBeenCalled();
    // con tu apiErrorMessage => err.message = 'fail'
    expect(component.msg).toBe('fail');
    expect(component.ok).toBeFalse();
    expect(component.saving).toBeFalse();
  });

  // =========================
  // upload()
  // =========================
  it('upload should handle error (apiErrorMessage prefers err.message)', () => {
    const f = new File(['x'], 'a.pdf');
    const fakeList: any = { length: 1, 0: f, item: (_: number) => f };
    component.filesToUpload = fakeList as FileList;

    svc.uploadProjectFiles.and.returnValue(throwError(() => new Error('fail')));

    component.upload();

    expect(svc.uploadProjectFiles).toHaveBeenCalledWith(99, component.filesToUpload as any);
    expect(component.msgUpload).toBe('fail');
    expect(component.okUpload).toBeFalse();
    expect(component.uploading).toBeFalse();
  });

  // =========================
  // assignSelected()
  // =========================
  it('assignSelected should report failures when some assignments fail (shows lastErrMsg)', () => {
    component.pendingAssign = new Set<number>([1, 2]);

    svc.assignUserToProject.and.callFake((_pid: number, uid: number) => {
      return uid === 1
        ? of({ success: true } as any)
        : throwError(() => new Error('fail'));
    });

    // para que refreshMembers no haga cosas raras
    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({ members: [], files: [] } as any);

    component.assignSelected();

    expect(svc.assignUserToProject).toHaveBeenCalledTimes(2);
    expect(component.okAssign).toBeFalse();

    // tu componente muestra lastErrMsg, no el "fallas: 1"
    expect(component.msgAssign).toContain('fail');

    // el componente limpia pendingAssign al final
    expect(component.pendingAssign.size).toBe(0);
    expect(component.assigning).toBeFalse();
  });

  it('assignSelected should assign users and clear pendingAssign on completion (all ok)', () => {
    component.pendingAssign = new Set<number>([1, 2]);

    svc.assignUserToProject.and.returnValue(of({ success: true } as any));

    // para que refreshMembers no haga cosas raras
    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({ members: [], files: [] } as any);

    component.assignSelected();

    expect(svc.assignUserToProject).toHaveBeenCalledTimes(2);
    expect(component.okAssign).toBeTrue();
    expect(component.msgAssign).toContain('Usuarios asignados correctamente');
    expect(component.pendingAssign.size).toBe(0);
    expect(component.assigning).toBeFalse();
  });

  // =========================
  // helpers
  // =========================
  it('fileUrl should call buildFileDownloadUrl', () => {
    const url = component.fileUrl(10);
    expect(svc.buildFileDownloadUrl).toHaveBeenCalledWith(10);
    expect(url).toContain('/file/10');
  });
});
