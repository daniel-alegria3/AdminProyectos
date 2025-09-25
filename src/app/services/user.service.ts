import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import type { DbUser, User, AccountStatus } from '@/models/user';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = '/api';

  private mapDbToUi(u: DbUser): User {
    return {
      id: u.id_user,
      fullName: u.name,
      email: u.email,
      phone: u.phone_number ?? null,
      enabled: u.account_status === 'ENABLED',
      isAdmin: !!u.is_admin
    };
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<DbUser[]>(`${this.base}/user`).pipe(map((list) => list.map((u) => this.mapDbToUi(u))));
  }

  createUser(payload: {
    name: string;
    email: string;
    password: string;
    phone_number?: string | null;
    is_admin?: boolean;
  }): Observable<User> {
    return this.http.post<DbUser>(`${this.base}/admin/user`, payload).pipe(map((u) => this.mapDbToUi(u)));
  }

  updateUser(payload: {
    id_user: number;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    account_status?: AccountStatus | null;
    password?: string | null;
    is_admin?: boolean | null;
  }): Observable<User> {
    return this.http.patch<DbUser>(`${this.base}/admin/user`, payload).pipe(map((u) => this.mapDbToUi(u)));
  }

  deleteUser(id_user: number): Observable<{ ok: boolean }> {
    // Some backends accept DELETE with body; adjust if your backend expects query param instead.
    return this.http.request<{ ok: boolean }>('DELETE', `${this.base}/admin/user`, { body: { id_user } });
  }

  updateUserStatus(id_user: number, enabled: boolean): Observable<User> {
    const account_status: AccountStatus = enabled ? 'ENABLED' : 'DISABLED';
    return this.http
      .patch<DbUser>(`${this.base}/admin/user/account_status`, { id_user, account_status })
      .pipe(map((u) => this.mapDbToUi(u)));
  }
}
