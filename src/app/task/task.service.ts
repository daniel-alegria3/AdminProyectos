import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Tarea, Archivo, Miembro } from './models'; // Asegúrate que Miembro y Archivo estén exportados en models.ts

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // ==========================================
  // LECTURA DE DATOS (Queries)
  // ==========================================

  // Obtiene los detalles completos y transforma la respuesta del backend al modelo del frontend
  // En task.service.ts

// En src/app/task/task.service.ts

  getTaskDetails(id: number): Observable<Tarea> {
    return this.http.get<any>(`${this.apiUrl}/task/${id}`, {
      withCredentials: true
    }).pipe(
      map(response => {
        // 1. Extraer datos (Backend a veces manda Array, a veces Objeto)
        const data = response.data || response;
        const tareaRaw = Array.isArray(data) ? data[0] : data;

        if (!tareaRaw) throw new Error('No se encontraron datos de la tarea');

        // Helper para convertir JSON string a Objetos reales
        const parsear = (val: any) => {
          try { return typeof val === 'string' ? JSON.parse(val) : (val || []); } 
          catch { return []; }
        };

        const listaMiembros = parsear(tareaRaw.members);
        const listaArchivos = parsear(tareaRaw.files);

        // 2. TRADUCCIÓN: Backend (Inglés) -> Frontend (Español)
        const tareaTraducida: Tarea = {
          id: tareaRaw.id_task || tareaRaw.id,
          titulo: tareaRaw.title,
          descripcion: tareaRaw.description,
          
          // Usamos 'as any' para evitar errores si el backend manda 'pending' en vez de 'PENDING'
          estado: (tareaRaw.progress_status || 'PENDING') as any, 
          
          fechaInicio: tareaRaw.start_date,
          fechaFin: tareaRaw.end_date,
          proyecto: tareaRaw.project_title || 'General',

          // 👇 ESTA LÍNEA ES VITAL (id del dueño)
          usuario: tareaRaw.user_id || (listaMiembros[0] ? listaMiembros[0].user_id : 0),
          usuarioNombre: listaMiembros.length > 0 ? listaMiembros[0].name : 'Sin asignar',

          // Mapeo de Miembros
          miembros: listaMiembros.map((m: any) => ({
            id: m.user_id, // Tu interface usa 'id'
            nombre_completo: m.name,
            email: m.email,
            rol: m.role
          })),

          // Mapeo de Archivos con validación de tipo estricta
          archivos: listaArchivos.map((f: any) => {
            const ext = (f.extension || '').toLowerCase();
            return {
              id: f.file_id || f.id,
              nombre: f.filename || f.name,
              size: f.size,
              // Validación estricta para que coincida con tu modelo 'pdf' | 'jpg' | ...
              tipo: (['pdf', 'doc', 'docx', 'jpg'].includes(ext)) ? ext : 'otro',
              url: '' 
            };
          })
        };

        return tareaTraducida;
      })
    );
  }

  getUserTasks(): Observable<any> {
    console.log('🚀 TaskService: Llamando getUserTasks()');
    return this.http.get(`${this.apiUrl}/task`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // En task.service.ts, si no existe:
  getProjectDetails(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/project/${projectId}`, { withCredentials: true });
  }

  getAllProjectTasks(project_id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/project/${project_id}/tasks`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  getProjectUserTasks(project_id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/project/${project_id}/tasks/mine`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  getAllUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // ==========================================
  // ESCRITURA Y GESTIÓN (Commands)
  // ==========================================

    // En task.service.ts
  deleteTask(taskId: number): Observable<any> {
    // Asegúrate de que tu backend tenga esta ruta, o usa la lógica que corresponda
    // Si usas procedimientos almacenados, podría ser un POST a /task/delete
    return this.http.delete<any>(`${this.apiUrl}/task/${taskId}`, { withCredentials: true });
  }

  createTask(tarea: Partial<Tarea>): Observable<any> {
    // Si viene con campos en inglés (desde task-form), usarlos directamente
    // Si viene con campos en español, traducirlos
    const taskData = {
      project_id: (tarea as any).project_id || (tarea as any).proyecto_id,
      title: (tarea as any).title || tarea.titulo,
      description: (tarea as any).description || tarea.descripcion || '',
      start_date: (tarea as any).start_date || tarea.fechaInicio,
      end_date: (tarea as any).end_date || tarea.fechaFin,
      user_id: (tarea as any).user_id || tarea.usuario,
      role: (tarea as any).role || 'MEMBER'
    };

    console.log('📤 [TaskService] createTask - Enviando:', taskData);

    return this.http.post(`${this.apiUrl}/task`, taskData, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  updateTaskStatus(taskId: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/task/progress_status`, 
      { task_id: taskId, progress_status: status }, 
      { 
        headers: this.getHeaders(),
        withCredentials: true 
      }
    );
  }

  // ==========================================
  // GESTIÓN DE ARCHIVOS (RF05)
  // ==========================================

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

  // NUEVO: Método para descargar archivos (Requisito del Líder y RF05)
  // Recibe el ID del archivo y devuelve un Blob (binario)
  downloadFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/file/${fileId}`, {
      responseType: 'blob', // Importante para archivos PDF/DOC/JPG
      withCredentials: true
    });
  }

  // ==========================================
  // MÉTODOS DE ASIGNACIÓN DE MIEMBROS
  // ==========================================

  createTaskAssignation(task_id: number, users: { user_id: number; role: string }[]): Observable<any[]> {
    if (!users || users.length === 0) {
      return of([]);
    }
    
    const peticiones = users.map(user => 
      this.http.post(
        `${this.apiUrl}/task/assign`,
        { task_id, user_id: user.user_id, role: user.role || 'MEMBER' },
        { headers: this.getHeaders(), withCredentials: true }
      )
    );
    
    return forkJoin(peticiones);
  }

  deleteTaskAssignation(task_id: number, user_id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/task/assign`, {
      headers: this.getHeaders(),
      withCredentials: true,
      body: { task_id, user_id }
    });
  }

  deleteFile(file_id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/file/${file_id}`, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }
}