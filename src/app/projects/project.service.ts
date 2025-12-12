import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Project {
  project_id?: number;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  visibility?: string | null;
  description?: string | null; // solo UI
}

export interface User {
  user_id: number;
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  is_enabled?: boolean;
  is_admin?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  // === PROYECTOS ===
  getAllMyProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<ApiResponse<Project[]>>(`${this.apiUrl}/project/mine`, {
      headers: this.jsonHeaders(),
      withCredentials: true,
    });
  }

  createProject(payload: {
    title: string;
    visibility: string;
    description?: string;
    start_date?: string;
    end_date?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/project`, payload, {
      headers: this.jsonHeaders(),
      withCredentials: true,
    });
  }

  updateProject(payload: {
    project_id: number;
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    visibility?: string; // usamos ARCHIVED para “eliminar”
  }) {
    return this.http.patch(`${this.apiUrl}/project`, payload, {
      headers: this.jsonHeaders(),
      withCredentials: true,
    });
  }

  assignUserToProject(project_id: number, assigned_user_id: number, role: string = 'MEMBER') {
    return this.http.post(
      `${this.apiUrl}/project/assign`,
      { project_id, user_id: assigned_user_id, role },
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }

  uploadProjectFiles(project_id: number, files: FileList) {
    const form = new FormData();
    form.append('project_id', String(project_id));
    for (let i = 0; i < files.length; i++) form.append('files', files[i]);
    return this.http.post(`${this.apiUrl}/file/to_project`, form, { withCredentials: true });
  }

  getProjectDetails(project_id: number) {
    return this.http.get(`${this.apiUrl}/project/${project_id}`, {
      headers: this.jsonHeaders(),
      withCredentials: true,
    });
  }

  parseProjectDetailsResponse(response: any) {
    const row = (response?.data || [])[0] || {};
    return {
      ...row,
      members: JSON.parse(row.members || '[]').map((m: any) => ({
        user_id: m.id_user ?? null,
        name: m.name ?? null,
        email: m.email ?? null,
        role: m.role ?? null
      })),
      files: JSON.parse(row.files || '[]').map((f: any) => ({
        file_id: f.file_id ?? null,
        filename: f.filename ?? null,
        size: f.size ?? null
      }))
    };
  }

  buildFileDownloadUrl(file_id: number) {
    return `${this.apiUrl}/file/${file_id}`;
  }

  // === USUARIOS ===
  getAllUsers(): Observable<ApiResponse<User[]>> {
    // Backend: GET /user -> SELECT id_user as user_id, name, email, phone_number, account_status = "ENABLED" as is_enabled, is_admin
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/user`, {
      headers: this.jsonHeaders(),
      withCredentials: true,
    });
  }
}
