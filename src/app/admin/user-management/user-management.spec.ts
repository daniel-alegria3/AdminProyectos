import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { UserManagement } from './user-management';
import { AdminService, User, CreateUserData, UpdateUserData, ApiResponse } from '@/admin/admin.service';

describe('UserManagement Component', () => {
  let component: UserManagement;
  let fixture: ComponentFixture<UserManagement>;
  let adminService: jasmine.SpyObj<AdminService>;

  const mockUsers: User[] = [
    {
      user_id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone_number: '1234567890',
      is_enabled: true,
      is_admin: true,
    },
    {
      user_id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone_number: '0987654321',
      is_enabled: true,
      is_admin: false,
    },
  ];

  beforeEach(async () => {
    const adminServiceSpy = jasmine.createSpyObj('AdminService', [
      'getAllUsers',
      'createUser',
      'updateUser',
      'deleteUser',
      'updateUserStatus',
    ]);

    await TestBed.configureTestingModule({
      imports: [UserManagement],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        { provide: AdminService, useValue: adminServiceSpy },
      ],
    }).compileComponents();

    adminService = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
    fixture = TestBed.createComponent(UserManagement);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(component.users).toEqual([]);
      expect(component.loading).toBe(false);
      expect(component.error).toBe('');
      expect(component.success).toBe('');
      expect(component.showCreateModal).toBe(false);
      expect(component.showEditModal).toBe(false);
      expect(component.showDeleteModal).toBe(false);
      expect(component.selectedUser).toBeNull();
    });

    it('should initialize create form with empty values', () => {
      expect(component.createForm).toEqual({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        is_admin: false,
      });
    });

    it('should initialize edit form with default values', () => {
      expect(component.editForm).toEqual({
        user_id: 0,
        name: '',
        email: '',
        phone_number: '',
        account_status: 'ENABLED',
      });
    });

    it('should load users on initialization', () => {
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.ngOnInit();

      expect(adminService.getAllUsers).toHaveBeenCalled();
      expect(component.users).toEqual(mockUsers);
    });
  });

  describe('Loading Users', () => {
    it('should load users successfully', () => {
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.loadUsers();

      expect(component.users).toEqual(mockUsers);
      expect(component.loading).toBe(false);
      expect(component.error).toBe('');
    });

    it('should handle empty user list', () => {
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'No users', data: [] })
      );

      component.loadUsers();

      expect(component.users).toEqual([]);
    });

    it('should handle API error response', () => {
      adminService.getAllUsers.and.returnValue(
        of({ success: false, message: 'Failed to load users' })
      );

      component.loadUsers();

      expect(component.error).toBe('Failed to load users');
      expect(component.users).toEqual([]);
    });

    it('should handle network error when loading users', () => {
      const error = { status: 500 };
      adminService.getAllUsers.and.returnValue(throwError(() => error));

      component.loadUsers();

      expect(component.loading).toBe(false);
    });

    it('should set loading state during load', () => {
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.loading = false;
      component.loadUsers();

      expect(component.loading).toBe(false);
    });
  });

  describe('Modal Management', () => {
    it('should open create modal and reset form', () => {
      component.createForm = { name: 'Old', email: 'old@test.com', password: 'pass', phone_number: '', is_admin: true };

      component.openCreateModal();

      expect(component.showCreateModal).toBe(true);
      expect(component.createForm.name).toBe('');
      expect(component.createForm.email).toBe('');
      expect(component.createForm.password).toBe('');
      expect(component.createForm.is_admin).toBe(false);
      expect(component.error).toBe('');
      expect(component.success).toBe('');
    });

    it('should open edit modal with user data', () => {
      const user = mockUsers[0];

      component.openEditModal(user);

      expect(component.showEditModal).toBe(true);
      expect(component.selectedUser).toEqual(user);
      expect(component.editForm.user_id).toBe(user.user_id);
      expect(component.editForm.name).toBe(user.name);
      expect(component.editForm.email).toBe(user.email);
      expect(component.editForm.phone_number).toBe(user.phone_number);
      expect(component.editForm.account_status).toBe('ENABLED');
    });

    it('should open edit modal with disabled status when user is disabled', () => {
      const disabledUser: User = { ...mockUsers[0], is_enabled: false };

      component.openEditModal(disabledUser);

      expect(component.editForm.account_status).toBe('DISABLED');
    });

    it('should open delete modal and set selected user', () => {
      const user = mockUsers[0];

      component.openDeleteModal(user);

      expect(component.showDeleteModal).toBe(true);
      expect(component.selectedUser).toEqual(user);
    });

    it('should close all modals and clear messages', () => {
      component.showCreateModal = true;
      component.showEditModal = true;
      component.showDeleteModal = true;
      component.selectedUser = mockUsers[0];
      component.error = 'Some error';
      component.success = 'Some success';

      component.closeModals();

      expect(component.showCreateModal).toBe(false);
      expect(component.showEditModal).toBe(false);
      expect(component.showDeleteModal).toBe(false);
      expect(component.selectedUser).toBeNull();
      expect(component.error).toBe('');
      expect(component.success).toBe('');
    });
  });

  describe('Create User', () => {
    it('should create user with valid form data', () => {
      component.createForm = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        phone_number: '1234567890',
        is_admin: false,
      };

      adminService.createUser.and.returnValue(
        of({ success: true, message: 'User created', data: { user_id: 3, name: 'New User' } as User })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.createUser();

      expect(adminService.createUser).toHaveBeenCalledWith(component.createForm);
      expect(adminService.getAllUsers).toHaveBeenCalled();
    });

    it('should reject creation with empty name', () => {
      component.createForm = {
        name: '',
        email: 'test@example.com',
        password: 'password123',
        phone_number: '',
        is_admin: false,
      };

      component.createUser();

      expect(adminService.createUser).not.toHaveBeenCalled();
      expect(component.error).toContain('nombre');
    });

    it('should reject creation with empty email', () => {
      component.createForm = {
        name: 'Test',
        email: '',
        password: 'password123',
        phone_number: '',
        is_admin: false,
      };

      component.createUser();

      expect(adminService.createUser).not.toHaveBeenCalled();
      expect(component.error).toContain('email');
    });

    it('should reject creation with empty password', () => {
      component.createForm = {
        name: 'Test',
        email: 'test@example.com',
        password: '',
        phone_number: '',
        is_admin: false,
      };

      component.createUser();

      expect(adminService.createUser).not.toHaveBeenCalled();
      expect(component.error).toContain('contraseña');
    });

    it('should handle creation error', () => {
      component.createForm = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        phone_number: '',
        is_admin: false,
      };

      const error = { status: 409, error: { message: 'Email already exists' } };
      adminService.createUser.and.returnValue(throwError(() => error));

      component.createUser();

      expect(component.error).toContain('Email already exists');
    });

    it('should close modal and reload users after successful creation', () => {
      component.createForm = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        phone_number: '',
        is_admin: false,
      };
      component.showCreateModal = true;

      adminService.createUser.and.returnValue(
        of({ success: true, message: 'Created', data: { user_id: 3 } as User })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.createUser();

      expect(component.showCreateModal).toBe(false);
      expect(adminService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('Update User', () => {
    it('should update user with valid form data', () => {
      component.editForm = {
        user_id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
        phone_number: '9999999999',
        account_status: 'ENABLED',
      };

      adminService.updateUser.and.returnValue(
        of({ success: true, message: 'User updated', data: { user_id: 1 } as User })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.updateUser();

      expect(adminService.updateUser).toHaveBeenCalledWith(component.editForm);
      expect(adminService.getAllUsers).toHaveBeenCalled();
    });

    it('should handle update error', () => {
      component.editForm = {
        user_id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
        phone_number: '',
        account_status: 'ENABLED',
      };

      const error = { status: 404 };
      adminService.updateUser.and.returnValue(throwError(() => error));

      component.updateUser();

      expect(component.error).toContain('Recurso no encontrado');
    });

    it('should close modal and reload users after successful update', () => {
      component.editForm = {
        user_id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
        phone_number: '',
        account_status: 'ENABLED',
      };
      component.showEditModal = true;

      adminService.updateUser.and.returnValue(
        of({ success: true, message: 'Updated', data: { user_id: 1 } as User })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.updateUser();

      expect(component.showEditModal).toBe(false);
      expect(adminService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('Delete User', () => {
    it('should delete selected user', () => {
      component.selectedUser = mockUsers[0];

      adminService.deleteUser.and.returnValue(
        of({ success: true, message: 'User deleted', data: { deleted_user_id: 1 } })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: [mockUsers[1]] })
      );

      component.deleteUser();

      expect(adminService.deleteUser).toHaveBeenCalledWith(1);
      expect(adminService.getAllUsers).toHaveBeenCalled();
    });

    it('should not delete if no user selected', () => {
      component.selectedUser = null;

      component.deleteUser();

      expect(adminService.deleteUser).not.toHaveBeenCalled();
    });

    it('should handle deletion error', () => {
      component.selectedUser = mockUsers[0];

      const error = { status: 403 };
      adminService.deleteUser.and.returnValue(throwError(() => error));

      component.deleteUser();

      expect(component.error).toContain('Acceso denegado');
    });

    it('should close modal and reload users after successful deletion', () => {
      component.selectedUser = mockUsers[0];
      component.showDeleteModal = true;

      adminService.deleteUser.and.returnValue(
        of({ success: true, message: 'Deleted', data: { deleted_user_id: 1 } })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: [mockUsers[1]] })
      );

      component.deleteUser();

      expect(component.showDeleteModal).toBe(false);
      expect(adminService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('Toggle User Status', () => {
    it('should toggle enabled user to disabled', () => {
      const user = mockUsers[0];

      adminService.updateUserStatus.and.returnValue(
        of({ success: true, message: 'Status updated' })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.toggleUserStatus(user);

      expect(adminService.updateUserStatus).toHaveBeenCalledWith(1, 'DISABLED');
      expect(adminService.getAllUsers).toHaveBeenCalled();
    });

    it('should toggle disabled user to enabled', () => {
      const disabledUser: User = { ...mockUsers[0], is_enabled: false };

      adminService.updateUserStatus.and.returnValue(
        of({ success: true, message: 'Status updated' })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.toggleUserStatus(disabledUser);

      expect(adminService.updateUserStatus).toHaveBeenCalledWith(1, 'ENABLED');
    });

    it('should handle status update error', () => {
      const user = mockUsers[0];

      const error = { status: 500 };
      adminService.updateUserStatus.and.returnValue(throwError(() => error));

      component.toggleUserStatus(user);

      expect(component.error).toContain('Error interno');
    });

    it('should reload users after status update', () => {
      const user = mockUsers[0];

      adminService.updateUserStatus.and.returnValue(
        of({ success: true, message: 'Status updated' })
      );
      adminService.getAllUsers.and.returnValue(
        of({ success: true, message: 'Users loaded', data: mockUsers })
      );

      component.toggleUserStatus(user);

      expect(adminService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('Error Message Handling', () => {
    it('should handle connection error (status 0)', () => {
      const error = { status: 0 };
      const message = component['getErrorMessage'](error, 'Default');

      expect(message).toContain('No se puede conectar');
    });

    it('should handle unauthorized error (status 401)', () => {
      const error = { status: 401 };
      const message = component['getErrorMessage'](error, 'Default');

      expect(message).toContain('No tienes permisos');
    });

    it('should handle forbidden error (status 403)', () => {
      const error = { status: 403 };
      const message = component['getErrorMessage'](error, 'Default');

      expect(message).toContain('Acceso denegado');
    });

    it('should handle not found error (status 404)', () => {
      const error = { status: 404 };
      const message = component['getErrorMessage'](error, 'Default');

      expect(message).toContain('Recurso no encontrado');
    });

    it('should handle server error (status >= 500)', () => {
      const error = { status: 500 };
      const message = component['getErrorMessage'](error, 'Default');

      expect(message).toContain('Error interno');
    });

    it('should use error message from response if available', () => {
      const error = { status: 400, error: { message: 'Custom error message' } };
      const message = component['getErrorMessage'](error, 'Default');

      expect(message).toBe('Custom error message');
    });

    it('should use default message as fallback', () => {
      const error = { status: 250 };
      const message = component['getErrorMessage'](error, 'Default message');

      expect(message).toBe('Default message');
    });
  });

  describe('User Status Display', () => {
    it('should return correct status text for enabled user', () => {
      const user = mockUsers[0];
      const text = component.getUserStatusText(user);

      expect(text).toBe('Habilitado');
    });

    it('should return correct status text for disabled user', () => {
      const disabledUser: User = { ...mockUsers[0], is_enabled: false };
      const text = component.getUserStatusText(disabledUser);

      expect(text).toBe('Deshabilitado');
    });

    it('should return correct CSS class for enabled user', () => {
      const user = mockUsers[0];
      const cssClass = component.getUserStatusClass(user);

      expect(cssClass).toBe('text-green-600 bg-green-100');
    });

    it('should return correct CSS class for disabled user', () => {
      const disabledUser: User = { ...mockUsers[0], is_enabled: false };
      const cssClass = component.getUserStatusClass(disabledUser);

      expect(cssClass).toBe('text-red-600 bg-red-100');
    });
  });

  describe('Message Clearing', () => {
    it('should clear all messages', () => {
      component.error = 'Error message';
      component.success = 'Success message';

      component.clearMessages();

      expect(component.error).toBe('');
      expect(component.success).toBe('');
    });
  });
});
