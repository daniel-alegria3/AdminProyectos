import { Component } from '@angular/core';
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
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css'],
})
export class Auth {
  isLoginMode = true;
  loginForm: FormGroup;
  registerForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  passwordStrength = '';
  showPassword = false;
  showConfirmPassword = false;
  showLoginPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
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
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;

          // Service already handles storage and state
          const isAdmin = response.data?.is_admin || false;

          // Navigate based on user role
          setTimeout(() => {
            if (isAdmin) {
              this.router.navigate(['/admin']);
            } else {
              this.router.navigate(['/user']);
            }
          }, 1000);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
      },
    });
  }

  onRegister() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;
          // Optionally switch to login mode after successful registration
          setTimeout(() => {
            this.isLoginMode = true;
            this.registerForm.reset();
          }, 2000);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      },
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
