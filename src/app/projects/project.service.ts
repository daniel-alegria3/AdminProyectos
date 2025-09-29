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
  start_date?: string;
  end_date?: string;
  description?: string; // UI-only
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  getAllProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<ApiResponse<Project[]>>(
      `${this.apiUrl}/project`,
      { headers: this.jsonHeaders(), withCredentials: true }
    );
  }

  createProject(payload: { title: string; start_date?: string; end_date?: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/project`,
      payload,
      { headers: this.jsonHeaders(), withCredentials: true }
    );
  }

  assignUserToProject(project_id: number, assigned_user_id: number, role: string = 'MEMBER'): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/project/assign`,
      { project_id, assigned_user_id, role },
      { headers: this.jsonHeaders(), withCredentials: true }
    );
  }

  uploadProjectFiles(project_id: number, files: FileList): Observable<any> {
    const form = new FormData();
    form.append('project_id', String(project_id));
    for (let i = 0; i < files.length; i++) form.append('files', files[i]);
    return this.http.post(`${this.apiUrl}/file/to_project`, form, { withCredentials: true });
  }

  getAllUsers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/user`,
      { headers: this.jsonHeaders(), withCredentials: true }
    );
    
  }
  updateProject(payload: {
  project_id: number;
  title?: string;
  start_date?: string;
  end_date?: string;
  visibility?: string; // opcional, tu SP lo acepta
    }) {
  return this.http.patch(
    `${this.apiUrl}/project`,
    payload,
    { headers: this.jsonHeaders(), withCredentials: true }
  );
}
getProjectDetails(project_id: number) {
    return this.http.get(
      `${this.apiUrl}/project/${project_id}`,
      { headers: this.jsonHeaders(), withCredentials: true }
    );
  }

  getProjectTasks(project_id: number) {
    return this.http.get(
      `${this.apiUrl}/project/${project_id}/tasks`,
      { headers: this.jsonHeaders(), withCredentials: true }
    );
  }

  // URL directa para descargar archivo del backend
  buildFileDownloadUrl(file_id: number) {
    return `${this.apiUrl}/file/${file_id}`;
  }
}
