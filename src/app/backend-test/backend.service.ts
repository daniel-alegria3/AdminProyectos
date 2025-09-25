import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  // -- ADMIN --
  createUser(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/user`, data, { withCredentials: true });
  }

  updateUser(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/user`, data, { withCredentials: true });
  }

  deleteUser(data: any): Observable<any> {
    return this.http.request('DELETE', `${this.baseUrl}/admin/user`, {
      body: data,
      withCredentials: true,
    });
  }

  updateUserStatus(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/project`, data, { withCredentials: true });
  }

  // --- USER ---
  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/login`, data, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/logout`, {}, { withCredentials: true });
  }

  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/user`, { withCredentials: true });
  }

  // --- PROJECT ---
  getAllProjects(): Observable<any> {
    return this.http.get(`${this.baseUrl}/project`, { withCredentials: true });
  }

  // getProjectFiles(): Observable<any> {
  // }

  createProject(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/project`, data, { withCredentials: true });
  }

  // assignUserToProject(): Observable<any> {
  // }

  // updateProjectAssignRole(): Observable<any> {
  // }

  // --- TASK ---
  createTask(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/task`, data, { withCredentials: true });
  }

  // assignUserToTask(): Observable<any> {
  // }

  // updateTaskAssignRole(): Observable<any> {
  // }

  // updateTaskProgressStatus(): Observable<any> {
  // }

  getTaskFiles(taskId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/task/${taskId}`, { withCredentials: true });
  }

  // getMyTasks (): Observable<any> {
  // }

  // getTasksByProject(): Observable<any> {
  // }

  // getTasksByAssignedUser(): Observable<any> {
  // }

  // --- FILE ---
  uploadFileToProject(projectId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    formData.append('project_id', projectId.toString());
    files.forEach((f) => formData.append('files', f));
    return this.http.post(`${this.baseUrl}/file/to_project`, formData, { withCredentials: true });
  }

  uploadFileToTask(taskId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    formData.append('task_id', taskId.toString());
    files.forEach((f) => formData.append('files', f));
    return this.http.post(`${this.baseUrl}/file/to_task`, formData, { withCredentials: true });
  }

  downloadFile(fileId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/file/${fileId}`, { withCredentials: true });
  }
}
