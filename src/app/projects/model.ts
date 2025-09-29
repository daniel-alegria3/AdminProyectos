export interface Project {
  project_id?: number;
  title: string;
  description?: string; // ⚠️ el backend /project no recibe descripción aún
  start_date?: string;  // YYYY-MM-DD
  end_date?: string;    // YYYY-MM-DD
  members?: ProjectMember[];
  files?: ProjectFile[];
}

export interface ProjectMember {
  user_id: number;
  name?: string;
  role?: string; // e.g. 'MEMBER' (por defecto en backend)
}

export interface ProjectFile {
  file_id: number;
  filename: string;
  size?: number;
}

export interface UserLite {
  user_id: number;
  name: string;
  email: string;
  is_enabled?: boolean;
  is_admin?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
