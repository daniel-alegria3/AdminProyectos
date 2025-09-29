import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  user_id: number;
  name: string;
  email: string;
  phone_number?: string;
  is_enabled: boolean;
  is_admin: boolean;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  is_admin?: boolean;
}

export interface UpdateUserData {
  user_id: number;
  name?: string;
  email?: string;
  phone_number?: string;
  account_status?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:5000';

  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.API_BASE}/user`, { withCredentials: true });
  }

  createUser(userData: CreateUserData): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.API_BASE}/admin/user`, userData, { withCredentials: true });
  }

  updateUser(userData: UpdateUserData): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.API_BASE}/admin/user`, userData, { withCredentials: true });
  }

  deleteUser(userId: number): Observable<ApiResponse<{ deleted_user_id: number }>> {
    return this.http.delete<ApiResponse<{ deleted_user_id: number }>>(
      `${this.API_BASE}/admin/user`,
      {
        body: { user_id: userId },
        withCredentials: true,
      }
    );
  }

  updateUserStatus(userId: number, accountStatus: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API_BASE}/admin/user/account_status`, {
      user_id: userId,
      account_status: accountStatus
    }, { withCredentials: true });
  }
}
