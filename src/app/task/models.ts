export interface Miembro {
  id: number;
  nombre_completo: string; // RF01 [cite: 16]
  email: string;
  rol?: string; // RF03 [cite: 23]
}

export interface Archivo {
  id: number; // Necesario para que la API sepa cuál descargar
  nombre: string;
  url?: string; // Opcional, por si la descargas directamente
  // RF05: El sistema debe distinguir tipos de archivo [cite: 31]
  tipo: 'pdf' | 'doc' | 'docx' | 'jpg' | 'otro'; 
  size: number;
}

export interface Tarea {
  id?: number; // Te sugiero unificar a number si tu backend es Python/SQL
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  
  // Datos del creador o responsable principal
  usuario: number;
  usuarioNombre: string;
  
  // RF04: Estado del proyecto/tarea [cite: 20]
  estado?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'; 

  // Listas de detalles (RF05 y RF06)
  archivos: Archivo[]; 
  miembros?: Miembro[]; // RF06: Múltiples responsables [cite: 34]
  
  proyecto: string; // O el ID del proyecto
}