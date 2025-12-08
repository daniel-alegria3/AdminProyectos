import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

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
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000';

  // Signal-based state management
  private currentUserSignal = signal<UserSession | null>(null);

  // Public computed signals for reactive access
  currentUser = this.currentUserSignal.asReadonly();
  isLoggedIn = computed(() => this.currentUserSignal()?.isLoggedIn ?? false);
  isAdmin = computed(() => this.currentUserSignal()?.is_admin ?? false);
  userId = computed(() => this.currentUserSignal()?.user_id ?? null);

  constructor() {
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
            this.currentUserSignal.set(userSession);
          } else {
            this.currentUserSignal.set(null);
          }
        }),
        tap(() => true as boolean),
        catchError(() => {
          this.currentUserSignal.set(null);
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
            this.currentUserSignal.set(userSession);
          }
        }),
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUserSignal.set(null);
      }),
    );
  }

  getCurrentUser(): UserSession | null {
    return this.currentUserSignal();
  }
}
