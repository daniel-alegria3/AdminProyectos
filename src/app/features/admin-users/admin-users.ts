import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { UserService } from '@/services/user.service';
import type { User } from '@/models/user';
import { CommonModule } from '@angular/common';
import { UserForm } from '@/features/user-form/user-form';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UserForm]
})
export class AdminUsers {
  private userService = inject(UserService);

  users$ = this.userService.getAllUsers();

  userFormOpen = signal(false);
  selectedUser = signal<User | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  refresh(): void {
    this.users$ = this.userService.getAllUsers();
  }

  openCreate(): void {
    this.selectedUser.set(null);
    this.userFormOpen.set(true);
  }

  openEdit(u: User): void {
    this.selectedUser.set(u);
    this.userFormOpen.set(true);
  }

  onDelete(id: number): void {
    if (!confirm('¿Eliminar usuario? Esta acción es irreversible.')) return;
    this.loading.set(true);
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.loading.set(false);
        this.refresh();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo eliminar el usuario');
        console.error(err);
      }
    });
  }

  toggleStatus(u: User): void {
    this.loading.set(true);
    this.userService.updateUserStatus(u.id, !u.enabled).subscribe({
      next: () => {
        this.loading.set(false);
        this.refresh();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cambiar el estado');
        console.error(err);
      }
    });
  }

  onFormSaved(): void {
    this.userFormOpen.set(false);
    this.refresh();
  }

  onFormCancelled(): void {
    this.userFormOpen.set(false);
  }
}
