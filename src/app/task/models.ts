export interface Tarea {
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  usuario: string;
  archivos: Archivo[];
  proyecto: string;
}

export interface Archivo {
  nombre: string;
  url: string;
}

export interface Proyecto {
  nombre: string;
  tareas: Tarea[];
}

export interface Usuario {
  nombre: string;
  tareas: Tarea[];
}
