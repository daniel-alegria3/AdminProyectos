import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

interface LoginResp {
  token: string;
  me: { id: number; isAdmin: boolean };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = '/api';

  token = signal<string | null>(localStorage.getItem('token'));
  currentUser = signal<{ id: number; isAdmin: boolean } | null>(
    JSON.parse(localStorage.getItem('me') ?? 'null')
  );

  login(email: string, password: string): Observable<void> {
    return this.http.post<LoginResp>(`${this.base}/auth/login`, { email, password }).pipe(
      map((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('me', JSON.stringify(res.me));
        this.token.set(res.token);
        this.currentUser.set(res.me);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('me');
    this.token.set(null);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  isAdmin(): boolean {
    return !!this.currentUser()?.isAdmin;
  }
}
