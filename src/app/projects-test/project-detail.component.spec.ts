import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProjectDetailComponent } from '../projects/project-detail.component'; // ajusta ruta
import { ProjectService } from '../projects/project.service';                 // ajusta ruta

describe('ProjectDetailComponent', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let component: ProjectDetailComponent;

  let svc: jasmine.SpyObj<ProjectService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<ProjectService>('ProjectService', [
      'getProjectDetails',
      'parseProjectDetailsResponse',
      'buildFileDownloadUrl',
    ]);

    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    // Defaults para no romper
    svc.getProjectDetails.and.returnValue(of({ success: true, data: [] } as any));
    svc.parseProjectDetailsResponse.and.returnValue({
      title: 'P',
      start_date: '2025-01-01',
      end_date: '2025-02-01',
      visibility: 'PUBLIC',
      members: [],
      files: [],
    } as any);

    svc.buildFileDownloadUrl.and.callFake((id: number) => `URL/${id}`);

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        { provide: ProjectService, useValue: svc },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.project_id = 1;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ngOnInit should NOT call fetch if project_id is falsy', () => {
    component.project_id = 0 as any;
    const fetchSpy = spyOn(component, 'fetch');

    fixture.detectChanges(); // ngOnInit

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(svc.getProjectDetails).not.toHaveBeenCalled();
  });

  it('ngOnInit should call fetch if project_id exists', () => {
    component.project_id = 123;
    const fetchSpy = spyOn(component, 'fetch').and.callThrough();

    fixture.detectChanges(); // ngOnInit

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(svc.getProjectDetails).toHaveBeenCalledWith(123);
  });

  it('fetch() should set loading true then populate details/members/files on success', () => {
    component.project_id = 7;

    const parsed = {
      title: 'Proyecto X',
      start_date: '2025-03-01',
      end_date: '2025-03-10',
      visibility: 'PRIVATE',
      members: [{ user_id: 1, name: 'Ana', email: 'a@a.com', role: 'MEMBER' }],
      files: [{ file_id: 9, filename: 'doc.pdf', size: 100 }],
    };

    svc.getProjectDetails.and.returnValue(of({ success: true, data: [{}] } as any));
    svc.parseProjectDetailsResponse.and.returnValue(parsed as any);

    component.fetch();

    expect(component.loading).toBeFalse();
    expect(svc.getProjectDetails).toHaveBeenCalledWith(7);

    expect(component.details).toEqual({
      title: 'Proyecto X',
      start_date: '2025-03-01',
      end_date: '2025-03-10',
      visibility: 'PRIVATE',
    });

    expect(component.members).toEqual(parsed.members as any);
    expect(component.files).toEqual(parsed.files as any);
  });

  it('fetch() should handle error and set loading=false', () => {
    component.project_id = 8;
    svc.getProjectDetails.and.returnValue(throwError(() => new Error('fail')));

    component.loading = false;
    component.fetch();

    expect(component.loading).toBeFalse();
  });

  it('fileUrl() should call buildFileDownloadUrl', () => {
    expect(component.fileUrl(55)).toBe('URL/55');
    expect(svc.buildFileDownloadUrl).toHaveBeenCalledWith(55);
  });

  it('goTasks() should navigate to /task with project_id query param', () => {
    component.project_id = 99;

    component.goTasks();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/task'],
      { queryParams: { project_id: 99 } }
    );
  });

  it('close() should emit closed', () => {
    const spy = spyOn(component.closed, 'emit');
    component.close();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
