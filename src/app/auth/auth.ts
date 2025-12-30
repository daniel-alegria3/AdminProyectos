import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css'],
})
export class Auth {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals for reactive state
  isLoginMode = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);

  loginForm: FormGroup;
  registerForm: FormGroup;

  passwordStrength = '';
  showPassword = false;
  showConfirmPassword = false;
  showLoginPassword = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordLengthValidator]],
    });

    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, this.passwordLengthValidator]],
        confirmPassword: ['', [Validators.required]],
        phone_number: [''],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  passwordLengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null; // Let required handle this
    const trimmed = value.trim();
    const normalized = trimmed.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    if (normalized.length < 12) {
      return { minlength: { requiredLength: 12, actualLength: normalized.length } };
    }
    if (normalized.length > 128) {
      return { maxlength: { requiredLength: 128, actualLength: normalized.length } };
    }
    return null;
  }

  calculatePasswordStrength(password: string): string {
    if (!password) return '';
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9\s]/.test(password)) score++; // Special characters
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }

  onPasswordInput() {
    const password = this.registerForm.get('password')?.value || '';
    this.passwordStrength = this.calculatePasswordStrength(password);
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  toggleShowLoginPassword() {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleMode() {
    this.isLoginMode.set(!this.isLoginMode());
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.hashPassword(this.loginForm.value.password).then((hashedPassword) => {
      const loginData = {
        ...this.loginForm.value,
        password: hashedPassword,
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.success) {
            this.successMessage.set(response.message);

            // Service already handles storage and state
            const isAdmin = response.data?.is_admin || false;

            // Navigate based on user role
            setTimeout(() => {
              if (isAdmin) {
                this.router.navigate(['/admin']);
              } else {
                this.router.navigate(['/projects']);
              }
            }, 1000);
          } else {
            this.errorMessage.set(response.message);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.error?.message || 'Login failed. Please try again.');
        },
      });
    }).catch((err) => {
      this.isLoading.set(false);
      this.errorMessage.set('An error occurred during login. Please try again.');
    });
  }

  onRegister() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.hashPassword(registerData.password).then((hashedPassword) => {
      const hashedRegisterData = {
        ...registerData,
        password: hashedPassword,
      };

      this.authService.register(hashedRegisterData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.success) {
            this.successMessage.set(response.message);
            // Optionally switch to login mode after successful registration
            setTimeout(() => {
              this.isLoginMode.set(true);
              this.registerForm.reset();
            }, 2000);
          } else {
            this.errorMessage.set(response.message);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.error?.message || 'Registration failed. Please try again.');
        },
      });
    }).catch((err) => {
      this.isLoading.set(false);
      this.errorMessage.set('An error occurred during registration. Please try again.');
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    if (control?.hasError('required') && control?.touched) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control?.hasError('email') && control?.touched) {
      return 'Please enter a valid email';
    }
    if (control?.hasError('minlength') && control?.touched) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${control.errors?.['minlength'].requiredLength} characters (consecutive blank spaces count as one)`;
    }
    if (control?.hasError('maxlength') && control?.touched) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be no more than ${control.errors?.['maxlength'].requiredLength} characters`;
    }
    if (control?.hasError('passwordMismatch') && control?.touched) {
      return 'Passwords do not match';
    }
    return '';
  }
}
