import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarea } from './models';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = 'http://localhost:5000/api/general';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // Obtener tareas del usuario (adaptado al backend existente)
  getUserTasks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tasks`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // Crear nueva tarea (adaptado al backend existente)
  createTask(tarea: Partial<Tarea>): Observable<any> {
    const taskData = {
      title: tarea.titulo,
      description: tarea.descripcion,
      start_date: tarea.fechaInicio,
      due_date: tarea.fechaFin,
      assigned_user: tarea.usuario,
      project_id: 1 // Proyecto por defecto
    };

    return this.http.post(`${this.apiUrl}/tasks`, taskData, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // Obtener todos los usuarios disponibles
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // Actualizar estado de tarea
  updateTaskStatus(taskId: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tasks/progress_status`, 
      { task_id: taskId, progress_status: status }, 
      { 
        headers: this.getHeaders(),
        withCredentials: true 
      }
    );
  }

  // Subir archivos a una tarea
  uploadTaskFiles(taskId: number, files: FileList): Observable<any> {
    const formData = new FormData();
    formData.append('task_id', taskId.toString());
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    return this.http.post(`${this.apiUrl}/file/to_task`, formData, { 
      withCredentials: true 
    });
  }
}