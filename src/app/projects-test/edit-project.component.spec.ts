import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EditProjectComponent } from '../projects/edit-project.component'; // ajusta ruta
import { ProjectService } from '../projects/project.service';             // ajusta ruta

describe('EditProjectComponent', () => {
  let fixture: ComponentFixture<EditProjectComponent>;
  let component: EditProjectComponent;

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
    ]);

    // Defaults para evitar errores al crear componente (ngOnInit llama fetchAll)
    svc.getAllUsers.and.returnValue(of({ success: true, data: [] } as any));
    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({ members: [], files: [] } as any);
    svc.buildFileDownloadUrl.and.returnValue('http://localhost:5000/file/1');

    await TestBed.configureTestingModule({
      imports: [EditProjectComponent],
      providers: [{ provide: ProjectService, useValue: svc }],
    }).compileComponents();

    fixture = TestBed.createComponent(EditProjectComponent);
    component = fixture.componentInstance;

    // inputs obligatorios
    component.project_id = 123;
    component.initialTitle = 'Titulo Inicial';
    component.initialStart = '2025-01-01T00:00:00.000Z';
    component.initialEnd = '2025-02-01';

    fixture.detectChanges(); // dispara ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should set title and format start/end dates', () => {
    expect(component.title).toBe('Titulo Inicial');
    expect(component.start_date).toBe('2025-01-01'); // recorta por "T"
    expect(component.end_date).toBe('2025-02-01');   // ya estaba en YYYY-MM-DD
  });

  it('fetchAll should call getAllUsers and getProjectDetails and set members/files', () => {
    const users = [{ user_id: 1, name: 'Ana' }];
    svc.getAllUsers.and.returnValue(of({ success: true, data: users } as any));

    const rawDetail = { success: true, data: [{ members: '[]', files: '[]' }] };
    svc.getProjectDetails.and.returnValue(of(rawDetail as any));

    svc.parseProjectDetailsResponse.and.returnValue({
      members: [{ user_id: 9, name: 'M' }],
      files: [{ file_id: 7, filename: 'x.pdf' }],
    } as any);

    component.fetchAll();

    expect(svc.getAllUsers).toHaveBeenCalled();
    expect(svc.getProjectDetails).toHaveBeenCalledWith(123);

    expect(component.allUsers).toEqual(users as any);
    expect(component.members).toEqual([{ user_id: 9, name: 'M' }] as any);
    expect(component.files).toEqual([{ file_id: 7, filename: 'x.pdf' }] as any);
    expect(component.loading).toBeFalse();
  });

  it('fetchAll should set loading=false if getProjectDetails errors', () => {
    svc.getProjectDetails.and.returnValue(throwError(() => new Error('fail')));
    component.loading = false;

    component.fetchAll();

    expect(component.loading).toBeFalse();
  });

  it('saveDatos should PATCH updateProject with trimmed title and clean dates (strip T)', () => {
    component.title = '  Nuevo  ';
    component.start_date = '2025-03-10T12:00:00.000Z';
    component.end_date = '2025-03-20T00:00:00.000Z';

    svc.updateProject.and.returnValue(of({ success: true } as any));

    const savedSpy = spyOn(component.saved, 'emit');

    component.saveDatos();

    expect(svc.updateProject).toHaveBeenCalledWith({
      project_id: 123,
      title: 'Nuevo',
      start_date: '2025-03-10',
      end_date: '2025-03-20',
    } as any);

    expect(component.saving).toBeFalse();
    expect(component.ok).toBeTrue();
    expect(component.msg).toContain('Proyecto actualizado');
    expect(savedSpy).toHaveBeenCalledTimes(1);
  });

  it('saveDatos should set msg when success=false', () => {
    svc.updateProject.and.returnValue(of({ success: false, message: 'X' } as any));

    component.title = 'Titulo';
    component.saveDatos();

    expect(component.ok).toBeFalse();
    expect(component.msg).toBe('X');
    expect(component.saving).toBeFalse();
  });

  it('saveDatos should handle error', () => {
    svc.updateProject.and.returnValue(throwError(() => new Error('fail')));

    component.title = 'Titulo';
    component.saveDatos();

    expect(component.saving).toBeFalse();
    expect(component.msg).toBe('Error al actualizar');
  });

  it('toggleAssign should add/remove pendingAssign', () => {
    component.toggleAssign(10, true);
    expect(component.pendingAssign.has(10)).toBeTrue();

    component.toggleAssign(10, false);
    expect(component.pendingAssign.has(10)).toBeFalse();
  });

  it('assignSelected should do nothing if pendingAssign is empty', () => {
    component.pendingAssign.clear();
    component.assignSelected();
    expect(svc.assignUserToProject).not.toHaveBeenCalled();
  });

  it('assignSelected should assign users and clear pendingAssign on completion (all ok)', () => {
    component.pendingAssign = new Set([10, 11]);

    svc.assignUserToProject.and.returnValue(of({ success: true } as any));
    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({ members: [{ user_id: 10 }], files: [] } as any);

    component.assignSelected();

    expect(svc.assignUserToProject).toHaveBeenCalledTimes(2);
    expect(svc.assignUserToProject).toHaveBeenCalledWith(123, 10, 'MEMBER');
    expect(svc.assignUserToProject).toHaveBeenCalledWith(123, 11, 'MEMBER');

    expect(component.assigning).toBeFalse();
    expect(component.okAssign).toBeTrue();
    expect(component.msgAssign).toContain('Usuarios asignados correctamente');
    expect(component.pendingAssign.size).toBe(0);
  });

  it('assignSelected should report failures when some assignments fail', () => {
    component.pendingAssign = new Set([10, 11]);

    // 10 ok, 11 falla
    svc.assignUserToProject.and.callFake((_: any, uid: any) => {
      return uid === 10 ? of({ success: true } as any) : throwError(() => new Error('fail'));
    });

    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({ members: [], files: [] } as any);

    component.assignSelected();

    expect(component.assigning).toBeFalse();
    expect(component.okAssign).toBeFalse();
    expect(component.msgAssign).toContain('fallas: 1');
    expect(component.pendingAssign.size).toBe(0);
  });

  it('onFiles should set filesToUpload', () => {
    const f = new File(['x'], 'x.pdf');
    const fakeList: any = { length: 1, 0: f, item: (_: number) => f };

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: fakeList });

    component.onFiles({ target: input } as any);

    expect(component.filesToUpload).toBe(fakeList as any);
  });

  it('upload should do nothing if filesToUpload is null', () => {
    component.filesToUpload = null;
    component.upload();
    expect(svc.uploadProjectFiles).not.toHaveBeenCalled();
  });

  it('upload should call uploadProjectFiles and then refreshFiles on success', () => {
    const f = new File(['x'], 'x.pdf');
    const fakeList: any = { length: 1, 0: f, item: (_: number) => f };
    component.filesToUpload = fakeList as FileList;

    svc.uploadProjectFiles.and.returnValue(of({ success: true } as any));
    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({ members: [], files: [{ file_id: 1 }] } as any);

    component.upload();

    expect(svc.uploadProjectFiles).toHaveBeenCalledWith(123, fakeList as FileList);
    expect(component.uploading).toBeFalse();
    expect(component.okUpload).toBeTrue();
    expect(component.msgUpload).toContain('Archivos subidos');
    expect(component.files).toEqual([{ file_id: 1 }] as any);
  });

  it('upload should handle error', () => {
    const f = new File(['x'], 'x.pdf');
    const fakeList: any = { length: 1, 0: f, item: (_: number) => f };
    component.filesToUpload = fakeList as FileList;

    svc.uploadProjectFiles.and.returnValue(throwError(() => new Error('fail')));

    component.upload();

    expect(component.uploading).toBeFalse();
    expect(component.okUpload).toBeFalse();
    expect(component.msgUpload).toBe('Error al subir archivos');
  });

  it('fileUrl should call buildFileDownloadUrl', () => {
    svc.buildFileDownloadUrl.and.returnValue('URL_OK');
    expect(component.fileUrl(9)).toBe('URL_OK');
    expect(svc.buildFileDownloadUrl).toHaveBeenCalledWith(9);
  });

  it('close should emit closed', () => {
    const spy = spyOn(component.closed, 'emit');
    component.close();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
