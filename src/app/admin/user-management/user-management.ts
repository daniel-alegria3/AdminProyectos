import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, User, CreateUserData, UpdateUserData } from '@/admin/admin.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagement implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  users: User[] = [];
  loading = false;
  error = '';
  success = '';

  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  // Form data
  createForm: CreateUserData = {
    name: '',
    email: '',
    password: '',
    phone_number: '',
    is_admin: false
  };

  editForm: UpdateUserData = {
    user_id: 0,
    name: '',
    email: '',
    phone_number: '',
    account_status: 'ENABLED'
  };

  selectedUser: User | null = null;

  ngOnInit() {
    this.loadUsers();
  }

  private updateState() {
    // Force change detection after state updates
    this.cdr.detectChanges();
  }

  loadUsers() {
    this.loading = true;
    this.clearMessages();
    this.updateState();

    this.adminService.getAllUsers().subscribe({
      next: (response) => {
        console.log('Full API Response:', response);

        if (response.success && response.data) {
          this.users = response.data;
        } else {
          this.error = response.message || 'Error al cargar usuarios';
        }

        this.loading = false;
        this.updateState();
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.loading = false;
        this.updateState();
      }
    });
  }

  openCreateModal() {
    this.createForm = {
      name: '',
      email: '',
      password: '',
      phone_number: '',
      is_admin: false
    };
    this.showCreateModal = true;
    this.clearMessages();
    this.updateState();
  }

  openEditModal(user: User) {
    this.selectedUser = user;
    this.editForm = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || '',
      account_status: user.is_enabled ? 'ENABLED' : 'DISABLED'
    };
    this.showEditModal = true;
    this.clearMessages();
    this.updateState();
  }

  openDeleteModal(user: User) {
    this.selectedUser = user;
    this.showDeleteModal = true;
    this.clearMessages();
    this.updateState();
  }

  closeModals() {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedUser = null;
    this.clearMessages();
    this.updateState();
  }

  createUser() {
    if (!this.validateCreateForm()) {
      this.updateState();
      return;
    }

    this.loading = true;
    this.clearMessages();
    this.updateState();

    this.adminService.createUser(this.createForm).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = response.message || 'Usuario creado exitosamente';
          this.loadUsers();
          this.closeModals();
        } else {
          this.error = response.message || 'Error al crear usuario';
        }
        this.loading = false;
        this.updateState();
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Error al crear usuario');
        console.error('Error creating user:', err);
        this.loading = false;
        this.updateState();
      }
    });
  }

  updateUser() {
    this.loading = true;
    this.clearMessages();
    this.updateState();

    this.adminService.updateUser(this.editForm).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = response.message || 'Usuario actualizado exitosamente';
          this.loadUsers();
          this.closeModals();
        } else {
          this.error = response.message || 'Error al actualizar usuario';
        }
        this.loading = false;
        this.updateState();
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Error al actualizar usuario');
        console.error('Error updating user:', err);
        this.loading = false;
        this.updateState();
      }
    });
  }

  deleteUser() {
    if (!this.selectedUser) return;

    this.loading = true;
    this.clearMessages();
    this.updateState();

    this.adminService.deleteUser(this.selectedUser.user_id).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = response.message || 'Usuario eliminado exitosamente';
          this.loadUsers();
          this.closeModals();
        } else {
          this.error = response.message || 'Error al eliminar usuario';
        }
        this.loading = false;
        this.updateState();
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Error al eliminar usuario');
        console.error('Error deleting user:', err);
        this.loading = false;
        this.updateState();
      }
    });
  }

  toggleUserStatus(user: User) {
    this.loading = true;
    this.clearMessages();
    this.updateState();

    const newStatus = user.is_enabled ? 'DISABLED' : 'ENABLED';

    this.adminService.updateUserStatus(user.user_id, newStatus).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = response.message || 'Estado de usuario actualizado exitosamente';
          this.loadUsers();
        } else {
          this.error = response.message || 'Error al cambiar estado del usuario';
        }
        this.loading = false;
        this.updateState();
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Error al cambiar estado del usuario');
        console.error('Error updating user status:', err);
        this.loading = false;
        this.updateState();
      }
    });
  }

  private validateCreateForm(): boolean {
    if (!this.createForm.name.trim()) {
      this.error = 'El nombre es requerido';
      return false;
    }
    if (!this.createForm.email.trim()) {
      this.error = 'El email es requerido';
      return false;
    }
    if (!this.createForm.password.trim()) {
      this.error = 'La contraseña es requerida';
      return false;
    }
    return true;
  }

  private getErrorMessage(err: any, defaultMessage: string): string {
    if (err.status === 0) {
      return 'No se puede conectar al servidor. Verifica que el backend esté ejecutándose.';
    } else if (err.status === 401) {
      return 'No tienes permisos para realizar esta acción.';
    } else if (err.status === 403) {
      return 'Acceso denegado.';
    } else if (err.status === 404) {
      return 'Recurso no encontrado.';
    } else if (err.status >= 500) {
      return 'Error interno del servidor.';
    } else if (err.error && err.error.message) {
      return err.error.message;
    } else {
      return defaultMessage;
    }
  }

  clearMessages() {
    this.error = '';
    this.success = '';
  }

  getUserStatusText(user: User): string {
    return user.is_enabled ? 'Habilitado' : 'Deshabilitado';
  }

  getUserStatusClass(user: User): string {
    return user.is_enabled ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  }
}
