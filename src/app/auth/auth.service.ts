import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Auth } from './auth';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user_id?: number;
    is_admin?: boolean;
  };
}

export interface UserSession {
  user_id: number;
  is_admin: boolean;
  isLoggedIn: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000';

  // BehaviorSubject to track authentication state
  private currentUserSubject = new BehaviorSubject<UserSession | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check session on service initialization
    this.checkSession().subscribe();
  }

  /**
   * Check if there's an active session on the server
   * Call this on app initialization
   */
  checkSession(): Observable<boolean | AuthResponse> {
    return this.http
      .get<AuthResponse>(`${this.apiUrl}/user/is_logged_in`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            const userSession: UserSession = {
              user_id: response.data.user_id || 0,
              is_admin: response.data.is_admin || false,
              isLoggedIn: true,
            };
            this.currentUserSubject.next(userSession);
          } else {
            this.currentUserSubject.next(null);
          }
        }),
        tap(() => true as boolean),
        catchError(() => {
          this.currentUserSubject.next(null);
          return of(false);
        }),
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/user/register`, userData, {
      withCredentials: true,
    });
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/user/login`, credentials, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            const userSession: UserSession = {
              user_id: response.data.user_id || 0,
              is_admin: response.data.is_admin || false,
              isLoggedIn: true,
            };

            // Update the BehaviorSubject
            this.currentUserSubject.next(userSession);
          }
        }),
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
      }),
    );
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value?.isLoggedIn || false;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.is_admin || false;
  }

  getUserId(): number | null {
    return this.currentUserSubject.value?.user_id || null;
  }

  getCurrentUser(): UserSession | null {
    return this.currentUserSubject.value;
  }
}
