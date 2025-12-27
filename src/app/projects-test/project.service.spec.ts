import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService } from '../projects/project.service'; // ajusta ruta según tu estructura

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:5000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService],
    });

    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllMyProjects() should GET /project/mine with json headers and credentials', () => {
    const mockRes = { success: true, data: [] };

    service.getAllMyProjects().subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/project/mine`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockRes);
  });

  it('createProject() should POST /project with payload, headers, credentials', () => {
    const payload = {
      title: 'Demo',
      visibility: 'PUBLIC',
      description: 'x',
      start_date: '2025-01-01',
      end_date: '2025-01-31',
    };
    const mockRes = { success: true, message: 'created' };

    service.createProject(payload).subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/project`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRes);
  });

  it('updateProject() should PATCH /project with payload, headers, credentials', () => {
    const payload = {
      project_id: 10,
      title: 'Updated',
      visibility: 'ARCHIVED',
    };
    const mockRes = { success: true };

    service.updateProject(payload as any).subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/project`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRes);
  });

  it('assignUserToProject() should POST /project/assign with default role MEMBER', () => {
    const mockRes = { success: true };

    service.assignUserToProject(5, 99).subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/project/assign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.body).toEqual({ project_id: 5, user_id: 99, role: 'MEMBER' });
    req.flush(mockRes);
  });

  it('assignUserToProject() should POST /project/assign with custom role', () => {
    const mockRes = { success: true };

    service.assignUserToProject(5, 99, 'OWNER').subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/project/assign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ project_id: 5, user_id: 99, role: 'OWNER' });
    req.flush(mockRes);
  });

  it('uploadProjectFiles() should POST /file/to_project as FormData with credentials', () => {
    const file1 = new File(['a'], 'a.txt');
    const file2 = new File(['b'], 'b.txt');

    // simulamos FileList
    const fakeList: any = {
      length: 2,
      0: file1,
      1: file2,
      item: (i: number) => (i === 0 ? file1 : file2),
    };

    const mockRes = { success: true };

    service.uploadProjectFiles(7, fakeList as FileList).subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/file/to_project`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();

    // Ojo: el body es FormData (no se compara directo como objeto)
    expect(req.request.body instanceof FormData).toBeTrue();

    req.flush(mockRes);
  });

  it('getProjectDetails() should GET /project/:id with headers and credentials', () => {
    const mockRes = { success: true, data: [] };

    service.getProjectDetails(123).subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/project/123`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockRes);
  });

  it('parseProjectDetailsResponse() should normalize members/files from JSON strings', () => {
    const response = {
      data: [
        {
          project_id: 1,
          title: 'P',
          members: JSON.stringify([
            { id_user: 10, name: 'Ana', email: 'a@a.com', role: 'MEMBER' },
            { id_user: 11, name: null, email: null, role: null },
          ]),
          files: JSON.stringify([
            { file_id: 7, filename: 'doc.pdf', size: 1000 },
            { file_id: 8, filename: null, size: null },
          ]),
        },
      ],
    };

    const parsed = service.parseProjectDetailsResponse(response);

    expect(parsed.project_id).toBe(1);
    expect(parsed.members).toEqual([
      { user_id: 10, name: 'Ana', email: 'a@a.com', role: 'MEMBER' },
      { user_id: 11, name: null, email: null, role: null },
    ]);

    expect(parsed.files).toEqual([
      { file_id: 7, filename: 'doc.pdf', size: 1000 },
      { file_id: 8, filename: null, size: null },
    ]);
  });

  it('parseProjectDetailsResponse() should handle missing data safely', () => {
    const parsed = service.parseProjectDetailsResponse({});
    expect(parsed.members).toEqual([]);
    expect(parsed.files).toEqual([]);
  });

  it('buildFileDownloadUrl() should build /file/:id', () => {
    expect(service.buildFileDownloadUrl(55)).toBe(`${API}/file/55`);
  });

  it('getAllUsers() should GET /user with headers and credentials', () => {
    const mockRes = { success: true, data: [] };

    service.getAllUsers().subscribe(res => {
      expect(res).toEqual(mockRes as any);
    });

    const req = httpMock.expectOne(`${API}/user`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockRes);
  });
});
