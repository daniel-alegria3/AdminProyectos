import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CreateProjectComponent } from '../projects/create-project.component'; // ajusta ruta
import { ProjectService } from '../projects/project.service';                 // ajusta ruta

describe('CreateProjectComponent', () => {
  let fixture: ComponentFixture<CreateProjectComponent>;
  let component: CreateProjectComponent;

  let svc: jasmine.SpyObj<ProjectService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<ProjectService>('ProjectService', [
      'getAllUsers',
      'createProject',
      'uploadProjectFiles',
      'assignUserToProject',
    ]);

    // Importante: el constructor llama fetchUsers(), así que definimos el return ANTES de crear el componente
    svc.getAllUsers.and.returnValue(of({ success: true, data: [] } as any));

    await TestBed.configureTestingModule({
      imports: [CreateProjectComponent],
      providers: [{ provide: ProjectService, useValue: svc }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('constructor should call getAllUsers (fetchUsers)', () => {
    expect(svc.getAllUsers).toHaveBeenCalledTimes(1);
  });

  it('fetchUsers() should populate users when success=true and data is array', () => {
    const users = [{ user_id: 1, name: 'Ana', email: 'a@a.com' }];
    svc.getAllUsers.and.returnValue(of({ success: true, data: users } as any));

    component.fetchUsers();

    expect(component.users).toEqual(users as any);
  });

  it('toggleUser() should add/remove ids from selectedUserIds', () => {
    component.toggleUser(10, true);
    expect(component.selectedUserIds.has(10)).toBeTrue();

    component.toggleUser(10, false);
    expect(component.selectedUserIds.has(10)).toBeFalse();
  });

  it('onFiles() should reject file > 10MB, clear input, and set files=null', () => {
    // Archivo grande: 10MB + 1
    const big = new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'big.pdf');

    // Fake FileList
    const fakeList: any = {
      length: 1,
      0: big,
      item: (_: number) => big,
    };

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: fakeList });

    // Simular que input tenía valor (para ver si se limpia)
    input.value = 'C:\\fakepath\\big.pdf';

    const ev = { target: input } as any as Event;

    component.onFiles(ev);

    expect(component.success).toBeFalse();
    expect(component.message).toContain('supera 10MB');
    expect(component.files).toBeNull();
    expect(input.value).toBe('');
  });

  it('onCreate() should call createProject with trimmed title and undefined dates when empty', () => {
    component.title = '   Mi Proyecto   ';
    component.description = 'desc';
    component.start_date = '';
    component.end_date = '';

    svc.createProject.and.returnValue(of({ success: true, data: { project_id: 1 } } as any));
    svc.assignUserToProject.and.returnValue(of({ success: true } as any));
    svc.uploadProjectFiles.and.returnValue(of({ success: true } as any));

    component.onCreate();

    expect(svc.createProject).toHaveBeenCalledTimes(1);
    expect(svc.createProject).toHaveBeenCalledWith({
      title: 'Mi Proyecto',
      visibility: 'PUBLIC',
      description: 'desc',
      start_date: undefined,
      end_date: undefined,
    });
  });

  it('onCreate() success with no users selected and no files should emit created and then closed after 800ms', fakeAsync(() => {
    component.title = 'Proyecto';
    const createdSpy = spyOn(component.created, 'emit');
    const closedSpy = spyOn(component.closed, 'emit');

    svc.createProject.and.returnValue(of({ success: true, data: { project_id: 123 } } as any));

    component.onCreate();

    // finishOk sucede rápido
    expect(component.success).toBeTrue();
    expect(component.message).toContain('Proyecto creado correctamente');
    expect(createdSpy).toHaveBeenCalledTimes(1);

    // cierre diferido
    expect(closedSpy).not.toHaveBeenCalled();
    tick(800);
    expect(closedSpy).toHaveBeenCalledTimes(1);
  }));

  it('onCreate() should upload files when present', () => {
    component.title = 'Proyecto';
    // Fake FileList (puede ser length 0, igual valida flujo)
    const f = new File(['x'], 'x.pdf');
    const fakeList: any = { length: 1, 0: f, item: (_: number) => f };
    component.files = fakeList as FileList;

    svc.createProject.and.returnValue(of({ success: true, data: { project_id: 5 } } as any));
    svc.uploadProjectFiles.and.returnValue(of({ success: true } as any));

    component.onCreate();

    expect(svc.uploadProjectFiles).toHaveBeenCalledTimes(1);
    expect(svc.uploadProjectFiles).toHaveBeenCalledWith(5, fakeList as FileList);
  });

  it('onCreate() should assign selected users with role MEMBER', () => {
    component.title = 'Proyecto';
    component.selectedUserIds.add(10);
    component.selectedUserIds.add(11);

    svc.createProject.and.returnValue(of({ success: true, data: { project_id: 99 } } as any));
    svc.assignUserToProject.and.returnValue(of({ success: true } as any));

    component.onCreate();

    expect(svc.assignUserToProject).toHaveBeenCalledTimes(2);
    expect(svc.assignUserToProject).toHaveBeenCalledWith(99, 10, 'MEMBER');
    expect(svc.assignUserToProject).toHaveBeenCalledWith(99, 11, 'MEMBER');
  });

  it('onCreate() should continue after upload error and still assign users', () => {
  component.title = 'Proyecto';
  component.selectedUserIds.add(10);

  const f = new File(['x'], 'x.pdf');
  const fakeList: any = { length: 1, 0: f, item: (_: number) => f };
  component.files = fakeList as FileList;

  svc.createProject.and.returnValue(of({ success: true, data: { project_id: 7 } } as any));
  svc.uploadProjectFiles.and.returnValue(throwError(() => new Error('upload fail')));
  svc.assignUserToProject.and.returnValue(of({ success: true } as any));

  component.onCreate();

  expect(svc.assignUserToProject).toHaveBeenCalledTimes(1);
  expect(svc.assignUserToProject).toHaveBeenCalledWith(7, 10, 'MEMBER');

  // mensaje final lo pisa finishOk(), así que validamos el final esperado
  expect(component.success).toBeTrue();
  expect(component.message).toContain('Proyecto creado y responsables asignados');
});


  it('onCreate() should fallback to localStorage when backend error', () => {
    component.title = 'Proyecto Local';
    component.description = 'd';
    component.selectedUserIds.add(77);

    spyOn(localStorage, 'getItem').and.returnValue('[]');
    const setSpy = spyOn(localStorage, 'setItem');

    svc.createProject.and.returnValue(throwError(() => new Error('backend down')));

    component.onCreate();

    expect(setSpy).toHaveBeenCalledTimes(1);
    const [key, value] = setSpy.calls.argsFor(0);
    expect(key).toBe('projects');

    const parsed = JSON.parse(value);
    expect(parsed.length).toBe(1);
    expect(parsed[0].title).toBe('Proyecto Local');
    expect(parsed[0].members).toEqual([{ user_id: 77 }]);
    expect(component.success).toBeTrue();
    expect(component.message).toContain('Proyecto guardado localmente');
  });

  it('onCreate() should fallback when response has success=false or missing data', () => {
    component.title = 'Proyecto';
    spyOn(localStorage, 'getItem').and.returnValue('[]');
    const setSpy = spyOn(localStorage, 'setItem');

    svc.createProject.and.returnValue(of({ success: false } as any));

    component.onCreate();

    expect(setSpy).toHaveBeenCalled();
    expect(component.success).toBeTrue();
    expect(component.message).toContain('Proyecto guardado localmente');
  });

  it('close() should emit closed', () => {
    const closedSpy = spyOn(component.closed, 'emit');
    component.close();
    expect(closedSpy).toHaveBeenCalledTimes(1);
  });
});
