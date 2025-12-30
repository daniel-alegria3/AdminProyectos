import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, Logs } from '@/admin/admin.service';

@Component({
  selector: 'app-logs-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logs-management.html',
  styleUrl: './logs-management.css'
})
export class LogsManagement implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  logs: Logs[] = [];
  loading = false;
  error = '';
  success = '';
  JSON = JSON;

  ngOnInit() {
    this.loadLogs();
  }

  private updateState() {
    this.cdr.detectChanges();
  }

  loadLogs() {
    this.loading = true;
    this.clearMessages();
    this.updateState();

    this.adminService.getLogs().subscribe({
      next: (response) => {
        console.log('Full API Response:', response);

        if (response.success && response.data) {
          this.logs = response.data;
        } else {
          this.error = response.message || 'Error al cargar registros';
        }

        this.loading = false;
        this.updateState();
      },
      error: (err) => {
        console.error('Error loading logs:', err);
        this.error = this.getErrorMessage(err, 'Error al cargar registros');
        this.loading = false;
        this.updateState();
      }
    });
  }

  clearMessages() {
    this.error = '';
    this.success = '';
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

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'CREATE':
        return 'action-create';
      case 'UPDATE':
        return 'action-update';
      case 'DELETE':
        return 'action-delete';
      default:
        return '';
    }
  }

  getEntityTypeBadgeClass(entityType: string): string {
    switch (entityType) {
      case 'PROJECT':
        return 'entity-project';
      case 'TASK':
        return 'entity-task';
      default:
        return '';
    }
  }

  getActionText(action: string): string {
    const actionMap: Record<string, string> = {
      'CREATE': 'Crear',
      'UPDATE': 'Actualizar',
      'DELETE': 'Eliminar'
    };
    return actionMap[action] || action;
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatNewValues(newValues: Record<string, any> | null | string): string {
    if (!newValues) return '-';
    let obj = newValues;
    if (typeof newValues === 'string') {
      try {
        obj = JSON.parse(newValues);
      } catch (e) {
        return newValues;
      }
    }
    return JSON.stringify(obj, null, 2);
  }
}
