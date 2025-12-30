import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Auth } from './auth';
import { AuthService, AuthResponse } from './auth.service';

describe('Auth Component', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'register',
      'logout',
      'checkSession',
      'getCurrentUser',
      'isLoggedIn',
      'isAdmin',
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Auth);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock hashPassword to return a resolved promise immediately
    spyOn<any>(component, 'hashPassword').and.returnValue(Promise.resolve('hashed_password'));
  });

  // Component Creation
  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize forms', () => {
      expect(component.loginForm).toBeTruthy();
      expect(component.registerForm).toBeTruthy();
    });

    it('should start in login mode', () => {
      expect(component.isLoginMode()).toBe(true);
    });

    it('should initialize signals correctly', () => {
      expect(component.errorMessage()).toBe('');
      expect(component.successMessage()).toBe('');
      expect(component.isLoading()).toBe(false);
    });
  });

  // Form Validation - Login Form
  describe('Login Form Validation', () => {
    it('should have invalid form when email is missing', () => {
      const form = component.loginForm;
      form.patchValue({ email: '', password: 'ValidPassword123!' });
      expect(form.invalid).toBe(true);
    });

    it('should have invalid form when password is missing', () => {
      const form = component.loginForm;
      form.patchValue({ email: 'test@example.com', password: '' });
      expect(form.invalid).toBe(true);
    });

    it('should have invalid form when email format is wrong', () => {
      const form = component.loginForm;
      form.patchValue({ email: 'invalid-email', password: 'ValidPassword123!' });
      expect(form.invalid).toBe(true);
    });

    it('should have invalid form when password is too short', () => {
      const form = component.loginForm;
      form.patchValue({ email: 'test@example.com', password: 'short' });
      expect(form.invalid).toBe(true);
    });

    it('should have valid form with correct credentials', () => {
      const form = component.loginForm;
      form.patchValue({ email: 'test@example.com', password: 'ValidPassword123!' });
      expect(form.valid).toBe(true);
    });
  });

  // Form Validation - Register Form
  describe('Register Form Validation', () => {
    it('should have invalid form when name is missing', () => {
      const form = component.registerForm;
      form.patchValue({
        name: '',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });
      expect(form.invalid).toBe(true);
    });

    it('should have invalid form when name is too short', () => {
      const form = component.registerForm;
      form.patchValue({
        name: 'A',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });
      expect(form.invalid).toBe(true);
    });

    it('should have invalid form when passwords do not match', () => {
      const form = component.registerForm;
      form.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });
      expect(form.invalid).toBe(true);
    });

    it('should have valid form with correct data', () => {
      const form = component.registerForm;
      form.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        phone_number: '1234567890',
      });
      expect(form.valid).toBe(true);
    });
  });

  // Password Strength Calculator
  describe('Password Strength Calculation', () => {
    it('should return weak strength for passwords with low score', () => {
      // Score: lowercase(1) = 1 point
      const strength = component.calculatePasswordStrength('lower');
      expect(strength).toBe('weak');
    });

    it('should return medium strength for passwords with medium score', () => {
      // Score: lowercase(1) + uppercase(1) + digit(1) = 3 points
      const strength = component.calculatePasswordStrength('LowerCaseDigit1');
      expect(strength).toBe('medium');
    });

    it('should return strong strength for passwords with high score', () => {
      // Score: length>=12(1) + length>=16(1) + lowercase(1) + uppercase(1) + digit(1) + special(1) = 6 points
      const strength = component.calculatePasswordStrength('LowerCaseDigit123!@#');
      expect(strength).toBe('strong');
    });

    it('should return empty string for empty password', () => {
      const strength = component.calculatePasswordStrength('');
      expect(strength).toBe('');
    });
  });

  // Password Visibility Toggles
  describe('Password Visibility Toggles', () => {
    it('should toggle showPassword', () => {
      expect(component.showPassword).toBe(false);
      component.toggleShowPassword();
      expect(component.showPassword).toBe(true);
      component.toggleShowPassword();
      expect(component.showPassword).toBe(false);
    });

    it('should toggle showConfirmPassword', () => {
      expect(component.showConfirmPassword).toBe(false);
      component.toggleShowConfirmPassword();
      expect(component.showConfirmPassword).toBe(true);
    });

    it('should toggle showLoginPassword', () => {
      expect(component.showLoginPassword).toBe(false);
      component.toggleShowLoginPassword();
      expect(component.showLoginPassword).toBe(true);
    });
  });

  // Mode Toggle
  describe('Mode Toggle', () => {
    it('should switch from login to register mode', () => {
      component.isLoginMode.set(true);
      component.toggleMode();
      expect(component.isLoginMode()).toBe(false);
    });

    it('should clear error and success messages on mode toggle', () => {
      component.errorMessage.set('Some error');
      component.successMessage.set('Some success');
      component.toggleMode();
      expect(component.errorMessage()).toBe('');
      expect(component.successMessage()).toBe('');
    });
  });

  // Login Method
  describe('onLogin()', () => {
    it('should not submit if form is invalid', () => {
      component.loginForm.patchValue({ email: '', password: '' });
      component.onLogin();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should clear loading state after login completes', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };
      authService.login.and.returnValue(of(response));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      expect(component.isLoading()).toBe(false);
    }));

    it('should call authService.login with valid credentials', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };
      authService.login.and.returnValue(of(response));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashed_password',
      });
    }));

    it('should navigate to projects for non-admin user on successful login', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };
      authService.login.and.returnValue(of(response));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      tick(1100);
      expect(router.navigate).toHaveBeenCalledWith(['/projects']);
    }));

    it('should navigate to admin for admin user on successful login', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: true },
      };
      authService.login.and.returnValue(of(response));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      tick(1100);
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    }));

    it('should display success message on successful login', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };
      authService.login.and.returnValue(of(response));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      expect(component.successMessage()).toBe('Login successful');
    }));

    it('should display error message on failed login', fakeAsync(() => {
      const response: AuthResponse = {
        success: false,
        message: 'Invalid credentials',
      };
      authService.login.and.returnValue(of(response));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      expect(component.errorMessage()).toBe('Invalid credentials');
    }));

    it('should handle login error', fakeAsync(() => {
      const errorResponse = {
        error: { message: 'Network error' },
      };
      authService.login.and.returnValue(throwError(() => errorResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      expect(component.errorMessage()).toBe('Network error');
      expect(component.isLoading()).toBe(false);
    }));

    it('should clear error message on new login attempt', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };
      authService.login.and.returnValue(of(response));

      component.errorMessage.set('Previous error');
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      component.onLogin();
      tick();
      expect(component.errorMessage()).not.toBe('Previous error');
    }));
  });

  // Register Method
  describe('onRegister()', () => {
    it('should not submit if form is invalid', () => {
      component.registerForm.patchValue({ name: '', email: '', password: '', confirmPassword: '' });
      component.onRegister();
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('should call authService.register with valid data', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
      };
      authService.register.and.returnValue(of(response));

      component.registerForm.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

      component.onRegister();
      tick();

      const callArgs = authService.register.calls.mostRecent().args[0];
      expect(callArgs.name).toBe('John Doe');
      expect(callArgs.email).toBe('test@example.com');
      expect(callArgs.password).toBe('hashed_password');
      expect('confirmPassword' in callArgs).toBe(false);
    }));

    it('should exclude confirmPassword from register call', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
      };
      authService.register.and.returnValue(of(response));

      component.registerForm.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

      component.onRegister();
      tick();

      const callArgs = authService.register.calls.mostRecent().args[0];
      expect('confirmPassword' in callArgs).toBe(false);
    }));

    it('should display success message on successful registration', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
      };
      authService.register.and.returnValue(of(response));

      component.registerForm.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

      component.onRegister();
      tick();
      expect(component.successMessage()).toBe('Registration successful');
    }));

    it('should switch to login mode after successful registration', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
      };
      authService.register.and.returnValue(of(response));

      component.isLoginMode.set(false);
      component.registerForm.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

      component.onRegister();
      tick();
      tick(2100);
      expect(component.isLoginMode()).toBe(true);
    }));

    it('should reset register form after successful registration', fakeAsync(() => {
      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
      };
      authService.register.and.returnValue(of(response));

      component.registerForm.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

      component.onRegister();
      tick();
      tick(2100);
      expect(component.registerForm.get('name')?.value).toBeNull();
      expect(component.registerForm.get('email')?.value).toBeNull();
    }));

    it('should display error message on failed registration', fakeAsync(() => {
      const response: AuthResponse = {
        success: false,
        message: 'Email already registered',
      };
      authService.register.and.returnValue(of(response));

      component.registerForm.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

      component.onRegister();
      tick();
      expect(component.errorMessage()).toBe('Email already registered');
    }));

    it('should handle registration error', fakeAsync(() => {
      const errorResponse = {
        error: { message: 'Server error' },
      };
      authService.register.and.returnValue(throwError(() => errorResponse));

      component.registerForm.patchValue({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

      component.onRegister();
      tick();
      expect(component.errorMessage()).toBe('Server error');
      expect(component.isLoading()).toBe(false);
    }));
  });

  // Error Messages
  describe('getErrorMessage()', () => {
    it('should return required error message', () => {
      const form = component.loginForm;
      const emailControl = form.get('email');
      emailControl?.markAsTouched();
      emailControl?.setErrors({ required: true });

      const errorMessage = component.getErrorMessage(form, 'email');
      expect(errorMessage).toContain('required');
    });

    it('should return email format error message', () => {
      const form = component.loginForm;
      const emailControl = form.get('email');
      emailControl?.markAsTouched();
      emailControl?.setErrors({ email: true });

      const errorMessage = component.getErrorMessage(form, 'email');
      expect(errorMessage).toContain('valid email');
    });

    it('should return password mismatch error message', () => {
      const form = component.registerForm;
      const confirmPasswordControl = form.get('confirmPassword');
      confirmPasswordControl?.markAsTouched();
      confirmPasswordControl?.setErrors({ passwordMismatch: true });

      const errorMessage = component.getErrorMessage(form, 'confirmPassword');
      expect(errorMessage).toContain('do not match');
    });

    it('should return empty string when control is valid and touched', () => {
      const form = component.loginForm;
      const emailControl = form.get('email');
      emailControl?.markAsTouched();
      emailControl?.setErrors(null);

      const errorMessage = component.getErrorMessage(form, 'email');
      expect(errorMessage).toBe('');
    });
  });

  // Validators
  describe('Password Validators', () => {
    it('passwordLengthValidator should reject passwords shorter than 12 characters', () => {
      const control = component.loginForm.get('password');
      control?.setValue('short');
      const error = component.passwordLengthValidator(control!);
      expect(error).toBeTruthy();
      expect(error?.['minlength'].requiredLength).toBe(12);
    });

    it('passwordLengthValidator should accept passwords of 12 characters', () => {
      const control = component.loginForm.get('password');
      control?.setValue('ValidPass123');
      const error = component.passwordLengthValidator(control!);
      expect(error).toBeNull();
    });

    it('passwordLengthValidator should reject passwords longer than 128 characters', () => {
      const control = component.loginForm.get('password');
      const longPassword = 'a'.repeat(129);
      control?.setValue(longPassword);
      const error = component.passwordLengthValidator(control!);
      expect(error).toBeTruthy();
      expect(error?.['maxlength'].requiredLength).toBe(128);
    });

    it('passwordMatchValidator should reject mismatched passwords', () => {
      const form = component.registerForm;
      form.patchValue({
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });
      const error = component.passwordMatchValidator(form);
      expect(error).toBeTruthy();
      expect(error?.['passwordMismatch']).toBe(true);
    });

    it('passwordMatchValidator should accept matching passwords', () => {
      const form = component.registerForm;
      form.patchValue({
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });
      const error = component.passwordMatchValidator(form);
      expect(error).toBeNull();
    });
  });
});
